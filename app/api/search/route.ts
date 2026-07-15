import { searchBinVault } from "@/lib/services/search-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  try {
    const results = await searchBinVault(query);

    return Response.json({
      query,
      results,
    });
  } catch (error) {
    console.error("Search failed:", error);

    return Response.json(
      {
        error: "Search could not be completed.",
      },
      {
        status: 500,
      },
    );
  }
}