import { describe, expect, it, vi } from "vitest";
import { version } from "@/package.json";

vi.mock("@/lib/production/runtime", () => ({ checkProductionRuntime: vi.fn() }));
import { checkProductionRuntime } from "@/lib/production/runtime";
import { GET as health } from "@/app/api/health/route";
import { GET as ready } from "@/app/api/ready/route";

const checks = { configuration: "ok", database: "ok", migrations: "ok", uploads: "ok", recovery: "ok", temporary: "ok" } as const;

describe("production HTTP probes", () => {
  it("returns cheap versioned liveness without invoking readiness", async () => {
    const response = health();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", version });
    expect(checkProductionRuntime).not.toHaveBeenCalled();
  });

  it("returns bounded readiness and never exposes internal paths or URL values", async () => {
    vi.mocked(checkProductionRuntime).mockResolvedValueOnce({ status: "ready", fresh: false, legacy: false, checks });
    const success = await ready();
    expect(success.status).toBe(200);
    expect(await success.json()).toEqual({ status: "ready", version, checks });
    vi.mocked(checkProductionRuntime).mockResolvedValueOnce({ status: "unavailable", fresh: false, legacy: true,
      checks: { ...checks, database: "failed" } });
    const failure = await ready();
    expect(failure.status).toBe(503);
    expect(failure.headers.get("Cache-Control")).toBe("no-store");
    const body = await failure.text();
    expect(body).not.toContain("file:");
    expect(body).not.toContain("/Users/");
    expect(body).not.toContain("legacy");
    expect(JSON.parse(body)).toEqual({ status: "unavailable", version, checks: { ...checks, database: "failed" } });
  });

  it("returns a safe 503 if an unexpected readiness inspection fails", async () => {
    vi.mocked(checkProductionRuntime).mockRejectedValueOnce(new Error("secret file:/private/operator.db"));
    const response = await ready();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("operator.db");
  });
});
