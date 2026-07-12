const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Resizes to a max dimension and re-encodes via canvas — re-encoding
 * through canvas pixel data (rather than copying the original bytes)
 * is what strips EXIF (GPS, camera model, etc.), since canvas never
 * carries the source file's metadata into its output (GC-055).
 */
export async function compressAndStripExif(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable — cannot process image');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('Failed to encode compressed image');

  const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], newName, { type: 'image/jpeg' });
}
