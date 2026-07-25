import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '../../components/common/Dialog'
import { MatrixPlot } from '../../components/matrix/MatrixPlot'
import { ThoughtButton } from '../../components/thoughts/ThoughtButton'
import { THOUGHT_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import {
  QUADRANTS,
  computeMatrixPoints,
  matrixLayout,
  quadrantTitle,
  valueForPosition,
  type QuadrantId,
} from '../../domain/matrix'
import { allTags, filterThoughts } from '../../domain/selectors'
import type { ThoughtStatus, ThoughtType } from '../../domain/types'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useActiveDimensions, useMatrixAxes, useStore, useThoughts } from '../../store'

export function MatrixScreen() {
  const thoughts = useThoughts()
  const dimensions = useActiveDimensions()
  const { xDimension, yDimension } = useMatrixAxes()
  const setMatrixAxes = useStore((state) => state.setMatrixAxes)
  const setDimensionValue = useStore((state) => state.setDimensionValue)
  const selectThought = useStore((state) => state.selectThought)
  const selectedThoughtId = useStore((state) => state.selectedThoughtId)
  const showToast = useStore((state) => state.showToast)

  const isNarrow = useMediaQuery('(max-width: 760px)')
  const [forceList, setForceList] = useState(false)
  const listMode = isNarrow || forceList

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ThoughtType | ''>('')
  const [statusFilter, setStatusFilter] = useState<ThoughtStatus>('active')
  const [tagFilter, setTagFilter] = useState('')
  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null)

  const tags = useMemo(() => allTags(thoughts), [thoughts])

  const filtered = useMemo(
    () =>
      filterThoughts(thoughts, {
        search,
        types: typeFilter ? [typeFilter] : undefined,
        statuses: [statusFilter],
        tags: tagFilter ? [tagFilter] : undefined,
      }),
    [thoughts, search, typeFilter, statusFilter, tagFilter],
  )

  const { points, unresolved } = useMemo(
    () => computeMatrixPoints(filtered, xDimension, yDimension),
    [filtered, xDimension, yDimension],
  )

  const layout = matrixLayout(xDimension, yDimension)

  const move = (thoughtId: string, x: number, y: number) => {
    setDimensionValue(thoughtId, xDimension.id, valueForPosition(xDimension, x))
    setDimensionValue(thoughtId, yDimension.id, valueForPosition(yDimension, y))
    showToast('Position updated.')
  }

  if (!xDimension || !yDimension) {
    return <p className="empty-state">No dimensions are active. Add one in settings.</p>
  }

  const quadrantPoints = (quadrant: QuadrantId) =>
    points.filter((point) => point.quadrant === quadrant)

  return (
    <div className="stack">
      <div className="screen-header spread">
        <div>
          <h1>Matrix</h1>
          <p>This is one way to view your thoughts. Nothing here is a verdict.</p>
        </div>
        <button
          type="button"
          className="button"
          aria-pressed={listMode}
          disabled={isNarrow}
          onClick={() => setForceList((value) => !value)}
        >
          {listMode ? 'Showing lists' : 'Switch to lists'}
        </button>
      </div>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="matrix-x">Horizontal axis</label>
          <select
            id="matrix-x"
            className="select"
            value={xDimension.id}
            onChange={(event) => setMatrixAxes({ x: event.target.value, y: yDimension.id })}
          >
            {dimensions.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="matrix-y">Vertical axis</label>
          <select
            id="matrix-y"
            className="select"
            value={yDimension.id}
            onChange={(event) => setMatrixAxes({ x: xDimension.id, y: event.target.value })}
          >
            {dimensions.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="matrix-search">Search</label>
          <input
            id="matrix-search"
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="matrix-type">Type</label>
          <select
            id="matrix-type"
            className="select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as ThoughtType | '')}
          >
            <option value="">All types</option>
            {THOUGHT_TYPES.map((type) => (
              <option key={type} value={type}>
                {THOUGHT_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="matrix-status">Status</label>
          <select
            id="matrix-status"
            className="select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ThoughtStatus)}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        {tags.length > 0 ? (
          <div className="field">
            <label htmlFor="matrix-tag">Tag</label>
            <select
              id="matrix-tag"
              className="select"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
            >
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {listMode ? (
        <div className="quadrant-grid">
          {layout === 'quadrant' ? (
            QUADRANTS.map((quadrant) => (
              <section key={quadrant.id} className="card quadrant-card">
                <h3>{quadrantTitle(quadrant.id, xDimension, yDimension)}</h3>
                <p className="faint">{quadrantPoints(quadrant.id).length} thoughts</p>
                <ul className="stack" style={{ gap: 'var(--space-2)' }}>
                  {quadrantPoints(quadrant.id).map((point) => (
                    <li key={point.thought.id}>
                      <ThoughtButton
                        thought={point.thought}
                        onSelect={selectThought}
                        selected={selectedThoughtId === point.thought.id}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <section className="card">
              <h3>All plotted thoughts</h3>
              <ul className="stack" style={{ gap: 'var(--space-2)' }}>
                {points.map((point) => (
                  <li key={point.thought.id}>
                    <ThoughtButton thought={point.thought} onSelect={selectThought} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <MatrixPlot
          points={points}
          xDimension={xDimension}
          yDimension={yDimension}
          selectedThoughtId={selectedThoughtId}
          onSelect={selectThought}
          onMove={move}
          onOpenQuadrant={setOpenQuadrant}
        />
      )}

      <section className="stack">
        <h2>Not placed yet ({unresolved.length})</h2>
        {unresolved.length === 0 ? (
          <p className="faint">Every visible thought has both answers.</p>
        ) : (
          <>
            <p className="faint">
              These are missing an answer for {xDimension.name} or {yDimension.name}. Open one to
              answer, or work through them in{' '}
              <Link to="/review/importance">the importance review</Link>.
            </p>
            <ul className="stack" style={{ gap: 'var(--space-2)' }}>
              {unresolved.map((thought) => (
                <li key={thought.id}>
                  <ThoughtButton thought={thought} onSelect={selectThought} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {openQuadrant ? (
        <Dialog
          variant="modal"
          title={quadrantTitle(openQuadrant, xDimension, yDimension)}
          onClose={() => setOpenQuadrant(null)}
        >
          <ul className="stack" style={{ gap: 'var(--space-2)' }}>
            {quadrantPoints(openQuadrant).map((point) => (
              <li key={point.thought.id}>
                <ThoughtButton
                  thought={point.thought}
                  onSelect={(id) => {
                    setOpenQuadrant(null)
                    selectThought(id)
                  }}
                />
              </li>
            ))}
          </ul>
          {quadrantPoints(openQuadrant).length === 0 ? (
            <p className="muted">Nothing here yet.</p>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  )
}
