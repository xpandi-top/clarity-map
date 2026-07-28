import { useId, useMemo, useState } from 'react'
import {
  RELATION_CHOICES_COMMON_FIRST,
  choiceEndpoints,
  findChoice,
} from '../../domain/relationChoices'
import { useStore, useThoughts } from '../../store'
import { t, tx } from '../../i18n/core'

interface RelationEditorProps {
  sourceThoughtId: string
  onDone?: (message: string) => void
}

/**
 * One sentence, one field, one button: pick how this thought relates to
 * another, then name that thought. Typing something new creates it.
 */
export function RelationEditor({ sourceThoughtId, onDone }: RelationEditorProps) {
  const thoughts = useThoughts()
  const addRelation = useStore((state) => state.addRelation)
  const addThought = useStore((state) => state.addThought)

  const fieldId = useId()
  const [choiceKey, setChoiceKey] = useState<string>('serves')
  const [target, setTarget] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const choice = findChoice(choiceKey)

  const candidates = useMemo(
    () => thoughts.filter((thought) => thought.id !== sourceThoughtId),
    [thoughts, sourceThoughtId],
  )

  const trimmed = target.trim()
  const existing = useMemo(
    () =>
      candidates.find((thought) => thought.text.toLowerCase() === trimmed.toLowerCase()) ?? null,
    [candidates, trimmed],
  )

  const link = () => {
    if (!trimmed) return
    const otherId = existing?.id ?? addThought(trimmed)
    if (!otherId) return

    // Reversed choices store the relation the other way round.
    const { sourceThoughtId: from, targetThoughtId: to } = choiceEndpoints(
      choice,
      sourceThoughtId,
      otherId,
    )
    const result = addRelation(from, choice.type, to)

    if (!result.ok) {
      setMessage(result.reason ?? 'That relationship could not be added.')
      return
    }
    const note =
      result.warning ??
      tx('Linked: {relation} {thought}.', '已连接：{relation}“{thought}”。', {
        relation: t(choice.label),
        thought: trimmed,
      })
    setMessage(note)
    setTarget('')
    onDone?.(note)
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-3)' }}>
      <div className="field">
        <label htmlFor={`${fieldId}-type`}>This thought…</label>
        <select
          id={`${fieldId}-type`}
          className="select"
          value={choice.key}
          onChange={(event) => setChoiceKey(event.target.value)}
        >
          {RELATION_CHOICES_COMMON_FIRST.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${fieldId}-target`}>Which thought</label>
        <input
          id={`${fieldId}-target`}
          className="input"
          list={`${fieldId}-options`}
          value={target}
          placeholder="Pick one, or type something new"
          onChange={(event) => {
            setTarget(event.target.value)
            setMessage(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              link()
            }
          }}
        />
        <datalist id={`${fieldId}-options`}>
          {candidates.map((thought) => (
            <option key={thought.id} value={thought.text} />
          ))}
        </datalist>
        <span className="faint">
          {trimmed && !existing
            ? tx(
                '“{thought}” does not exist yet and will be created.',
                '“{thought}”尚不存在，将会创建。',
                { thought: trimmed },
              )
            : 'Choose an existing thought, or type a new one.'}
        </span>
      </div>

      <div className="row">
        <button
          type="button"
          className="button button--primary"
          disabled={trimmed.length === 0}
          onClick={link}
        >
          {existing || !trimmed ? 'Add relationship' : 'Create and link'}
        </button>
      </div>

      {message ? (
        <p className="notice" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
