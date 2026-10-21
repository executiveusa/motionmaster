// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Minimal MCP client (JSON-RPC 2.0 over stdio).
 *
 * This is a clean-room implementation of the public Model Context Protocol
 * transport rules; it contains no Montage code. It is used to reach the
 * Montage studio tools that have no HTTP equivalent on a user-run instance:
 *
 *   project_create, project_list, project_get, project_validate,
 *   timeline_get, timeline_replace
 *
 * The Montage MCP server is started by the user with
 * `python -m yappy_clipz.mcp_server` (default transport: stdio).
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";

/** A tool advertised by an MCP server. */
export interface McpToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

/** Options for {@link McpStdioClient}. */
export interface McpStdioOptions {
  /** Command to spawn. Default: `python`. */
  command?: string;
  /** Arguments for the command. Default: `["-m", "yappy_clipz.mcp_server"]`. */
  args?: string[];
  /** Extra environment variables for the child process. */
  env?: Record<string, string>;
  /** Working directory of the child process. */
  cwd?: string;
  /** Per-request timeout in milliseconds. Default 60000. */
  timeoutMs?: number;
  /** Client identity reported during `initialize`. */
  clientName?: string;
  clientVersion?: string;
  /** Protocol version requested during `initialize`. */
  protocolVersion?: string;
}

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

let nextId = 1;

/** Error raised when the MCP server answers with a JSON-RPC error. */
export class McpError extends Error {
  code: number;
  data?: unknown;
  constructor(message: string, code: number, data?: unknown) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.data = data;
  }
}

/** Client for an MCP server exposed over stdio. */
export class McpStdioClient {
  private readonly options: Required<
    Pick<McpStdioOptions, "command" | "args" | "timeoutMs" | "clientName" | "clientVersion" | "protocolVersion">
  > &
    McpStdioOptions;
  private child?: ChildProcessWithoutNullStreams;
  private reader?: Interface;
  private readonly pending = new Map<number, PendingCall>();
  private serverInfo?: { protocolVersion?: string; serverInfo?: { name?: string; version?: string } };
  private startPromise?: Promise<void>;

  constructor(options: McpStdioOptions = {}) {
    this.options = {
      command: options.command ?? "python",
      args: options.args ?? ["-m", "yappy_clipz.mcp_server"],
      env: options.env,
      cwd: options.cwd,
      timeoutMs: options.timeoutMs ?? 60000,
      clientName: options.clientName ?? "motion-master-montage-bridge",
      clientVersion: options.clientVersion ?? "0.1.0",
      protocolVersion: options.protocolVersion ?? "2024-11-05",
    };
  }

  /** Protocol version the server answered with, once connected. */
  get negotiatedProtocolVersion(): string | undefined {
    return this.serverInfo?.protocolVersion;
  }

  /** Spawn the server and complete the MCP handshake. */
  async start(): Promise<void> {
    if (!this.startPromise) this.startPromise = this.doStart();
    return this.startPromise;
  }

  private async doStart(): Promise<void> {
    const child = spawn(this.options.command, this.options.args, {
      cwd: this.options.cwd,
      env: { ...process.env, ...(this.options.env ?? {}) },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;
    this.reader = createInterface({ input: child.stdout });
    this.reader.on("line", (line) => this.onLine(line));
    child.on("exit", (code) => this.failAll(new Error(`MCP server exited with code ${code}`)));

    const result = (await this.request("initialize", {
      protocolVersion: this.options.protocolVersion,
      capabilities: { roots: { listChanged: false }, sampling: {} },
      clientInfo: { name: this.options.clientName, version: this.options.clientVersion },
    })) as { protocolVersion?: string; serverInfo?: { name?: string; version?: string } };
    this.serverInfo = result ?? {};
    this.notify("notifications/initialized", {});
  }

  /** List the tools the server advertises. */
  async listTools(): Promise<McpToolDescriptor[]> {
    const result = (await this.request("tools/list", {})) as { tools?: McpToolDescriptor[] };
    return result?.tools ?? [];
  }

  /**
   * Call one MCP tool and return its decoded result.
   *
   * Montage's server is created with `json_response=True`, so the tool result
   * arrives as a text content block holding JSON. Structured content is used
   * when the server provides it.
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = (await this.request("tools/call", { name, arguments: args })) as {
      content?: { type: string; text?: string }[];
      structuredContent?: unknown;
      isError?: boolean;
    };
    if (result?.isError) {
      const text = result.content?.map((block) => block.text ?? "").join("\n") ?? "unknown tool error";
      throw new McpError(`MCP tool ${name} failed: ${text}`, -32000);
    }
    if (result?.structuredContent !== undefined) return result.structuredContent;
    const text = result?.content?.find((block) => block.type === "text")?.text;
    if (text === undefined) return result;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /** Stop the server process. */
  async close(): Promise<void> {
    this.reader?.close();
    this.child?.stdin?.end();
    this.child?.kill();
    this.child = undefined;
    this.reader = undefined;
    this.startPromise = undefined;
    this.failAll(new Error("MCP client closed"));
  }

  private onLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    let message: {
      id?: number;
      method?: string;
      result?: unknown;
      error?: { code: number; message: string; data?: unknown };
    };
    try {
      message = JSON.parse(trimmed);
    } catch {
      return; // not a JSON-RPC frame (server logging)
    }
    if (typeof message.id !== "number") return; // server-initiated notification
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(new McpError(message.error.message, message.error.code, message.error.data));
    } else {
      pending.resolve(message.result);
    }
  }

  private failAll(error: Error): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private notify(method: string, params: Record<string, unknown>): void {
    this.write({ jsonrpc: "2.0", method, params });
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request ${method} timed out after ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }

  private write(message: Record<string, unknown>): void {
    if (!this.child) throw new Error("MCP server is not running");
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }
}
