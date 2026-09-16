import appPackage from "@/package.json";
import { checkProductionRuntime } from "@/lib/production/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await checkProductionRuntime("ready");
    return Response.json({ status: result.status, version: appPackage.version, checks: result.checks }, {
      status: result.status === "ready" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ status: "unavailable", version: appPackage.version,
      checks: { configuration: "failed", database: "failed", migrations: "failed",
        uploads: "failed", recovery: "failed", temporary: "failed" } }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
