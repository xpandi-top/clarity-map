import { useMemo, useState } from 'react'
import {
  RELATION_LABEL,
  RELATION_TYPES,
  THOUGHT_TYPES,
  THOUGHT_TYPE_LABEL,
} from '../../domain/defaults'
import type { RelationType } from '../../domain/types'
import { useStore, useVisibleThoughts } from '../../store'

/** Ordered so the two most common choices sit at the top. */
const COMMON_FIRST: RelationType[] = [
  'serves',
  'relatedTo',
  ...RELATION_TYPES.filter((type) => type !== 'serves' && type !== 'relatedTo'),
]

const PLAIN_LABEL: Partial<Record<RelationType, string>> = {
  serves: 'contributes to',
  relatedTo: 'is related to',
}

function label(type: RelationType): string {
  return PLAIN_LABEL[type] ?? RELATION_LABEL[type]
}

/**
 * One-line "this thought contributes to / is related to that one" control.
 * The target list is grouped by thought type so the right kind of thing is
 * easy to find. Picking a target adds the relationship immediately.
 */
export function QuickRelation({ sourceThoughtId }: { sourceThoughtId: string }) {
  const thoughts = useVisibleThoughts()
  const addRelation = useStore((state) => state.addRelation)
  const showToast = useStore((state) => state.showToast)
  const [type, setType] = useState<RelationType>('serves')

  const grouped = useMemo(() => {
    const others = thoughts.filter((thought) => thought.id !== sourceThoughtId)
    return THOUGHT_TYPES.map((thoughtType) => ({
      thoughtType,
      thoughts: others.filter((thought) => thought.type === thoughtType),
    })).filter((group) => group.thoughts.length > 0)
  }, [thoughts, sourceThoughtId])

  const link = (targetThoughtId: string) => {
    if (!targetThoughtId) return
    const result = addRelation(sourceThoughtId, type, targetThoughtId)
    showToast(
      result.ok
        ? (result.warning ?? `Linked: ${label(type)}.`)
        : (result.reason ?? 'That relationship could not be added.'),
    )
  }

  if (grouped.length === 0) return null

  return (
    <div className="row quick-relation">
      <label className="visually-hidden" htmlFor={`quick-type-${sourceThoughtId}`}>
        Relationship
      </label>
      <span className="faint">This</span>
      <select
        id={`quick-type-${sourceThoughtId}`}
        className="select quick-relation__type"
        value={type}
        onChange={(event) => setType(event.target.value as RelationType)}
      >
        {COMMON_FIRST.map((entry) => (
          <option key={entry} value={entry}>
            {label(entry)}
          </option>
        ))}
      </select>

      <label className="visually-hidden" htmlFor={`quick-target-${sourceThoughtId}`}>
        Which thought
      </label>
      <select
        id={`quick-target-${sourceThoughtId}`}
        className="select quick-relation__target"
        value=""
        onChange={(event) => {
          link(event.target.value)
          event.target.value = ''
        }}
      >
        <option value="">Choose a thought…</option>
        {grouped.map((group) => (
          <optgroup key={group.thoughtType} label={THOUGHT_TYPE_LABEL[group.thoughtType]}>
            {group.thoughts.map((thought) => (
              <option key={thought.id} value={thought.id}>
                {thought.text.length > 60 ? `${thought.text.slice(0, 57)}…` : thought.text}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
