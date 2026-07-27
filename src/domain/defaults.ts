import type {
  Dimension,
  DimensionOption,
  RelationType,
  Rule,
  ThoughtType,
  Workspace,
} from './types'
import { createId, nowIso } from './ids'

/** Stable ids for built-in dimensions. Referenced by rules, matrix, and tests. */
export const BUILTIN_DIMENSION = {
  motivation: 'dim_motivation',
  importance: 'dim_importance',
  thoughtType: 'dim_type',
  difficulty: 'dim_difficulty',
  priority: 'dim_priority',
  energy: 'dim_energy',
  impact: 'dim_impact',
  urgency: 'dim_urgency',
} as const

export const MOTIVATION_SHOULD = 'should'
export const MOTIVATION_WANT = 'want'
export const IMPORTANCE_NOT = 'notImportant'
export const IMPORTANCE_YES = 'important'

function option(value: string, label: string, order: number): DimensionOption {
  return { id: `opt_${value}`, value, label, order }
}

export const THOUGHT_TYPES: ThoughtType[] = [
  'unclassified',
  'value',
  'vision',
  'goal',
  'outcome',
  'milestone',
  'project',
  'habit',
  'action',
  'decision',
  'problem',
  'idea',
  'note',
]

export const THOUGHT_TYPE_LABEL: Record<ThoughtType, string> = {
  unclassified: 'Unclassified',
  value: 'Value',
  vision: 'Vision',
  goal: 'Goal',
  outcome: 'Outcome',
  milestone: 'Milestone',
  project: 'Project',
  habit: 'Habit',
  action: 'Action',
  decision: 'Decision',
  problem: 'Problem',
  idea: 'Idea',
  note: 'Note',
}

export const THOUGHT_TYPE_DEFINITION: Record<ThoughtType, string> = {
  unclassified: 'Not decided yet. It is fine to leave a thought here.',
  value: 'A continuing direction or principle, such as health or freedom.',
  vision: 'A desired long-term state.',
  goal: 'A desired result that cannot be performed as one immediate action.',
  outcome: 'An observable completed state.',
  milestone: 'An intermediate result within a larger goal.',
  project: 'A finite body of work containing multiple actions.',
  habit: 'A repeated behavior.',
  action: 'A behavior that can be started directly.',
  decision: 'A choice that must be made.',
  problem: 'An obstacle that needs to be resolved.',
  idea: 'A thought that does not yet fit another type.',
  note: 'Information stored for reference.',
}

export const RELATION_TYPES: RelationType[] = [
  'serves',
  'milestoneOf',
  'breaksDownInto',
  'prerequisiteFor',
  'supports',
  'conflictsWith',
  'relatedTo',
]

/** Reads from the relation's source towards its target. */
export const RELATION_LABEL: Record<RelationType, string> = {
  serves: 'serves',
  milestoneOf: 'is a milestone of',
  breaksDownInto: 'breaks down into',
  prerequisiteFor: 'is a prerequisite for',
  supports: 'supports',
  conflictsWith: 'conflicts with',
  relatedTo: 'is related to',
}

/**
 * Reads the other way, from the target back towards the source. The roadmap
 * draws every edge downwards, so an upward relation such as `milestoneOf`
 * needs this phrasing to stay true: "Lose weight has milestone Reach 45kg",
 * not "Lose weight is a milestone of Reach 45kg".
 */
export const RELATION_REVERSE_LABEL: Record<RelationType, string> = {
  serves: 'is served by',
  milestoneOf: 'has milestone',
  breaksDownInto: 'is part of',
  prerequisiteFor: 'needs first',
  supports: 'is supported by',
  conflictsWith: 'conflicts with',
  relatedTo: 'is related to',
}

/**
 * Relations whose direction means "the target is higher in the structure".
 * `breaksDownInto` points the other way, so it is inverted when traversing.
 */
export const UPWARD_RELATIONS: RelationType[] = [
  'serves',
  'milestoneOf',
  'supports',
  'prerequisiteFor',
]

