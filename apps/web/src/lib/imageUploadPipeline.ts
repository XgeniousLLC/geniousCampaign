import { compressAndStripExif } from './imageProcessing';
import { presignUpload } from './uploadsApi';

/** Shared by the toolbar file picker and paste/drop-to-upload: compress +
 * strip EXIF (GC-055), get a presigned R2 PUT URL, upload directly
 * browser-to-R2, and return the real R2 URL — callers insert this into the
 * doc themselves, so a base64 data URI never reaches the editor (invariant 6). */
export async function uploadImageFile(file: File): Promise<string> {
  const compressed = await compressAndStripExif(file);
  const { uploadUrl, publicUrl } = await presignUpload(compressed.name, compressed.type);
  const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': compressed.type }, body: compressed });
  if (!putRes.ok) throw new Error(`R2 upload failed: ${putRes.status} ${putRes.statusText}`);
  return publicUrl;
}
