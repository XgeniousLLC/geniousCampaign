import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TriggersService } from './triggers.service';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { evaluateCondition, type ConditionNode } from './condition-evaluator';

/**
 * Listens on the internal event bus (GC-037) for every event type a trigger
 * can be configured against, evaluates each active trigger's condition tree,
 * and enrolls the contact into the trigger's sequence on a match — via
 * EnrollmentService, never a parallel state-transition path (invariant 2).
 */
@Injectable()
export class TriggerEvaluationService {
  private readonly logger = new Logger(TriggerEvaluationService.name);

  constructor(
    private readonly triggersService: TriggersService,
    private readonly enrollments: EnrollmentService,
  ) {}

  @OnEvent('contact.created')
  handleContactCreated(payload: { contactId: string; email: string }) {
    return this.evaluate('contact.created', payload.contactId, payload);
  }

  @OnEvent('contact.tag_added')
  handleTagAdded(payload: { contactId: string; tagId: string; tagName: string }) {
    return this.evaluate('contact.tag_added', payload.contactId, payload);
  }

  @OnEvent('contact.field_changed')
  handleFieldChanged(payload: { contactId: string; field: string; value: unknown }) {
    return this.evaluate('contact.field_changed', payload.contactId, payload);
  }

  @OnEvent('contact.list_joined')
  handleListJoined(payload: { contactId: string; listId: string; listName: string }) {
    return this.evaluate('contact.list_joined', payload.contactId, payload);
  }

  @OnEvent('email.opened')
  handleEmailOpened(payload: { contactId: string; sendId: string }) {
    return this.evaluate('email.opened', payload.contactId, payload);
  }

  @OnEvent('email.clicked')
  handleEmailClicked(payload: { contactId: string; sendId: string; url: string }) {
    return this.evaluate('email.clicked', payload.contactId, payload);
  }

  private async evaluate(eventType: string, contactId: string, context: Record<string, unknown>) {
    const activeTriggers = await this.triggersService.findActiveForEvent(eventType);
    for (const trigger of activeTriggers) {
      const matches = evaluateCondition(trigger.conditions as ConditionNode, context);
      if (!matches) continue;

      try {
        await this.enrollments.enroll(trigger.sequenceId, contactId);
        this.logger.log(`Trigger "${trigger.name}" enrolled contact ${contactId} into sequence ${trigger.sequenceId}`);
      } catch (err) {
        // Already enrolled (409) is expected/benign; anything else is logged.
        if (!(err instanceof Error) || !err.message.includes('already has an')) {
          this.logger.error(`Trigger "${trigger.name}" failed to enroll ${contactId}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  }
}
