import path from "path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { sessionsRouter } from "./routes/sessions";
import { chatRouter } from "./routes/chat";
import { configRouter } from "./routes/config";
import { modelsRouter } from "./routes/models";
import { filesRouter } from "./routes/files";
import { eventsRouter } from "./routes/events";
import healthRouter from "./routes/health";

const {
  OPENCODE_URL = "http://localhost:4098",
  PORT = "3001",
  CORS_ORIGIN = "http://localhost:5173",
  NODE_ENV = "",
  BUN_ENV = "",
} = process.env;

const port = parseInt(PORT, 10);
const isProduction = NODE_ENV === "production" || BUN_ENV === "production";
const isTest = NODE_ENV === "test" || BUN_ENV === "test";

const app = new Hono();

app.use("/api/*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  await next();
  const duration = Date.now() - start;
  if (!isTest) {
    console.log(
      JSON.stringify({
        level: "info",
        method,
        path,
        status: c.res.status,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }),
    );
  }
});

// CORS middleware for all responses (not just preflight)
app.use("*", async (c, next) => {
  try { await next() } finally {
    const existingOrigin = c.res.headers.get('Access-Control-Allow-Origin')
    if (!existingOrigin) {
      c.res.headers.set("Access-Control-Allow-Origin", CORS_ORIGIN);
    }
    c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    c.res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.res.headers.set("Access-Control-Allow-Credentials", "true");
  }
});

const CORS_ORIGINS = (CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.options("/api/*", (c) => {
  const requestOrigin = c.req.header("Origin") || "";
  const allowedOrigin =
    CORS_ORIGINS.includes(requestOrigin) || CORS_ORIGINS.includes("*")
      ? requestOrigin
      : CORS_ORIGINS[0];

  if (
    requestOrigin &&
    !CORS_ORIGINS.includes(requestOrigin) &&
    !CORS_ORIGINS.includes("*")
  ) {
    if (!isTest) {
      console.warn(
        JSON.stringify({
          level: "warn",
          source: "cors",
          rejected_origin: requestOrigin,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }

  return c.newResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
});

app.route("/api", sessionsRouter);
app.route("/api", chatRouter);
app.route("/api", configRouter);
app.route("/api", modelsRouter);
app.route("/api", filesRouter);
app.route("/api", eventsRouter);
app.route("/", healthRouter);

if (isProduction) {
  const dist = path.resolve(import.meta.dir, "../../frontend/dist");

  app.use("/*", serveStatic({ root: dist }));
  app.get("*", async (c) => {
    if (c.req.path.startsWith("/api")) return c.notFound();
    const file = await Bun.file(`${dist}/index.html`).text();
    return c.html(file);
  });
}

export const server = Bun.serve({
  fetch: app.fetch,
  port,
  idleTimeout: 120,
});

if (!isTest) {
  console.log(
    JSON.stringify({
      level: "info",
      event: "server_start",
      port,
      upstream: OPENCODE_URL,
      cors_origins: CORS_ORIGINS,
      timestamp: new Date().toISOString(),
    }),
  );
}
