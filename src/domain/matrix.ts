import { BUILTIN_DIMENSION } from './defaults'
import type { Dimension, DimensionValue, Thought } from './types'

/**
 * Single source of truth for reading a dimension off a thought.
 * The built-in "Thought type" dimension mirrors `thought.type` so classification
 * is never stored twice.
 */
export function getDimensionValue(thought: Thought, dimension: Dimension): DimensionValue {
  if (dimension.id === BUILTIN_DIMENSION.thoughtType) return thought.type
  const value = thought.dimensionValues[dimension.id]
  return value === undefined ? null : value
}

export function isAnswered(value: DimensionValue): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** Index of a binary/select value within the dimension options, or null. */
export function optionIndex(dimension: Dimension, value: DimensionValue): number | null {
  if (typeof value !== 'string' || !dimension.options) return null
  const index = dimension.options.findIndex((entry) => entry.value === value)
  return index === -1 ? null : index
}

/**
 * Normalised axis position in the range 0..1, or null when the thought has no
 * value for that dimension. Binary dimensions collapse to 0 or 1.
 */
export function axisPosition(dimension: Dimension, value: DimensionValue): number | null {
  if (!isAnswered(value)) return null

  switch (dimension.kind) {
    case 'binary':
    case 'singleSelect': {
      const index = optionIndex(dimension, value)
      if (index === null) return null
      const count = dimension.options?.length ?? 0
      if (count <= 1) return 0.5
      return index / (count - 1)
    }
    case 'boolean':
      return value === true ? 1 : 0
    case 'scale': {
      if (typeof value !== 'number') return null
      const min = dimension.min ?? 0
      const max = dimension.max ?? 5
      if (max === min) return 0.5
      return (value - min) / (max - min)
    }
    case 'multiSelect': {
      if (!Array.isArray(value) || value.length === 0) return null
      const total = dimension.options?.length ?? 0
      if (total === 0) return 0.5
      return Math.min(1, value.length / total)
    }
    default:
      return null
  }
}

export type MatrixLayout = 'quadrant' | 'scatter' | 'mixed'

/** Dimensions with exactly two option-like states render as quadrants. */
export function isBinaryLike(dimension: Dimension): boolean {
  if (dimension.kind === 'boolean') return true
  if (dimension.kind === 'binary') return (dimension.options?.length ?? 0) === 2
  return false
}

export function matrixLayout(xDimension: Dimension, yDimension: Dimension): MatrixLayout {
  const x = isBinaryLike(xDimension)
  const y = isBinaryLike(yDimension)
  if (x && y) return 'quadrant'
  if (!x && !y) return 'scatter'
  return 'mixed'
}

export type QuadrantId = 'lowLow' | 'highLow' | 'lowHigh' | 'highHigh'

export interface Quadrant {
  id: QuadrantId
  /** 0 = left column, 1 = right column. */
  x: 0 | 1
  /** 0 = bottom row, 1 = top row. */
  y: 0 | 1
}

export const QUADRANTS: Quadrant[] = [
  { id: 'lowHigh', x: 0, y: 1 },
  { id: 'highHigh', x: 1, y: 1 },
  { id: 'lowLow', x: 0, y: 0 },
  { id: 'highLow', x: 1, y: 0 },
]

/**
 * Quadrant for a thought against two binary-like dimensions.
 * Returns null when either dimension is unanswered.
 */
export function quadrantOf(
  thought: Thought,
  xDimension: Dimension,
  yDimension: Dimension,
): QuadrantId | null {
  const x = axisPosition(xDimension, getDimensionValue(thought, xDimension))
  const y = axisPosition(yDimension, getDimensionValue(thought, yDimension))
  if (x === null || y === null) return null
  const xHigh = x >= 0.5
  const yHigh = y >= 0.5
  if (xHigh && yHigh) return 'highHigh'
  if (xHigh) return 'highLow'
  if (yHigh) return 'lowHigh'
  return 'lowLow'
}

/**
 * Interpretation copy for the default Motivation x Importance matrix.
 * Falls back to neutral wording for any other dimension pair.
 */
export function quadrantTitle(
  quadrant: QuadrantId,
  xDimension: Dimension,
  yDimension: Dimension,
): string {
  const isDefaultPair =
    xDimension.id === BUILTIN_DIMENSION.motivation &&
    yDimension.id === BUILTIN_DIMENSION.importance
  if (isDefaultPair) {
    switch (quadrant) {
      case 'highHigh':
        return 'Core direction'
      case 'lowHigh':
        return 'Responsibility or chosen commitment'
      case 'highLow':
        return 'Exploration, enjoyment, or recovery'
      case 'lowLow':
        return 'Examine, reduce, reject, simplify, or delegate'
    }
  }
  const xLabel = quadrant === 'highHigh' || quadrant === 'highLow' ? highLabel(xDimension) : lowLabel(xDimension)
  const yLabel = quadrant === 'highHigh' || quadrant === 'lowHigh' ? highLabel(yDimension) : lowLabel(yDimension)
  return `${xLabel} + ${yLabel}`
}

