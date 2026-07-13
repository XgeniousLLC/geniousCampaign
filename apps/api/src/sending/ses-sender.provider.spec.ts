import { SettingsService } from '../settings/settings.service';
import type { DrizzleService } from '../db/drizzle.service';
import type { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SesSenderProvider } from './ses-sender.provider';

jest.mock('nodemailer');

// Neither test passes a senderAccountId, so buildTransporter() never reads
// drizzle/config — a bare stub is enough for the constructor.
const noopDrizzle = {} as unknown as DrizzleService;
const noopConfig = {} as unknown as ConfigService;

describe('SesSenderProvider', () => {
  it('throws instead of faking a send when AWS_REGION is not configured', async () => {
    const config = { get: () => undefined } as unknown as SettingsService;
    const provider = new SesSenderProvider(config, noopDrizzle, noopConfig);

    await expect(
      provider.send({
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Hi',
        html: '<p>hi</p>',
        text: 'hi',
        unsubscribeUrl: 'https://track.example.com/unsubscribe/abc',
      }),
    ).rejects.toThrow(/SES is not configured/);
  });

  it('includes one-click unsubscribe headers and the configuration set on every send', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'ses-msg-123' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const values: Record<string, string> = {
      AWS_REGION: 'us-east-1',
      SES_CONFIGURATION_SET: 'gc-config-set',
    };
    const config = { get: (key: string) => values[key] } as unknown as SettingsService;
    const provider = new SesSenderProvider(config, noopDrizzle, noopConfig);

    const result = await provider.send({
      to: 'test@example.com',
      from: 'sender@example.com',
      subject: 'Hi',
      html: '<p>hi</p>',
      text: 'hi',
      unsubscribeUrl: 'https://track.example.com/unsubscribe/abc',
      messageTags: { campaignId: 'c1' },
    });

    expect(result).toEqual({ provider: 'ses', providerMessageId: 'ses-msg-123' });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0][0];
    expect(call.headers['List-Unsubscribe']).toBe('<https://track.example.com/unsubscribe/abc>');
    expect(call.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(call.ses.ConfigurationSetName).toBe('gc-config-set');
    expect(call.ses.EmailTags).toEqual([{ Name: 'campaignId', Value: 'c1' }]);
  });
});
