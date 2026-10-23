/**
 * The chat route.
 *
 * A streaming chat that can drive the whole product. Its tools are not a copy
 * of the Motion Master tools — they *are* them: the chat connects to this
 * server's own MCP endpoint and asks it what it can do, so the tool surface
 * has exactly one source of truth and the wire protocol is exercised on every
 * request.
 *
 * The stream follows the AI SDK's UI message protocol, so a client can render
 * text, tool calls and **artifacts**. An artifact is not something the model
 * writes: it is emitted from the *actual result of a real tool call*, so what
 * the console shows can never be a description of something that did not
 * happen.
 *
 * The model comes from OpenRouter. The key comes from the request (the
 * founder's own key, via Sign in with OpenRouter) or from the server
 * environment. Neither path means the server holds a secret it did not have
 * to.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
  type UIMessageStreamWriter,
} from "ai";
import { join } from "node:path";
import type { Config } from "./config.js";
import { resolveModel, DEFAULT_MODEL } from "./model.js";

export interface ChatRequestBody {
  messages?: ModelMessage[];
  model?: string;
  /** The caller's own OpenRouter key. Used only for this request. */
  apiKey?: string;
  /** The system prompt to use instead of the Motion Master one. */
  instructions?: string;
}

/**
 * The agent's own voice. It is the router's rules, shortened for a chat turn:
 * what the product is, what the tools do, and the rule that the tool result is
 * the answer — not a description of it.
 */
export const MOTION_MASTER_SYSTEM = `You are Motion Master, a motion-design agent. You make films.

Your tools are the product. When a tool returns something, that IS the answer —
return it, do not describe it in your own words, and do not claim to have done
something a tool did not.

Start by understanding the brief: what the piece is, how long it is, and the
words on screen. Then use the tools:

- browse_library and list_motion_blocks to find what already exists
- enhance_prompt when the brief is weak, to turn it into a complete one
- fill_block to put the brief's words into a specific motion block
- compose_film to assemble a shot list from several blocks
- plan_video for the beat sheet, build_composition for Remotion, and
  build_hyperframes_composition for an HTML project
- render_film to actually make the film: it builds the project, runs the
  HyperFrames gate, and encodes the MP4 on this machine. It returns at once
  with the film rendering; check it with film_status and show the file when
  it is ready. If the user wants a film, render_film is the tool that
  delivers it — a shot list is not a film.
- list_films for what has already been made here

Never invent a prompt, a block id, a file path or a count. If it is in the
library, look it up. If a tool fails, say what failed.

Be brief. The user is looking at a console, not reading an essay. Show the
artifact, not an essay about the artifact.`;

/**
 * What each tool's result is, to the console. The kind decides how it is
 * rendered; the payload is the real result, trimmed.
 */
const ARTIFACT_KINDS: Record<string, string> = {
  list_skills: 'reference',
  get_motion_tokens: 'reference',
  list_clips: 'clip',
  get_clip_prompt: 'clip',
  plan_video: 'shotlist',
  build_composition: 'code',
  build_hyperframes_composition: 'code',
  mix_footage: 'timeline',
  list_library_collections: 'library',
  list_library_categories: 'library',
  browse_library: 'library',
  get_library_item: 'library',
  list_motion_blocks: 'library',
  fill_block: 'shotlist',
  compose_film: 'shotlist',
  render_film: 'film',
  film_status: 'film',
  list_films: 'film',
  enhance_prompt: 'brief',
};

/** How much of a tool result is worth showing. */
function trimResult(value: unknown, limit = 6000): unknown {
  if (typeof value === 'string') {
    return value.length > limit ? `${value.slice(0, limit)}\n…` : value;
  }
  if (value && typeof value === 'object') {
    const text = JSON.stringify(value);
    if (text.length <= limit) return value;
    return { _trimmed: true, preview: `${text.slice(0, limit)}…` };
  }
  return value;
}

/**
 * Unwrap the MCP envelope so the console gets the *result*, not the wire
 * format.
 *
 * An MCP tool answers with a content envelope: `{ content: [{ type: "text",
 * text: "<json>" }] }`. The model can read that. The console cannot — it needs
 * `payload.items`, `payload.shots`, `payload.files`. So the artifact carries
 * the structured form, and the model still receives the original envelope.
 */
