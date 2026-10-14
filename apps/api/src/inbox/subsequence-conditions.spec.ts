import {
  evaluateConditionTree,
  describeConditionTree,
  type ConditionContext,
  type ConditionTree,
} from '@genius-campaign/shared';

const base: ConditionContext = {
  openCount: 0,
  clickCount: 0,
  clickedUrls: [],
  replied: false,
  outcome: 'uncategorized',
  replyText: '',
  lastStepNumber: 0,
};

function tree(t: Omit<ConditionTree, 'kind'>): ConditionTree {
  return { kind: 'group', ...t };
}

describe('evaluateConditionTree', () => {
  it('returns false for an empty tree', () => {
    expect(evaluateConditionTree(tree({ combinator: 'and', children: [] }), base)).toBe(false);
  });

  it('AND requires every condition', () => {
    const t = tree({
      combinator: 'and',
      children: [
        { kind: 'condition', field: 'replied', operator: 'is', value: true },
        { kind: 'condition', field: 'prospect_outcome', operator: 'is', value: ['interested'] },
      ],
    });
    expect(evaluateConditionTree(t, { ...base, replied: false, outcome: 'interested' })).toBe(false);
    expect(evaluateConditionTree(t, { ...base, replied: true, outcome: 'interested' })).toBe(true);
  });

  it('OR needs only one condition', () => {
    const t = tree({
      combinator: 'or',
      children: [
        { kind: 'condition', field: 'prospect_outcome', operator: 'is', value: ['interested', 'meeting_booked'] },
        { kind: 'condition', field: 'reply_body_contains', operator: 'contains', value: 'pricing' },
      ],
    });
    expect(evaluateConditionTree(t, { ...base, outcome: 'meeting_booked' })).toBe(true);
    expect(evaluateConditionTree(t, { ...base, replyText: 'send pricing please' })).toBe(true);
    expect(evaluateConditionTree(t, { ...base, outcome: 'closed' })).toBe(false);
  });

  it('supports nested groups', () => {
    const t = tree({
      combinator: 'or',
      children: [
        { kind: 'condition', field: 'link_clicked', operator: 'is', value: true },
        {
          kind: 'group',
          combinator: 'and',
          children: [
            { kind: 'condition', field: 'email_open_count', operator: 'gte', value: 3 },
            { kind: 'condition', field: 'replied', operator: 'is_not', value: true },
          ],
        },
      ],
    });
    expect(evaluateConditionTree(t, { ...base, clickCount: 1 })).toBe(true);
    expect(evaluateConditionTree(t, { ...base, openCount: 3, replied: false })).toBe(true);
    expect(evaluateConditionTree(t, { ...base, openCount: 3, replied: true })).toBe(false);
    expect(evaluateConditionTree(t, { ...base, openCount: 2 })).toBe(false);
  });

  it('compares numbers and last step', () => {
    expect(
      evaluateConditionTree(
        tree({ combinator: 'and', children: [{ kind: 'condition', field: 'last_step_completed', operator: 'gte', value: 2 }] }),
        { ...base, lastStepNumber: 2 },
      ),
    ).toBe(true);
    expect(
      evaluateConditionTree(
        tree({ combinator: 'and', children: [{ kind: 'condition', field: 'last_step_completed', operator: 'lt', value: 2 }] }),
        { ...base, lastStepNumber: 2 },
      ),
    ).toBe(false);
  });

  it('describes a tree for the UI', () => {
    const t = tree({
      combinator: 'and',
      children: [
        { kind: 'condition', field: 'replied', operator: 'is', value: true },
        { kind: 'condition', field: 'prospect_outcome', operator: 'is', value: ['interested', 'meeting_booked'] },
      ],
    });
    expect(describeConditionTree(t)).toBe('Replied is yes and Prospect outcome is Interested, Meeting booked');
  });
});
