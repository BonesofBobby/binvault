import { InventoryMediaGallery } from "@/components/inventory/inventory-media-gallery";
import { mediaService } from "@/lib/services/media-service";

type InventoryMediaSectionProps = {
  inventoryId: number;
};

export async function InventoryMediaSection({
  inventoryId,
}: InventoryMediaSectionProps) {
  const media = await mediaService.getInventoryMedia(inventoryId);

  const initialMedia = media.map((item) => ({
    ...item,
    publicUrl: mediaService.getPublicUrl(item.storagePath),
  }));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <InventoryMediaGallery
        inventoryId={inventoryId}
        initialMedia={initialMedia}
      />
    </section>
  );
}