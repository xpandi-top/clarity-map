import { useMemo } from 'react'
import { BUILTIN_DIMENSION, createDefaultDimensions } from '../domain/defaults'
import { backfillBuiltInPrompts } from '../domain/prompts'
import { createRankAxis, isRankAxis, rankedDimensionId } from '../domain/rankingAxis'
import { evaluateRules } from '../domain/rules'
import type { Dimension, RuleSuggestion, Thought } from '../domain/types'
import { useStore } from './store'

const EMPTY: never[] = []

export function useCurrentWorkspaceId(): string | null {
  return useStore((state) => state.currentWorkspaceId)
}

export function useCurrentWorkspace() {
  const workspaces = useStore((state) => state.workspaces)
  const currentId = useStore((state) => state.currentWorkspaceId)
  return useMemo(
    () => workspaces.find((workspace) => workspace.id === currentId) ?? null,
    [workspaces, currentId],
  )
}

export function useThoughts(): Thought[] {
  const thoughts = useStore((state) => state.thoughts)
  const currentId = useStore((state) => state.currentWorkspaceId)
  return useMemo(
    () =>
      currentId ? thoughts.filter((thought) => thought.workspaceId === currentId) : EMPTY,
    [thoughts, currentId],
  )
}

/** Thoughts excluding archived ones, which is what most screens want. */
export function useVisibleThoughts(): Thought[] {
  const thoughts = useThoughts()
  return useMemo(() => thoughts.filter((thought) => thought.status !== 'archived'), [thoughts])
}

export function useThought(thoughtId: string | null | undefined): Thought | null {
  const thoughts = useStore((state) => state.thoughts)
  return useMemo(
    () => (thoughtId ? (thoughts.find((thought) => thought.id === thoughtId) ?? null) : null),
    [thoughts, thoughtId],
  )
}

export function useDimensions(): Dimension[] {
  const byWorkspace = useStore((state) => state.dimensionsByWorkspace)
  const currentId = useStore((state) => state.currentWorkspaceId)
  return useMemo(() => {
    if (!currentId) return EMPTY
    const dimensions = byWorkspace[currentId]
    if (!dimensions || dimensions.length === 0) return createDefaultDimensions()
    // Idempotent, so wording stays right even for a snapshot that reached the
    // current schema version without the migration having run over it.
    return backfillBuiltInPrompts(dimensions, createDefaultDimensions())
  }, [byWorkspace, currentId])
}

export function useActiveDimensions(): Dimension[] {
  const dimensions = useDimensions()
  return useMemo(
    () =>
      dimensions
        .filter((dimension) => dimension.active)
        .sort((a, b) => a.order - b.order),
    [dimensions],
  )
}

export function useDimension(dimensionId: string): Dimension | null {
  const dimensions = useDimensions()
  return useMemo(
    () => dimensions.find((dimension) => dimension.id === dimensionId) ?? null,
    [dimensions, dimensionId],
  )
}

export function useRelations() {
  const relations = useStore((state) => state.relations)
  const currentId = useStore((state) => state.currentWorkspaceId)
  return useMemo(
    () =>
      currentId ? relations.filter((relation) => relation.workspaceId === currentId) : EMPTY,
    [relations, currentId],
  )
}

export function useComparisons() {
  const comparisons = useStore((state) => state.comparisons)
  const currentId = useStore((state) => state.currentWorkspaceId)
  return useMemo(
    () =>
      currentId
        ? comparisons.filter((comparison) => comparison.workspaceId === currentId)
        : EMPTY,
    [comparisons, currentId],
  )
}

export function useRules() {
  const rules = useStore((state) => state.rules)
  const currentId = useStore((state) => state.currentWorkspaceId)
  return useMemo(
    () => (currentId ? rules.filter((rule) => rule.workspaceId === currentId) : EMPTY),
    [rules, currentId],
  )
}

export function useSuggestions(): RuleSuggestion[] {
  const thoughts = useThoughts()
  const rules = useRules()
  const dimensions = useDimensions()
  const dismissed = useStore((state) => state.dismissedSuggestionIds)
  return useMemo(
    () => evaluateRules(thoughts, rules, dimensions, dismissed),
    [thoughts, rules, dimensions, dismissed],
  )
}

export function useSuggestionsFor(thoughtId: string | null): RuleSuggestion[] {
  const suggestions = useSuggestions()
  return useMemo(
    () =>
      thoughtId
        ? suggestions.filter((suggestion) => suggestion.thoughtId === thoughtId)
        : EMPTY,
    [suggestions, thoughtId],
  )
}

/** The two dimensions currently plotted on the matrix, with safe fallbacks. */
export function useMatrixAxes(): { xDimension: Dimension; yDimension: Dimension } {
  const dimensions = useDimensions()
  const axes = useStore((state) => state.matrixAxes)
  const currentId = useStore((state) => state.currentWorkspaceId)

  return useMemo(() => {
    const stored = currentId ? axes[currentId] : undefined
    const find = (id: string | undefined, fallbackId: string) => {
      // Ranking axes are synthetic, so they are rebuilt from the dimension
      // they rank rather than looked up in the stored list.
      if (id && isRankAxis(id)) {
        const source = dimensions.find((dimension) => dimension.id === rankedDimensionId(id))
        if (source) return createRankAxis(source)
      }
      return (
        dimensions.find((dimension) => dimension.id === id) ??
        dimensions.find((dimension) => dimension.id === fallbackId) ??
        dimensions[0]
      )
    }

    return {
      xDimension: find(stored?.x, BUILTIN_DIMENSION.motivation),
      yDimension: find(stored?.y, BUILTIN_DIMENSION.importance),
    }
  }, [dimensions, axes, currentId])
}
