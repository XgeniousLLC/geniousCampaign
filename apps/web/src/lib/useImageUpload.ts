import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { compressAndStripExif } from './imageProcessing';
import { presignUpload } from './uploadsApi';

/** Compress + strip EXIF (GC-055) client-side, get a presigned R2 PUT URL,
 * upload directly browser-to-R2, then insert the real R2 URL into the doc —
 * the editor never sees a base64 data URI at any point (invariant 6). */
export function useImageUpload(editor: Editor | null) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openFilePicker() {
    setError(null);
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;

    setUploading(true);
    setError(null);
    try {
      const compressed = await compressAndStripExif(file);
      const { uploadUrl, publicUrl } = await presignUpload(compressed.name, compressed.type);
      const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': compressed.type }, body: compressed });
      if (!putRes.ok) throw new Error(`R2 upload failed: ${putRes.status} ${putRes.statusText}`);
      editor.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return { inputRef, uploading, error, openFilePicker, handleFileChange };
}
