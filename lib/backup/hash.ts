import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export async function hashFile(file: string): Promise<{ sha256: string; size: number }> {
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of createReadStream(file)) {
    size += chunk.length;
    hash.update(chunk);
  }
  return { sha256: hash.digest("hex"), size };
}
