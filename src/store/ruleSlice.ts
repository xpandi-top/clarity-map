import { createId, nowIso } from '../domain/ids'
import { applySuggestion } from '../domain/rules'
import type { Rule } from '../domain/types'
import type { RuleActions, SliceCreator } from './types'

export const createRuleSlice: SliceCreator<RuleActions> = (set, get) => ({
  addRule: (rule) => {
    const workspaceId = get().currentWorkspaceId
    if (!workspaceId) return null
    const created: Rule = {
      ...rule,
      id: createId('rule'),
      workspaceId,
      builtIn: false,
      createdAt: nowIso(),
    }
    set((state) => ({ rules: [...state.rules, created] }))
    return created.id
  },

  updateRule: (ruleId, patch) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === ruleId
          ? { ...rule, ...patch, id: rule.id, workspaceId: rule.workspaceId }
          : rule,
      ),
    }))
  },

  deleteRule: (ruleId) => {
    set((state) => ({ rules: state.rules.filter((rule) => rule.id !== ruleId) }))
  },

  dismissSuggestion: (suggestionId) => {
    set((state) =>
      state.dismissedSuggestionIds.includes(suggestionId)
        ? {}
        : { dismissedSuggestionIds: [...state.dismissedSuggestionIds, suggestionId] },
    )
  },

  restoreDismissedSuggestions: () => {
    set({ dismissedSuggestionIds: [] })
  },

  acceptSuggestion: (suggestion) => {
    set((state) => ({
      thoughts: state.thoughts.map((thought) =>
        thought.id === suggestion.thoughtId
          ? { ...applySuggestion(thought, suggestion.action), updatedAt: nowIso() }
          : thought,
      ),
    }))
  },
})
