import { NextRequest, NextResponse } from "next/server";

import { mediaService } from "@/lib/services/media-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseMediaId(value: string): number | null {
  const mediaId = Number(value);

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return null;
  }

  return mediaId;
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const mediaId = parseMediaId(id);

    if (!mediaId) {
      return NextResponse.json(
        {
          error: "A valid media ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    await mediaService.deleteMedia(mediaId);

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    console.error("Failed to delete media:", error);

    return NextResponse.json(
      {
        error: "Unable to delete media.",
      },
      {
        status: 500,
      },
    );
  }
}