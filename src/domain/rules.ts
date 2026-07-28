import { THOUGHT_TYPE_LABEL } from './defaults'
import { getDimensionValue, isAnswered } from './matrix'
import type {
  Dimension,
  Rule,
  RuleAction,
  RuleCondition,
  RuleSuggestion,
  Thought,
} from './types'
import { t, tx } from '../i18n/core'

function fieldValue(
  thought: Thought,
  condition: RuleCondition,
  dimensions: Dimension[],
): unknown {
  switch (condition.field) {
    case 'type':
      return thought.type
    case 'status':
      return thought.status
    case 'tag':
      return thought.tags
    case 'text':
      return thought.text
    case 'dimension': {
      const dimension = dimensions.find((entry) => entry.id === condition.dimensionId)
      if (!dimension) return undefined
      return getDimensionValue(thought, dimension)
    }
    default:
      return undefined
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function evaluateCondition(
  thought: Thought,
  condition: RuleCondition,
  dimensions: Dimension[],
): boolean {
  const actual = fieldValue(thought, condition, dimensions)
  const expected = condition.value

  switch (condition.operator) {
    case 'isEmpty':
      if (Array.isArray(actual)) return actual.length === 0
      return !isAnswered((actual ?? null) as never)
    case 'isNotEmpty':
      if (Array.isArray(actual)) return actual.length > 0
      return isAnswered((actual ?? null) as never)
    case 'equals':
      if (Array.isArray(actual)) return actual.includes(String(expected))
      return actual === expected
    case 'notEquals':
      if (Array.isArray(actual)) return !actual.includes(String(expected))
      return actual !== expected
    case 'contains': {
      if (Array.isArray(actual)) {
        return actual.some((entry) =>
          String(entry).toLowerCase().includes(String(expected ?? '').toLowerCase()),
        )
      }
      if (typeof actual !== 'string') return false
      return actual.toLowerCase().includes(String(expected ?? '').toLowerCase())
    }
    case 'greaterThan':
    case 'greaterThanOrEqual':
    case 'lessThan':
    case 'lessThanOrEqual': {
      const left = toNumber(actual)
      const right = toNumber(expected)
      if (left === null || right === null) return false
      if (condition.operator === 'greaterThan') return left > right
      if (condition.operator === 'greaterThanOrEqual') return left >= right
      if (condition.operator === 'lessThan') return left < right
      return left <= right
    }
    default:
      return false
  }
}

export function ruleMatches(thought: Thought, rule: Rule, dimensions: Dimension[]): boolean {
  if (!rule.enabled) return false
  if (rule.conditions.length === 0) return false
  const results = rule.conditions.map((condition) =>
    evaluateCondition(thought, condition, dimensions),
  )
  return rule.match === 'all' ? results.every(Boolean) : results.some(Boolean)
}

export function suggestionMessage(action: RuleAction): string {
  switch (action.type) {
    case 'addTag':
      return tx('Add the tag “{value}”.', '添加标签“{value}”。', { value: action.value })
    case 'removeTag':
      return tx('Remove the tag “{value}”.', '移除标签“{value}”。', { value: action.value })
    case 'suggestType':
      return tx(
        'This may be a {type}. You can keep the current type.',
        '这可能属于“{type}”。你也可以保留当前类型。',
        { type: t(THOUGHT_TYPE_LABEL[action.value]) },
      )
    case 'flag':
      return action.value
    case 'suggestBreakdown':
      return t('This thought may need to be broken down.')
    case 'suggestArchive':
      return t('You could archive this thought if it no longer needs attention.')
    default:
      return t('Suggestion')
  }
}

/** A suggestion is worth showing only when it would actually change something. */
function isRelevant(thought: Thought, action: RuleAction): boolean {
  switch (action.type) {
    case 'addTag':
      return !thought.tags.includes(action.value)
    case 'removeTag':
      return thought.tags.includes(action.value)
    case 'suggestType':
      return thought.type !== action.value
    case 'suggestArchive':
      return thought.status !== 'archived'
    default:
      return true
  }
}

/** Actions that change data when accepted. `flag` is informational only. */
export function isApplicable(action: RuleAction): boolean {
  return action.type !== 'flag' && action.type !== 'suggestBreakdown'
}

export function suggestionId(ruleId: string, thoughtId: string, actionIndex: number): string {
  return `${ruleId}:${thoughtId}:${actionIndex}`
}

/**
 * Rules never write to thoughts. They only produce suggestions the user may
 * apply, ignore, or dismiss.
 */
export function evaluateRules(
  thoughts: Thought[],
  rules: Rule[],
  dimensions: Dimension[],
  dismissedIds: string[] = [],
): RuleSuggestion[] {
  const dismissed = new Set(dismissedIds)
  const suggestions: RuleSuggestion[] = []

  for (const rule of rules) {
    for (const thought of thoughts) {
      if (!ruleMatches(thought, rule, dimensions)) continue
      rule.actions.forEach((action, index) => {
        if (!isRelevant(thought, action)) return
        const id = suggestionId(rule.id, thought.id, index)
        if (dismissed.has(id)) return
        suggestions.push({
          id,
          ruleId: rule.id,
          ruleName: rule.name,
          thoughtId: thought.id,
          action,
          message: suggestionMessage(action),
          applicable: isApplicable(action),
        })
      })
    }
  }

  return suggestions
}

/** Result of accepting a suggestion. Returns a new thought; never mutates. */
export function applySuggestion(thought: Thought, action: RuleAction): Thought {
  switch (action.type) {
    case 'addTag':
      if (thought.tags.includes(action.value)) return thought
      return { ...thought, tags: [...thought.tags, action.value] }
    case 'removeTag':
      return { ...thought, tags: thought.tags.filter((tag) => tag !== action.value) }
    case 'suggestType':
      return { ...thought, type: action.value }
    case 'suggestArchive':
      return { ...thought, status: 'archived' }
    default:
      return thought
  }
}
