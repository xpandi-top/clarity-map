import { THOUGHT_TYPE_LABEL } from './defaults'
import { hierarchy } from './graph'
import type { Thought, ThoughtRelation } from './types'

export interface ChecklistOptions {
  /** Leave out anything that is not an action or a habit. */
  onlyActionable?: boolean
  includeTypes?: boolean
  /** Adds a "— archived" style note for anything not active. */
  includeStatus?: boolean
  /** Written into the header. Passed in so output stays deterministic. */
  generatedAt?: string
}

export interface ChecklistItem {
  thought: Thought
  depth: number
  done: boolean
}

const ACTIONABLE = new Set(['action', 'habit'])

/**
 * Depth-first walk of everything beneath a thought, in the order the roadmap
 * draws it. A thought reachable by more than one path appears once.
 */
export function collectChecklistItems(
  thoughts: Thought[],
  relations: ThoughtRelation[],
  rootId: string,
): ChecklistItem[] {
  const byId = new Map(thoughts.map((thought) => [thought.id, thought]))
  const items: ChecklistItem[] = []
  const seen = new Set<string>()

  const childrenOf = (id: string) =>
    relations
      .map((relation) => hierarchy(relation))
      .filter((levels) => levels?.upper === id)
      .map((levels) => levels!.lower)

  const walk = (id: string, depth: number) => {
    if (seen.has(id)) return
    seen.add(id)
    const thought = byId.get(id)
    if (!thought) return
    items.push({ thought, depth, done: thought.status === 'completed' })
    for (const childId of childrenOf(id)) walk(childId, depth + 1)
  }

  walk(rootId, 0)
  return items
}

function escapeMarkdown(text: string): string {
  // Newlines would break the list item; the rest of Markdown is left alone so
  // the export stays readable as plain text.
  return text.replace(/\s*\n\s*/g, ' ').trim()
}

/**
 * A Markdown checklist of a roadmap, ready to paste into an issue, a note, or
 * a pull request description.
 */
export function buildChecklistMarkdown(
  thoughts: Thought[],
  relations: ThoughtRelation[],
  rootId: string,
  options: ChecklistOptions = {},
): string {
  const {
    onlyActionable = false,
    includeTypes = true,
    includeStatus = false,
    generatedAt,
  } = options

  const all = collectChecklistItems(thoughts, relations, rootId)
  if (all.length === 0) return ''

  const root = all[0]
  const rest = all.slice(1)
  const items = onlyActionable
    ? rest
        .filter((item) => ACTIONABLE.has(item.thought.type))
        // Flatten, because a filtered tree has holes in it.
        .map((item) => ({ ...item, depth: 1 }))
    : rest

  const lines: string[] = [`# ${escapeMarkdown(root.thought.text)}`, '']

  if (includeTypes && root.thought.type !== 'unclassified') {
    lines.push(`_${THOUGHT_TYPE_LABEL[root.thought.type]}_`, '')
  }
  if (root.thought.description.trim()) {
    lines.push(escapeMarkdown(root.thought.description), '')
  }

  if (items.length === 0) {
    lines.push(
      onlyActionable
        ? '_No actions or habits beneath this thought yet._'
        : '_Nothing beneath this thought yet._',
    )
  } else {
    for (const item of items) {
      const indent = '  '.repeat(Math.max(0, item.depth - 1))
      const box = item.done ? '[x]' : '[ ]'
      const suffix: string[] = []
      if (includeTypes && item.thought.type !== 'unclassified') {
        suffix.push(THOUGHT_TYPE_LABEL[item.thought.type])
      }
      if (includeStatus && item.thought.status !== 'active') suffix.push(item.thought.status)
      const trailer = suffix.length > 0 ? ` _(${suffix.join(', ')})_` : ''
      lines.push(`${indent}- ${box} ${escapeMarkdown(item.thought.text)}${trailer}`)
    }
  }

  if (generatedAt) {
    lines.push('', `_Exported from Clarity Map on ${generatedAt}._`)
  }

  return `${lines.join('\n')}\n`
}
