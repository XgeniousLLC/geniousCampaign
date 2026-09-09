import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { uploadImageFile } from './imageUploadPipeline';

/** Drives the toolbar's hidden file input — compress/presign/upload happens
 * in the shared uploadImageFile() pipeline (also used by paste/drop in
 * TemplateEditor.tsx), this hook just wires it to the file picker + button
 * loading/error state. */
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
      const publicUrl = await uploadImageFile(file);
      editor.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return { inputRef, uploading, error, openFilePicker, handleFileChange };
}
