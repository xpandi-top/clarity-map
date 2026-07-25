import { useRef } from 'react'
import {
  BUILTIN_DIMENSION,
  MOTIVATION_WANT,
  MOTIVATION_SHOULD,
} from '../../domain/defaults'
import {
  QUADRANTS,
  highLabel,
  lowLabel,
  matrixLayout,
  quadrantTitle,
  type MatrixPoint,
  type QuadrantId,
} from '../../domain/matrix'
import type { Dimension } from '../../domain/types'

interface MatrixPlotProps {
  points: MatrixPoint[]
  xDimension: Dimension
  yDimension: Dimension
  selectedThoughtId: string | null
  onSelect: (thoughtId: string) => void
  onMove: (thoughtId: string, x: number, y: number) => void
  onOpenQuadrant: (quadrant: QuadrantId) => void
}

const QUADRANT_POSITION: Record<QuadrantId, { top?: string; bottom?: string; left?: string; right?: string }> =
  {
    lowHigh: { top: '0.5rem', left: '0.5rem' },
    highHigh: { top: '0.5rem', right: '0.5rem' },
    lowLow: { bottom: '0.5rem', left: '0.5rem' },
    highLow: { bottom: '0.5rem', right: '0.5rem' },
  }

/**
 * Two-dimensional plot. Dragging is an enhancement — every thought can also be
 * repositioned from its detail panel, and the list view covers the same ground.
 */
export function MatrixPlot({
  points,
  xDimension,
  yDimension,
  selectedThoughtId,
  onSelect,
  onMove,
  onOpenQuadrant,
}: MatrixPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const layout = matrixLayout(xDimension, yDimension)

  return (
    <div className="matrix-frame">
      <div className="matrix-axis-y" aria-hidden="true">
        <span>{lowLabel(yDimension)}</span>
        <span>←→</span>
        <span>{highLabel(yDimension)}</span>
      </div>

      <div
        ref={plotRef}
        className="matrix-plot"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const thoughtId = event.dataTransfer.getData('text/plain')
          const rect = plotRef.current?.getBoundingClientRect()
          if (!thoughtId || !rect) return
          const x = (event.clientX - rect.left) / rect.width
          const y = 1 - (event.clientY - rect.top) / rect.height
          onMove(thoughtId, Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)))
        }}
      >
        <div className="matrix-plot__divider-x" />
        <div className="matrix-plot__divider-y" />

        {layout === 'quadrant'
          ? QUADRANTS.map((quadrant) => (
              <button
                key={quadrant.id}
                type="button"
                className="matrix-quadrant-label"
                style={QUADRANT_POSITION[quadrant.id]}
                onClick={() => onOpenQuadrant(quadrant.id)}
              >
                {quadrantTitle(quadrant.id, xDimension, yDimension)}
              </button>
            ))
          : null}

        {points.map((point) => {
          const motivation = point.thought.dimensionValues[BUILTIN_DIMENSION.motivation]
          const motivationClass =
            motivation === MOTIVATION_WANT
              ? ' matrix-node--want'
              : motivation === MOTIVATION_SHOULD
                ? ' matrix-node--should'
                : ''
          return (
            <button
              key={point.thought.id}
              type="button"
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData('text/plain', point.thought.id)
              }
              className={`matrix-node${motivationClass}${
                selectedThoughtId === point.thought.id ? ' is-selected' : ''
              }`}
              style={{ left: `${point.x * 100}%`, bottom: `${point.y * 100}%` }}
              onClick={() => onSelect(point.thought.id)}
            >
              {point.thought.text}
              {motivation ? (
                <span className="matrix-node__marker">
                  {motivation === MOTIVATION_WANT ? 'Want' : 'Should'}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div />
      <div className="matrix-axis-x" aria-hidden="true">
        <span>{lowLabel(xDimension)}</span>
        <span>←→</span>
        <span>{highLabel(xDimension)}</span>
      </div>
    </div>
  )
}
