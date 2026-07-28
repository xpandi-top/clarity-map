import { useMemo, useState } from 'react'
import { THOUGHT_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import {
  RELATION_CHOICES_COMMON_FIRST,
  choiceEndpoints,
  findChoice,
} from '../../domain/relationChoices'
import { useStore, useVisibleThoughts } from '../../store'
import { t, tx } from '../../i18n/core'

/**
 * One-line "this thought serves / is served by that one" control. Both
 * readings are offered, and the target list is grouped by thought type so the
 * right kind of thing is easy to find. Picking a target links immediately.
 */
export function QuickRelation({ sourceThoughtId }: { sourceThoughtId: string }) {
  const thoughts = useVisibleThoughts()
  const addRelation = useStore((state) => state.addRelation)
  const showToast = useStore((state) => state.showToast)
  const [choiceKey, setChoiceKey] = useState<string>('serves')

  const choice = findChoice(choiceKey)

  const grouped = useMemo(() => {
    const others = thoughts.filter((thought) => thought.id !== sourceThoughtId)
    return THOUGHT_TYPES.map((thoughtType) => ({
      thoughtType,
      thoughts: others.filter((thought) => thought.type === thoughtType),
    })).filter((group) => group.thoughts.length > 0)
  }, [thoughts, sourceThoughtId])

  const link = (targetThoughtId: string) => {
    if (!targetThoughtId) return
    const { sourceThoughtId: from, targetThoughtId: to } = choiceEndpoints(
      choice,
      sourceThoughtId,
      targetThoughtId,
    )
    const result = addRelation(from, choice.type, to)
    showToast(
      result.ok
        ? (result.warning ??
          tx('Linked: {relation}.', '已连接：{relation}。', {
            relation: t(choice.label),
          }))
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
        value={choice.key}
        onChange={(event) => setChoiceKey(event.target.value)}
      >
        {RELATION_CHOICES_COMMON_FIRST.map((entry) => (
          <option key={entry.key} value={entry.key}>
            {entry.label}
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
