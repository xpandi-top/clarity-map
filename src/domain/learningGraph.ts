import type { LearningData, Thought } from './types'

/**
 * How records relate to each other epistemically. Separate from
 * `RelationType`, which describes how plans hang together: "supports a goal"
 * and "weakens a belief" are not the same kind of statement.
 */
export type LearningRelationType =
  | 'observedDuring'
  | 'supportsBelief'
  | 'weakensBelief'
  | 'contradictsBelief'
  | 'supportsHypothesis'
  | 'contradictsHypothesis'
  | 'derivedFrom'
  | 'updates'
  | 'replaces'
  | 'informsRule'
  | 'appliesTo'

export const LEARNING_RELATION_LABEL: Record<LearningRelationType, string> = {
  observedDuring: 'observed during',
  supportsBelief: 'supports',
  weakensBelief: 'weakens',
  contradictsBelief: 'contradicts',
  supportsHypothesis: 'supports',
  contradictsHypothesis: 'contradicts',
  derivedFrom: 'derived from',
  updates: 'updates',
  replaces: 'replaces',
  informsRule: 'informs',
  appliesTo: 'applies to',
}

export interface LearningRelationStyle {
  stroke: string
  dash?: string
  width: number
  meaning: string
}

export const LEARNING_RELATION_STYLE: Record<LearningRelationType, LearningRelationStyle> = {
  observedDuring: { stroke: '#8f8981', dash: '1 5', width: 1.5, meaning: 'Happened around this.' },
  supportsBelief: { stroke: '#4a6b63', width: 2, meaning: 'Records that back this up.' },
  weakensBelief: { stroke: '#8c6a42', dash: '5 5', width: 2, meaning: 'Records that push against it.' },
  contradictsBelief: { stroke: '#8c4a42', dash: '5 5', width: 2.5, meaning: 'Records that run against it.' },
  supportsHypothesis: { stroke: '#6b7f4a', width: 2, meaning: 'Backs up something being tested.' },
  contradictsHypothesis: { stroke: '#8c4a42', dash: '5 5', width: 2, meaning: 'Runs against something being tested.' },
  derivedFrom: { stroke: '#4d6182', dash: '8 4', width: 2, meaning: 'Read from what happened.' },
  updates: { stroke: '#7a6a52', width: 2.5, meaning: 'A revised working model.' },
  replaces: { stroke: '#6d5a86', dash: '2 4', width: 2, meaning: 'Took the place of an earlier one.' },
  informsRule: { stroke: '#4a6b63', dash: '10 3 2 3', width: 2, meaning: 'Shaped a default response.' },
  appliesTo: { stroke: '#8f8981', dash: '4 3', width: 1.5, meaning: 'Where this seems to apply.' },
}

export type LearningNodeKind =
  | 'observation'
  | 'evidence'
  | 'hypothesis'
  | 'belief'
  | 'rule'
  | 'thought'

export const LEARNING_NODE_LABEL: Record<LearningNodeKind, string> = {
  observation: 'Observation',
  evidence: 'Evidence',
  hypothesis: 'Hypothesis',
  belief: 'Belief',
  rule: 'Default rule',
  thought: 'Thought',
}

export const LEARNING_NODE_COLOUR: Record<LearningNodeKind, string> = {
  observation: '#8f8981',
  evidence: '#4d6182',
  hypothesis: '#6b7f4a',
  belief: '#7a6a52',
  rule: '#4a6b63',
  thought: '#6d5a86',
}

export interface LearningGraphNode {
  id: string
  kind: LearningNodeKind
  label: string
  meta: string
}

export interface LearningGraphEdge {
  id: string
  source: string
  target: string
  type: LearningRelationType
}

export interface LearningGraph {
  nodes: LearningGraphNode[]
  edges: LearningGraphEdge[]
}

