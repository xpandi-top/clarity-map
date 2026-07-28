import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CollectionBrowser } from '../../components/common/CollectionBrowser'
import { useCollectionBrowser } from '../../components/common/useCollectionBrowser'
import { InlineThoughtDetails } from '../../components/thoughts/ThoughtDetailPanel'
import {
  BUILTIN_DIMENSION,
  MOTIVATION_SHOULD,
  MOTIVATION_WANT,
} from '../../domain/defaults'
import type { Thought } from '../../domain/types'
import { useStore, useVisibleThoughts } from '../../store'

type MotivationFilter = 'all' | 'want' | 'should' | 'unanswered'

const FILTER_LABEL: Record<MotivationFilter, string> = {
  all: 'All',
  want: 'Want',
  should: 'Should',
  unanswered: 'Not answered',
}

const FILTERS: MotivationFilter[] = ['all', 'want', 'should', 'unanswered']

export function CaptureScreen() {
  const thoughts = useVisibleThoughts()
  const addThought = useStore((state) => state.addThought)
  const lastDeletion = useStore((state) => state.lastDeletion)
  const undoDelete = useStore((state) => state.undoDelete)

  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [motivationFilter, setMotivationFilter] = useState<MotivationFilter>('all')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const ordered = useMemo(
    () => [...thoughts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [thoughts],
  )

  const counts = useMemo(() => {
    const tally: Record<MotivationFilter, number> = {
      all: thoughts.length,
      want: 0,
      should: 0,
      unanswered: 0,
    }
    for (const thought of thoughts) {
      const value = thought.dimensionValues[BUILTIN_DIMENSION.motivation]
      if (value === MOTIVATION_WANT) tally.want += 1
      else if (value === MOTIVATION_SHOULD) tally.should += 1
      else tally.unanswered += 1
    }
    return tally
  }, [thoughts])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return ordered.filter((thought) => {
      if (term && !thought.text.toLowerCase().includes(term)) return false
      const value = thought.dimensionValues[BUILTIN_DIMENSION.motivation]
      if (motivationFilter === 'want') return value === MOTIVATION_WANT
      if (motivationFilter === 'should') return value === MOTIVATION_SHOULD
      if (motivationFilter === 'unanswered') return value === undefined
      return true
    })
  }, [ordered, search, motivationFilter])
  const browser = useCollectionBrowser(visible.length)

  const unresolved = counts.unanswered
  const filtered = search.trim().length > 0 || motivationFilter !== 'all'

  const submit = () => {
    if (!draft.trim()) return
    addThought(draft)
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <div className="capture-page">
      <header className="capture-page__header">
        <h1>Capture</h1>
        <p>Write down whatever is taking up space in your mind. You can make sense of it later.</p>
      </header>

      <div className="capture-page__composer">
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
        <div className="capture-page__actions">
          <button
            type="button"
            className="button button--primary"
            disabled={!draft.trim()}
            onClick={submit}
          >
            Add thought
          </button>
          <span className="keyboard-hint">
            <kbd>Enter</kbd> to add · <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
          </span>
        </div>
        <div className="capture-page__meta">
          <p className="muted" style={{ margin: 0 }} role="status" aria-live="polite">
            {thoughts.length} thought{thoughts.length === 1 ? '' : 's'} captured
            {unresolved > 0 ? ` · ${unresolved} without a Want or Should answer` : null}
          </p>
          <div className="row">
            {lastDeletion ? (
              <button type="button" className="button button--small" onClick={undoDelete}>
                Undo last deletion
              </button>
            ) : null}
            <Link className="button" to="/structure">
              Continue to Structure <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        {unresolved > 0 ? (
          <p className="faint" style={{ margin: 0 }}>
            You can leave these unanswered and keep going. It is fine not to know yet.
          </p>
        ) : null}
      </div>

      {ordered.length === 0 ? (
        <p className="empty-state">Nothing captured yet. There is no correct number.</p>
      ) : (
        <>
          <div className="capture-page__filters">
            <div className="field">
              <label htmlFor="capture-search" className="visually-hidden">
                Search your thoughts
              </label>
              <input
                id="capture-search"
                className="input"
                value={search}
                placeholder="Search what you have written"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="row">
              {FILTERS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className="button button--small"
                  aria-pressed={motivationFilter === entry}
                  onClick={() => setMotivationFilter(entry)}
                >
                  {FILTER_LABEL[entry]} <span className="faint">{counts[entry]}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered ? (
            <p className="faint" style={{ margin: 0 }} role="status" aria-live="polite">
              Showing {visible.length} of {thoughts.length}
            </p>
          ) : null}

          <CollectionBrowser
            mode={browser.mode}
            onModeChange={browser.setMode}
            index={browser.index}
            total={visible.length}
            itemLabel="thought"
            onPrevious={browser.previous}
            onNext={browser.next}
          />

          {visible.length === 0 ? (
            <div className="empty-state stack">
              <p style={{ margin: 0 }}>Nothing matches this filter.</p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => {
                    setSearch('')
                    setMotivationFilter('all')
                  }}
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <ul
              className={`capture-list ${
                browser.mode === 'focus' ? 'collection-list--focus' : ''
              }`}
            >
              {visible.slice(browser.start, browser.end).map((thought) => (
                <li
                  key={thought.id}
                  className={browser.mode === 'focus' ? 'focused-thought stack' : undefined}
                >
                  <CaptureEntry thought={thought} focused={browser.mode === 'focus'} />
                  {browser.mode === 'focus' ? (
                    <InlineThoughtDetails thoughtId={thought.id} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function CaptureEntry({ thought, focused = false }: { thought: Thought; focused?: boolean }) {
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
        <span className="capture-entry__question">Does this feel like a want or a should?</span>
        <button
          type="button"
          className="button button--small"
          aria-pressed={motivation === MOTIVATION_WANT}
          onClick={() => choose(MOTIVATION_WANT)}
        >
          Want <span className="shortcut">(W)</span>
        </button>
        <button
          type="button"
          className="button button--small"
          aria-pressed={motivation === MOTIVATION_SHOULD}
          onClick={() => choose(MOTIVATION_SHOULD)}
        >
          Should <span className="shortcut">(S)</span>
        </button>
        <button
          type="button"
          className="button button--small button--quiet"
          aria-pressed={motivation === undefined}
          onClick={() => choose(null)}
        >
          Not sure yet <span className="shortcut">(Esc)</span>
        </button>
      </div>

      {!focused ? (
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
            Open details
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
      ) : null}
    </div>
  )
}
