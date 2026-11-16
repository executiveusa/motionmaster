# Motion Master — the studio.
#
# One image, two roles: the API and the worker. They are the same code with
# different commands, because the thing that renders and the thing that
# serves the API should be the same build.
#
# The data directory is deliberately outside the repository. A redeploy
# replaces the image; the work, the jobs and the ledger stay.
#
#   docker build -t motionmaster .
#   docker run -p 8787:8787 -v "$PWD/data:/data" motionmaster
#
# The browser is the awkward part: HyperFrames renders with a headless
# Chrome, and a Chrome in a container needs a few flags. They are in
# generator/hf.sh already; the image installs the browser the CLI expects.

FROM node:22-bookworm-slim

# A headless browser, and the tools a render needs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    ca-certificates \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV MOTION_MASTER_HOST=0.0.0.0
ENV MOTION_MASTER_MCP_PORT=8787
ENV MOTION_MASTER_DATA_DIR=/data

WORKDIR /app

# The dependency manifests first, so a code change does not reinstall them.
COPY mcp/package.json mcp/package-lock.json ./mcp/
COPY site/package.json site/package-lock.json ./site/
RUN cd mcp && npm ci --omit=dev --no-audit --no-fund || npm ci --no-audit --no-fund

COPY . .

# The house library, the block pool and the tokens are generated artefacts.
# They are in the repository, so they arrive with the code.
RUN cd mcp && npm run build || true
RUN cd site && npm run build || true

RUN mkdir -p /data && chmod 700 /data

VOLUME ["/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.MOTION_MASTER_MCP_PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The default role is the API. The worker is the same image with
# `node mcp/dist/supervisor-cli.js` (see docker-compose.yml).
CMD ["node", "mcp/dist/index.js"]
