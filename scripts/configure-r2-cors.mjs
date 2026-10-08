#!/usr/bin/env node
/**
 * Applies the CORS rule a geniusCampaign R2 bucket needs for direct
 * browser-to-R2 template-image uploads (POST /uploads/presign flow).
 *
 * Without this, the browser's preflight OPTIONS request to
 * https://<account>.r2.cloudflarestorage.com gets no
 * Access-Control-Allow-Origin back and every image upload fails with:
 *   "blocked by CORS policy ... No 'Access-Control-Allow-Origin' header"
 *
 * Usage (creds are the same five values as Settings > Integrations > Cloudflare R2):
 *   CLOUDFLARE_R2_ACCOUNT_ID=... \
 *   CLOUDFLARE_R2_ACCESS_KEY_ID=... \
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY=... \
 *   CLOUDFLARE_R2_BUCKET=... \
 *   node scripts/configure-r2-cors.mjs https://campaign.xgenious.com [https://other-origin ...]
 *
 * Local dev origins (http://localhost:5173) are always included; pass
 * --no-localhost to skip them. Run again any time the app's public URL changes.
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const args = process.argv.slice(2).filter((a) => a !== '--no-localhost');
const includeLocalhost = !process.argv.includes('--no-localhost');

const { CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET } =
  process.env;

for (const [key, value] of Object.entries({
  CLOUDFLARE_R2_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET,
})) {
  if (!value) {
    console.error(`Missing ${key} in the environment — export the R2 credentials first (see usage above).`);
    process.exit(1);
  }
}

if (args.length === 0) {
  console.error('Pass at least one app origin, e.g. node scripts/configure-r2-cors.mjs https://campaign.xgenious.com');
  process.exit(1);
}

const origins = [...args];
if (includeLocalhost) origins.push('http://localhost:5173', 'http://localhost:5174');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

// The browser PUT sends Content-Type (+ Origin, auto-added); the preflight
// asks for exactly these, so the rule must allow them — a wildcard method
// list alone is not enough.
await client.send(
  new PutBucketCorsCommand({
    Bucket: CLOUDFLARE_R2_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ['GET', 'PUT', 'HEAD'],
          AllowedHeaders: ['Content-Type', 'Origin'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

const current = await client.send(new GetBucketCorsCommand({ Bucket: CLOUDFLARE_R2_BUCKET }));
console.log(`CORS configured on bucket "${CLOUDFLARE_R2_BUCKET}":`);
console.log(JSON.stringify(current.CORSRules, null, 2));
