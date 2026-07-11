import * as dns from 'node:dns/promises';
import { LocalVerifyService } from './local-verify.service';

jest.mock('node:dns/promises');

describe('LocalVerifyService', () => {
  let service: LocalVerifyService;
  const resolveMxMock = dns.resolveMx as jest.Mock;

  beforeEach(() => {
    service = new LocalVerifyService();
    resolveMxMock.mockReset();
  });

  it('rejects a syntactically invalid address without any DNS lookup', async () => {
    const result = await service.check('not-an-email');
    expect(result).toEqual({ valid: false, reason: 'invalid_syntax' });
    expect(resolveMxMock).not.toHaveBeenCalled();
  });

  it('rejects a known disposable-domain address without any DNS lookup', async () => {
    const result = await service.check('someone@mailinator.com');
    expect(result).toEqual({ valid: false, reason: 'disposable_domain' });
    expect(resolveMxMock).not.toHaveBeenCalled();
  });

  it('rejects a domain with no MX record', async () => {
    resolveMxMock.mockResolvedValue([]);
    const result = await service.check('someone@no-mx-example.com');
    expect(result).toEqual({ valid: false, reason: 'no_mx_record' });
    expect(resolveMxMock).toHaveBeenCalledWith('no-mx-example.com');
  });

  it('rejects a domain whose MX lookup fails (NXDOMAIN etc.)', async () => {
    resolveMxMock.mockRejectedValue(new Error('ENOTFOUND'));
    const result = await service.check('someone@does-not-exist.invalid');
    expect(result).toEqual({ valid: false, reason: 'no_mx_record' });
  });

  it('accepts a syntactically valid, non-disposable address with MX records', async () => {
    resolveMxMock.mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }]);
    const result = await service.check('someone@example.com');
    expect(result).toEqual({ valid: true });
  });
});
