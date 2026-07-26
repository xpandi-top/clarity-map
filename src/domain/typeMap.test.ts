import { describe, expect, it } from 'vitest'
import { RELATION_TYPES, THOUGHT_TYPES } from './defaults'
import { RELATION_STYLE } from './relationStyle'
import {
  FULL_MAP_EDGES,
  FULL_MAP_NODES,
  SIMPLE_MAP_EDGES,
  SIMPLE_MAP_NODES,
  SIMPLE_TYPES,
  TYPE_GROUPS,
  TYPE_LONG_DESCRIPTION,
  TYPE_MAP_HEIGHT,
  TYPE_MAP_WIDTH,
  TYPE_NODE_HEIGHT,
  TYPE_NODE_WIDTH,
  groupOf,
} from './typeMap'

describe('type map', () => {
  it('places every classified type exactly once in the full map', () => {
    const mapped = FULL_MAP_NODES.map((node) => node.type).sort()
    const expected = THOUGHT_TYPES.filter((type) => type !== 'unclassified').sort()
    expect(mapped).toEqual(expected)
  })

  it('assigns every classified type to exactly one group', () => {
    for (const type of THOUGHT_TYPES) {
      if (type === 'unclassified') {
        expect(groupOf(type)).toBeNull()
        continue
      }
      const groups = TYPE_GROUPS.filter((group) => group.types.includes(type))
      expect(groups).toHaveLength(1)
    }
  })

  it('describes every type, including unclassified', () => {
    for (const type of THOUGHT_TYPES) {
      expect(TYPE_LONG_DESCRIPTION[type].length).toBeGreaterThan(20)
    }
  })

  it('only draws edges between nodes that exist', () => {
    const fullIds = new Set(FULL_MAP_NODES.map((node) => node.type))
    for (const edge of FULL_MAP_EDGES) {
      expect(fullIds.has(edge.from)).toBe(true)
      expect(fullIds.has(edge.to)).toBe(true)
    }
    const simpleIds = new Set(SIMPLE_MAP_NODES.map((node) => node.type))
    for (const edge of SIMPLE_MAP_EDGES) {
      expect(simpleIds.has(edge.from)).toBe(true)
      expect(simpleIds.has(edge.to)).toBe(true)
    }
  })

  it('keeps the simplified map to the five starter types', () => {
    expect(SIMPLE_MAP_NODES.map((node) => node.type)).toEqual(SIMPLE_TYPES)
  })

  it('keeps every node inside the drawing area', () => {
    for (const node of [...FULL_MAP_NODES, ...SIMPLE_MAP_NODES]) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.x + TYPE_NODE_WIDTH).toBeLessThanOrEqual(TYPE_MAP_WIDTH)
      expect(node.y + TYPE_NODE_HEIGHT).toBeLessThanOrEqual(TYPE_MAP_HEIGHT)
    }
  })

  it('does not overlap any two nodes in either layout', () => {
    const overlaps = (layout: typeof FULL_MAP_NODES) => {
      for (let i = 0; i < layout.length; i += 1) {
        for (let j = i + 1; j < layout.length; j += 1) {
          const a = layout[i]
          const b = layout[j]
          const apart =
            a.x + TYPE_NODE_WIDTH <= b.x ||
            b.x + TYPE_NODE_WIDTH <= a.x ||
            a.y + TYPE_NODE_HEIGHT <= b.y ||
            b.y + TYPE_NODE_HEIGHT <= a.y
          if (!apart) return `${a.type} overlaps ${b.type}`
        }
      }
      return null
    }
    expect(overlaps(FULL_MAP_NODES)).toBeNull()
    expect(overlaps(SIMPLE_MAP_NODES)).toBeNull()
  })
})

describe('relationship styles', () => {
  it('styles every relationship type', () => {
    for (const type of RELATION_TYPES) {
      expect(RELATION_STYLE[type]).toBeDefined()
      expect(RELATION_STYLE[type].meaning.length).toBeGreaterThan(10)
    }
  })

  it('gives every type a visually distinct line, not just a distinct colour', () => {
    const colours = RELATION_TYPES.map((type) => RELATION_STYLE[type].stroke)
    expect(new Set(colours).size).toBe(RELATION_TYPES.length)

    const patterns = RELATION_TYPES.map(
      (type) => `${RELATION_STYLE[type].dash ?? 'solid'}:${RELATION_STYLE[type].width}`,
    )
    expect(new Set(patterns).size).toBe(RELATION_TYPES.length)
  })
})
