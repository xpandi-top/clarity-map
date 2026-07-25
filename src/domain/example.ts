import {
  BUILTIN_DIMENSION,
  IMPORTANCE_NOT,
  IMPORTANCE_YES,
  MOTIVATION_SHOULD,
  MOTIVATION_WANT,
  createDefaultDimensions,
  createDefaultRules,
} from './defaults'
import { createId, nowIso } from './ids'
import type { RelationType, Thought, ThoughtRelation, ThoughtType, WorkspaceData } from './types'

interface Seed {
  key: string
  text: string
  type: ThoughtType
  motivation?: string
  importance?: string
  difficulty?: number
  priority?: number
  impact?: number
  energy?: number
  urgency?: number
  estimatedMinutes?: number
  description?: string
}

const SEEDS: Seed[] = [
  {
    key: 'changeJobs',
    text: 'Change jobs',
    type: 'goal',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_YES,
    priority: 5,
    impact: 5,
    description: 'Not urgent, but it keeps returning.',
  },
  {
    key: 'learnAws',
    text: 'Learn AWS',
    type: 'project',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_YES,
    difficulty: 3,
    priority: 4,
    impact: 4,
  },
  {
    key: 'awsCert',
    text: 'Complete an AWS certification',
    type: 'milestone',
    motivation: MOTIVATION_SHOULD,
    importance: IMPORTANCE_YES,
    difficulty: 4,
    priority: 4,
    impact: 4,
  },
  {
    key: 'remoteJob',
    text: 'Find a remote job',
    type: 'outcome',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_YES,
    difficulty: 4,
    priority: 5,
    impact: 5,
  },
  {
    key: 'walk',
    text: 'Walk every day',
    type: 'habit',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_YES,
    difficulty: 2,
    priority: 4,
    impact: 4,
    energy: 3,
    estimatedMinutes: 30,
  },
  {
    key: 'health',
    text: 'Improve physical health',
    type: 'goal',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_YES,
    priority: 5,
    impact: 5,
  },
  {
    key: 'scrolling',
    text: 'Reduce short-video scrolling',
    type: 'habit',
    motivation: MOTIVATION_SHOULD,
    importance: IMPORTANCE_YES,
    difficulty: 3,
    priority: 3,
    impact: 4,
    energy: 2,
  },
  {
    key: 'photography',
    text: 'Learn photography',
    type: 'idea',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_NOT,
    difficulty: 2,
    energy: 4,
  },
  {
    key: 'japan',
    text: 'Travel to Japan',
    type: 'vision',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_YES,
    difficulty: 3,
    energy: 5,
  },
  {
    key: 'family',
    text: 'Call my family',
    type: 'action',
    motivation: MOTIVATION_SHOULD,
    importance: IMPORTANCE_YES,
    difficulty: 1,
    priority: 4,
    impact: 4,
    energy: 2,
    urgency: 4,
    estimatedMinutes: 15,
  },
  {
    key: 'room',
    text: 'Organize my room',
    type: 'action',
    motivation: MOTIVATION_SHOULD,
    importance: IMPORTANCE_NOT,
    difficulty: 2,
    priority: 2,
    impact: 2,
    energy: -1,
    estimatedMinutes: 60,
  },
  {
    key: 'sideProject',
    text: 'Build a personal project',
    type: 'project',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_YES,
    difficulty: 4,
    priority: 3,
    impact: 4,
    energy: 3,
  },
  {
    key: 'selfTime',
    text: 'Create more self-directed time',
    type: 'value',
    motivation: MOTIVATION_WANT,
    importance: IMPORTANCE_YES,
    priority: 5,
    impact: 5,
  },
]

const RELATIONS: Array<[string, RelationType, string]> = [
  ['learnAws', 'supports', 'awsCert'],
  ['awsCert', 'milestoneOf', 'remoteJob'],
  ['remoteJob', 'serves', 'changeJobs'],
  ['walk', 'serves', 'health'],
  ['scrolling', 'supports', 'selfTime'],
  ['sideProject', 'serves', 'selfTime'],
  ['photography', 'relatedTo', 'japan'],
  ['family', 'serves', 'selfTime'],
]

/**
 * A ready-made workspace used by "Load example". Never loaded automatically.
 */
export function createExampleWorkspace(): WorkspaceData {
  const timestamp = nowIso()
  const workspaceId = createId('ws')
  const idByKey = new Map<string, string>()

  const thoughts: Thought[] = SEEDS.map((seed) => {
    const id = createId('th')
    idByKey.set(seed.key, id)
    const dimensionValues: Thought['dimensionValues'] = {}
    if (seed.motivation) dimensionValues[BUILTIN_DIMENSION.motivation] = seed.motivation
    if (seed.importance) dimensionValues[BUILTIN_DIMENSION.importance] = seed.importance
    if (seed.difficulty !== undefined) {
      dimensionValues[BUILTIN_DIMENSION.difficulty] = seed.difficulty
    }
    if (seed.priority !== undefined) dimensionValues[BUILTIN_DIMENSION.priority] = seed.priority
    if (seed.impact !== undefined) dimensionValues[BUILTIN_DIMENSION.impact] = seed.impact
    if (seed.energy !== undefined) dimensionValues[BUILTIN_DIMENSION.energy] = seed.energy
    if (seed.urgency !== undefined) dimensionValues[BUILTIN_DIMENSION.urgency] = seed.urgency

    return {
      id,
      workspaceId,
      text: seed.text,
      description: seed.description ?? '',
      type: seed.type,
      dimensionValues,
      tags: [],
      status: 'active',
      estimatedMinutes: seed.estimatedMinutes,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  })

  const relations: ThoughtRelation[] = RELATIONS.flatMap(([source, type, target]) => {
    const sourceThoughtId = idByKey.get(source)
    const targetThoughtId = idByKey.get(target)
    if (!sourceThoughtId || !targetThoughtId) return []
    return [
      {
        id: createId('rel'),
        workspaceId,
        sourceThoughtId,
        targetThoughtId,
        type,
        createdAt: timestamp,
      },
    ]
  })

  return {
    workspace: {
      id: workspaceId,
      name: 'Example workspace',
      createdAt: timestamp,
      updatedAt: timestamp,
      currentStage: 'matrix',
    },
    thoughts,
    dimensions: createDefaultDimensions(),
    relations,
    comparisons: [],
    rules: createDefaultRules(workspaceId),
    dismissedSuggestionIds: [],
  }
}
