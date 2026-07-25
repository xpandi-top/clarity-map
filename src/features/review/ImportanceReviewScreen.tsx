import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BUILTIN_DIMENSION,
  IMPORTANCE_NOT,
  IMPORTANCE_YES,
} from '../../domain/defaults'
import { useStore, useVisibleThoughts } from '../../store'

export function ImportanceReviewScreen() {
  const thoughts = useVisibleThoughts()
  const setDimensionValue = useStore((state) => state.setDimensionValue)
  const [index, setIndex] = useState(0)

  const ordered = useMemo(
    () => [...thoughts].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [thoughts],
  )

  const safeIndex = ordered.length === 0 ? 0 : Math.min(index, ordered.length - 1)
  const current = ordered[safeIndex]

  const answered = ordered.filter(
    (thought) => thought.dimensionValues[BUILTIN_DIMENSION.importance] !== undefined,
  ).length

  const answer = useMemo(
    () => (value: string | null) => {
      if (!current) return
      setDimensionValue(current.id, BUILTIN_DIMENSION.importance, value)
      setIndex((position) => Math.min(position + 1, ordered.length - 1))
    },
    [current, ordered.length, setDimensionValue],
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(value + 1, ordered.length - 1))
      else if (event.key === 'ArrowLeft') setIndex((value) => Math.max(value - 1, 0))
      else if (event.key.toLowerCase() === 'i') answer(IMPORTANCE_YES)
      else if (event.key.toLowerCase() === 'n') answer(IMPORTANCE_NOT)
      else if (event.key === 'Escape') answer(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answer, ordered.length])

  if (!current) {
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

  const value = current.dimensionValues[BUILTIN_DIMENSION.importance]

  return (
    <div className="stack" style={{ maxWidth: '44rem' }}>
      <div className="screen-header">
        <h1>Is this important to you?</h1>
        <p>Important to you, not important in general. You can change this later.</p>
      </div>

      <div className="card stack">
        <p className="faint" style={{ margin: 0 }}>
          Thought {safeIndex + 1} of {ordered.length} · {answered} answered
        </p>
        <p style={{ fontSize: '1.3rem', whiteSpace: 'pre-wrap', margin: 0 }}>{current.text}</p>

        <div className="row" role="group" aria-label="Is this important to you?">
          <button
            type="button"
            className="button"
            aria-pressed={value === IMPORTANCE_YES}
            onClick={() => answer(IMPORTANCE_YES)}
          >
            Important <span className="faint">(I)</span>
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={value === IMPORTANCE_NOT}
            onClick={() => answer(IMPORTANCE_NOT)}
          >
            Not important <span className="faint">(N)</span>
          </button>
          <button
            type="button"
            className="button button--quiet"
            aria-pressed={value === undefined}
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
            disabled={safeIndex >= ordered.length - 1}
            onClick={() =>
              setIndex((position) => Math.min(position + 1, ordered.length - 1))
            }
          >
            Next
          </button>
        </div>
        <Link className="button button--primary" to="/matrix">
          Next: Open the matrix
        </Link>
      </div>

      <p className="faint">
        Arrow keys move between thoughts. You can leave and return at any time.
      </p>
    </div>
  )
}
