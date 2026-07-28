import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmButton } from '../../components/common/ConfirmButton'
import { BUILTIN_DIMENSION, THOUGHT_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import {
  comparisonProgress,
  nextPair,
  rankByScore,
  scoreComparisons,
  type ComparisonMode,
} from '../../domain/comparisons'
import { computeMatrixPoints, type QuadrantId, quadrantTitle } from '../../domain/matrix'
import { comparativePrompt } from '../../domain/prompts'
import type { PairwiseComparison, ThoughtType } from '../../domain/types'
import {
  useActiveDimensions,
  useComparisons,
  useMatrixAxes,
  useStore,
  useVisibleThoughts,
} from '../../store'
import { tx } from '../../i18n/core'

export function CompareScreen() {
  const thoughts = useVisibleThoughts()
  const dimensions = useActiveDimensions()
  const comparisons = useComparisons()
  const { xDimension, yDimension } = useMatrixAxes()
  const recordComparison = useStore((state) => state.recordComparison)
  const clearComparisons = useStore((state) => state.clearComparisons)
  const selectThought = useStore((state) => state.selectThought)

  const comparable = useMemo(
    () => dimensions.filter((dimension) => dimension.id !== BUILTIN_DIMENSION.thoughtType),
    [dimensions],
  )

  const [dimensionId, setDimensionId] = useState<string>(BUILTIN_DIMENSION.importance)
  const [mode, setMode] = useState<ComparisonMode>('quick')
  const [quadrant, setQuadrant] = useState<QuadrantId | ''>('')
  const [typeFilter, setTypeFilter] = useState<ThoughtType | ''>('')

  const dimension =
    comparable.find((entry) => entry.id === dimensionId) ?? comparable[0] ?? null

  const subset = useMemo(() => {
    let selected = thoughts
    if (typeFilter) selected = selected.filter((thought) => thought.type === typeFilter)
    if (quadrant) {
      const { points } = computeMatrixPoints(selected, xDimension, yDimension)
      const ids = new Set(
        points.filter((point) => point.quadrant === quadrant).map((point) => point.thought.id),
      )
      selected = selected.filter((thought) => ids.has(thought.id))
    }
    return selected
  }, [thoughts, typeFilter, quadrant, xDimension, yDimension])

  const subsetIds = useMemo(() => subset.map((thought) => thought.id), [subset])
  const byId = useMemo(() => new Map(subset.map((thought) => [thought.id, thought])), [subset])

  const pair = useMemo(
    () => (dimension ? nextPair(subsetIds, comparisons, dimension.id, mode) : null),
    [subsetIds, comparisons, dimension, mode],
  )

  const progress = useMemo(
    () =>
      dimension
        ? comparisonProgress(subsetIds, comparisons, dimension.id, mode)
        : { completed: 0, skipped: 0, remaining: 0, total: 0 },
    [subsetIds, comparisons, dimension, mode],
  )

  const ranking = useMemo(
    () =>
      dimension ? rankByScore(scoreComparisons(subsetIds, comparisons, dimension.id)) : [],
    [subsetIds, comparisons, dimension],
  )

  // Comparing is repetitive, so the whole round is reachable from the keyboard.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!dimension || !pair) return

      const choose = (result: PairwiseComparison['result']) => {
        event.preventDefault()
        recordComparison(dimension.id, pair[0], pair[1], result)
      }

      if (event.key === 'ArrowLeft') choose('left')
      else if (event.key === 'ArrowRight') choose('right')
      else if (event.key === '=' || event.key === ' ') choose('tie')
      else if (event.key.toLowerCase() === 's') choose('skipped')
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dimension, pair, recordComparison])

  if (!dimension) {
    return <p className="empty-state">No comparable dimensions are active.</p>
  }

  const record = (result: 'left' | 'right' | 'tie' | 'skipped') => {
    if (!pair) return
    recordComparison(dimension.id, pair[0], pair[1], result)
  }

  return (
    <div className="stack">
      <div className="screen-header spread">
        <div>
          <h1>Compare</h1>
          <p>
            Two at a time is easier than ranking everything at once, and it needs no
            classification first. There is no correct answer here.
          </p>
        </div>
        <Link className="button button--primary" to="/matrix">
          Next: Matrix
        </Link>
      </div>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="compare-dimension">Dimension</label>
          <select
            id="compare-dimension"
            className="select"
            value={dimension.id}
            onChange={(event) => setDimensionId(event.target.value)}
          >
            {comparable.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="compare-mode">Mode</label>
          <select
            id="compare-mode"
            className="select"
            value={mode}
            onChange={(event) => setMode(event.target.value as ComparisonMode)}
          >
            <option value="quick">Quick — a few rounds each</option>
            <option value="complete">Complete — every pair</option>
            <option value="manual">Manual — keep going until you stop</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="compare-quadrant">Matrix quadrant</label>
          <select
            id="compare-quadrant"
            className="select"
            value={quadrant}
            onChange={(event) => setQuadrant(event.target.value as QuadrantId | '')}
          >
            <option value="">All quadrants</option>
            {(['highHigh', 'lowHigh', 'highLow', 'lowLow'] as QuadrantId[]).map((id) => (
              <option key={id} value={id}>
                {quadrantTitle(id, xDimension, yDimension)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="compare-type">Thought type</label>
          <select
            id="compare-type"
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
      </div>

      <div className="stack" style={{ gap: 'var(--space-1)' }}>
        <progress
          className="compare-progress"
          max={Math.max(1, progress.total)}
          value={progress.completed + progress.skipped}
          aria-label="Comparison progress"
        />
        <p className="muted" style={{ margin: 0 }} role="status" aria-live="polite">
          {progress.remaining === 0
            ? tx(
                'Nothing left to compare in this mode · {count} recorded',
                '此模式下没有剩余组合 · 已记录 {count} 次',
                { count: progress.completed },
              )
            : tx(
                '{completed} of {total} compared · {remaining} to go',
                '已比较 {completed} / {total} · 还剩 {remaining} 次',
                {
                  completed: progress.completed,
                  total: progress.total,
                  remaining: progress.remaining,
                },
              )}
          {progress.skipped > 0
            ? tx(' · {count} skipped', ' · 已跳过 {count} 次', { count: progress.skipped })
            : null}
          {tx(' · {count} thoughts in this set', ' · 本组 {count} 条想法', {
            count: subset.length,
          })}
        </p>
      </div>

      {pair ? (
        <div className="stack">
          <div>
            {/* Comparative wording, not the single-thought question. */}
            <h2 style={{ marginBottom: 'var(--space-1)' }}>{comparativePrompt(dimension)}</h2>
            {dimension.description ? (
              <p className="faint" style={{ margin: 0 }}>
                {dimension.description}
              </p>
            ) : null}
          </div>
          <div className="compare-pair">
            {[0, 1].map((side) => {
              const thought = byId.get(pair[side])
              return (
                <button
                  key={pair[side]}
                  type="button"
                  className="compare-option"
                  onClick={() => record(side === 0 ? 'left' : 'right')}
                >
                  <span className="compare-option__key faint">{side === 0 ? '←' : '→'}</span>
                  <span>{thought?.text ?? 'Unknown thought'}</span>
                </button>
              )
            })}
          </div>
          <div className="row">
            <button type="button" className="button" onClick={() => record('tie')}>
              About the same <span className="faint">(=)</span>
            </button>
            {/* "Cannot compare" used to sit here doing exactly what Skip does.
                One control, one outcome. */}
            <button
              type="button"
              className="button button--quiet"
              onClick={() => record('skipped')}
            >
              Skip this pair <span className="faint">(S)</span>
            </button>
          </div>
          <p className="faint">
            Arrow keys choose a side. Skipped pairs never affect the ranking, and you can stop
            whenever you like.
          </p>
        </div>
      ) : (
        <p className="empty-state">
          {subset.length < 2
            ? 'Two or more thoughts are needed to compare.'
            : 'No comparisons left in this mode. Switch to Complete or Manual to keep going.'}
        </p>
      )}

      <section className="stack">
        <div className="spread">
          <h2>Current ranking</h2>
          <ConfirmButton
            label="Clear this dimension's history"
            confirmLabel="Confirm clear"
            onConfirm={() => clearComparisons(dimension.id)}
          />
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Thought</th>
                <th scope="col">Score</th>
                <th scope="col">Wins</th>
                <th scope="col">Losses</th>
                <th scope="col">Ties</th>
                <th scope="col">Compared</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry, index) => (
                <tr key={entry.thoughtId}>
                  <td>{index + 1}</td>
                  <td>
                    <button
                      type="button"
                      className="button button--quiet button--small"
                      onClick={() => selectThought(entry.thoughtId)}
                    >
                      {byId.get(entry.thoughtId)?.text ?? 'Unknown thought'}
                    </button>
                  </td>
                  <td>{entry.score}</td>
                  <td>{entry.wins}</td>
                  <td>{entry.losses}</td>
                  <td>{entry.ties}</td>
                  <td>{entry.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ranking.length === 0 ? <p className="muted">Nothing to rank yet.</p> : null}
      </section>
    </div>
  )
}
