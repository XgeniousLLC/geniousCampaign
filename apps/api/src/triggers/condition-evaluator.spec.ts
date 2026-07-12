import { evaluateCondition } from './condition-evaluator';

describe('evaluateCondition', () => {
  it('equals', () => {
    expect(evaluateCondition({ field: 'tagName', op: 'equals', value: 'vip' }, { tagName: 'vip' })).toBe(true);
    expect(evaluateCondition({ field: 'tagName', op: 'equals', value: 'vip' }, { tagName: 'other' })).toBe(false);
  });

  it('contains (string and array)', () => {
    expect(evaluateCondition({ field: 'email', op: 'contains', value: '@acme.com' }, { email: 'a@acme.com' })).toBe(true);
    expect(evaluateCondition({ field: 'tags', op: 'contains', value: 'vip' }, { tags: ['vip', 'lead'] })).toBe(true);
    expect(evaluateCondition({ field: 'tags', op: 'contains', value: 'nope' }, { tags: ['vip'] })).toBe(false);
  });

  it('gt / lt', () => {
    expect(evaluateCondition({ field: 'score', op: 'gt', value: 10 }, { score: 20 })).toBe(true);
    expect(evaluateCondition({ field: 'score', op: 'gt', value: 10 }, { score: 5 })).toBe(false);
    expect(evaluateCondition({ field: 'score', op: 'lt', value: 10 }, { score: 5 })).toBe(true);
    expect(evaluateCondition({ field: 'score', op: 'lt', value: 10 }, { score: 20 })).toBe(false);
  });

  it('in', () => {
    expect(evaluateCondition({ field: 'status', op: 'in', value: ['active', 'trial'] }, { status: 'active' })).toBe(true);
    expect(evaluateCondition({ field: 'status', op: 'in', value: ['active', 'trial'] }, { status: 'churned' })).toBe(false);
  });

  it('exists', () => {
    expect(evaluateCondition({ field: 'company', op: 'exists' }, { company: 'Acme' })).toBe(true);
    expect(evaluateCondition({ field: 'company', op: 'exists' }, {})).toBe(false);
    expect(evaluateCondition({ field: 'company', op: 'exists' }, { company: null })).toBe(false);
  });

  it('and group requires every condition', () => {
    const node = {
      op: 'and' as const,
      conditions: [
        { field: 'tagName', op: 'equals' as const, value: 'vip' },
        { field: 'score', op: 'gt' as const, value: 10 },
      ],
    };
    expect(evaluateCondition(node, { tagName: 'vip', score: 20 })).toBe(true);
    expect(evaluateCondition(node, { tagName: 'vip', score: 5 })).toBe(false);
  });

  it('or group requires at least one condition', () => {
    const node = {
      op: 'or' as const,
      conditions: [
        { field: 'tagName', op: 'equals' as const, value: 'vip' },
        { field: 'tagName', op: 'equals' as const, value: 'lead' },
      ],
    };
    expect(evaluateCondition(node, { tagName: 'lead' })).toBe(true);
    expect(evaluateCondition(node, { tagName: 'other' })).toBe(false);
  });

  it('nested groups', () => {
    const node = {
      op: 'or' as const,
      conditions: [
        {
          op: 'and' as const,
          conditions: [
            { field: 'tagName', op: 'equals' as const, value: 'vip' },
            { field: 'score', op: 'gt' as const, value: 50 },
          ],
        },
        { field: 'tagName', op: 'equals' as const, value: 'urgent' },
      ],
    };
    expect(evaluateCondition(node, { tagName: 'vip', score: 60 })).toBe(true);
    expect(evaluateCondition(node, { tagName: 'urgent', score: 0 })).toBe(true);
    expect(evaluateCondition(node, { tagName: 'vip', score: 10 })).toBe(false);
  });
});
