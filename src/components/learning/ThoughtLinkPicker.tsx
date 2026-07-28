import { useId, useMemo, useState } from 'react'
import { THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { useVisibleThoughts } from '../../store'

interface ThoughtLinkPickerProps {
  label: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
  /** Optional narrowing, e.g. only values and goals. */
  filter?: (type: string) => boolean
  hint?: string
}

/**
 * Attaches a record to thoughts the user already has. Search plus checkboxes:
 * nothing is suggested automatically, so every link here is one the user made.
 */
export function ThoughtLinkPicker({
  label,
  selectedIds,
  onChange,
  filter,
  hint,
}: ThoughtLinkPickerProps) {
  const thoughts = useVisibleThoughts()
  const id = useId()
  const [query, setQuery] = useState('')

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return thoughts
      .filter((thought) => (filter ? filter(thought.type) : true))
      .filter((thought) => (needle ? thought.text.toLowerCase().includes(needle) : true))
      .slice(0, needle ? 30 : 12)
  }, [thoughts, query, filter])

  const selected = useMemo(
    () => thoughts.filter((thought) => selectedIds.includes(thought.id)),
    [thoughts, selectedIds],
  )

  const toggle = (thoughtId: string) => {
    onChange(
      selectedIds.includes(thoughtId)
        ? selectedIds.filter((entry) => entry !== thoughtId)
        : [...selectedIds, thoughtId],
    )
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? <span className="faint">{hint}</span> : null}

      {selected.length > 0 ? (
        <div className="row">
          {selected.map((thought) => (
            <span key={thought.id} className="chip chip--accent">
              {thought.text}
              <button
                type="button"
                className="button button--quiet button--small"
                aria-label={`Remove link to ${thought.text}`}
                onClick={() => toggle(thought.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <input
        id={id}
        className="input"
        value={query}
        placeholder="Search your thoughts"
        onChange={(event) => setQuery(event.target.value)}
      />

      {thoughts.length === 0 ? (
        <span className="faint">No thoughts to link to yet.</span>
      ) : (
        <div className="stack" style={{ gap: 'var(--space-1)', maxHeight: '12rem', overflowY: 'auto' }}>
          {candidates.map((thought) => (
            <label key={thought.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedIds.includes(thought.id)}
                onChange={() => toggle(thought.id)}
              />
              <span>
                {thought.text}{' '}
                <span className="faint">{THOUGHT_TYPE_LABEL[thought.type]}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
