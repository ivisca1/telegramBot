import { describe, it, expect, beforeAll, afterAll } from "bun:test";

const BASE = "http://localhost:3456";
process.env.PORT = "3456";
process.env.CORS_ORIGIN = "http://localhost:5173,http://localhost:3000";

let server: any;

beforeAll(async () => {
  const mod = await import("../src/index");
  server = mod.server;
  await new Promise((r) => setTimeout(r, 300));
});

afterAll(() => {
  server?.stop();
});

describe("GET /health/live", () => {
  it("returns 200 with status ok", async () => {
    const res = await fetch(`${BASE}/health/live`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("number");
  });
});

describe("GET /health/ready", () => {
  it("returns a valid status object", async () => {
    const res = await fetch(`${BASE}/health/ready`);
    const body = await res.json();
    expect(body.status).toMatch(/^(ready|not_ready)$/);
    expect(body).toHaveProperty("upstream");
    expect([200, 503]).toContain(res.status);
  });
});
