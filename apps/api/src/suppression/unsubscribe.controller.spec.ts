import { UnsubscribeController } from './unsubscribe.controller';
import { signUnsubscribeToken } from '../sending/unsubscribe-token.util';

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
  };
}

describe('UnsubscribeController', () => {
  const secret = 'test-tracking-secret';
  let suppression: { suppress: jest.Mock };
  let controller: UnsubscribeController;

  beforeEach(() => {
    suppression = { suppress: jest.fn().mockResolvedValue({}) };
    controller = new UnsubscribeController(
      suppression as never,
      {
        get: jest.fn((key: string) =>
          key === 'TRACKING_SIGNING_SECRET' ? secret : undefined,
        ),
      } as never,
    );
  });

  it('renders the 3-step confirmation page on GET without unsubscribing anyone', () => {
    const token = signUnsubscribeToken(secret, 'person@example.com');
    const res = mockResponse();

    controller.unsubscribePage(token, res as never);

    expect(suppression.suppress).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const html = (
      res.send.mock.calls as unknown as Array<[string, ...unknown[]]>
    )[0][0];
    expect(html).toContain('STEP 1 OF 3');
    expect(html).toContain('STEP 3 OF 3');
    expect(html).toContain('/confirm');
  });

  it('rejects an invalid token on GET without unsubscribing', () => {
    const res = mockResponse();

    controller.unsubscribePage('not-a-real-token', res as never);

    expect(suppression.suppress).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('unsubscribes after the confirmation step', async () => {
    const token = signUnsubscribeToken(secret, 'person@example.com');
    const res = mockResponse();

    await controller.unsubscribeConfirm(token, res as never);

    expect(suppression.suppress).toHaveBeenCalledWith(
      'person@example.com',
      'manual_unsubscribe',
      'unsubscribe_link',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('rejects an invalid token on the confirmation step', async () => {
    const res = mockResponse();

    await controller.unsubscribeConfirm('bad-token', res as never);

    expect(suppression.suppress).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
    );
  });

  it('keeps RFC 8058 one-click POST immediate', async () => {
    const token = signUnsubscribeToken(secret, 'person@example.com');
    const res = mockResponse();

    await controller.unsubscribePost(token, res as never);

    expect(suppression.suppress).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
