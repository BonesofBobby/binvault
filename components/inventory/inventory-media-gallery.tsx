"use client";

import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { FormEvent, useRef, useState } from "react";

type InventoryMedia = {
  id: number;
  inventoryId: number;
  mediaType: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  publicUrl: string;
};

type InventoryMediaGalleryProps = {
  inventoryId: number;
  initialMedia: InventoryMedia[];
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const sizeKilobytes = sizeBytes / 1024;

  if (sizeKilobytes < 1024) {
    return `${sizeKilobytes.toFixed(1)} KB`;
  }

  return `${(sizeKilobytes / 1024).toFixed(1)} MB`;
}

export function InventoryMediaGallery({
  inventoryId,
  initialMedia,
}: InventoryMediaGalleryProps) {
  const [media, setMedia] = useState(initialMedia);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleFileSelected(file: File | null) {
    resetMessages();

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setSelectedFile(null);
      setErrorMessage(
        "Unsupported image type. Select a JPEG, PNG, WebP, or GIF image.",
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (file.size === 0) {
      setSelectedFile(null);
      setErrorMessage("The selected image is empty.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setErrorMessage("The selected image exceeds the 10 MB size limit.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!selectedFile) {
      setErrorMessage("Select an image before uploading.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption);

      const response = await fetch(
        `/api/inventory/${inventoryId}/media`,
        {
          method: "POST",
          body: formData,
        },
      );

      const responseBody = (await response.json()) as {
        media?: InventoryMedia;
        error?: string;
      };

      if (!response.ok || !responseBody.media) {
        throw new Error(
          responseBody.error ?? "Unable to upload the selected image.",
        );
      }

      setMedia((currentMedia) => [
        ...currentMedia,
        responseBody.media as InventoryMedia,
      ]);

      setSelectedFile(null);
      setCaption("");
      setSuccessMessage("Photo uploaded successfully.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload the selected image.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(mediaId: number) {
    resetMessages();

    const confirmed = window.confirm(
      "Delete this photo? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingMediaId(mediaId);

    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const responseBody = (await response.json()) as {
          error?: string;
        };

        throw new Error(
          responseBody.error ?? "Unable to delete the selected photo.",
        );
      }

      setMedia((currentMedia) =>
        currentMedia.filter((item) => item.id !== mediaId),
      );

      setSuccessMessage("Photo deleted successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete the selected photo.",
      );
    } finally {
      setDeletingMediaId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Item photos
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Add photos to help identify, document, and locate this item.
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <label
              htmlFor="inventory-photo"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Image
            </label>

            <input
              ref={fileInputRef}
              id="inventory-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={isUploading}
              onChange={(event) =>
                handleFileSelected(event.target.files?.[0] ?? null)
              }
              className="block w-full cursor-pointer rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-300 file:mr-4 file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:font-medium file:text-white hover:file:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <p className="mt-2 text-xs text-slate-500">
              JPEG, PNG, WebP, or GIF. Maximum size: 10 MB.
            </p>
          </div>

          <div>
            <label
              htmlFor="inventory-photo-caption"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Caption
            </label>

            <input
              id="inventory-photo-caption"
              type="text"
              value={caption}
              disabled={isUploading}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Optional photo description"
              maxLength={200}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                Upload photo
              </>
            )}
          </button>
        </div>

        {selectedFile && (
          <p className="mt-4 text-sm text-slate-400">
            Selected:{" "}
            <span className="font-medium text-slate-200">
              {selectedFile.name}
            </span>{" "}
            ({formatFileSize(selectedFile.size)})
          </p>
        )}
      </form>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {successMessage}
        </div>
      )}

      {media.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-12 text-center">
          <ImagePlus className="mx-auto h-10 w-10 text-slate-600" />

          <p className="mt-4 font-medium text-slate-300">
            No photos have been uploaded
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Upload the first photo for this inventory item.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => {
            const isDeleting = deletingMediaId === item.id;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
              >
                <div className="relative aspect-[4/3] bg-slate-900">
                  <Image
                    src={item.publicUrl}
                    alt={item.caption || item.originalName}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="truncate font-medium text-slate-200">
                      {item.caption || item.originalName}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {item.originalName} · {formatFileSize(item.sizeBytes)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Deleting
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete photo
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}