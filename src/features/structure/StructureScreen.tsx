import { useMemo, useState } from 'react'
import { BreakdownDialog } from '../../components/thoughts/BreakdownDialog'
import { ThoughtMeta } from '../../components/thoughts/ThoughtMeta'
import { OUTCOME_HINT, looksLikeOutcome } from '../../domain/classification'
import {
  BREAKDOWN_TYPES,
  RELATION_LABEL,
  THOUGHT_TYPES,
  THOUGHT_TYPE_DEFINITION,
  THOUGHT_TYPE_LABEL,
} from '../../domain/defaults'
import { findCycles } from '../../domain/graph'
import type { ThoughtType } from '../../domain/types'
import { useRelations, useStore, useVisibleThoughts } from '../../store'

export function StructureScreen() {
  const thoughts = useVisibleThoughts()
  const relations = useRelations()
  const setThoughtType = useStore((state) => state.setThoughtType)
  const selectThought = useStore((state) => state.selectThought)
  const [breakdownId, setBreakdownId] = useState<string | null>(null)
  const [onlyUnclassified, setOnlyUnclassified] = useState(false)

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

      <details className="card">
        <summary>What the types mean</summary>
        <dl style={{ marginTop: 'var(--space-3)' }}>
          {THOUGHT_TYPES.filter((type) => type !== 'unclassified').map((type) => (
            <div key={type} style={{ marginBottom: 'var(--space-2)' }}>
              <dt className="label">{THOUGHT_TYPE_LABEL[type]}</dt>
              <dd style={{ margin: 0 }}>{THOUGHT_TYPE_DEFINITION[type]}</dd>
            </div>
          ))}
        </dl>
      </details>

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
