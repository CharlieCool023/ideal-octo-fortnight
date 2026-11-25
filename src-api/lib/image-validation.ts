import sharp from "sharp";

const JPEG_DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_DATA_URL_LENGTH = 20_000;
const MAX_INPUT_PIXELS = 1_000_000;

export async function normalizePassportPhotoDataUrl(value: string): Promise<string | null> {
  if (value.length > MAX_DATA_URL_LENGTH) return null;

  const match = JPEG_DATA_URL.exec(value);
  if (!match) return null;

  const encoded = match[1];
  if (encoded.length % 4 !== 0) return null;

  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.toString("base64") !== encoded) return null;

  try {
    const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" as const };
    const metadata = await sharp(bytes, options).metadata();
    if (
      metadata.format !== "jpeg" ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_INPUT_PIXELS
    ) {
      return null;
    }

    const normalized = await sharp(bytes, options)
      .rotate()
      .resize({ width: 160, height: 160, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return `data:image/jpeg;base64,${normalized.toString("base64")}`;
  } catch {
    return null;
  }
}
