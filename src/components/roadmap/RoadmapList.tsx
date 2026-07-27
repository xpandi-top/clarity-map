import { THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { hierarchy, relationPhrase } from '../../domain/graph'
import type { Thought, ThoughtRelation } from '../../domain/types'

interface RoadmapListProps {
  thoughts: Thought[]
  relations: ThoughtRelation[]
  focusId: string
  onSelectThought: (thoughtId: string) => void
}

/** Text alternative to the graph, usable with a keyboard and screen reader. */
export function RoadmapList({
  thoughts,
  relations,
  focusId,
  onSelectThought,
}: RoadmapListProps) {
  const byId = new Map(thoughts.map((thought) => [thought.id, thought]))

  const childrenOf = (id: string) =>
    relations
      .map((relation) => ({ relation, levels: hierarchy(relation) }))
      .filter((entry) => entry.levels?.upper === id)
      .map((entry) => ({ relation: entry.relation, id: entry.levels!.lower }))

  const renderBranch = (id: string, seen: Set<string>, relationLabel?: string) => {
    const thought = byId.get(id)
    if (!thought) return null
    const alreadySeen = seen.has(id)
    const nextSeen = new Set(seen).add(id)
    const children = alreadySeen ? [] : childrenOf(id)

    return (
      <li key={`${relationLabel ?? 'root'}-${id}`}>
        <button
          type="button"
          className="button button--quiet button--small"
          onClick={() => onSelectThought(id)}
        >
          {relationLabel ? <span className="faint">{relationLabel} </span> : null}
          {thought.text}
          <span className="faint"> ({THOUGHT_TYPE_LABEL[thought.type]})</span>
        </button>
        {alreadySeen ? <span className="faint"> — already shown above</span> : null}
        {children.length > 0 ? (
          <ul>
            {children.map((child) =>
              // The branch reads downwards from `id`, so the phrase must too.
              renderBranch(child.id, nextSeen, relationPhrase(child.relation, id)),
            )}
          </ul>
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
                    <span className="faint">
                      {relationPhrase(entry.relation, focusId)}{' '}
                    </span>
                    {parent?.text ?? 'a removed thought'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3>This thought and everything beneath it</h3>
        <ul>{renderBranch(focusId, new Set())}</ul>
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