function unwrapResult(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const envelope = value as {
    structuredContent?: unknown;
    content?: unknown;
  };

  if (envelope.structuredContent && typeof envelope.structuredContent === 'object') {
    return envelope.structuredContent;
  }

  const content = envelope.content;
  if (Array.isArray(content) && content.length === 1) {
    const part = content[0] as { type?: string; text?: string } | undefined;
    if (part?.type === 'text' && typeof part.text === 'string') {
      try {
        return JSON.parse(part.text);
      } catch {
        /* not JSON — fall through to the raw envelope */
      }
    }
  }
  return value;
}

/**
 * Wrap the real MCP tools so that each call emits an artifact built from its
 * actual output. The model never writes the artifact — the server does, from
 * the tool's own return value.
 */
function withArtifacts(
  tools: ToolSet,
  writer: UIMessageStreamWriter,
): ToolSet {
  const wrapped: ToolSet = {};
  for (const [name, tool] of Object.entries(tools)) {
    const original = tool as {
      execute?: (args: unknown, options: unknown) => Promise<unknown> | unknown;
    };
    if (typeof original.execute !== 'function') {
      wrapped[name] = tool;
      continue;
    }
    wrapped[name] = {
      ...tool,
      execute: async (args: unknown, options: unknown) => {
        const result = await original.execute!(args, options);
        const payload = unwrapResult(result);
        writer.write({
          type: 'data-artifact',
          data: {
            kind: ARTIFACT_KINDS[name] ?? 'result',
            tool: name,
            title: String(
              (payload as { title?: string })?.title ??
                (result as { title?: string })?.title ??
                name,
            ),
            payload: trimResult(payload),
          },
        } as never);
        return result;
      },
    };
  }
  return wrapped;
}

/**
 * Connect to our own MCP endpoint. The chat is a client of the product's own
 * protocol, exactly as an external agent would be.
 */
async function connectTools(config: Config): Promise<MCPClient> {
  const url = `http://127.0.0.1:${config.port}/mcp`;
  return createMCPClient({ transport: { type: 'http', url } });
}

/** The key for this request. The caller's key wins. */
function keyFor(body: ChatRequestBody): string | null {
  const fromRequest = body.apiKey?.trim();
  if (fromRequest) return fromRequest;
  const fromEnv = process.env.OPENROUTER_API_KEY?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}

export interface ChatOptions {
  /**
   * How to build the language model. The default is OpenRouter; the seam
   * exists so the route can be tested against a mocked model without a key
   * and without spending anything.
   */
  createModel?: (modelId: string, apiKey: string) => LanguageModel;
}

/**
 * Handle a chat request. Returns a streaming response the caller can pipe.
 */
export async function handleChat(
  body: ChatRequestBody,
  config: Config,
  signal?: AbortSignal,
  options: ChatOptions = {},
): Promise<{ status: number; response: Response }> {
  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      status: 400,
      response: Response.json({ error: "No messages were sent." }),
    };
  }

  const apiKey = keyFor(body);
  if (!apiKey) {
    return {
      status: 401,
      response: Response.json({
        error: "No OpenRouter key.",
        howToFix:
          "Sign in with OpenRouter on the page, or set OPENROUTER_API_KEY on the server. " +
          "The server never needs a key: bring your own.",
      }),
    };
  }

  const resolution = await resolveModel(
    body.model,
    process.env.MOTION_MASTER_CHAT_MODEL?.trim() || DEFAULT_MODEL,
    join(config.repoRoot, ".cache", "openrouter-models.json"),
  );

  if (resolution.error) {
    return {
      status: 400,
      response: Response.json({
        error: resolution.error,
        suggestions: resolution.suggestions,
        note: "The model was not substituted. Pick one of these, or leave the model unset.",
      }),
    };
  }

  const client = await connectTools(config);
  const tools = (await client.tools()) as unknown as ToolSet;

  const model = options.createModel
    ? options.createModel(resolution.model, apiKey)
    : createOpenRouter({ apiKey })(resolution.model);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model,
        system: body.instructions?.trim() || MOTION_MASTER_SYSTEM,
        messages,
        tools: withArtifacts(tools, writer),
        stopWhen: stepCountIs(12),
        abortSignal: signal,
        onError: ({ error }) => {
          console.error("[chat] model error:", error);
        },
      });
      writer.merge(result.toUIMessageStream());
    },
    onError: (error) => {
      console.error("[chat] stream error:", error);
      return error instanceof Error ? error.message : String(error);
    },
  });

  const response = createUIMessageStreamResponse({ stream });
  response.headers.set('x-motion-master-model', resolution.model);
  response.headers.set('x-motion-master-model-verified', String(resolution.verified));
  return { status: 200, response };
}