export function createDefaultDimensions(): Dimension[] {
  return [
    {
      id: BUILTIN_DIMENSION.motivation,
      name: 'Motivation source',
      question: 'Is this something I want, or something I believe I should do?',
      comparativeQuestion:
        'Which one is more something you want, rather than something you feel you should do?',
      description:
        'Neither answer is better. This only helps you notice where the pull is coming from.',
      kind: 'binary',
      options: [option(MOTIVATION_SHOULD, 'Should', 0), option(MOTIVATION_WANT, 'Want', 1)],
      required: false,
      active: true,
      builtIn: true,
      stage: 'capture',
      order: 0,
    },
    {
      id: BUILTIN_DIMENSION.importance,
      name: 'Importance',
      question: 'Is this important to you?',
      comparativeQuestion: 'Which one matters more to you?',
      description: 'Important to you, not important in general.',
      kind: 'binary',
      options: [option(IMPORTANCE_NOT, 'Not important', 0), option(IMPORTANCE_YES, 'Important', 1)],
      required: false,
      active: true,
      builtIn: true,
      stage: 'review',
      order: 1,
    },
    {
      id: BUILTIN_DIMENSION.thoughtType,
      name: 'Thought type',
      question: 'What kind of thought is this?',
      kind: 'singleSelect',
      options: THOUGHT_TYPES.map((type, index) =>
        option(type, THOUGHT_TYPE_LABEL[type], index),
      ),
      required: false,
      active: true,
      builtIn: true,
      stage: 'structure',
      order: 2,
    },
    {
      id: BUILTIN_DIMENSION.difficulty,
      name: 'Difficulty',
      question: 'How difficult does this feel?',
      comparativeQuestion: 'Which one would be harder?',
      kind: 'scale',
      min: 1,
      max: 5,
      step: 1,
      lowLabel: 'Very easy',
      highLabel: 'Very difficult',
      required: false,
      active: true,
      builtIn: true,
      stage: 'action',
      order: 3,
    },
    {
      id: BUILTIN_DIMENSION.priority,
      name: 'Priority',
      question: 'How high would you place this right now?',
      comparativeQuestion: 'Which one would you rather deal with first?',
      kind: 'scale',
      min: 1,
      max: 5,
      step: 1,
      lowLabel: 'Low',
      highLabel: 'High',
      required: false,
      active: true,
      builtIn: true,
      stage: 'action',
      order: 4,
    },
    {
      id: BUILTIN_DIMENSION.energy,
      name: 'Energy effect',
      question: 'Does doing this drain you or restore you?',
      comparativeQuestion: 'Which one leaves you with more energy afterwards?',
      description: '-5 is strongly draining, 0 is neutral, +5 is strongly restoring.',
      kind: 'scale',
      min: -5,
      max: 5,
      step: 1,
      lowLabel: 'Strongly draining',
      highLabel: 'Strongly restoring',
      required: false,
      active: true,
      builtIn: true,
      stage: 'action',
      order: 5,
    },
    {
      id: BUILTIN_DIMENSION.impact,
      name: 'Impact',
      question: 'How much would this change if it were done?',
      comparativeQuestion: 'Which one would change more if it were done?',
      kind: 'scale',
      min: 1,
      max: 5,
      step: 1,
      lowLabel: 'Little',
      highLabel: 'A great deal',
      required: false,
      active: true,
      builtIn: true,
      stage: 'action',
      order: 6,
    },
    {
      id: BUILTIN_DIMENSION.urgency,
      name: 'Urgency',
      question: 'How soon does this need attention?',
      comparativeQuestion: 'Which one needs attention sooner?',
      kind: 'scale',
      min: 1,
      max: 5,
      step: 1,
      lowLabel: 'Can wait',
      highLabel: 'Very soon',
      required: false,
      active: true,
      builtIn: true,
      stage: 'action',
      order: 7,
    },
  ]
}

export function createDefaultRules(workspaceId: string): Rule[] {
  const createdAt = nowIso()
  return [
    {
      id: createId('rule'),
      workspaceId,
      name: 'Examine low-value obligations',
      enabled: true,
      match: 'all',
      builtIn: true,
      createdAt,
      conditions: [
        {
          id: createId('cond'),
          field: 'dimension',
          dimensionId: BUILTIN_DIMENSION.motivation,
          operator: 'equals',
          value: MOTIVATION_SHOULD,
        },
        {
          id: createId('cond'),
          field: 'dimension',
          dimensionId: BUILTIN_DIMENSION.importance,
          operator: 'equals',
          value: IMPORTANCE_NOT,
        },
      ],
      actions: [
        {
          type: 'flag',
          value: 'Consider reducing, declining, simplifying, or delegating this.',
        },
      ],
    },
    {
      id: createId('rule'),
      workspaceId,
      name: 'Break down goals',
      enabled: true,
      match: 'all',
      builtIn: true,
      createdAt,
      conditions: [{ id: createId('cond'), field: 'type', operator: 'equals', value: 'goal' }],
      actions: [{ type: 'suggestBreakdown' }],
    },
    {
      id: createId('rule'),
      workspaceId,
      name: 'High-leverage action',
      enabled: true,
      match: 'all',
      builtIn: true,
      createdAt,
      conditions: [
        { id: createId('cond'), field: 'type', operator: 'equals', value: 'action' },
        {
          id: createId('cond'),
          field: 'dimension',
          dimensionId: BUILTIN_DIMENSION.difficulty,
          operator: 'lessThanOrEqual',
          value: 2,
        },
        {
          id: createId('cond'),
          field: 'dimension',
          dimensionId: BUILTIN_DIMENSION.impact,
          operator: 'greaterThanOrEqual',
          value: 4,
        },
      ],
      actions: [{ type: 'addTag', value: 'High leverage' }],
    },
  ]
}

export function createWorkspace(name = 'My thoughts'): Workspace {
  const timestamp = nowIso()
  return {
    id: createId('ws'),
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    currentStage: 'capture',
  }
}
