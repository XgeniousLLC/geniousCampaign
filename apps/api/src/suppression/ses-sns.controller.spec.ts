import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { SesSnsController } from './ses-sns.controller';
import type { SuppressionService } from './suppression.service';
import type { DrizzleService } from '../db/drizzle.service';
import type { WebhookDeliveriesService } from '../webhooks/webhook-deliveries.service';
import type { EventEmitter2 } from '@nestjs/event-emitter';

// Regression coverage for the bug this fixes: SES's configuration-set SNS
// event destination (what SES_SNS_SETUP.md has the app use) discriminates
// notifications on top-level `eventType` ("Send", "Bounce", "Delivery", ...),
// not `notificationType` — the field the controller used to check exclusively.
// Since `notificationType` is never present on that payload shape, every
// Bounce/Complaint/Delivery notification silently no-opped: `sends.status`
// never advanced past 'sent', so the email log, sequence stats, and campaign
// stats all stayed permanently incomplete despite webhook_deliveries showing
// the notification as received.
const FAKE_SEND = {
  id: 'send-1',
  contactId: 'contact-1',
  providerMessageId: 'msg-123',
};

function makeMocks() {
  const findFirst = jest.fn().mockResolvedValue(FAKE_SEND);
  const updateWhere = jest.fn().mockResolvedValue(undefined);
  const updateSet = jest.fn(() => ({ where: updateWhere }));
  const update = jest.fn(() => ({ set: updateSet }));
  const insertValues = jest.fn().mockResolvedValue(undefined);
  const insert = jest.fn(() => ({ values: insertValues }));

  const drizzle = {
    db: {
      query: { sends: { findFirst } },
      update,
      insert,
    },
  } as unknown as DrizzleService;

  const suppression = {
    suppress: jest.fn().mockResolvedValue(undefined),
    recordSoftBounce: jest.fn().mockResolvedValue(undefined),
  } as unknown as SuppressionService;

  const webhookDeliveries = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as WebhookDeliveriesService;

  const events = { emit: jest.fn() } as unknown as EventEmitter2;

  return { drizzle, suppression, webhookDeliveries, events, findFirst, updateSet, insertValues };
}

function makeRequest(notification: Record<string, unknown>): RawBodyRequest<Request> {
  const envelope = {
    Type: 'Notification',
    Message: JSON.stringify(notification),
  };
  return {
    rawBody: Buffer.from(JSON.stringify(envelope)),
    get: () => 'text/plain; charset=UTF-8',
  } as unknown as RawBodyRequest<Request>;
}

describe('SesSnsController.handle — configuration-set eventType payloads', () => {
  it('records a Delivery event (configuration-set shape, no notificationType field)', async () => {
    const { drizzle, suppression, webhookDeliveries, events, updateSet, insertValues } = makeMocks();
    const controller = new SesSnsController(suppression, drizzle, webhookDeliveries, events);

    await controller.handle(
      makeRequest({
        eventType: 'Delivery',
        mail: { messageId: 'msg-123' },
        delivery: { recipients: ['a@example.com'], timestamp: 't', processingTimeMillis: 1 },
      }),
    );

    expect(updateSet).toHaveBeenCalledWith({ status: 'delivered' });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sendId: 'send-1', type: 'delivery' }),
    );
    expect(events.emit).toHaveBeenCalledWith('email.delivered', {
      sendId: 'send-1',
      contactId: 'contact-1',
    });
  });

  it('records a Bounce event and suppresses the recipient (configuration-set shape)', async () => {
    const { drizzle, suppression, webhookDeliveries, events, updateSet } = makeMocks();
    const controller = new SesSnsController(suppression, drizzle, webhookDeliveries, events);

    await controller.handle(
      makeRequest({
        eventType: 'Bounce',
        mail: { messageId: 'msg-123' },
        bounce: {
          bounceType: 'Permanent',
          bouncedRecipients: [{ emailAddress: 'a@example.com' }],
        },
      }),
    );

    expect(suppression.suppress).toHaveBeenCalledWith('a@example.com', 'hard_bounce', 'ses_sns');
    expect(updateSet).toHaveBeenCalledWith({ status: 'bounced' });
    expect(events.emit).toHaveBeenCalledWith(
      'email.bounced',
      expect.objectContaining({ sendId: 'send-1' }),
    );
  });

  it('still supports the classic notificationType shape (direct topic, no configuration set)', async () => {
    const { drizzle, suppression, webhookDeliveries, events, updateSet } = makeMocks();
    const controller = new SesSnsController(suppression, drizzle, webhookDeliveries, events);

    await controller.handle(
      makeRequest({
        notificationType: 'Complaint',
        mail: { messageId: 'msg-123' },
        complaint: { complainedRecipients: [{ emailAddress: 'a@example.com' }] },
      }),
    );

    expect(suppression.suppress).toHaveBeenCalledWith('a@example.com', 'complaint', 'ses_sns');
    expect(updateSet).toHaveBeenCalledWith({ status: 'complained' });
  });

  it('records an Open event without touching sends.status', async () => {
    const { drizzle, suppression, webhookDeliveries, events, updateSet, insertValues } = makeMocks();
    const controller = new SesSnsController(suppression, drizzle, webhookDeliveries, events);

    await controller.handle(
      makeRequest({
        eventType: 'Open',
        mail: { messageId: 'msg-123' },
        open: { timestamp: 't' },
      }),
    );

    expect(updateSet).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sendId: 'send-1', type: 'open' }),
    );
    expect(events.emit).toHaveBeenCalledWith('email.opened', {
      sendId: 'send-1',
      contactId: 'contact-1',
    });
  });

  it('records a Click event with its url, without touching sends.status', async () => {
    const { drizzle, suppression, webhookDeliveries, events, updateSet, insertValues } = makeMocks();
    const controller = new SesSnsController(suppression, drizzle, webhookDeliveries, events);

    await controller.handle(
      makeRequest({
        eventType: 'Click',
        mail: { messageId: 'msg-123' },
        click: { link: 'https://example.com/x', timestamp: 't' },
      }),
    );

    expect(updateSet).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sendId: 'send-1', type: 'click', url: 'https://example.com/x' }),
    );
    expect(events.emit).toHaveBeenCalledWith('email.clicked', {
      sendId: 'send-1',
      contactId: 'contact-1',
      url: 'https://example.com/x',
    });
  });

  it('ignores a Send event with no side effects', async () => {
    const { drizzle, suppression, webhookDeliveries, events, updateSet, insertValues } = makeMocks();
    const controller = new SesSnsController(suppression, drizzle, webhookDeliveries, events);

    await controller.handle(
      makeRequest({ eventType: 'Send', mail: { messageId: 'msg-123' } }),
    );

    expect(updateSet).not.toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
