import { BUILTIN_DIMENSION } from './defaults'
import { getDimensionValue, isAnswered } from './matrix'
import type { Dimension, Thought, ThoughtStatus, ThoughtType } from './types'

export interface ThoughtFilter {
  search?: string
  types?: ThoughtType[]
  statuses?: ThoughtStatus[]
  tags?: string[]
}

export function filterThoughts(thoughts: Thought[], filter: ThoughtFilter): Thought[] {
  const search = filter.search?.trim().toLowerCase() ?? ''
  return thoughts.filter((thought) => {
    if (search) {
      const haystack = `${thought.text} ${thought.description} ${thought.tags.join(' ')}`
      if (!haystack.toLowerCase().includes(search)) return false
    }
    if (filter.types && filter.types.length > 0 && !filter.types.includes(thought.type)) {
      return false
    }
    if (
      filter.statuses &&
      filter.statuses.length > 0 &&
      !filter.statuses.includes(thought.status)
    ) {
      return false
    }
    if (filter.tags && filter.tags.length > 0) {
      if (!filter.tags.some((tag) => thought.tags.includes(tag))) return false
    }
    return true
  })
}

export function thoughtsMissingDimension(thoughts: Thought[], dimension: Dimension): Thought[] {
  return thoughts.filter((thought) => !isAnswered(getDimensionValue(thought, dimension)))
}

export function allTags(thoughts: Thought[]): string[] {
  const tags = new Set<string>()
  for (const thought of thoughts) for (const tag of thought.tags) tags.add(tag)
  return [...tags].sort((a, b) => a.localeCompare(b))
}

export function scaleValue(thought: Thought, dimensionId: string): number | null {
  const value = thought.dimensionValues[dimensionId]
  return typeof value === 'number' ? value : null
}

export interface ActionFilterFlags {
  lowDifficulty: boolean
  highImpact: boolean
  lowEnergyFriendly: boolean
  under15Minutes: boolean
  delegatable: boolean
  noPrerequisite: boolean
  canStartNow: boolean
}

export const EMPTY_ACTION_FILTERS: ActionFilterFlags = {
  lowDifficulty: false,
  highImpact: false,
  lowEnergyFriendly: false,
  under15Minutes: false,
  delegatable: false,
  noPrerequisite: false,
  canStartNow: false,
}

/** Tag conventions used by the action assessment filters. */
export const ACTION_TAG = {
  requiresPerson: 'Requires another person',
  delegatable: 'Can be delegated',
  requiresLearning: 'Requires learning',
  hasPrerequisites: 'Has prerequisites',
} as const

export function isActionable(thought: Thought): boolean {
  return thought.type === 'action' || thought.type === 'habit'
}

export function matchesActionFilters(thought: Thought, flags: ActionFilterFlags): boolean {
  const difficulty = scaleValue(thought, BUILTIN_DIMENSION.difficulty)
  const impact = scaleValue(thought, BUILTIN_DIMENSION.impact)
  const energy = scaleValue(thought, BUILTIN_DIMENSION.energy)

  if (flags.lowDifficulty && !(difficulty !== null && difficulty <= 2)) return false
  if (flags.highImpact && !(impact !== null && impact >= 4)) return false
  if (flags.lowEnergyFriendly) {
    const easy = difficulty !== null && difficulty <= 2
    const restoring = energy !== null && energy >= 0
    if (!easy && !restoring) return false
  }
  if (flags.under15Minutes && !(thought.estimatedMinutes !== undefined && thought.estimatedMinutes <= 15)) {
    return false
  }
  if (flags.delegatable && !thought.tags.includes(ACTION_TAG.delegatable)) return false
  if (flags.noPrerequisite && thought.tags.includes(ACTION_TAG.hasPrerequisites)) return false
  if (flags.canStartNow) {
    if (thought.tags.includes(ACTION_TAG.hasPrerequisites)) return false
    if (thought.tags.includes(ACTION_TAG.requiresPerson)) return false
    if (thought.tags.includes(ACTION_TAG.requiresLearning)) return false
  }
  return true
}

/** Highest priority first, then impact, then least difficulty. */
export function nextActions(thoughts: Thought[], limit = 5): Thought[] {
  return thoughts
    .filter((thought) => isActionable(thought) && thought.status === 'active')
    .map((thought) => ({
      thought,
      priority: scaleValue(thought, BUILTIN_DIMENSION.priority) ?? 0,
      impact: scaleValue(thought, BUILTIN_DIMENSION.impact) ?? 0,
      difficulty: scaleValue(thought, BUILTIN_DIMENSION.difficulty) ?? 3,
    }))
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      if (b.impact !== a.impact) return b.impact - a.impact
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
      return a.thought.text.localeCompare(b.thought.text)
    })
    .slice(0, limit)
    .map((entry) => entry.thought)
}
