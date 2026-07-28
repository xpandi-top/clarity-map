import { createId, nowIso } from '../domain/ids'
import {
  createBelief,
  createEvidence,
  createHypothesis,
  createObservation,
  createPersonalRule,
} from '../domain/learning'
import type { LearningActions, SliceCreator } from './types'

/**
 * Records of what happened and what the user made of it.
 *
 * Two rules run through the whole slice. Nothing is ever silently rewritten —
 * a revised belief is a new record pointing at the old one — and nothing is
 * inferred: every link here was made by the user.
 */
export const createLearningSlice: SliceCreator<LearningActions> = (set, get) => {
  const workspaceId = () => get().currentWorkspaceId

  return {
    addObservation: (input) => {
      const currentWorkspaceId = workspaceId()
      if (!currentWorkspaceId) return null
      const description = input.description.trim()
      if (!description) return null
      const observation = createObservation(currentWorkspaceId, { ...input, description })
      set((state) => ({ observations: [...state.observations, observation] }))
      return observation.id
    },

    updateObservation: (observationId, patch) => {
      set((state) => ({
        observations: state.observations.map((observation) =>
          observation.id === observationId
            ? { ...observation, ...patch, id: observation.id, updatedAt: nowIso() }
            : observation,
        ),
      }))
    },

    deleteObservation: (observationId) => {
      set((state) => ({
        observations: state.observations.filter(
          (observation) => observation.id !== observationId,
        ),
        // An interpretation should not keep pointing at a record that is gone.
        evidence: state.evidence.map((entry) => ({
          ...entry,
          observationIds: entry.observationIds.filter((id) => id !== observationId),
          supportingObservationIds: entry.supportingObservationIds.filter(
            (id) => id !== observationId,
          ),
          contradictingObservationIds: entry.contradictingObservationIds.filter(
            (id) => id !== observationId,
          ),
        })),
      }))
    },

    addEvidence: (input) => {
      const currentWorkspaceId = workspaceId()
      if (!currentWorkspaceId) return null
      const statement = input.statement.trim()
      if (!statement) return null
      const entry = createEvidence(currentWorkspaceId, { ...input, statement })
      set((state) => ({ evidence: [...state.evidence, entry] }))
      return entry.id
    },

    updateEvidence: (evidenceId, patch) => {
      set((state) => ({
        evidence: state.evidence.map((entry) =>
          entry.id === evidenceId
            ? { ...entry, ...patch, id: entry.id, updatedAt: nowIso() }
            : entry,
        ),
      }))
    },

    deleteEvidence: (evidenceId) => {
      const without = (ids: string[] | undefined) => (ids ?? []).filter((id) => id !== evidenceId)
      set((state) => ({
        evidence: state.evidence.filter((entry) => entry.id !== evidenceId),
        beliefs: state.beliefs.map((belief) => ({
          ...belief,
          evidenceIds: without(belief.evidenceIds),
          contradictingEvidenceIds: without(belief.contradictingEvidenceIds),
        })),
        hypotheses: state.hypotheses.map((hypothesis) => ({
          ...hypothesis,
          evidenceIds: without(hypothesis.evidenceIds),
          contradictingEvidenceIds: without(hypothesis.contradictingEvidenceIds),
        })),
        personalRules: state.personalRules.map((rule) => ({
          ...rule,
          evidenceIds: without(rule.evidenceIds),
          contradictingEvidenceIds: without(rule.contradictingEvidenceIds),
        })),
      }))
    },

    addHypothesis: (input) => {
      const currentWorkspaceId = workspaceId()
      if (!currentWorkspaceId) return null
      const statement = input.statement.trim()
      if (!statement) return null
      const hypothesis = createHypothesis(currentWorkspaceId, { ...input, statement })
      set((state) => ({ hypotheses: [...state.hypotheses, hypothesis] }))
      return hypothesis.id
    },

    updateHypothesis: (hypothesisId, patch) => {
      set((state) => ({
        hypotheses: state.hypotheses.map((hypothesis) =>
          hypothesis.id === hypothesisId
            ? { ...hypothesis, ...patch, id: hypothesis.id, updatedAt: nowIso() }
            : hypothesis,
        ),
      }))
    },

    deleteHypothesis: (hypothesisId) => {
      set((state) => ({
        hypotheses: state.hypotheses.filter((hypothesis) => hypothesis.id !== hypothesisId),
      }))
    },

    addBelief: (input) => {
      const currentWorkspaceId = workspaceId()
      if (!currentWorkspaceId) return null
      const statement = input.statement.trim()
      if (!statement) return null
      const belief = createBelief(currentWorkspaceId, { ...input, statement })
      set((state) => ({ beliefs: [...state.beliefs, belief] }))
      return belief.id
    },

    updateBelief: (beliefId, patch) => {
      set((state) => ({
        beliefs: state.beliefs.map((belief) =>
          belief.id === beliefId
            ? { ...belief, ...patch, id: belief.id, updatedAt: nowIso() }
            : belief,
        ),
      }))
    },

    deleteBelief: (beliefId) => {
      set((state) => ({
        beliefs: state.beliefs.filter((belief) => belief.id !== beliefId),
        beliefUpdates: state.beliefUpdates.filter(
          (update) => update.updatedBeliefId !== beliefId,
        ),
      }))
    },

    recordBeliefUpdate: (input) => {
      const currentWorkspaceId = workspaceId()
      if (!currentWorkspaceId) return null
      const updatedStatement = input.updatedStatement.trim()
      if (!updatedStatement) return null

      const state = get()
      const previous = input.previousBeliefId
        ? (state.beliefs.find((belief) => belief.id === input.previousBeliefId) ?? null)
        : null

      const supportingEvidenceIds = input.supportingEvidenceIds ?? []
      const contradictingEvidenceIds = input.contradictingEvidenceIds ?? []

      const updated = createBelief(currentWorkspaceId, {
        statement: updatedStatement,
        confidence: input.confidence ?? 'low',
        // Evidence that pulls both ways is a reason to mark the model
        // uncertain, not a reason to hide half of it.
        status: contradictingEvidenceIds.length > 0 ? 'uncertain' : 'active',
        evidenceIds: supportingEvidenceIds,
        contradictingEvidenceIds,
        relatedThoughtIds: input.relatedThoughtIds ?? previous?.relatedThoughtIds ?? [],
        previousBeliefId: previous?.id,
      })

      const timestamp = nowIso()
      set((current) => ({
        beliefs: [
          ...current.beliefs.map((belief) =>
            belief.id === previous?.id
              ? {
                  ...belief,
                  // Kept, not deleted: the history is the point.
                  status: 'replaced' as const,
                  replacementBeliefId: updated.id,
                  updatedAt: timestamp,
                }
              : belief,
          ),
          updated,
        ],
        beliefUpdates: [
          ...current.beliefUpdates,
          {
            id: createId('bup'),
            workspaceId: currentWorkspaceId,
            previousBeliefId: previous?.id,
            previousStatement: previous?.statement,
            updatedBeliefId: updated.id,
            updatedStatement,
            reason: input.reason.trim(),
            supportingEvidenceIds,
            contradictingEvidenceIds,
            confidence: updated.confidence,
            createdAt: timestamp,
            reviewAt: input.reviewAt,
          },
        ],
      }))

      return updated.id
    },

    addPersonalRule: (input) => {
      const currentWorkspaceId = workspaceId()
      if (!currentWorkspaceId) return null
      const name = input.name.trim()
      const defaultResponse = input.defaultResponse.trim()
      if (!name || !defaultResponse) return null
      const rule = createPersonalRule(currentWorkspaceId, { ...input, name, defaultResponse })
      set((state) => ({ personalRules: [...state.personalRules, rule] }))
      return rule.id
    },

    updatePersonalRule: (ruleId, patch) => {
      set((state) => ({
        personalRules: state.personalRules.map((rule) =>
          rule.id === ruleId ? { ...rule, ...patch, id: rule.id, updatedAt: nowIso() } : rule,
        ),
      }))
    },

    replacePersonalRule: (ruleId, input) => {
      const currentWorkspaceId = workspaceId()
      if (!currentWorkspaceId) return null
      const original = get().personalRules.find((rule) => rule.id === ruleId)
      if (!original) return null
      const name = input.name.trim()
      const defaultResponse = input.defaultResponse.trim()
      if (!name || !defaultResponse) return null

      // The successor inherits the original's links, then takes its own id and
      // timestamps — those must not be carried over.
      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        replacedByRuleId: _replacedBy,
        ...inherited
      } = original
      const replacement = createPersonalRule(currentWorkspaceId, {
        ...inherited,
        ...input,
        name,
        defaultResponse,
        status: input.status ?? 'experimental',
      })

      const timestamp = nowIso()
      set((state) => ({
        personalRules: [
          ...state.personalRules.map((rule) =>
            rule.id === ruleId
              ? {
                  ...rule,
                  status: 'replaced' as const,
                  replacedByRuleId: replacement.id,
                  updatedAt: timestamp,
                }
              : rule,
          ),
          replacement,
        ],
      }))

      return replacement.id
    },

    deletePersonalRule: (ruleId) => {
      set((state) => ({
        personalRules: state.personalRules.filter((rule) => rule.id !== ruleId),
      }))
    },
  }
}
