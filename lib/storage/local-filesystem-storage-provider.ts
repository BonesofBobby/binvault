import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  SaveFileInput,
  StorageProvider,
  StoredFile,
} from "@/lib/storage/storage-provider";

const DEFAULT_UPLOAD_DIRECTORY = "inventory";
const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

function normalizeStoragePath(storagePath: string): string {
  return storagePath
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");
}

function resolveSafeUploadPath(storagePath: string): string {
  const normalizedPath = normalizeStoragePath(storagePath);
  const absolutePath = path.resolve(PUBLIC_UPLOAD_ROOT, normalizedPath);
  const uploadRoot = path.resolve(PUBLIC_UPLOAD_ROOT);

  if (
    absolutePath !== uploadRoot &&
    !absolutePath.startsWith(`${uploadRoot}${path.sep}`)
  ) {
    throw new Error("Invalid storage path.");
  }

  return absolutePath;
}

export class LocalFilesystemStorageProvider implements StorageProvider {
  async save(input: SaveFileInput): Promise<StoredFile> {
    const directory =
      sanitizePathSegment(input.directory ?? DEFAULT_UPLOAD_DIRECTORY) ||
      DEFAULT_UPLOAD_DIRECTORY;

    const safeFileName = sanitizePathSegment(input.fileName);

    if (!safeFileName) {
      throw new Error("A valid file name is required.");
    }

    const storagePath = `${directory}/${safeFileName}`;
    const absolutePath = resolveSafeUploadPath(storagePath);
    const absoluteDirectory = path.dirname(absolutePath);

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, input.data);

    return {
      fileName: safeFileName,
      storagePath,
      publicUrl: this.getPublicUrl(storagePath),
      sizeBytes: input.data.byteLength,
    };
  }

  async delete(storagePath: string): Promise<void> {
    const absolutePath = resolveSafeUploadPath(storagePath);

    try {
      await unlink(absolutePath);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return;
      }

      throw error;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    const absolutePath = resolveSafeUploadPath(storagePath);

    try {
      await access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(storagePath: string): string {
    const normalizedPath = normalizeStoragePath(storagePath);

    return `/uploads/${normalizedPath}`;
  }
}

export const localFilesystemStorageProvider =
  new LocalFilesystemStorageProvider();