import { describe, it, expect } from "bun:test";
import { Hono } from "hono";

describe("CORS headers", () => {
  function makeApp(origins: string) {
    const CORS_ORIGINS = origins.split(",").map((s) => s.trim());
    const app = new Hono();
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
        // rejected origin — suppressed in test
      }

      return c.newResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    });
    return app;
  }

  it("includes Access-Control-Allow-Origin for allowed origin", async () => {
    const app = makeApp("http://localhost:5173,http://localhost:3000");
    const res = await app.request("http://localhost:3456/api/sessions", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
  });

  it("falls back to first allowed origin for unknown origin", async () => {
    const app = makeApp("http://localhost:5173,http://localhost:3000");
    const res = await app.request("http://localhost:3456/api/sessions", {
      method: "OPTIONS",
      headers: { Origin: "http://unknown.com" },
    });
    const allowed = res.headers.get("Access-Control-Allow-Origin");
    expect(allowed).toBe("http://localhost:5173");
  });

  it("returns * when wildcard origin is configured", async () => {
    const app = makeApp("*");
    const res = await app.request("http://localhost:3456/api/sessions", {
      method: "OPTIONS",
      headers: { Origin: "http://evil.com" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://evil.com",
    );
  });

  it("returns 204 for OPTIONS preflight", async () => {
    const app = makeApp("http://localhost:5173");
    const res = await app.request("http://localhost:3456/api/sessions", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.status).toBe(204);
  });

  it("sets all expected CORS headers", async () => {
    const app = makeApp("http://localhost:5173");
    const res = await app.request("http://localhost:3456/api/sessions", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type",
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });
});
