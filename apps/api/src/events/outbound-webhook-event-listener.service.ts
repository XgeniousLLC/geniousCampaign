import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OutboundWebhookDispatchService } from '../outbound-webhooks/outbound-webhook-dispatch.service';

/** Bridges the internal event bus (GC-037) to GC-043's outbound webhook
 * dispatcher — external subscribers see the same events the trigger engine
 * evaluates against. One explicit handler per event type, matching
 * TriggerEvaluationService's supported event_type list 1:1 (plus the send
 * lifecycle events triggers don't currently act on). */
@Injectable()
export class OutboundWebhookEventListener {
  constructor(private readonly dispatch: OutboundWebhookDispatchService) {}

  @OnEvent('contact.created')
  onContactCreated(payload: unknown) {
    return this.dispatch.emit('contact.created', payload);
  }

  @OnEvent('contact.tag_added')
  onTagAdded(payload: unknown) {
    return this.dispatch.emit('contact.tag_added', payload);
  }

  @OnEvent('contact.field_changed')
  onFieldChanged(payload: unknown) {
    return this.dispatch.emit('contact.field_changed', payload);
  }

  @OnEvent('contact.list_joined')
  onListJoined(payload: unknown) {
    return this.dispatch.emit('contact.list_joined', payload);
  }

  @OnEvent('email.opened')
  onEmailOpened(payload: unknown) {
    return this.dispatch.emit('email.opened', payload);
  }

  @OnEvent('email.clicked')
  onEmailClicked(payload: unknown) {
    return this.dispatch.emit('email.clicked', payload);
  }

  @OnEvent('email.bounced')
  onEmailBounced(payload: unknown) {
    return this.dispatch.emit('email.bounced', payload);
  }

  @OnEvent('email.complained')
  onEmailComplained(payload: unknown) {
    return this.dispatch.emit('email.complained', payload);
  }

  @OnEvent('email.unsubscribed')
  onEmailUnsubscribed(payload: unknown) {
    return this.dispatch.emit('email.unsubscribed', payload);
  }

  @OnEvent('sequence.completed')
  onSequenceCompleted(payload: unknown) {
    return this.dispatch.emit('sequence.completed', payload);
  }
}