function clip(text: string, limit = 90): string {
  const trimmed = text.trim()
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}…` : trimmed
}

/** Every learning record as a node, keyed by its own id. */
function allNodes(data: LearningData, thoughts: Thought[]): Map<string, LearningGraphNode> {
  const nodes = new Map<string, LearningGraphNode>()

  for (const observation of data.observations) {
    nodes.set(observation.id, {
      id: observation.id,
      kind: 'observation',
      label: clip(observation.title || observation.description),
      meta: new Date(observation.occurredAt).toLocaleDateString(),
    })
  }
  for (const evidence of data.evidence) {
    nodes.set(evidence.id, {
      id: evidence.id,
      kind: 'evidence',
      label: clip(evidence.statement),
      meta: evidence.status,
    })
  }
  for (const hypothesis of data.hypotheses) {
    nodes.set(hypothesis.id, {
      id: hypothesis.id,
      kind: 'hypothesis',
      label: clip(hypothesis.statement),
      meta: hypothesis.status,
    })
  }
  for (const belief of data.beliefs) {
    nodes.set(belief.id, {
      id: belief.id,
      kind: 'belief',
      label: clip(belief.statement),
      meta: belief.status,
    })
  }
  for (const rule of data.personalRules) {
    nodes.set(rule.id, {
      id: rule.id,
      kind: 'rule',
      label: clip(rule.name || rule.defaultResponse),
      meta: rule.status,
    })
  }
  for (const thought of thoughts) {
    nodes.set(thought.id, {
      id: thought.id,
      kind: 'thought',
      label: clip(thought.text),
      meta: thought.type,
    })
  }

  return nodes
}

function allEdges(data: LearningData): LearningGraphEdge[] {
  const edges: LearningGraphEdge[] = []
  const add = (source: string, target: string, type: LearningRelationType) => {
    if (!source || !target || source === target) return
    edges.push({ id: `${source}>${target}:${type}`, source, target, type })
  }

  for (const observation of data.observations) {
    for (const thoughtId of observation.relatedThoughtIds) {
      add(observation.id, thoughtId, 'observedDuring')
    }
  }

  for (const evidence of data.evidence) {
    const supporting = new Set([...evidence.observationIds, ...evidence.supportingObservationIds])
    for (const observationId of supporting) add(evidence.id, observationId, 'derivedFrom')
    for (const observationId of evidence.contradictingObservationIds) {
      add(evidence.id, observationId, 'derivedFrom')
    }
    for (const thoughtId of evidence.relatedThoughtIds) add(evidence.id, thoughtId, 'appliesTo')
  }

  for (const hypothesis of data.hypotheses) {
    for (const evidenceId of hypothesis.evidenceIds) {
      add(evidenceId, hypothesis.id, 'supportsHypothesis')
    }
    for (const evidenceId of hypothesis.contradictingEvidenceIds ?? []) {
      add(evidenceId, hypothesis.id, 'contradictsHypothesis')
    }
    for (const thoughtId of [
      ...hypothesis.relatedValueIds,
      ...hypothesis.relatedGoalIds,
      ...(hypothesis.relatedThoughtIds ?? []),
    ]) {
      add(hypothesis.id, thoughtId, 'appliesTo')
    }
  }

  for (const belief of data.beliefs) {
    for (const evidenceId of belief.evidenceIds) add(evidenceId, belief.id, 'supportsBelief')
    for (const evidenceId of belief.contradictingEvidenceIds ?? []) {
      add(evidenceId, belief.id, 'weakensBelief')
    }
    for (const thoughtId of belief.relatedThoughtIds ?? []) {
      add(belief.id, thoughtId, 'appliesTo')
    }
    // The newer belief points back at the one it took the place of.
    if (belief.previousBeliefId) add(belief.id, belief.previousBeliefId, 'replaces')
  }

  for (const update of data.beliefUpdates) {
    if (update.previousBeliefId) {
      add(update.previousBeliefId, update.updatedBeliefId, 'updates')
    }
    for (const evidenceId of update.supportingEvidenceIds) {
      add(evidenceId, update.updatedBeliefId, 'supportsBelief')
    }
    for (const evidenceId of update.contradictingEvidenceIds) {
      add(evidenceId, update.previousBeliefId ?? update.updatedBeliefId, 'contradictsBelief')
    }
  }

  for (const rule of data.personalRules) {
    for (const evidenceId of rule.evidenceIds) add(evidenceId, rule.id, 'informsRule')
    for (const thoughtId of [
      ...rule.relatedValueIds,
      ...rule.relatedGoalIds,
      ...(rule.relatedThoughtIds ?? []),
    ]) {
      add(rule.id, thoughtId, 'appliesTo')
    }
    if (rule.replacedByRuleId) add(rule.replacedByRuleId, rule.id, 'replaces')
  }

  // Same pair, same meaning, recorded twice — keep one.
  const seen = new Set<string>()
  return edges.filter((edge) => {
    if (seen.has(edge.id)) return false
    seen.add(edge.id)
    return true
  })
}

export interface LearningGraphOptions {
  /** Where to start. Omit to return the whole learning graph. */
  focusId?: string
  /** How far to walk from the focus, ignoring direction. */
  maxDepth?: number
  /** Thoughts to draw alongside; leave empty for the learning-only view. */
  thoughts?: Thought[]
}

/**
 * The learning graph, optionally narrowed to one belief, rule, or thought.
 * Narrowing is the default use: the whole graph is unreadable long before it
 * is interesting, which is why the Roadmap does not combine the two by default.
 */
export function buildLearningGraph(
  data: LearningData,
  options: LearningGraphOptions = {},
): LearningGraph {
  const { focusId, maxDepth = 2, thoughts = [] } = options
  const nodes = allNodes(data, thoughts)
  const edges = allEdges(data).filter(
    (edge) => nodes.has(edge.source) && nodes.has(edge.target),
  )

  if (!focusId) {
    return { nodes: [...nodes.values()], edges }
  }
  if (!nodes.has(focusId)) return { nodes: [], edges: [] }

  const adjacency = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set())
    adjacency.get(edge.source)!.add(edge.target)
    adjacency.get(edge.target)!.add(edge.source)
  }

  const included = new Set<string>([focusId])
  let frontier = [focusId]
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbour of adjacency.get(id) ?? []) {
        if (included.has(neighbour)) continue
        included.add(neighbour)
        next.push(neighbour)
      }
    }
    frontier = next
  }

  return {
    nodes: [...included].map((id) => nodes.get(id)!),
    edges: edges.filter((edge) => included.has(edge.source) && included.has(edge.target)),
  }
}
