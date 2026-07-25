import {
  BUILTIN_DIMENSION,
  IMPORTANCE_NOT,
  IMPORTANCE_YES,
  MOTIVATION_SHOULD,
  MOTIVATION_WANT,
  THOUGHT_TYPE_LABEL,
} from '../../domain/defaults'
import type { Thought } from '../../domain/types'

/**
 * Compact status chips for a thought. Every chip carries text, never colour
 * alone.
 */
export function ThoughtMeta({ thought }: { thought: Thought }) {
  const motivation = thought.dimensionValues[BUILTIN_DIMENSION.motivation]
  const importance = thought.dimensionValues[BUILTIN_DIMENSION.importance]
  const priority = thought.dimensionValues[BUILTIN_DIMENSION.priority]

  return (
    <span className="thought-item__meta">
      {thought.type !== 'unclassified' ? (
        <span className="chip">{THOUGHT_TYPE_LABEL[thought.type]}</span>
      ) : null}
      {motivation === MOTIVATION_WANT ? <span className="chip chip--want">Want</span> : null}
      {motivation === MOTIVATION_SHOULD ? (
        <span className="chip chip--should">Should</span>
      ) : null}
      {importance === IMPORTANCE_YES ? <span className="chip">Important</span> : null}
      {importance === IMPORTANCE_NOT ? <span className="chip">Not important</span> : null}
      {typeof priority === 'number' ? <span className="chip">Priority {priority}</span> : null}
      {thought.status !== 'active' ? <span className="chip">{thought.status}</span> : null}
      {thought.tags.map((tag) => (
        <span key={tag} className="chip chip--accent">
          {tag}
        </span>
      ))}
    </span>
  )
}
