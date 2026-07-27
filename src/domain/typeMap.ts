import type { ThoughtType } from './types'

/**
 * The thirteen types grouped into four plain-language families, so the
 * Structure screen can explain the shape before the vocabulary.
 */
export interface TypeGroup {
  id: 'direction' | 'results' | 'work' | 'open'
  label: string
  summary: string
  types: ThoughtType[]
}

export const TYPE_GROUPS: TypeGroup[] = [
  {
    id: 'direction',
    label: 'Direction',
    summary: 'Why any of this matters. These are never finished, and that is the point.',
    types: ['value', 'vision'],
  },
  {
    id: 'results',
    label: 'Results',
    summary: 'What being done would look like. Described, not performed.',
    types: ['goal', 'outcome', 'milestone'],
  },
  {
    id: 'work',
    label: 'Work',
    summary: 'What you actually do. Everything here can be started or repeated.',
    types: ['project', 'action', 'habit'],
  },
  {
    id: 'open',
    label: 'Still open',
    summary: 'Not shaped into work yet. Most thoughts start here and that is fine.',
    types: ['decision', 'problem', 'idea', 'note'],
  },
]

/** The five types worth learning first. Simplified view uses only these. */
export const SIMPLE_TYPES: ThoughtType[] = ['value', 'goal', 'project', 'action', 'habit']

export function groupOf(type: ThoughtType): TypeGroup | null {
  return TYPE_GROUPS.find((group) => group.types.includes(type)) ?? null
}

export interface TypeGroupStyle {
  /** Border and text colour. */
  stroke: string
  /** Background tint. */
  fill: string
  /** Short guideline shown while breaking a thought down. */
  guideline: string
}

/**
 * One colour per family, used on the roadmap, the type map, and the breakdown
 * flow so the four kinds of thought stay recognisable across screens. Always
 * paired with the family name in text — never colour alone.
 */
export const TYPE_GROUP_STYLE: Record<TypeGroup['id'] | 'none', TypeGroupStyle> = {
  direction: {
    stroke: '#6d5a86',
    fill: '#f1eef5',
    guideline: 'Say where you are heading. No finish line, so do not phrase it as done.',
  },
  results: {
    stroke: '#4d6182',
    fill: '#eaeef4',
    guideline: 'Describe a finished state you could check. A result, not an activity.',
  },
  work: {
    stroke: '#4a6b63',
    fill: '#e6eeeb',
    guideline: 'Say what you would actually do. Startable, or repeatable.',
  },
  open: {
    stroke: '#8a6d3b',
    fill: '#f7efe0',
    guideline: 'Park it as it is. Naming the question is enough for now.',
  },
  none: {
    stroke: '#8f8981',
    fill: '#f3f1ec',
    guideline: 'Not classified yet, which is a valid place to leave it.',
  },
}

export function styleOfType(type: ThoughtType): TypeGroupStyle {
  return TYPE_GROUP_STYLE[groupOf(type)?.id ?? 'none']
}

export function groupLabelOfType(type: ThoughtType): string {
  return groupOf(type)?.label ?? 'Unclassified'
}

/** Longer explanation shown when a type is selected in the map. */
export const TYPE_LONG_DESCRIPTION: Record<ThoughtType, string> = {
  unclassified:
    'You have not decided yet. Nothing depends on classifying a thought, so leaving it here costs nothing.',
  value:
    'A direction you want to keep moving in, with no finish line. "Health", "freedom", "being someone my family can rely on". A value is not achieved, it is expressed — which is why it makes a good root for a roadmap.',
  vision:
    'A picture of a desired long-term state, more concrete than a value but still not something you can complete this quarter. "Working remotely from anywhere with a stable income."',
  goal:
    'A result you want that cannot be performed as a single action. If you cannot start it right now without deciding something else first, it is a goal rather than an action. Goals are the usual thing to break down.',
  outcome:
    'An observable finished state, phrased so you could tell whether it happened. "The certification is passed" rather than "study more". Useful for making a vague goal checkable.',
  milestone:
    'An intermediate result on the way to a larger goal. Milestones tell you the order things need to happen in, and give a roadmap its middle layer.',
  project:
    'A finite body of work with several actions inside it and an end. If it has a last step, it is a project; if it never ends, it is probably a habit or a value.',
  habit:
    'A behaviour you repeat rather than complete. "Walk every day." Habits serve goals and values but are never finished, so completing them is not the measure — continuing them is.',
  action:
    'Something you could start directly, without deciding anything else first. If you would have to plan before beginning, it is not yet an action.',
  decision:
    'A choice that is blocking other things. Naming it as a decision separates "I have not chosen" from "I have not done the work", which are very different kinds of stuck.',
  problem:
    'An obstacle in the way of something else. Problems usually turn into a project or a decision once you look at them directly.',
  idea: 'A thought that does not fit anywhere else yet. A holding place, not a judgement.',
  note: 'Information you want to keep near your thinking. Reference material, not work.',
}

