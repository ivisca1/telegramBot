import type { Context } from "hono";

const {
  OPENCODE_URL = "http://localhost:4098",
  OPENCODE_API_KEY = "",
  OPENCODE_PASSWORD = "",
  CORS_ORIGIN = "http://localhost:5173",
  NODE_ENV = "",
  BUN_ENV = "",
} = process.env;

const isTest = NODE_ENV === "test" || BUN_ENV === "test";

function addCORSHeaders(headers: Headers): void {
  headers.set("Access-Control-Allow-Origin", CORS_ORIGIN);
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Credentials", "true");
}

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-authenticate",
  "upgrade",
]);

function addAuthHeaders(headers: Headers): void {
  if (OPENCODE_API_KEY) {
    headers.set("Authorization", `Bearer ${OPENCODE_API_KEY}`)
  } else if (OPENCODE_PASSWORD) {
    const encoded = Buffer.from(`opencode:${OPENCODE_PASSWORD}`).toString(
      "base64",
    );
    headers.set("Authorization", `Basic ${encoded}`);
  }
}

async function readBody(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined;
}

export async function proxyRequest(
  c: Context,
  path: string,
): Promise<Response> {
  const url = new URL(c.req.url);
  const targetUrl = `${OPENCODE_URL}${path}${url.search}`;

  const headers = new Headers(c.req.raw.headers);
  for (const key of HOP_BY_HOP) {
    headers.delete(key);
  }

  addAuthHeaders(headers)

  let body: BodyInit | Uint8Array | undefined = undefined;
  if (c.req.method !== "GET" && c.req.method !== "HEAD" && c.req.raw.body) {
    body = await readBody(c.req.raw.body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  if (c.req.raw.signal) {
    if (c.req.raw.signal.aborted) { controller.abort(); }
    c.req.raw.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body: body as BodyInit,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const isSSE = (response.headers.get("content-type") ?? "").includes(
      "text/event-stream",
    );
    const responseHeaders = new Headers();

    if (isSSE) {
      responseHeaders.set("Content-Type", "text/event-stream");
      responseHeaders.set("Cache-Control", "no-cache");
      responseHeaders.set("Connection", "keep-alive");
    } else {
      for (const [key, value] of response.headers) {
        if (!HOP_BY_HOP.has(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }
    }

    addCORSHeaders(responseHeaders);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (!isTest) {
      console.error(
        JSON.stringify({
          level: "error",
          source: "proxy",
          upstream: OPENCODE_URL,
          endpoint: path,
          method: c.req.method,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    const errorHeaders = new Headers({ "Content-Type": "application/json" });
    addCORSHeaders(errorHeaders);
    return new Response(
      JSON.stringify({ error: "OpenCode server unreachable" }),
      { status: 503, headers: errorHeaders },
    );
  }
}
