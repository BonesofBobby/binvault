import { NextRequest, NextResponse } from "next/server";

import { mediaService } from "@/lib/services/media-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseInventoryId(value: string): number | null {
  const inventoryId = Number(value);

  if (!Number.isInteger(inventoryId) || inventoryId <= 0) {
    return null;
  }

  return inventoryId;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const inventoryId = parseInventoryId(id);

    if (!inventoryId) {
      return NextResponse.json(
        {
          error: "A valid inventory ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const media = await mediaService.getInventoryMedia(inventoryId);

    const results = media.map((item) => ({
      ...item,
      publicUrl: mediaService.getPublicUrl(item.storagePath),
    }));

    return NextResponse.json({
      media: results,
    });
  } catch (error) {
    console.error("Failed to retrieve inventory media:", error);

    return NextResponse.json(
      {
        error: "Unable to retrieve inventory media.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const inventoryId = parseInventoryId(id);

    if (!inventoryId) {
      return NextResponse.json(
        {
          error: "A valid inventory ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file");
    const captionValue = formData.get("caption");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          error: "An image file is required.",
        },
        {
          status: 400,
        },
      );
    }

    const caption =
      typeof captionValue === "string" ? captionValue : null;

    const arrayBuffer = await uploadedFile.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    const media = await mediaService.saveInventoryPhoto({
      inventoryId,
      originalName: uploadedFile.name,
      mimeType: uploadedFile.type,
      data,
      caption,
    });

    return NextResponse.json(
      {
        media: {
          ...media,
          publicUrl: mediaService.getPublicUrl(media.storagePath),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to save inventory media:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to save inventory media.";

    const status =
      message === "Inventory item not found."
        ? 404
        : message.includes("required") ||
            message.includes("Unsupported") ||
            message.includes("empty") ||
            message.includes("size limit")
          ? 400
          : 500;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    );
  }
}