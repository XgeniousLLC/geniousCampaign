import Image from '@tiptap/extension-image';

/**
 * The `src` attribute is always an R2 public URL, never a base64 data URI
 * (CLAUDE.md invariant 6) — enforced by the upload flow (see
 * useImageUpload.ts), which only ever calls setImage() with the publicUrl
 * returned from a presigned R2 upload, never with a local blob/data URL.
 */
export const R2Image = Image.configure({ inline: false });
