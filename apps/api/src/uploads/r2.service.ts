import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { SettingsService } from '../settings/settings.service';

const PRESIGN_EXPIRY_SECONDS = 300;

@Injectable()
export class R2Service {
  constructor(private readonly settings: SettingsService) {}

  // Built fresh per call (not cached at construction) so a credential saved
  // via Settings > Integrations takes effect immediately, no server restart.
  private buildClient(): { client: S3Client; bucket: string; publicBaseUrl: string } | null {
    const accountId = this.settings.get('CLOUDFLARE_R2_ACCOUNT_ID');
    const accessKeyId = this.settings.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.settings.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const bucket = this.settings.get('CLOUDFLARE_R2_BUCKET');
    const publicBaseUrl = this.settings.get('CLOUDFLARE_R2_PUBLIC_BASE_URL');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      return null;
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    return { client, bucket, publicBaseUrl };
  }

  /** Presigned PUT URL for a direct browser-to-R2 upload — the object is
   * never routed through our own server, and never becomes a base64 data
   * URI in the saved template (CLAUDE.md invariant 6). */
  async presignUpload(filename: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const config = this.buildClient();
    if (!config) {
      // Wired but cannot presign for real until credentials are provided —
      // never fake a working upload target (CLAUDE.md).
      throw new InternalServerErrorException(
        'Cloudflare R2 is not configured — cannot presign an upload. Set it up in Settings > Integrations, or CLOUDFLARE_R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET/PUBLIC_BASE_URL in .env.',
      );
    }

    const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
    const key = `template-images/${randomUUID()}${extension}`;

    const command = new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(config.client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });

    return { uploadUrl, publicUrl: `${config.publicBaseUrl}/${key}`, key };
  }
}
