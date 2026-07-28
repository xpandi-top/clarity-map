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
import type {
  Belief,
  Evidence,
  LearningData,
  Observation,
  RelationType,
  Thought,
  ThoughtRelation,
  ThoughtType,
  WorkspaceData,
} from './types'
import { t } from '../i18n/core'

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
      text: t(seed.text),
      description: seed.description ? t(seed.description) : '',
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
      name: t('Example workspace'),
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
    ...exampleLearning(workspaceId, idByKey, timestamp),
  }
}

/**
 * One complete turn of the learning loop, so the Reflect, Evidence, and Model
 * screens have something to show: an experience, what it might mean, a working
 * model that changed, and the default that came out of it.
 */
function exampleLearning(
  workspaceId: string,
  idByKey: Map<string, string>,
  timestamp: string,
): LearningData {
  const walkId = idByKey.get('walk')
  const healthId = idByKey.get('health')
  const relatedThoughtIds = [walkId, healthId].filter((id): id is string => id !== undefined)

  const observation: Observation = {
    id: createId('obs'),
    workspaceId,
    description: t('After I left the house, I became more willing to move.'),
    occurredAt: timestamp,
    context: { timeOfDay: t('Evening'), tags: [t('energy'), t('movement')] },
    energyBefore: 2,
    energyAfter: 4,
    relatedThoughtIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const evidence: Evidence = {
    id: createId('evd'),
    workspaceId,
    statement: t('Changing environments may help me regain movement motivation.'),
    observationIds: [observation.id],
    supportingObservationIds: [observation.id],
    contradictingObservationIds: [],
    relatedThoughtIds,
    confidence: 'low',
    status: 'emerging',
    context: { tags: [t('energy'), t('movement')] },
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const previousBelief: Belief = {
    id: createId('blf'),
    workspaceId,
    statement: t('I need to feel motivated before I start moving.'),
    confidence: 'low',
    status: 'replaced',
    evidenceIds: [],
    contradictingEvidenceIds: [evidence.id],
    relatedThoughtIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const updatedBelief: Belief = {
    id: createId('blf'),
    workspaceId,
    statement: t('Movement motivation may appear after I change environments or begin moving.'),
    confidence: 'low',
    status: 'active',
    evidenceIds: [evidence.id],
    contradictingEvidenceIds: [],
    relatedThoughtIds,
    previousBeliefId: previousBelief.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  previousBelief.replacementBeliefId = updatedBelief.id

  return {
    observations: [observation],
    evidence: [evidence],
    hypotheses: [
      {
        id: createId('hyp'),
        workspaceId,
        statement: t(
          'If I leave the house when my energy is low, I may become more willing to move.',
        ),
        relatedValueIds: [],
        relatedGoalIds: healthId ? [healthId] : [],
        relatedThoughtIds: walkId ? [walkId] : [],
        evidenceIds: [evidence.id],
        contradictingEvidenceIds: [],
        status: 'partiallySupported',
        confidence: 'low',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    beliefs: [previousBelief, updatedBelief],
    beliefUpdates: [
      {
        id: createId('bup'),
        workspaceId,
        previousBeliefId: previousBelief.id,
        previousStatement: previousBelief.statement,
        updatedBeliefId: updatedBelief.id,
        updatedStatement: updatedBelief.statement,
        reason: t(
          'One recorded experience went the other way round: the willingness followed the change of environment.',
        ),
        supportingEvidenceIds: [evidence.id],
        contradictingEvidenceIds: [],
        confidence: 'low',
        createdAt: timestamp,
      },
    ],
    personalRules: [
      {
        id: createId('prule'),
        workspaceId,
        name: t('Go outside before deciding about exercise'),
        triggerDescription: t('my energy is low and I have stayed indoors for a long time'),
        conditions: [
          { id: createId('pcond'), description: t('Energy feels like 3 or lower.') },
          { id: createId('pcond'), description: t('Indoors for most of the day.') },
        ],
        defaultResponse: t(
          'Go outside for five minutes, then decide whether I want to exercise.',
        ),
        exceptionDescription: t('Not when I am ill, or when the weather makes it unsafe.'),
        relatedValueIds: [],
        relatedGoalIds: healthId ? [healthId] : [],
        relatedThoughtIds: walkId ? [walkId] : [],
        evidenceIds: [evidence.id],
        contradictingEvidenceIds: [],
        context: { tags: [t('energy'), t('movement')] },
        confidence: 'veryLow',
        status: 'experimental',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  }
}
