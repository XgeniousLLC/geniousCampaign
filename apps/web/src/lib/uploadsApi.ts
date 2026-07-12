import { apiPost } from './api';

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export function presignUpload(filename: string, contentType: string) {
  return apiPost<PresignedUpload>('/uploads/presign', { filename, contentType });
}
