import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '../../components/common/Dialog'
import { DimensionCreateDialog } from '../../components/dimensions/DimensionCreateDialog'
import { MatrixPlot } from '../../components/matrix/MatrixPlot'
import { QuadrantBoard } from '../../components/matrix/QuadrantBoard'
import { ThoughtButton } from '../../components/thoughts/ThoughtButton'
import { BUILTIN_DIMENSION, THOUGHT_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import {
  computeMatrixPoints,
  getDimensionValue,
  matrixLayout,
  quadrantOf,
  quadrantTitle,
  valueForHalf,
  valueForPosition,
  type QuadrantId,
} from '../../domain/matrix'
import {
  RANK_AXIS_PREFIX,
  createRankAwareResolver,
  createRankAxes,
  isRankAxis,
  rankScores,
  rankedDimensionId,
} from '../../domain/rankingAxis'
import { ORDER_LABEL, hasComparisonData, orderThoughts, type ThoughtOrder } from '../../domain/ordering'
import { allTags, filterThoughts } from '../../domain/selectors'
import type { Thought, ThoughtStatus, ThoughtType } from '../../domain/types'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { t, tx } from '../../i18n/core'
import {
  useActiveDimensions,
  useComparisons,
  useMatrixAxes,
  useStore,
  useThoughts,
} from '../../store'

/** Sentinel value for the "create a dimension" entry in the axis pickers. */
const CREATE_DIMENSION = '__create_dimension__'

export function MatrixScreen() {
  const thoughts = useThoughts()
  const dimensions = useActiveDimensions()
  const comparisons = useComparisons()
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
  // Which axis the "create a dimension" option was chosen from.
  const [creatingFor, setCreatingFor] = useState<'x' | 'y' | null>(null)
  const [order, setOrder] = useState<ThoughtOrder>('comparison')
  const [rankDimensionId, setRankDimensionId] = useState<string>(BUILTIN_DIMENSION.importance)

  const tags = useMemo(() => allTags(thoughts), [thoughts])

  const comparableDimensions = useMemo(
    () => dimensions.filter((dimension) => dimension.id !== BUILTIN_DIMENSION.thoughtType),
    [dimensions],
  )

  /** Synthetic axes fed by the pairwise ranking rather than stored answers. */
  const rankAxes = useMemo(
    () => createRankAxes(dimensions, [BUILTIN_DIMENSION.thoughtType]),
    [dimensions],
  )

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

  const sorted = useMemo(
    () =>
      orderThoughts(filtered, {
        order,
        comparisons,
        dimensionId: rankDimensionId,
      }),
    [filtered, order, comparisons, rankDimensionId],
  )

  /** Ranking tables for whichever ranking axes are currently plotted. */
  const resolveValue = useMemo(() => {
    const tables = new Map<string, Map<string, number | null>>()
    for (const axis of [xDimension, yDimension]) {
      if (axis && isRankAxis(axis.id) && !tables.has(axis.id)) {
        tables.set(axis.id, rankScores(thoughts, comparisons, rankedDimensionId(axis.id)))
      }
    }
    return createRankAwareResolver(getDimensionValue, tables)
  }, [xDimension, yDimension, thoughts, comparisons])

  const { points, unresolved } = useMemo(
    () => computeMatrixPoints(sorted, xDimension, yDimension, resolveValue),
    [sorted, xDimension, yDimension, resolveValue],
  )

  /** Ordered thoughts bucketed by quadrant, for the board view. */
  const groups = useMemo(() => {
    const buckets: Record<QuadrantId, Thought[]> = {
      lowHigh: [],
      highHigh: [],
      lowLow: [],
      highLow: [],
    }
    for (const thought of sorted) {
      const quadrant = quadrantOf(thought, xDimension, yDimension, resolveValue)
      if (quadrant) buckets[quadrant].push(thought)
    }
    return buckets
  }, [sorted, xDimension, yDimension, resolveValue])

  const rankingAvailable = useMemo(
    () => hasComparisonData(filtered, comparisons, rankDimensionId),
    [filtered, comparisons, rankDimensionId],
  )

  const layout = matrixLayout(xDimension, yDimension)

  // A ranking axis is derived from comparisons, so there is nothing to write
  // to. Say so rather than silently ignoring half of a drag.
  const lockedAxes = [xDimension, yDimension].filter((axis) => axis && isRankAxis(axis.id))
  const bothAxesLocked = lockedAxes.length === 2

  const reportLocked = () => {
    showToast(
      bothAxesLocked
        ? 'Both axes come from your comparisons. Change a position in Compare.'
        : tx(
            '{name} comes from your comparisons and cannot be dragged. The other axis was updated.',
            '“{name}”来自比较结果，不能拖动。另一个坐标轴已更新。',
            { name: t(lockedAxes[0].name) },
          ),
    )
  }

  const move = (thoughtId: string, x: number, y: number) => {
    if (!isRankAxis(xDimension.id)) {
      setDimensionValue(thoughtId, xDimension.id, valueForPosition(xDimension, x))
    }
    if (!isRankAxis(yDimension.id)) {
      setDimensionValue(thoughtId, yDimension.id, valueForPosition(yDimension, y))
    }
    if (lockedAxes.length > 0) reportLocked()
    else showToast('Position updated.')
  }

  const moveToQuadrant = (thoughtId: string, quadrant: QuadrantId) => {
    const xHigh = quadrant === 'highHigh' || quadrant === 'highLow'
    const yHigh = quadrant === 'highHigh' || quadrant === 'lowHigh'
    if (!isRankAxis(xDimension.id)) {
      setDimensionValue(thoughtId, xDimension.id, valueForHalf(xDimension, xHigh))
    }
    if (!isRankAxis(yDimension.id)) {
      setDimensionValue(thoughtId, yDimension.id, valueForHalf(yDimension, yHigh))
    }
    if (lockedAxes.length > 0) reportLocked()
    else
      showToast(
        tx('Moved to {quadrant}.', '已移到“{quadrant}”。', {
          quadrant: t(quadrantTitle(quadrant, xDimension, yDimension)),
        }),
      )
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
          <p>
            This is one way to view your thoughts. Nothing here is a verdict. Axes can be an
            answer you gave, or a ranking built from your comparisons.
          </p>
        </div>
        {layout === 'quadrant' ? null : (
          <button
            type="button"
            className="button"
            aria-pressed={listMode}
            disabled={isNarrow}
            onClick={() => setForceList((value) => !value)}
          >
            {listMode ? 'Showing lists' : 'Switch to lists'}
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="matrix-x">Horizontal axis</label>
          <select
            id="matrix-x"
            className="select"
            value={xDimension.id}
            onChange={(event) => {
              if (event.target.value === CREATE_DIMENSION) {
                setCreatingFor('x')
                return
              }
              setMatrixAxes({ x: event.target.value, y: yDimension.id })
            }}
          >
            <optgroup label="Answers stored on each thought">
              {dimensions.map((dimension) => (
                <option key={dimension.id} value={dimension.id}>
                  {dimension.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="From your comparisons">
              {rankAxes.map((axis) => (
                <option key={axis.id} value={axis.id}>
                  {axis.name}
                </option>
              ))}
            </optgroup>
            <option value={CREATE_DIMENSION}>+ Create a dimension…</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="matrix-y">Vertical axis</label>
          <select
            id="matrix-y"
            className="select"
            value={yDimension.id}
            onChange={(event) => {
              if (event.target.value === CREATE_DIMENSION) {
                setCreatingFor('y')
                return
              }
              setMatrixAxes({ x: xDimension.id, y: event.target.value })
            }}
          >
            <optgroup label="Answers stored on each thought">
              {dimensions.map((dimension) => (
                <option key={dimension.id} value={dimension.id}>
                  {dimension.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="From your comparisons">
              {rankAxes.map((axis) => (
                <option key={axis.id} value={axis.id}>
                  {axis.name}
                </option>
              ))}
            </optgroup>
            <option value={CREATE_DIMENSION}>+ Create a dimension…</option>
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
        <div className="field">
          <label htmlFor="matrix-order">Order by</label>
          <select
            id="matrix-order"
            className="select"
            value={order}
            onChange={(event) => setOrder(event.target.value as ThoughtOrder)}
          >
            {(Object.keys(ORDER_LABEL) as ThoughtOrder[]).map((entry) => (
              <option key={entry} value={entry}>
                {ORDER_LABEL[entry]}
              </option>
            ))}
          </select>
        </div>
        {order === 'comparison' ? (
          <div className="field">
            <label htmlFor="matrix-rank-dimension">Ranked on</label>
            <select
              id="matrix-rank-dimension"
              className="select"
              value={rankDimensionId}
              onChange={(event) => setRankDimensionId(event.target.value)}
            >
              {comparableDimensions.map((dimension) => (
                <option key={dimension.id} value={dimension.id}>
                  {dimension.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
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

      {rankAxes.length >= 2 ? (
        <div className="row">
          <button
            type="button"
            className="button button--small"
            aria-pressed={bothAxesLocked}
            onClick={() =>
              setMatrixAxes(
                bothAxesLocked
                  ? { x: BUILTIN_DIMENSION.motivation, y: BUILTIN_DIMENSION.importance }
                  : {
                      x: `${RANK_AXIS_PREFIX}${BUILTIN_DIMENSION.priority}`,
                      y: `${RANK_AXIS_PREFIX}${BUILTIN_DIMENSION.importance}`,
                    },
              )
            }
          >
            {bothAxesLocked ? 'Back to answered axes' : 'Plot by ranking instead'}
          </button>
          {bothAxesLocked ? (
            <span className="faint">
              Both axes come from Compare, so nothing had to be classified as Want, Should, or
              important first.
            </span>
          ) : null}
        </div>
      ) : null}

      {order === 'comparison' ? (
        <p className="faint" style={{ margin: 0 }}>
          {rankingAvailable
            ? 'Ordered by your pairwise ranking. Thoughts you have not compared yet come last.'
            : 'No comparisons recorded for this dimension yet, so priority is used instead.'}{' '}
          <Link to="/compare">Open Compare</Link>
        </p>
      ) : null}

      {layout === 'quadrant' ? (
        <>
          <QuadrantBoard
            groups={groups}
            xDimension={xDimension}
            yDimension={yDimension}
            selectedThoughtId={selectedThoughtId}
            onSelect={selectThought}
            onMoveToQuadrant={moveToQuadrant}
            onOpenQuadrant={setOpenQuadrant}
            showRank={order === 'comparison' && rankingAvailable}
          />
          <p className="faint" style={{ margin: 0 }}>
            Drag a card into another quadrant to change its answers. You can also open a thought
            and change them there.
          </p>
        </>
      ) : listMode ? (
        <div className="quadrant-grid">
          <section className="card">
            <h3>All plotted thoughts</h3>
            <ul className="stack" style={{ gap: 'var(--space-2)' }}>
              {points.map((point) => (
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
              These are missing an answer for {xDimension.name} or {yDimension.name}. Open a
              thought to answer in its details, or use <Link to="/compare">Compare</Link> to build
              a relative ranking.
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

      {creatingFor ? (
        <DimensionCreateDialog
          intro={tx(
            'This becomes the {axis} axis as soon as it is created. Two-choice dimensions draw quadrants; scales draw a scatter.',
            '创建后会立即成为{axis}。二选一维度显示象限，量表维度显示散点图。',
            { axis: creatingFor === 'x' ? '横轴' : '纵轴' },
          )}
          onClose={() => setCreatingFor(null)}
          onCreated={(dimensionId) =>
            setMatrixAxes(
              creatingFor === 'x'
                ? { x: dimensionId, y: yDimension.id }
                : { x: xDimension.id, y: dimensionId },
            )
          }
        />
      ) : null}

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