export function lowLabel(dimension: Dimension): string {
  if (dimension.kind === 'boolean') return 'No'
  if (dimension.options && dimension.options.length > 0) return dimension.options[0].label
  return dimension.lowLabel ?? String(dimension.min ?? 'Low')
}

export function highLabel(dimension: Dimension): string {
  if (dimension.kind === 'boolean') return 'Yes'
  if (dimension.options && dimension.options.length > 0) {
    return dimension.options[dimension.options.length - 1].label
  }
  return dimension.highLabel ?? String(dimension.max ?? 'High')
}

export interface MatrixPoint {
  thought: Thought
  /** 0..1 from the left edge. */
  x: number
  /** 0..1 from the bottom edge. */
  y: number
  quadrant: QuadrantId | null
}

/**
 * Deterministic offset so thoughts sharing coordinates stay individually
 * selectable. Derived from the thought id, never random.
 */
function deterministicOffset(id: string, salt: number): number {
  let hash = salt
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 1000
  }
  return hash / 1000
}

export function computeMatrixPoints(
  thoughts: Thought[],
  xDimension: Dimension,
  yDimension: Dimension,
): { points: MatrixPoint[]; unresolved: Thought[] } {
  const points: MatrixPoint[] = []
  const unresolved: Thought[] = []
  const occupied = new Map<string, number>()

  for (const thought of thoughts) {
    const rawX = axisPosition(xDimension, getDimensionValue(thought, xDimension))
    const rawY = axisPosition(yDimension, getDimensionValue(thought, yDimension))
    if (rawX === null || rawY === null) {
      unresolved.push(thought)
      continue
    }

    const key = `${rawX.toFixed(3)}:${rawY.toFixed(3)}`
    const seen = occupied.get(key) ?? 0
    occupied.set(key, seen + 1)

    // Spread duplicates over a small grid inside their own cell, always
    // towards the middle of the plot so an extreme value is never pushed off
    // the edge. A tiny id-derived wobble keeps identical stacks distinguishable
    // without ever being random.
    const column = seen % CLUSTER_COLUMNS
    const row = Math.floor(seen / CLUSTER_COLUMNS)
    const wobble = (salt: number) => 0.012 * deterministicOffset(thought.id, salt)
    const inward = (value: number) => (value > 0.5 ? -1 : 1)

    points.push({
      thought,
      x: clampToPlot(rawX + inward(rawX) * (column * CLUSTER_STEP + wobble(7))),
      y: clampToPlot(rawY + inward(rawY) * (row * CLUSTER_STEP + wobble(13))),
      quadrant: quadrantOf(thought, xDimension, yDimension),
    })
  }

  return { points, unresolved }
}

/** Duplicates fan out over a grid this wide before starting a new row. */
const CLUSTER_COLUMNS = 3
const CLUSTER_STEP = 0.135

/** Keeps a point far enough from the border that its card stays fully visible. */
function clampToPlot(value: number): number {
  return Math.min(0.92, Math.max(0.08, value))
}

/**
 * The dimension value that corresponds to dropping a thought into a quadrant
 * half. Used when a thought is dragged across the matrix.
 */
export function valueForHalf(dimension: Dimension, high: boolean): DimensionValue {
  switch (dimension.kind) {
    case 'binary':
    case 'singleSelect': {
      const options = dimension.options ?? []
      if (options.length === 0) return null
      return high ? options[options.length - 1].value : options[0].value
    }
    case 'boolean':
      return high
    case 'scale': {
      const min = dimension.min ?? 0
      const max = dimension.max ?? 5
      return high ? max : min
    }
    default:
      return null
  }
}

/** Nearest legal value for a continuous 0..1 position on a scale dimension. */
export function valueForPosition(dimension: Dimension, position: number): DimensionValue {
  if (dimension.kind !== 'scale') return valueForHalf(dimension, position >= 0.5)
  const min = dimension.min ?? 0
  const max = dimension.max ?? 5
  const step = dimension.step && dimension.step > 0 ? dimension.step : 1
  const raw = min + position * (max - min)
  const snapped = Math.round((raw - min) / step) * step + min
  return Math.min(max, Math.max(min, snapped))
}
