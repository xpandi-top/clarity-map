import { useMemo, useState } from 'react'
import { BreakdownDialog } from '../../components/thoughts/BreakdownDialog'
import { ThoughtMeta } from '../../components/thoughts/ThoughtMeta'
import { TypeMapDiagram } from '../../components/structure/TypeMapDiagram'
import { OUTCOME_HINT, looksLikeOutcome } from '../../domain/classification'
import {
  BREAKDOWN_TYPES,
  RELATION_LABEL,
  THOUGHT_TYPES,
  THOUGHT_TYPE_DEFINITION,
  THOUGHT_TYPE_LABEL,
} from '../../domain/defaults'
import { findCycles } from '../../domain/graph'
import {
  SIMPLE_TYPES,
  TYPE_GROUPS,
  TYPE_LONG_DESCRIPTION,
  TYPE_MAP_SENTENCE,
  groupOf,
} from '../../domain/typeMap'
import type { ThoughtType } from '../../domain/types'
import { useRelations, useStore, useVisibleThoughts } from '../../store'

export function StructureScreen() {
  const thoughts = useVisibleThoughts()
  const relations = useRelations()
  const setThoughtType = useStore((state) => state.setThoughtType)
  const selectThought = useStore((state) => state.selectThought)
  const [breakdownId, setBreakdownId] = useState<string | null>(null)
  const [onlyUnclassified, setOnlyUnclassified] = useState(false)
  const [simplifiedMap, setSimplifiedMap] = useState(true)
  const [selectedType, setSelectedType] = useState<ThoughtType | null>(null)

  const visible = useMemo(
    () =>
      onlyUnclassified
        ? thoughts.filter((thought) => thought.type === 'unclassified')
        : thoughts,
    [thoughts, onlyUnclassified],
  )

  const byId = useMemo(() => new Map(thoughts.map((entry) => [entry.id, entry])), [thoughts])
  const cycles = useMemo(() => findCycles(relations), [relations])
  const unclassified = thoughts.filter((thought) => thought.type === 'unclassified').length

  const countsByType = useMemo(() => {
    const counts: Partial<Record<ThoughtType, number>> = {}
    for (const thought of thoughts) {
      counts[thought.type] = (counts[thought.type] ?? 0) + 1
    }
    return counts
  }, [thoughts])

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>Structure</h1>
        <p>
          What kind of thought is each of these? Leaving something unclassified is a valid
          answer.
        </p>
      </div>

      <div className="spread">
        <p className="muted" style={{ margin: 0 }}>
          {unclassified} of {thoughts.length} still unclassified
        </p>
        <button
          type="button"
          className="button"
          aria-pressed={onlyUnclassified}
          onClick={() => setOnlyUnclassified((value) => !value)}
        >
          Show only unclassified
        </button>
      </div>

      {cycles.length > 0 ? (
        <div className="notice notice--warning" role="status">
          <p style={{ marginBottom: 0 }}>
            {cycles.length} loop{cycles.length === 1 ? '' : 's'} found in your relationships. That
            can be intentional, so nothing has been changed. The first loop passes through:{' '}
            {cycles[0]
              .map((id) => byId.get(id)?.text ?? 'a removed thought')
              .join(' → ')}
            .
          </p>
        </div>
      ) : null}

      <section className="card stack">
        <div className="spread">
          <div>
            <h2 style={{ margin: 0 }}>How the types fit together</h2>
            <p className="muted" style={{ marginBottom: 0 }}>{TYPE_MAP_SENTENCE}</p>
          </div>
          <button
            type="button"
            className="button"
            aria-pressed={simplifiedMap}
            onClick={() => {
              setSimplifiedMap((value) => !value)
              setSelectedType(null)
            }}
          >
            {simplifiedMap ? 'Show all thirteen types' : 'Show the simple five'}
          </button>
        </div>

        <TypeMapDiagram
          simplified={simplifiedMap}
          selected={selectedType}
          onSelect={(type) => setSelectedType((current) => (current === type ? null : type))}
          counts={countsByType}
        />

        <p className="faint">
          Select a box to read what that type means. Solid arrows break a thought down a level;
          dashed arrows are what a thought often turns into once it is clearer.
          {simplifiedMap
            ? ' These five cover most thoughts — the rest are refinements.'
            : null}
        </p>

        {selectedType ? (
          <div className="notice stack" style={{ gap: 'var(--space-2)' }}>
            <div className="spread">
              <h3 style={{ margin: 0 }}>{THOUGHT_TYPE_LABEL[selectedType]}</h3>
              <span className="chip">
                {groupOf(selectedType)?.label ?? 'Type'} ·{' '}
                {countsByType[selectedType] ?? 0} in this workspace
              </span>
            </div>
            <p style={{ margin: 0 }}>{THOUGHT_TYPE_DEFINITION[selectedType]}</p>
            <p style={{ margin: 0 }} className="muted">
              {TYPE_LONG_DESCRIPTION[selectedType]}
            </p>
          </div>
        ) : null}

        <details>
          <summary>Every type, grouped</summary>
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {TYPE_GROUPS.map((group) => (
              <div key={group.id}>
                <h3 style={{ marginBottom: 'var(--space-1)' }}>{group.label}</h3>
                <p className="faint" style={{ marginTop: 0 }}>{group.summary}</p>
                <dl style={{ margin: 0 }}>
                  {group.types.map((type) => (
                    <div key={type} style={{ marginBottom: 'var(--space-2)' }}>
                      <dt className="label">
                        {THOUGHT_TYPE_LABEL[type]}
                        {SIMPLE_TYPES.includes(type) ? (
                          <span className="chip" style={{ marginLeft: 'var(--space-2)' }}>
                            start here
                          </span>
                        ) : null}
                      </dt>
                      <dd style={{ margin: 0 }}>{TYPE_LONG_DESCRIPTION[type]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </details>
      </section>

      <ul className="settings-list">
        {visible.map((thought) => {
          const outgoing = relations.filter(
            (relation) => relation.sourceThoughtId === thought.id,
          )
          const showHint = thought.type === 'action' && looksLikeOutcome(thought.text)
          return (
            <li key={thought.id} className="settings-item stack" style={{ gap: 'var(--space-2)' }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{thought.text}</p>
              <ThoughtMeta thought={thought} />

              <div className="row">
                <label className="label" htmlFor={`type-${thought.id}`}>
                  Type
                </label>
                <select
                  id={`type-${thought.id}`}
                  className="select"
                  style={{ maxWidth: '14rem' }}
                  value={thought.type}
                  onChange={(event) =>
                    setThoughtType(thought.id, event.target.value as ThoughtType)
                  }
                >
                  {THOUGHT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {THOUGHT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => selectThought(thought.id)}
                >
                  Details and relationships
                </button>
                {BREAKDOWN_TYPES.includes(thought.type) ? (
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => setBreakdownId(thought.id)}
                  >
                    Break this down
                  </button>
                ) : null}
              </div>

              <p className="faint" style={{ margin: 0 }}>
                {THOUGHT_TYPE_DEFINITION[thought.type]}
              </p>

              {showHint ? (
                <p className="notice notice--warning" role="status">
                  {OUTCOME_HINT}
                </p>
              ) : null}

              {outgoing.length > 0 ? (
                <ul className="row">
                  {outgoing.map((relation) => (
                    <li key={relation.id} className="chip">
                      {RELATION_LABEL[relation.type]}{' '}
                      {byId.get(relation.targetThoughtId)?.text ?? 'a removed thought'}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>

      {visible.length === 0 ? (
        <p className="empty-state">Nothing to classify here.</p>
      ) : null}

      {breakdownId ? (
        <BreakdownDialog thoughtId={breakdownId} onClose={() => setBreakdownId(null)} />
      ) : null}
    </div>
  )
}
