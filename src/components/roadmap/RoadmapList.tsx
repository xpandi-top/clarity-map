import { useMemo, useState } from 'react'
import { THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { hierarchy, relationPhrase } from '../../domain/graph'
import type { Thought, ThoughtRelation } from '../../domain/types'

interface RoadmapListProps {
  thoughts: Thought[]
  relations: ThoughtRelation[]
  focusId: string
  onSelectThought: (thoughtId: string) => void
  /** Levels expanded on first render. Deeper branches start collapsed. */
  initialDepth?: number
}

interface Branch {
  id: string
  relation?: ThoughtRelation
  /** The thought this branch hangs from, so the phrase reads downwards. */
  parentId?: string
  /** Distance below the thought in focus. */
  depth: number
  children: Branch[]
  /** True when this thought already appeared higher up the tree. */
  repeated: boolean
  /** Total thoughts hidden beneath, used on the collapse toggle. */
  descendants: number
}

/**
 * Text alternative to the graph. The tree is collapsible so a goal with many
 * milestones can be read a level at a time instead of all at once.
 */
export function RoadmapList({
  thoughts,
  relations,
  focusId,
  onSelectThought,
  initialDepth = 2,
}: RoadmapListProps) {
  const byId = useMemo(
    () => new Map(thoughts.map((thought) => [thought.id, thought])),
    [thoughts],
  )

  const tree = useMemo(() => {
    const childrenOf = (id: string) =>
      relations
        .map((relation) => ({ relation, levels: hierarchy(relation) }))
        .filter((entry) => entry.levels?.upper === id)
        .map((entry) => ({ relation: entry.relation, id: entry.levels!.lower }))

    const build = (
      id: string,
      depth: number,
      seen: Set<string>,
      relation?: ThoughtRelation,
      parentId?: string,
    ): Branch => {
      const repeated = seen.has(id)
      const nextSeen = new Set(seen).add(id)
      const children = repeated
        ? []
        : childrenOf(id).map((child) =>
            build(child.id, depth + 1, nextSeen, child.relation, id),
          )
      return {
        id,
        relation,
        parentId,
        depth,
        children,
        repeated,
        descendants: children.reduce(
          (total, child) => total + 1 + child.descendants,
          0,
        ),
      }
    }

    return build(focusId, 0, new Set())
  }, [relations, focusId])

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    // Everything at or beyond the initial depth starts folded away.
    const initial = new Set<string>()
    const walk = (branch: Branch) => {
      if (branch.depth >= initialDepth && branch.children.length > 0) initial.add(branch.id)
      branch.children.forEach(walk)
    }
    walk(tree)
    return initial
  })

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const expandAll = () => setCollapsed(new Set())

  const collapseAll = () => {
    const all = new Set<string>()
    const walk = (branch: Branch) => {
      if (branch.depth >= 1 && branch.children.length > 0) all.add(branch.id)
      branch.children.forEach(walk)
    }
    walk(tree)
    setCollapsed(all)
  }

  const renderBranch = (branch: Branch) => {
    const thought = byId.get(branch.id)
    if (!thought) return null
    const isCollapsed = collapsed.has(branch.id)
    const hasChildren = branch.children.length > 0

    return (
      <li key={`${branch.relation?.id ?? 'root'}-${branch.id}`} className="roadmap-branch">
        <div className="roadmap-branch__row">
          {hasChildren ? (
            <button
              type="button"
              className="roadmap-branch__toggle"
              aria-expanded={!isCollapsed}
              onClick={() => toggle(branch.id)}
            >
              <span aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
              <span className="visually-hidden">
                {isCollapsed ? 'Expand' : 'Collapse'} {thought.text}
              </span>
            </button>
          ) : (
            <span className="roadmap-branch__spacer" aria-hidden="true" />
          )}

          <button
            type="button"
            className="roadmap-branch__label"
            onClick={() => onSelectThought(branch.id)}
          >
            {branch.relation && branch.parentId ? (
              <span className="faint">
                {relationPhrase(branch.relation, branch.parentId)}{' '}
              </span>
            ) : null}
            {thought.text}
            <span className="faint"> · {THOUGHT_TYPE_LABEL[thought.type]}</span>
          </button>

          {branch.depth > 0 ? (
            <span className="chip roadmap-branch__level">Level {branch.depth}</span>
          ) : null}

          {hasChildren && isCollapsed ? (
            <button type="button" className="chip" onClick={() => toggle(branch.id)}>
              {branch.descendants} beneath
            </button>
          ) : null}

          {branch.repeated ? <span className="faint">already shown above</span> : null}
        </div>

        {hasChildren && !isCollapsed ? (
          <ul>{branch.children.map(renderBranch)}</ul>
        ) : null}
      </li>
    )
  }

  const parents = relations
    .map((relation) => ({ relation, levels: hierarchy(relation) }))
    .filter((entry) => entry.levels?.lower === focusId)

  const lateral = relations.filter(
    (relation) =>
      !hierarchy(relation) &&
      (relation.sourceThoughtId === focusId || relation.targetThoughtId === focusId),
  )

  return (
    <div className="roadmap-list stack">
      <section>
        <h3>Above this thought</h3>
        {parents.length === 0 ? (
          <p className="faint">Nothing above it yet.</p>
        ) : (
          <ul>
            {parents.map((entry) => {
              const parent = byId.get(entry.levels!.upper)
              return (
                <li key={entry.relation.id}>
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => onSelectThought(entry.levels!.upper)}
                  >
                    {/* Reads upwards, away from the thought in focus. */}
                    <span className="faint">{relationPhrase(entry.relation, focusId)} </span>
                    {parent?.text ?? 'a removed thought'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="spread">
          <h3 style={{ margin: 0 }}>This thought and everything beneath it</h3>
          {tree.descendants > 0 ? (
            <div className="row">
              <button type="button" className="button button--small" onClick={expandAll}>
                Expand all
              </button>
              <button type="button" className="button button--small" onClick={collapseAll}>
                Collapse all
              </button>
            </div>
          ) : null}
        </div>
        <ul className="roadmap-tree">{renderBranch(tree)}</ul>
      </section>

      {lateral.length > 0 ? (
        <section>
          <h3>Related sideways</h3>
          <ul>
            {lateral.map((relation) => {
              const otherId =
                relation.sourceThoughtId === focusId
                  ? relation.targetThoughtId
                  : relation.sourceThoughtId
              return (
                <li key={relation.id}>
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => onSelectThought(otherId)}
                  >
                    <span className="faint">{relationPhrase(relation, focusId)} </span>
                    {byId.get(otherId)?.text ?? 'a removed thought'}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
