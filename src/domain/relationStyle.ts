import type { RelationType } from './types'

export interface RelationStyle {
  /** Edge colour. */
  stroke: string
  /** SVG dash pattern; undefined means a solid line. */
  dash?: string
  width: number
  /** Plain description of what the line means, used in the legend. */
  meaning: string
}

/**
 * Every relationship type gets both a distinct colour and a distinct line
 * pattern, so the roadmap is readable without relying on colour alone.
 */
export const RELATION_STYLE: Record<RelationType, RelationStyle> = {
  serves: {
    stroke: '#4a6b63',
    width: 2,
    meaning: 'Contributes to something larger.',
  },
  milestoneOf: {
    stroke: '#7a6a52',
    width: 2.5,
    meaning: 'A step on the way to a bigger result.',
  },
  breaksDownInto: {
    stroke: '#4d6182',
    dash: '8 4',
    width: 2,
    meaning: 'Splits into smaller pieces.',
  },
  prerequisiteFor: {
    stroke: '#6d5a86',
    dash: '2 4',
    width: 2,
    meaning: 'Has to happen first.',
  },
  supports: {
    stroke: '#6b7f4a',
    dash: '10 3 2 3',
    width: 2,
    meaning: 'Helps, without being required.',
  },
  conflictsWith: {
    stroke: '#8c4a42',
    dash: '5 5',
    width: 2,
    meaning: 'Pulls against each other. No direction implied.',
  },
  relatedTo: {
    stroke: '#8f8981',
    dash: '1 5',
    width: 1.5,
    meaning: 'Connected in your mind. No direction implied.',
  },
}
