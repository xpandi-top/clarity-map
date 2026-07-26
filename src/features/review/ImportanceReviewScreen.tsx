import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BUILTIN_DIMENSION, IMPORTANCE_NOT, IMPORTANCE_YES } from '../../domain/defaults'
import type { DimensionValue, Thought } from '../../domain/types'
import { useStore, useVisibleThoughts } from '../../store'

type ReviewFilter = 'all' | 'unanswered' | 'important' | 'notImportant'

const FILTER_LABEL: Record<ReviewFilter, string> = {
  all: 'All',
  unanswered: 'Not answered yet',
  important: 'Marked important',
  notImportant: 'Marked not important',
}

const FILTERS: ReviewFilter[] = ['all', 'unanswered', 'important', 'notImportant']

function importanceOf(thought: Thought): DimensionValue | undefined {
  return thought.dimensionValues[BUILTIN_DIMENSION.importance]
}

function matchesFilter(value: DimensionValue | undefined, filter: ReviewFilter): boolean {
  switch (filter) {
    case 'unanswered':
      return value === undefined
    case 'important':
      return value === IMPORTANCE_YES
    case 'notImportant':
      return value === IMPORTANCE_NOT
    default:
      return true
  }
}

export function ImportanceReviewScreen() {
  const thoughts = useVisibleThoughts()
  const setDimensionValue = useStore((state) => state.setDimensionValue)
  const [index, setIndex] = useState(0)
  const [filter, setFilter] = useState<ReviewFilter>('all')

  const ordered = useMemo(
    () => [...thoughts].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [thoughts],
  )

  const queue = useMemo(
    () => ordered.filter((thought) => matchesFilter(importanceOf(thought), filter)),
    [ordered, filter],
  )

  const counts = useMemo(() => {
    const tally: Record<ReviewFilter, number> = {
      all: ordered.length,
      unanswered: 0,
      important: 0,
      notImportant: 0,
    }
    for (const thought of ordered) {
      const value = importanceOf(thought)
      if (value === undefined) tally.unanswered += 1
      else if (value === IMPORTANCE_YES) tally.important += 1
      else if (value === IMPORTANCE_NOT) tally.notImportant += 1
    }
    return tally
  }, [ordered])

  const safeIndex = queue.length === 0 ? 0 : Math.min(index, queue.length - 1)
  const current = queue[safeIndex]
  const answered = counts.all - counts.unanswered

  const answer = useMemo(
    () => (value: string | null) => {
      if (!current) return
      setDimensionValue(current.id, BUILTIN_DIMENSION.importance, value)
      // When the answer moves this thought out of the current filter the queue
      // shrinks under us, and the next thought slides into the same position.
      const staysInQueue = matchesFilter(value === null ? undefined : value, filter)
      setIndex((position) => {
        const remaining = staysInQueue ? queue.length : queue.length - 1
        if (remaining <= 0) return 0
        const target = staysInQueue ? position + 1 : position
        return Math.min(Math.max(target, 0), remaining - 1)
      })
    },
    [current, filter, queue.length, setDimensionValue],
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(value + 1, queue.length - 1))
      else if (event.key === 'ArrowLeft') setIndex((value) => Math.max(value - 1, 0))
      else if (event.key.toLowerCase() === 'i') answer(IMPORTANCE_YES)
      else if (event.key.toLowerCase() === 'n') answer(IMPORTANCE_NOT)
      else if (event.key === 'Escape') answer(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answer, queue.length])

  const filterBar = (
    <fieldset className="filter-bar" style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="label">Review</legend>
      {FILTERS.map((entry) => (
        <button
          key={entry}
          type="button"
          className="button button--small"
          aria-pressed={filter === entry}
          onClick={() => {
            setFilter(entry)
            setIndex(0)
          }}
        >
          {FILTER_LABEL[entry]} <span className="faint">{counts[entry]}</span>
        </button>
      ))}
    </fieldset>
  )

  if (ordered.length === 0) {
    return (
      <div className="stack">
        <div className="screen-header">
          <h1>Importance review</h1>
        </div>
        <p className="empty-state">
          There is nothing to review yet. <Link to="/capture">Capture a few thoughts first.</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="stack" style={{ maxWidth: '44rem' }}>
      <div className="screen-header">
        <h1>Is this important to you?</h1>
        <p>Important to you, not important in general. You can change this later.</p>
      </div>

      {filterBar}

      <p className="faint" style={{ margin: 0 }} role="status" aria-live="polite">
        {answered} of {counts.all} answered
        {counts.unanswered > 0 ? ` · ${counts.unanswered} still to go` : ' · all done'}
      </p>

      {current ? (
        <>
          <div className="card stack">
            <p className="faint" style={{ margin: 0 }}>
              {filter === 'all'
                ? `Thought ${safeIndex + 1} of ${queue.length}`
                : `${FILTER_LABEL[filter]}: ${safeIndex + 1} of ${queue.length}`}
            </p>
            <p style={{ fontSize: '1.3rem', whiteSpace: 'pre-wrap', margin: 0 }}>
              {current.text}
            </p>

            <div className="row" role="group" aria-label="Is this important to you?">
              <button
                type="button"
                className="button"
                aria-pressed={importanceOf(current) === IMPORTANCE_YES}
                onClick={() => answer(IMPORTANCE_YES)}
              >
                Important <span className="faint">(I)</span>
              </button>
              <button
                type="button"
                className="button"
                aria-pressed={importanceOf(current) === IMPORTANCE_NOT}
                onClick={() => answer(IMPORTANCE_NOT)}
              >
                Not important <span className="faint">(N)</span>
              </button>
              <button
                type="button"
                className="button button--quiet"
                aria-pressed={importanceOf(current) === undefined}
                onClick={() => answer(null)}
              >
                Not sure yet <span className="faint">(Esc)</span>
              </button>
            </div>
          </div>

          <div className="spread">
            <div className="row">
              <button
                type="button"
                className="button"
                disabled={safeIndex === 0}
                onClick={() => setIndex((position) => Math.max(position - 1, 0))}
              >
                Previous
              </button>
              <button
                type="button"
                className="button"
                disabled={safeIndex >= queue.length - 1}
                onClick={() => setIndex((position) => Math.min(position + 1, queue.length - 1))}
              >
                Next
              </button>
            </div>
            <Link className="button button--primary" to="/matrix">
              Next: Open the matrix
            </Link>
          </div>
        </>
      ) : (
        <div className="empty-state stack">
          <p style={{ margin: 0 }}>
            {filter === 'unanswered'
              ? 'Every thought has an answer. There is nothing left in this view.'
              : 'No thoughts match this filter yet.'}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="button button--small"
              onClick={() => {
                setFilter('all')
                setIndex(0)
              }}
            >
              Show all thoughts
            </button>
            <Link className="button button--small button--primary" to="/matrix">
              Open the matrix
            </Link>
          </div>
        </div>
      )}

      <p className="faint">
        Arrow keys move between thoughts. You can leave and return at any time.
      </p>
    </div>
  )
}
