export type ConditionOp = 'equals' | 'contains' | 'gt' | 'lt' | 'in' | 'exists';

export interface ConditionLeaf {
  field: string;
  op: ConditionOp;
  value?: unknown;
}

export interface ConditionGroup {
  op: 'and' | 'or';
  conditions: ConditionNode[];
}

export type ConditionNode = ConditionLeaf | ConditionGroup;

function isGroup(node: ConditionNode): node is ConditionGroup {
  return 'conditions' in node;
}

function evaluateLeaf(leaf: ConditionLeaf, context: Record<string, unknown>): boolean {
  const actual = context[leaf.field];

  switch (leaf.op) {
    case 'equals':
      return actual === leaf.value;
    case 'contains':
      if (Array.isArray(actual)) return actual.includes(leaf.value);
      if (typeof actual === 'string' && typeof leaf.value === 'string') return actual.includes(leaf.value);
      return false;
    case 'gt':
      return typeof actual === 'number' && typeof leaf.value === 'number' && actual > leaf.value;
    case 'lt':
      return typeof actual === 'number' && typeof leaf.value === 'number' && actual < leaf.value;
    case 'in':
      return Array.isArray(leaf.value) && leaf.value.includes(actual);
    case 'exists':
      return actual !== undefined && actual !== null;
    default:
      return false;
  }
}

/** JSON-logic-style evaluator: leaf { field, op, value } or a group
 * { op: 'and'|'or', conditions: [...] } nested to any depth. */
export function evaluateCondition(node: ConditionNode, context: Record<string, unknown>): boolean {
  if (isGroup(node)) {
    if (node.op === 'and') return node.conditions.every((c) => evaluateCondition(c, context));
    return node.conditions.some((c) => evaluateCondition(c, context));
  }
  return evaluateLeaf(node, context);
}
