import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, contactTags, tags, triggers, sequenceEnrollments, triggerEvaluations } from '../db/schema';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { evaluateCondition, type ConditionNode } from './condition-evaluator';
import { buildContactContext } from './contact-context.util';

@Processor('schedule-triggers')
export class ScheduleTriggerProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduleTriggerProcessor.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly enrollments: EnrollmentService,
  ) {
    super();
  }

  async process(job: Job<{ triggerId: string }>): Promise<{ matched: number; enrolled: number }> {
    const trigger = await this.drizzle.db.query.triggers.findFirst({
      where: eq(triggers.id, job.data.triggerId),
    });
    // Re-check active status at fire time, same re-check-before-acting
    // pattern as the sequence runner (invariant 3) — a trigger paused after
    // the job was scheduled should not fire.
    if (!trigger || !trigger.isActive || trigger.eventType !== 'schedule') {
      return { matched: 0, enrolled: 0 };
    }

    const allContacts = await this.drizzle.db.select().from(contacts);
    const tagRows = await this.drizzle.db
      .select({ contactId: contactTags.contactId, tagName: tags.name })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id));

    const tagsByContact = new Map<string, string[]>();
    for (const row of tagRows) {
      const list = tagsByContact.get(row.contactId) ?? [];
      list.push(row.tagName);
      tagsByContact.set(row.contactId, list);
    }

    // A recurring cron fire re-evaluates the same unchanging condition every
    // tick — without this, a contact who matches and completes the sequence
    // would be re-enrolled again on the very next tick, forever. Unlike
    // event-driven triggers (one enroll attempt per real-world occurrence),
    // a schedule trigger enrolls each matching contact at most once, ever,
    // per trigger's target sequence — enroll() itself still only guards
    // against a currently active/paused enrollment (invariant 1), so that
    // dedup has to happen here.
    const alreadyHandled = await this.drizzle.db
      .select({ contactId: sequenceEnrollments.contactId })
      .from(sequenceEnrollments)
      .where(eq(sequenceEnrollments.sequenceId, trigger.sequenceId));
    const handledContactIds = new Set(alreadyHandled.map((r) => r.contactId));

    let matched = 0;
    let enrolled = 0;
    for (const contact of allContacts) {
      if (handledContactIds.has(contact.id)) continue;
      const context = buildContactContext(contact, tagsByContact.get(contact.id) ?? []);
      if (!evaluateCondition(trigger.conditions as ConditionNode, context)) continue;
      matched++;
      try {
        await this.enrollments.enroll(trigger.sequenceId, contact.id);
        enrolled++;
        await this.drizzle.db.insert(triggerEvaluations).values({ triggerId: trigger.id, contactId: contact.id, eventType: 'schedule', enrolled: true });
      } catch (err) {
        const alreadyEnrolled = err instanceof Error && err.message.includes('already has an');
        if (!alreadyEnrolled) {
          this.logger.error(`Schedule trigger "${trigger.name}" failed to enroll ${contact.id}: ${err instanceof Error ? err.message : err}`);
        }
        await this.drizzle.db.insert(triggerEvaluations).values({
          triggerId: trigger.id,
          contactId: contact.id,
          eventType: 'schedule',
          enrolled: false,
          error: alreadyEnrolled ? undefined : err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.log(`Schedule trigger "${trigger.name}" fired: ${matched} matched, ${enrolled} newly enrolled`);
    return { matched, enrolled };
  }
}
