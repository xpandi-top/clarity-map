import { describe, expect, it } from 'vitest'
import {
  BUILTIN_DIMENSION,
  IMPORTANCE_NOT,
  IMPORTANCE_YES,
  MOTIVATION_SHOULD,
  MOTIVATION_WANT,
  createDefaultDimensions,
} from './defaults'
import {
  computeMatrixPoints,
  getDimensionValue,
  matrixLayout,
  quadrantOf,
  valueForHalf,
  valueForPosition,
} from './matrix'
import { makeThought } from '../test/factories'

const dimensions = createDefaultDimensions()
const motivation = dimensions.find((entry) => entry.id === BUILTIN_DIMENSION.motivation)!
const importance = dimensions.find((entry) => entry.id === BUILTIN_DIMENSION.importance)!
const difficulty = dimensions.find((entry) => entry.id === BUILTIN_DIMENSION.difficulty)!

describe('default dimensions', () => {
  it('creates the eight built-in dimensions with stable ids', () => {
    expect(dimensions).toHaveLength(8)
    expect(dimensions.every((dimension) => dimension.builtIn)).toBe(true)
    expect(dimensions.map((dimension) => dimension.id)).toEqual([
      BUILTIN_DIMENSION.motivation,
      BUILTIN_DIMENSION.importance,
      BUILTIN_DIMENSION.thoughtType,
      BUILTIN_DIMENSION.difficulty,
      BUILTIN_DIMENSION.priority,
      BUILTIN_DIMENSION.energy,
      BUILTIN_DIMENSION.impact,
      BUILTIN_DIMENSION.urgency,
    ])
  })

  it('gives motivation and importance two ordered options each', () => {
    expect(motivation.options?.map((option) => option.value)).toEqual([
      MOTIVATION_SHOULD,
      MOTIVATION_WANT,
    ])
    expect(importance.options?.map((option) => option.value)).toEqual([
      IMPORTANCE_NOT,
      IMPORTANCE_YES,
    ])
  })

  it('models the energy dimension from -5 to +5', () => {
    const energy = dimensions.find((entry) => entry.id === BUILTIN_DIMENSION.energy)!
    expect(energy.min).toBe(-5)
    expect(energy.max).toBe(5)
  })

  it('reads the thought type through the mirrored dimension', () => {
    const thoughtType = dimensions.find(
      (entry) => entry.id === BUILTIN_DIMENSION.thoughtType,
    )!
    expect(getDimensionValue(makeThought({ type: 'habit' }), thoughtType)).toBe('habit')
  })
})

describe('quadrant mapping', () => {
  const cases = [
    [MOTIVATION_WANT, IMPORTANCE_YES, 'highHigh'],
    [MOTIVATION_SHOULD, IMPORTANCE_YES, 'lowHigh'],
    [MOTIVATION_WANT, IMPORTANCE_NOT, 'highLow'],
    [MOTIVATION_SHOULD, IMPORTANCE_NOT, 'lowLow'],
  ] as const

  it.each(cases)('maps %s + %s to %s', (motivationValue, importanceValue, expected) => {
    const thought = makeThought({
      dimensionValues: {
        [BUILTIN_DIMENSION.motivation]: motivationValue,
        [BUILTIN_DIMENSION.importance]: importanceValue,
      },
    })
    expect(quadrantOf(thought, motivation, importance)).toBe(expected)
  })

  it('returns null when either dimension is unanswered', () => {
    const thought = makeThought({
      dimensionValues: { [BUILTIN_DIMENSION.motivation]: MOTIVATION_WANT },
    })
    expect(quadrantOf(thought, motivation, importance)).toBeNull()
  })

  it('separates unanswered thoughts from plotted points', () => {
    const placed = makeThought({
      dimensionValues: {
        [BUILTIN_DIMENSION.motivation]: MOTIVATION_WANT,
        [BUILTIN_DIMENSION.importance]: IMPORTANCE_YES,
      },
    })
    const unplaced = makeThought()
    const result = computeMatrixPoints([placed, unplaced], motivation, importance)
    expect(result.points).toHaveLength(1)
    expect(result.unresolved).toEqual([unplaced])
  })

  it('offsets thoughts that share coordinates so both stay selectable', () => {
    const values = {
      [BUILTIN_DIMENSION.motivation]: MOTIVATION_WANT,
      [BUILTIN_DIMENSION.importance]: IMPORTANCE_YES,
    }
    const { points } = computeMatrixPoints(
      [makeThought({ dimensionValues: values }), makeThought({ dimensionValues: values })],
      motivation,
      importance,
    )
    expect(points[0].x === points[1].x && points[0].y === points[1].y).toBe(false)
    expect(points.every((point) => point.quadrant === 'highHigh')).toBe(true)
  })

  it('chooses a layout from the pair of dimensions', () => {
    expect(matrixLayout(motivation, importance)).toBe('quadrant')
    expect(matrixLayout(difficulty, difficulty)).toBe('scatter')
    expect(matrixLayout(motivation, difficulty)).toBe('mixed')
  })
})

describe('moving a thought between quadrants', () => {
  it('produces the dimension value for each half', () => {
    expect(valueForHalf(motivation, true)).toBe(MOTIVATION_WANT)
    expect(valueForHalf(motivation, false)).toBe(MOTIVATION_SHOULD)
    expect(valueForHalf(difficulty, true)).toBe(5)
    expect(valueForHalf(difficulty, false)).toBe(1)
  })

  it('snaps a continuous drop position onto the scale', () => {
    expect(valueForPosition(difficulty, 0)).toBe(1)
    expect(valueForPosition(difficulty, 0.5)).toBe(3)
    expect(valueForPosition(difficulty, 1)).toBe(5)
    expect(valueForPosition(importance, 0.9)).toBe(IMPORTANCE_YES)
  })
})
