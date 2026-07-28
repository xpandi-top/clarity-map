import { useState } from 'react'
import {
  BUILTIN_DIMENSION,
  MOTIVATION_SHOULD,
  MOTIVATION_WANT,
  THOUGHT_TYPE_LABEL,
} from '../../domain/defaults'
import { QUADRANTS, highLabel, lowLabel, quadrantTitle, type QuadrantId } from '../../domain/matrix'
import type { Dimension, Thought } from '../../domain/types'
import { t, tx } from '../../i18n/core'

interface QuadrantBoardProps {
  /** Thoughts already ordered, grouped by quadrant. */
  groups: Record<QuadrantId, Thought[]>
  xDimension: Dimension
  yDimension: Dimension
  selectedThoughtId: string | null
  onSelect: (thoughtId: string) => void
  onMoveToQuadrant: (thoughtId: string, quadrant: QuadrantId) => void
  onOpenQuadrant: (quadrant: QuadrantId) => void
  /** Rank number to show on each card, when ordering by comparison. */
  showRank: boolean
}

function halves(quadrant: QuadrantId, xDimension: Dimension, yDimension: Dimension): string {
  const x = quadrant === 'highHigh' || quadrant === 'highLow'
    ? highLabel(xDimension)
    : lowLabel(xDimension)
  const y = quadrant === 'highHigh' || quadrant === 'lowHigh'
    ? highLabel(yDimension)
    : lowLabel(yDimension)
  return `${t(x)} · ${t(y)}`
}

/**
 * Binary axes give four buckets rather than meaningful coordinates, so the
 * board lists each quadrant instead of scattering overlapping cards. Cards can
 * be dragged between quadrants; the same change is available from the detail
 * panel for anyone not using a pointer.
 */
export function QuadrantBoard({
  groups,
  xDimension,
  yDimension,
  selectedThoughtId,
  onSelect,
  onMoveToQuadrant,
  onOpenQuadrant,
  showRank,
}: QuadrantBoardProps) {
  const [dragOver, setDragOver] = useState<QuadrantId | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  return (
    <div className="quadrant-board-frame">
      <div className="quadrant-board__axis-x" aria-hidden="true">
        <span>{lowLabel(xDimension)}</span>
        <span className="faint">{xDimension.name}</span>
        <span>{highLabel(xDimension)}</span>
      </div>

      <div className="quadrant-board__axis-y" aria-hidden="true">
        <span>{highLabel(yDimension)}</span>
        <span className="faint">{yDimension.name}</span>
        <span>{lowLabel(yDimension)}</span>
      </div>

      <div className="quadrant-board">
        {QUADRANTS.map((quadrant) => {
          const thoughts = groups[quadrant.id] ?? []
          return (
            <section
              key={quadrant.id}
              className={`quadrant-panel${dragOver === quadrant.id ? ' is-drop-target' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                if (dragOver !== quadrant.id) setDragOver(quadrant.id)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragOver((current) => (current === quadrant.id ? null : current))
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                const thoughtId = event.dataTransfer.getData('text/plain')
                setDragOver(null)
                setDragging(null)
                if (thoughtId) onMoveToQuadrant(thoughtId, quadrant.id)
              }}
            >
              <header className="quadrant-panel__header">
                <button
                  type="button"
                  className="quadrant-panel__title"
                  onClick={() => onOpenQuadrant(quadrant.id)}
                >
                  {quadrantTitle(quadrant.id, xDimension, yDimension)}
                </button>
                <p className="faint" style={{ margin: 0 }}>
                  {halves(quadrant.id, xDimension, yDimension)} · {thoughts.length}
                </p>
              </header>

              <ul className="quadrant-panel__list">
                {thoughts.map((thought, index) => {
                  const motivation = thought.dimensionValues[BUILTIN_DIMENSION.motivation]
                  const motivationClass =
                    motivation === MOTIVATION_WANT
                      ? ' quadrant-card--want'
                      : motivation === MOTIVATION_SHOULD
                        ? ' quadrant-card--should'
                        : ''
                  return (
                    <li key={thought.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        aria-label={tx(
                          '{thought}. Open details.',
                          '{thought}。打开详情。',
                          { thought: thought.text },
                        )}
                        className={`quadrant-card${motivationClass}${
                          selectedThoughtId === thought.id ? ' is-selected' : ''
                        }${dragging === thought.id ? ' is-dragging' : ''}`}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', thought.id)
                          event.dataTransfer.effectAllowed = 'move'
                          setDragging(thought.id)
                        }}
                        onDragEnd={() => {
                          setDragging(null)
                          setDragOver(null)
                        }}
                        onClick={() => onSelect(thought.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onSelect(thought.id)
                          }
                        }}
                      >
                        <span className="quadrant-card__text">
                          {showRank ? (
                            <span className="quadrant-card__rank">{index + 1}</span>
                          ) : null}
                          {thought.text}
                        </span>
                        <span className="quadrant-card__meta">
                          {thought.type !== 'unclassified' ? (
                            <span className="chip">{THOUGHT_TYPE_LABEL[thought.type]}</span>
                          ) : null}
                          {thought.tags.map((tag) => (
                            <span key={tag} className="chip chip--accent">
                              {tag}
                            </span>
                          ))}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {thoughts.length === 0 ? (
                <p className="faint" style={{ margin: 0 }}>
                  Nothing here yet. Drop a thought to move it.
                </p>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
