export type StoredFile = {
  fileName: string;
  storagePath: string;
  publicUrl: string;
  sizeBytes: number;
};

export type SaveFileInput = {
  fileName: string;
  data: Buffer;
  directory?: string;
};

export interface StorageProvider {
  save(input: SaveFileInput): Promise<StoredFile>;

  delete(storagePath: string): Promise<void>;

  exists(storagePath: string): Promise<boolean>;

  getPublicUrl(storagePath: string): string;
}