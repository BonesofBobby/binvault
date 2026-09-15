import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { createBackup } from "@/lib/backup/backup";
import { registerBackup, takeBackup } from "@/lib/backup/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let ready: Awaited<ReturnType<typeof createBackup>> | null = null;
  let token: string | null = null;
  try {
    const result = await createBackup();
    ready = result;
    if (request.signal.aborted) {
      await result.cleanup();
      return Response.json({ error: "Backup request was canceled." }, { status: 499 });
    }
    token = registerBackup(result);
    const { manifest } = result;
    return Response.json({ token, createdAt: manifest.createdAt, counts: manifest.counts,
      mediaCount: manifest.mediaCount, mediaBytes: manifest.mediaBytes,
      missingReferencedMediaCount: manifest.missingReferencedMedia.length,
      unreferencedManagedMediaCount: manifest.unreferencedManagedMediaCount },
    { headers: { "Cache-Control": "no-store" } });
  } catch {
    if (token) await takeBackup(token)?.cleanup().catch(() => {});
    else if (ready) await ready.cleanup().catch(() => {});
    return Response.json({ error: "Unable to create backup." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  let result: Awaited<ReturnType<typeof createBackup>> | null = null;
  let source: ReturnType<typeof createReadStream> | null = null;
  try {
    const token = new URL(request.url).searchParams.get("token");
    result = token ? takeBackup(token) : await createBackup();
    if (!result) return Response.json({ error: "Prepared backup has expired. Create another backup." }, { status: 404 });
    if (request.signal.aborted) {
      await result.cleanup();
      return Response.json({ error: "Backup download was canceled." }, { status: 499 });
    }
    source = createReadStream(result.archivePath);
    const ready = result;
    const fileStream = source;
    source.once("close", () => { void ready.cleanup().catch(() => {}); });
    request.signal.addEventListener("abort", () => fileStream.destroy(), { once: true });
    if (request.signal.aborted) source.destroy();
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    return new Response(Readable.toWeb(source) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="binvault-backup-${timestamp}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    if (source) source.destroy();
    else if (result) await result.cleanup().catch(() => {});
    return Response.json({ error: "Unable to create backup." }, { status: 500 });
  }
}
