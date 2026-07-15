import { prisma } from "@/lib/db/prisma";

export type SearchResult = {
  id: number;
  type: "inventory";
  title: string;
  subtitle: string;
  href: string;
  container: string;
  location: string;
};

export async function searchBinVault(
  rawQuery: string,
): Promise<SearchResult[]> {
  const query = rawQuery.trim();

  if (query.length < 2) {
    return [];
  }

  const inventoryItems = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
          },
        },
        {
          manufacturer: {
            contains: query,
          },
        },
        {
          modelNumber: {
            contains: query,
          },
        },
        {
          serialNumber: {
            contains: query,
          },
        },
        {
          category: {
            is: {
              name: {
                contains: query,
              },
            },
          },
        },
        {
          container: {
            is: {
              OR: [
                {
                  name: {
                    contains: query,
                  },
                },
                {
                  binNumber: {
                    contains: query,
                  },
                },
                {
                  location: {
                    is: {
                      name: {
                        contains: query,
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    include: {
      category: true,
      container: {
        include: {
          location: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 10,
  });

  return inventoryItems.map((item) => ({
    id: item.id,
    type: "inventory",
    title: item.name,
    subtitle: item.category?.name ?? item.inventoryType.replaceAll("_", " "),
    href: `/inventory/${item.id}`,
    container: `${item.container.binNumber} — ${item.container.name}`,
    location: item.container.location?.name ?? "No location",
  }));
}