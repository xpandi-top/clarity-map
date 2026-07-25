import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BUILTIN_DIMENSION,
  MOTIVATION_SHOULD,
  MOTIVATION_WANT,
} from '../../domain/defaults'
import type { Thought } from '../../domain/types'
import { useStore, useVisibleThoughts } from '../../store'

export function CaptureScreen() {
  const thoughts = useVisibleThoughts()
  const addThought = useStore((state) => state.addThought)
  const lastDeletion = useStore((state) => state.lastDeletion)
  const undoDelete = useStore((state) => state.undoDelete)

  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const ordered = useMemo(
    () => [...thoughts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [thoughts],
  )

  const unresolved = thoughts.filter(
    (thought) => thought.dimensionValues[BUILTIN_DIMENSION.motivation] === undefined,
  ).length

  const submit = () => {
    if (!draft.trim()) return
    addThought(draft)
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>Capture</h1>
        <p>Record first, interpret later. Press Enter to keep a thought, Shift+Enter for a new line.</p>
      </div>

      <div>
        <label htmlFor="capture-input" className="visually-hidden">
          Write a thought
        </label>
        <textarea
          id="capture-input"
          ref={inputRef}
          className="capture-input"
          value={draft}
          placeholder="What is on your mind?"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
        />
      </div>

      <div className="spread">
        <p className="muted" style={{ margin: 0 }}>
          {thoughts.length} thought{thoughts.length === 1 ? '' : 's'} captured
          {unresolved > 0 ? ` · ${unresolved} without a Want or Should answer` : null}
        </p>
        <div className="row">
          {lastDeletion ? (
            <button type="button" className="button button--small" onClick={undoDelete}>
              Undo last deletion
            </button>
          ) : null}
          <Link className="button button--primary" to="/review/importance">
            Next: Review importance
          </Link>
        </div>
      </div>

      {unresolved > 0 ? (
        <p className="faint">
          You can leave these unanswered and keep going. It is fine not to know yet.
        </p>
      ) : null}

      <ul className="capture-list">
        {ordered.map((thought) => (
          <li key={thought.id}>
            <CaptureEntry thought={thought} />
          </li>
        ))}
      </ul>

      {ordered.length === 0 ? (
        <p className="empty-state">Nothing captured yet. There is no correct number.</p>
      ) : null}
    </div>
  )
}

function CaptureEntry({ thought }: { thought: Thought }) {
  const updateThought = useStore((state) => state.updateThought)
  const deleteThought = useStore((state) => state.deleteThought)
  const setDimensionValue = useStore((state) => state.setDimensionValue)
  const selectThought = useStore((state) => state.selectThought)
  const showToast = useStore((state) => state.showToast)

  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(thought.text)

  const motivation = thought.dimensionValues[BUILTIN_DIMENSION.motivation]

  const choose = (value: string | null) => {
    setDimensionValue(thought.id, BUILTIN_DIMENSION.motivation, value)
  }

  return (
    <div className="capture-entry">
      {editing ? (
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <label className="visually-hidden" htmlFor={`edit-${thought.id}`}>
            Edit thought
          </label>
          <textarea
            id={`edit-${thought.id}`}
            className="textarea"
            value={text}
            autoFocus
            onChange={(event) => setText(event.target.value)}
          />
          <div className="row">
            <button
              type="button"
              className="button button--small button--primary"
              onClick={() => {
                updateThought(thought.id, { text })
                setEditing(false)
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="button button--small button--quiet"
              onClick={() => {
                setText(thought.text)
                setEditing(false)
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{thought.text}</p>
      )}

      <div
        role="group"
        aria-label={`Does “${thought.text}” feel like something you want to do, or something you believe you should do?`}
        className="row"
        onKeyDown={(event) => {
          const key = event.key.toLowerCase()
          if (key === 'w') {
            event.preventDefault()
            choose(MOTIVATION_WANT)
          } else if (key === 's') {
            event.preventDefault()
            choose(MOTIVATION_SHOULD)
          } else if (event.key === 'Escape') {
            event.preventDefault()
            choose(null)
          }
        }}
      >
        <span className="faint">Want, or should?</span>
        <button
          type="button"
          className="button button--small"
          aria-pressed={motivation === MOTIVATION_WANT}
          onClick={() => choose(MOTIVATION_WANT)}
        >
          Want <span className="faint">(W)</span>
        </button>
        <button
          type="button"
          className="button button--small"
          aria-pressed={motivation === MOTIVATION_SHOULD}
          onClick={() => choose(MOTIVATION_SHOULD)}
        >
          Should <span className="faint">(S)</span>
        </button>
        <button
          type="button"
          className="button button--small button--quiet"
          aria-pressed={motivation === undefined}
          onClick={() => choose(null)}
        >
          Not sure yet <span className="faint">(Esc)</span>
        </button>
      </div>

      <div className="row">
        <button
          type="button"
          className="button button--quiet button--small"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? 'Stop editing' : 'Edit'}
        </button>
        <button
          type="button"
          className="button button--quiet button--small"
          onClick={() => selectThought(thought.id)}
        >
          Details
        </button>
        <button
          type="button"
          className="button button--quiet button--small"
          onClick={() => {
            deleteThought(thought.id)
            showToast('Thought deleted.')
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
