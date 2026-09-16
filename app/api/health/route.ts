import appPackage from "@/package.json";

export const runtime = "nodejs";

export function GET() {
  return Response.json({ status: "ok", version: appPackage.version });
}
