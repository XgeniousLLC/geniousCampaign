import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
      // The SDK's flexible-checksum default injects x-amz-checksum-crc32 /
      // x-amz-sdk-checksum-algorithm into the presigned URL, forcing the
      // browser to send matching checksum headers on the PUT — an extra
      // signed-header surface that fails browser uploads (CORS preflight +
      // signature mismatch) for zero benefit on template images. Checksums
      // are optional for PutObject, so only compute one when R2 requires it.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
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

    const rawExtension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
    // Extension is cosmetic (key is a UUID) — whitelist it so a mismatched
    // name like "photo.exe" sent as image/jpeg can't persist a .exe key.
    // Falls back to the extension matching the validated contentType.
    const extensionByType: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
    const extension = allowedExtensions.has(rawExtension) ? rawExtension : (extensionByType[contentType] ?? '');
    const key = `template-images/${randomUUID()}${extension}`;

    const command = new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(config.client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });

    return { uploadUrl, publicUrl: `${config.publicBaseUrl}/${key}`, key };
  }

  /** Applies the bucket CORS rule the direct browser-to-R2 upload flow
   * needs. Browser PUTs to the presigned S3 endpoint are cross-origin, so
   * without this rule the preflight fails with "No
   * Access-Control-Allow-Origin" and no image upload can ever succeed —
   * no client-side change can work around a missing bucket-side rule. */
  async configureCors(origins: string[]): Promise<{ origins: string[] }> {
    const config = this.buildClient();
    if (!config) {
      throw new InternalServerErrorException(
        'Cloudflare R2 is not configured — cannot configure bucket CORS. Set it up in Settings > Integrations, or CLOUDFLARE_R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET/PUBLIC_BASE_URL in .env.',
      );
    }

    const normalized = [...new Set(origins.map((o) => o.trim()).filter(Boolean))].map((o) => {
      let url: URL;
      try {
        url = new URL(o);
      } catch {
        throw new BadRequestException(`"${o}" is not a valid origin URL — expected e.g. https://campaign.xgenious.com.`);
      }
      // An Origin is scheme + host + port only; anything else is rejected
      // rather than silently stored as a rule that could never match.
      if (url.pathname !== '/' || url.search || url.hash) {
        throw new BadRequestException(`"${o}" is not a bare origin — drop the path/query and retry.`);
      }
      if (url.protocol === 'https:') return url.origin;
      if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return url.origin;
      throw new BadRequestException(`"${o}" must be https (http is only allowed for localhost dev origins).`);
    });

    if (normalized.length === 0) {
      throw new BadRequestException('No origins to allow — pass at least one app URL.');
    }

    try {
      await config.client.send(
        new PutBucketCorsCommand({
          Bucket: config.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                // The browser PUT sends Content-Type (+ Origin, auto-added);
                // the preflight asks for exactly these.
                AllowedOrigins: normalized,
                AllowedMethods: ['GET', 'PUT', 'HEAD'],
                AllowedHeaders: ['Content-Type', 'Origin'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
    } catch (err) {
      if (err instanceof Error && (err.name === 'AccessDenied' || err.name === 'Forbidden')) {
        throw new ForbiddenException(
          'R2 refused the CORS update (AccessDenied) — the API token is scoped to Object Read & Write, which can only read/write objects. PutBucketCors edits bucket configuration, so the token must be created with "Admin Read & Write" (not "Object Read & Write") in R2 > Manage API tokens, then saved in Settings > Integrations. Alternatively run scripts/configure-r2-cors.mjs with such an Admin token.',
        );
      }
      throw err;
    }

    const current = await config.client.send(new GetBucketCorsCommand({ Bucket: config.bucket }));
    return { origins: current.CORSRules?.[0]?.AllowedOrigins ?? normalized };
  }
}
