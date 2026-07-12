import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const PRESIGN_EXPIRY_SECONDS = 300;

@Injectable()
export class R2Service {
  private readonly client: S3Client | null;
  private readonly bucket?: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>('CLOUDFLARE_R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('CLOUDFLARE_R2_BUCKET') || undefined;
    this.publicBaseUrl = config.get<string>('CLOUDFLARE_R2_PUBLIC_BASE_URL') || undefined;

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket || !this.publicBaseUrl) {
      // Wired but cannot presign for real until credentials are provided —
      // never fake a working upload target (CLAUDE.md).
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /** Presigned PUT URL for a direct browser-to-R2 upload — the object is
   * never routed through our own server, and never becomes a base64 data
   * URI in the saved template (CLAUDE.md invariant 6). */
  async presignUpload(filename: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    if (!this.client || !this.bucket || !this.publicBaseUrl) {
      throw new InternalServerErrorException(
        'Cloudflare R2 is not configured — cannot presign an upload. Set CLOUDFLARE_R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET/PUBLIC_BASE_URL in .env.',
      );
    }

    const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
    const key = `template-images/${randomUUID()}${extension}`;

    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });

    return { uploadUrl, publicUrl: `${this.publicBaseUrl}/${key}`, key };
  }
}
