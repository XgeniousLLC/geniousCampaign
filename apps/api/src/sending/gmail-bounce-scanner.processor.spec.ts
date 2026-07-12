import { extractBouncedRecipient } from './gmail-bounce-scanner.processor';

describe('extractBouncedRecipient', () => {
  it('parses the Final-Recipient DSN field', () => {
    const body = [
      'Reporting-MTA: dns; mail.example.com',
      'Final-Recipient: rfc822; bounced-user@example.com',
      'Action: failed',
      'Status: 5.1.1',
    ].join('\r\n');

    expect(extractBouncedRecipient(body)).toBe('bounced-user@example.com');
  });

  it('is case-insensitive and lowercases the result', () => {
    const body = 'Final-Recipient: RFC822; Bounced-User@Example.COM';
    expect(extractBouncedRecipient(body)).toBe('bounced-user@example.com');
  });

  it('returns null when no DSN field is present', () => {
    expect(extractBouncedRecipient('just a normal email body, not a bounce')).toBeNull();
  });
});
