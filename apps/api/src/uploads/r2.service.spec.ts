import { SettingsService } from '../settings/settings.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';
import { R2Service } from './r2.service';

jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation((config: unknown) => ({
      config,
      // Shared across instances so tests can stub responses before the
      // service under test constructs its own client.
      send: (jest.requireMock('@aws-sdk/client-s3') as { __send?: jest.Mock }).__send ?? jest.fn(),
    })),
    PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
    PutBucketCorsCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
    GetBucketCorsCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
    __send: jest.fn(),
  };
});

function configuredService() {
  const values: Record<string, string> = {
    CLOUDFLARE_R2_ACCOUNT_ID: 'acct123',
    CLOUDFLARE_R2_ACCESS_KEY_ID: 'key123',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret123',
    CLOUDFLARE_R2_BUCKET: 'gc-templates',
    CLOUDFLARE_R2_PUBLIC_BASE_URL: 'https://images.example.com',
  };
  const config = { get: (key: string) => values[key] } as unknown as SettingsService;
  return new R2Service(config);
}

function mockSend(): jest.Mock {
  return (jest.requireMock('@aws-sdk/client-s3') as { __send: jest.Mock }).__send;
}

beforeEach(() => {
  jest.clearAllMocks();
});

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

  it('builds the S3 client without flexible checksums, so presigned URLs stay plain host-signed', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://r2-presigned.example.com/put-url');
    await configuredService().presignUpload('photo.png', 'image/png');

    const config = (S3Client as jest.Mock).mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(config['requestChecksumCalculation']).toBe('WHEN_REQUIRED');
    expect(config['responseChecksumValidation']).toBe('WHEN_REQUIRED');
  });

  it('configureCors throws instead of touching R2 when credentials are not configured', async () => {
    const config = { get: () => undefined } as unknown as SettingsService;
    await expect(new R2Service(config).configureCors(['https://app.example.com'])).rejects.toThrow(
      /Cloudflare R2 is not configured/,
    );
  });

  it('configureCors rejects non-origins rather than storing rules that could never match', async () => {
    const service = configuredService();
    await expect(service.configureCors(['not-a-url'])).rejects.toThrow(/not a valid origin/);
    await expect(service.configureCors(['https://app.example.com/some/path'])).rejects.toThrow(/bare origin/);
    await expect(service.configureCors(['http://app.example.com'])).rejects.toThrow(/must be https/);
    await expect(service.configureCors([])).rejects.toThrow(/No origins/);
    expect(mockSend()).not.toHaveBeenCalled();
  });

  it('configureCors allows https origins and localhost http, normalizing trailing slashes', async () => {
    const service = configuredService();
    const send = mockSend();
    send
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ CORSRules: [{ AllowedOrigins: ['https://app.example.com', 'http://localhost:5173'] }] });

    const result = await service.configureCors(['https://app.example.com/', 'http://localhost:5173']);

    expect(PutBucketCorsCommand).toHaveBeenCalledWith({
      Bucket: 'gc-templates',
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['https://app.example.com', 'http://localhost:5173'],
            AllowedMethods: ['GET', 'PUT', 'HEAD'],
            AllowedHeaders: ['Content-Type', 'Origin'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });
    expect(result).toEqual({ origins: ['https://app.example.com', 'http://localhost:5173'] });
  });

  it('configureCors turns an R2 AccessDenied into an actionable token-scope error', async () => {
    const service = configuredService();
    mockSend().mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'AccessDenied' }));

    await expect(service.configureCors(['https://app.example.com'])).rejects.toThrow(/needs bucket-level permission/);
  });
});
