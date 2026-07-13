import { SettingsService } from '../settings/settings.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2Service } from './r2.service';

jest.mock('@aws-sdk/s3-request-presigner');

describe('R2Service', () => {
  it('throws instead of faking a presigned URL when R2 credentials are not configured', async () => {
    const config = { get: () => undefined } as unknown as SettingsService;
    const service = new R2Service(config);

    await expect(service.presignUpload('photo.png', 'image/png')).rejects.toThrow(/Cloudflare R2 is not configured/);
  });

  it('presigns a PUT URL and derives the public URL from the configured bucket base, never base64', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://r2-presigned.example.com/put-url');

    const values: Record<string, string> = {
      CLOUDFLARE_R2_ACCOUNT_ID: 'acct123',
      CLOUDFLARE_R2_ACCESS_KEY_ID: 'key123',
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret123',
      CLOUDFLARE_R2_BUCKET: 'gc-templates',
      CLOUDFLARE_R2_PUBLIC_BASE_URL: 'https://images.example.com',
    };
    const config = { get: (key: string) => values[key] } as unknown as SettingsService;
    const service = new R2Service(config);

    const result = await service.presignUpload('photo.png', 'image/png');

    expect(result.uploadUrl).toBe('https://r2-presigned.example.com/put-url');
    expect(result.publicUrl).toBe(`https://images.example.com/${result.key}`);
    expect(result.key).toMatch(/^template-images\/[0-9a-f-]+\.png$/);
  });
});
