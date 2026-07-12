import { resolveFirstExecutableStep, resolveNextExecutableStep, delayToMs, type RunnerStep } from './step-resolution.util';

const now = new Date('2026-01-01T00:00:00Z');

describe('step-resolution', () => {
  it('delayToMs converts units correctly', () => {
    expect(delayToMs(2, 'minutes')).toBe(120_000);
    expect(delayToMs(1, 'hours')).toBe(3_600_000);
    expect(delayToMs(1, 'days')).toBe(86_400_000);
  });

  it('resolves the immediate next executable step with no wait', () => {
    const steps: RunnerStep[] = [
      { id: 's1', order: 0, type: 'send_email', delayValue: null, delayUnit: null },
      { id: 's2', order: 1, type: 'exit', delayValue: null, delayUnit: null },
    ];
    const result = resolveNextExecutableStep(steps, 0, now);
    expect(result).toEqual({ done: false, stepId: 's2', runAt: now });
  });

  it('sums consecutive wait steps into a single delay', () => {
    const steps: RunnerStep[] = [
      { id: 's1', order: 0, type: 'send_email', delayValue: null, delayUnit: null },
      { id: 'w1', order: 1, type: 'wait', delayValue: 1, delayUnit: 'minutes' },
      { id: 'w2', order: 2, type: 'wait', delayValue: 30, delayUnit: 'minutes' },
      { id: 's2', order: 3, type: 'send_email', delayValue: null, delayUnit: null },
    ];
    const result = resolveNextExecutableStep(steps, 0, now);
    expect(result.done).toBe(false);
    if (!result.done) {
      expect(result.stepId).toBe('s2');
      expect(result.runAt.getTime() - now.getTime()).toBe(31 * 60_000);
    }
  });

  it('reports done when no executable step remains', () => {
    const steps: RunnerStep[] = [{ id: 's1', order: 0, type: 'send_email', delayValue: null, delayUnit: null }];
    const result = resolveNextExecutableStep(steps, 0, now);
    expect(result).toEqual({ done: true });
  });

  it('skips a leading wait step when resolving the first executable step', () => {
    const steps: RunnerStep[] = [
      { id: 'w1', order: 0, type: 'wait', delayValue: 5, delayUnit: 'minutes' },
      { id: 's1', order: 1, type: 'send_email', delayValue: null, delayUnit: null },
    ];
    const result = resolveFirstExecutableStep(steps, now);
    expect(result.done).toBe(false);
    if (!result.done) {
      expect(result.stepId).toBe('s1');
      expect(result.runAt.getTime() - now.getTime()).toBe(5 * 60_000);
    }
  });
});
