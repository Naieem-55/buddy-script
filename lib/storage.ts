import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

/**
 * Storage adapter. `local` writes re-encoded images to disk (served by
 * /api/uploads/*). Swap in a Blob/S3 driver for serverless deploys where the
 * filesystem is ephemeral — the rest of the app only depends on this interface.
 */
export interface StorageAdapter {
  save(buffer: Buffer, ext: string): Promise<string>; // returns public URL path
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

class LocalDiskStorage implements StorageAdapter {
  private dir = path.resolve(process.env.UPLOAD_DIR || "./uploads");

  async save(buffer: Buffer, ext: string): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const name = `${Date.now()}_${randomBytes(8).toString("hex")}.${ext}`;
    await writeFile(path.join(this.dir, name), buffer);
    return `/api/uploads/${name}`;
  }
}

export function getStorage(): StorageAdapter {
  // Only the local driver is implemented here; a Vercel Blob driver would be
  // selected via process.env.STORAGE_DRIVER === "vercel".
  return new LocalDiskStorage();
}

/**
 * Validate + re-encode an uploaded image. Re-encoding with sharp strips EXIF
 * and any embedded payload, and normalizes the format. Returns the stored URL.
 */
export async function processAndStoreImage(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Unsupported image type");
  }
  const arrayBuf = await file.arrayBuffer();
  if (arrayBuf.byteLength > MAX_BYTES) {
    throw new Error("Image too large");
  }
  const input = Buffer.from(arrayBuf);

  // Re-encode to webp, cap dimensions, drop metadata. A decode failure means a
  // corrupt/forged image — surface a clean message, not the vips internals.
  let output: Buffer;
  try {
    output = await sharp(input)
      .rotate() // apply EXIF orientation, then strip it
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error("Invalid or corrupt image file");
  }

  return getStorage().save(output, "webp");
}
