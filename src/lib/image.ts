// Downscales a user-picked photo before sending it to the scan-vocabulary API — full-resolution
// phone photos are unnecessarily large for OCR-style extraction and risk hitting the
// serverless request body limit. Output is always JPEG to keep the payload small.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export async function compressImageToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { base64, mimeType: "image/jpeg" };
}
