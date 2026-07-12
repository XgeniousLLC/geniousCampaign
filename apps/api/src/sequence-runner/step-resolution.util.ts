export interface RunnerStep {
  id: string;
  order: number;
  type: 'send_email' | 'wait' | 'condition' | 'exit';
  delayValue: number | null;
  delayUnit: 'minutes' | 'hours' | 'days' | null;
}

export function delayToMs(value: number, unit: 'minutes' | 'hours' | 'days'): number {
  const perUnit = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const;
  return value * perUnit[unit];
}

export type NextStepResolution = { done: true } | { done: false; stepId: string; runAt: Date };

/**
 * Steps are ordered but "wait" steps are pure delay markers, not executable
 * steps in their own right — a currentStepId always points at an executable
 * step (send_email/condition/exit). This walks forward from `fromOrder`,
 * summing any consecutive wait delays, and lands on the next executable step
 * (or reports the sequence is done if none remain).
 */
export function resolveNextExecutableStep(steps: RunnerStep[], fromOrder: number, now: Date): NextStepResolution {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  let totalDelayMs = 0;

  for (const step of sorted) {
    if (step.order <= fromOrder) continue;
    if (step.type === 'wait') {
      totalDelayMs += delayToMs(step.delayValue ?? 0, step.delayUnit ?? 'minutes');
      continue;
    }
    return { done: false, stepId: step.id, runAt: new Date(now.getTime() + totalDelayMs) };
  }

  return { done: true };
}

/** Same walk, but starting from "before any step" — used on enroll so a
 * sequence that (unusually) starts with a wait step still resolves to the
 * first real executable step. */
export function resolveFirstExecutableStep(steps: RunnerStep[], now: Date): NextStepResolution {
  return resolveNextExecutableStep(steps, -1, now);
}
