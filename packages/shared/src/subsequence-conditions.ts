/**
 * Subsequence entry conditions — shared by the API (evaluation) and web (builder UI).
 *
 * A condition tree is a recursive group: every group has a combinator (and/or) and a
 * list of children, each child being either a leaf Condition or a nested Group. This
 * gives the builder AND/OR across rows and across groups.
 */

export type Combinator = 'and' | 'or';

export type ConditionField =
  | 'email_open_count'
  | 'link_clicked'
  | 'replied'
  | 'prospect_outcome'
  | 'reply_body_contains'
  | 'last_step_completed';

export type ConditionOperator =
  | 'is'
  | 'is_not'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains';

export interface Condition {
  kind: 'condition';
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
}

export interface ConditionGroup {
  kind: 'group';
  combinator: Combinator;
  children: Array<Condition | ConditionGroup>;
}

export type ConditionTree = ConditionGroup;

export const THREAD_OUTCOMES = [
  'uncategorized',
  'interested',
  'not_interested',
  'meeting_booked',
  'out_of_office',
  'closed',
] as const;
export type ThreadOutcome = (typeof THREAD_OUTCOMES)[number];

export const OUTCOME_LABELS: Record<ThreadOutcome, string> = {
  uncategorized: 'Uncategorized',
  interested: 'Interested',
  not_interested: 'Not interested',
  meeting_booked: 'Meeting booked',
  out_of_office: 'Out of office',
  closed: 'Closed',
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  is: 'is',
  is_not: 'is not',
  gt: 'greater than',
  gte: 'at least',
  lt: 'less than',
  lte: 'at most',
  contains: 'contains',
  not_contains: "doesn't contain",
};

export interface FieldMeta {
  value: ConditionField;
  label: string;
  operators: ConditionOperator[];
  valueKind: 'number' | 'boolean' | 'text' | 'outcome' | 'step';
}

export const CONDITION_FIELDS: FieldMeta[] = [
  {
    value: 'replied',
    label: 'Replied',
    operators: ['is', 'is_not'],
    valueKind: 'boolean',
  },
  {
    value: 'prospect_outcome',
    label: 'Prospect outcome',
    operators: ['is', 'is_not'],
    valueKind: 'outcome',
  },
  {
    value: 'reply_body_contains',
    label: 'Reply body contains',
    operators: ['contains', 'not_contains'],
    valueKind: 'text',
  },
  {
    value: 'email_open_count',
    label: 'Email open count',
    operators: ['is', 'is_not', 'gte', 'lte', 'gt', 'lt'],
    valueKind: 'number',
  },
  {
    value: 'link_clicked',
    label: 'Link clicked',
    operators: ['is', 'is_not'],
    valueKind: 'boolean',
  },
  {
    value: 'last_step_completed',
    label: 'Last step completed',
    operators: ['is', 'is_not', 'gte', 'lte', 'gt', 'lt'],
    valueKind: 'step',
  },
];

export function fieldMeta(field: ConditionField): FieldMeta | undefined {
  return CONDITION_FIELDS.find((f) => f.value === field);
}

/** Data the evaluator sees when a rule fires (built by the inbox service). */
export interface ConditionContext {
  openCount: number;
  clickCount: number;
  clickedUrls: string[];
  replied: boolean;
  outcome: ThreadOutcome;
  replyText: string;
  lastStepNumber: number;
}

function numCompare(n: number, operator: ConditionOperator, v: number): boolean {
  switch (operator) {
    case 'is':
      return n === v;
    case 'is_not':
      return n !== v;
    case 'gt':
      return n > v;
    case 'gte':
      return n >= v;
    case 'lt':
      return n < v;
    case 'lte':
      return n <= v;
    default:
      return false;
  }
}

function asBool(value: Condition['value']): boolean {
  return value === true || value === 'true';
}

function evaluateCondition(c: Condition, ctx: ConditionContext): boolean {
  switch (c.field) {
    case 'email_open_count':
      return numCompare(ctx.openCount, c.operator, Number(c.value));
    case 'last_step_completed':
      return numCompare(ctx.lastStepNumber, c.operator, Number(c.value));
    case 'link_clicked': {
      const clicked = ctx.clickCount > 0;
      const want = asBool(c.value);
      return c.operator === 'is_not' ? clicked !== want : clicked === want;
    }
    case 'replied': {
      const want = asBool(c.value);
      return c.operator === 'is_not' ? ctx.replied !== want : ctx.replied === want;
    }
    case 'prospect_outcome': {
      const list = Array.isArray(c.value) ? c.value : [c.value];
      const has = list.includes(ctx.outcome);
      return c.operator === 'is_not' ? !has : has;
    }
    case 'reply_body_contains': {
      const needle = String(c.value ?? '').trim().toLowerCase();
      if (!needle) return false;
      const has = ctx.replyText.toLowerCase().includes(needle);
      return c.operator === 'not_contains' ? !has : has;
    }
    default:
      return false;
  }
}

export function isConditionGroup(node: Condition | ConditionGroup): node is ConditionGroup {
  return (node as ConditionGroup).kind === 'group';
}

/** Empty trees never match — a subsequence must have at least one condition. */
export function evaluateConditionTree(
  tree: ConditionTree | null | undefined,
  ctx: ConditionContext,
): boolean {
  if (!tree || !Array.isArray(tree.children) || tree.children.length === 0) return false;
  const results = tree.children.map((child) =>
    isConditionGroup(child) ? evaluateConditionTree(child, ctx) : evaluateCondition(child, ctx),
  );
  return tree.combinator === 'or' ? results.some(Boolean) : results.every(Boolean);
}

function describeCondition(c: Condition): string {
  const meta = fieldMeta(c.field);
  const label = meta?.label ?? c.field;
  const op = OPERATOR_LABELS[c.operator] ?? c.operator;
  let value: string;
  if (c.field === 'prospect_outcome') {
    const list = Array.isArray(c.value) ? c.value : [c.value];
    value = list.map((v) => OUTCOME_LABELS[v as ThreadOutcome] ?? String(v)).join(', ');
  } else if (meta?.valueKind === 'boolean') {
    value = asBool(c.value) ? 'yes' : 'no';
  } else if (c.field === 'last_step_completed') {
    value = `Step ${c.value}`;
  } else {
    value = String(c.value ?? '');
  }
  return `${label} ${op} ${value}`.trim();
}

function describeGroup(group: ConditionGroup): string {
  if (!Array.isArray(group.children) || group.children.length === 0) return '';
  const word = group.combinator === 'or' ? ' or ' : ' and ';
  return group.children
    .map((child) => (isConditionGroup(child) ? describeGroup(child) : describeCondition(child)))
    .filter(Boolean)
    .join(word);
}

/** Human-readable one-liner, e.g. `Replied is yes and Prospect outcome is Interested`. */
export function describeConditionTree(tree: ConditionTree | null | undefined): string {
  if (!tree) return '';
  const inner = describeGroup(tree);
  return tree.children?.length > 1 && groupHasNested(tree) ? `(${inner})` : inner;
}

function groupHasNested(group: ConditionGroup): boolean {
  return group.children.some((c) => isConditionGroup(c) && c.children.length > 0);
}

/** Lenient runtime guard used when persisting/reading JSON. */
export function isConditionTree(value: unknown): value is ConditionTree {
  if (!value || typeof value !== 'object') return false;
  const t = value as ConditionTree;
  return t.kind === 'group' && (t.combinator === 'and' || t.combinator === 'or') && Array.isArray(t.children);
}