export interface TypeMapNode {
  type: ThoughtType
  x: number
  y: number
}

export interface TypeMapEdge {
  from: ThoughtType
  to: ThoughtType
  /** Dashed edges are "may become", solid edges are "breaks down into". */
  tentative?: boolean
  label?: string
}

export const TYPE_MAP_WIDTH = 760
export const TYPE_MAP_HEIGHT = 400
export const TYPE_NODE_WIDTH = 132
export const TYPE_NODE_HEIGHT = 46

/** Full taxonomy: four layers plus the "still open" column on the right. */
export const FULL_MAP_NODES: TypeMapNode[] = [
  { type: 'value', x: 40, y: 24 },
  { type: 'vision', x: 210, y: 24 },
  { type: 'goal', x: 125, y: 116 },
  { type: 'outcome', x: 295, y: 116 },
  { type: 'milestone', x: 125, y: 208 },
  { type: 'project', x: 295, y: 208 },
  { type: 'action', x: 210, y: 300 },
  { type: 'habit', x: 40, y: 300 },
  { type: 'decision', x: 560, y: 24 },
  { type: 'problem', x: 560, y: 100 },
  { type: 'idea', x: 560, y: 176 },
  { type: 'note', x: 560, y: 252 },
]

export const FULL_MAP_EDGES: TypeMapEdge[] = [
  { from: 'value', to: 'vision' },
  { from: 'vision', to: 'goal' },
  { from: 'value', to: 'goal' },
  // Deliberately unlabelled: the two boxes sit side by side and there is no
  // room for text without it colliding with them.
  { from: 'goal', to: 'outcome' },
  { from: 'goal', to: 'milestone' },
  { from: 'milestone', to: 'project' },
  { from: 'project', to: 'action' },
  { from: 'project', to: 'habit' },
]

/**
 * The "still open" column does not connect to individual types — drawing those
 * edges crosses the whole map. One arrow and a short note says the same thing.
 */
export const TYPE_MAP_ASIDE = {
  arrow: { x1: 552, y1: 139, x2: 435, y2: 139 },
  lines: ['These usually become goals or', 'projects once they are clearer.'],
  textX: 560,
  textY: 320,
}

/** Simplified view: the spine only. */
export const SIMPLE_MAP_NODES: TypeMapNode[] = [
  { type: 'value', x: 230, y: 24 },
  { type: 'goal', x: 230, y: 122 },
  { type: 'project', x: 230, y: 220 },
  { type: 'action', x: 130, y: 318 },
  { type: 'habit', x: 330, y: 318 },
]

export const SIMPLE_MAP_EDGES: TypeMapEdge[] = [
  { from: 'value', to: 'goal', label: 'gives you' },
  { from: 'goal', to: 'project', label: 'breaks into' },
  { from: 'project', to: 'action', label: 'done through' },
  { from: 'project', to: 'habit', label: 'or repeated as' },
]

/** One-line reading of the whole map, used as the diagram caption. */
export const TYPE_MAP_SENTENCE =
  'A value gives you goals, a goal breaks into milestones and projects, and a project is done through actions and habits.'
