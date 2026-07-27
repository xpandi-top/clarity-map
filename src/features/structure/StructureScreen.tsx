import { useMemo, useState } from 'react'
import { BreakdownDialog } from '../../components/thoughts/BreakdownDialog'
import { QuickRelation } from '../../components/thoughts/QuickRelation'
import { ThoughtMeta } from '../../components/thoughts/ThoughtMeta'
import { TypeMapDiagram } from '../../components/structure/TypeMapDiagram'
import { OUTCOME_HINT, looksLikeOutcome } from '../../domain/classification'
import {
  RELATION_LABEL,
  THOUGHT_TYPES,
  THOUGHT_TYPE_DEFINITION,
  THOUGHT_TYPE_LABEL,
} from '../../domain/defaults'
import { findCycles } from '../../domain/graph'
import { filterThoughts } from '../../domain/selectors'
import {
  SIMPLE_TYPES,
  TYPE_GROUPS,
  TYPE_GROUP_STYLE,
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
  const deleteRelation = useStore((state) => state.deleteRelation)
  const [breakdownId, setBreakdownId] = useState<string | null>(null)
  // Empty means every type. Drives both the chips and the shortcut button.
  const [typeFilter, setTypeFilter] = useState<ThoughtType[]>([])
  const [simplifiedMap, setSimplifiedMap] = useState(true)
  const [selectedType, setSelectedType] = useState<ThoughtType | null>(null)

  const visible = useMemo(
    () => filterThoughts(thoughts, { types: typeFilter }),
    [thoughts, typeFilter],
  )

  const byId = useMemo(() => new Map(thoughts.map((entry) => [entry.id, entry])), [thoughts])
  const cycles = useMemo(() => findCycles(relations), [relations])
  const unclassified = thoughts.filter((thought) => thought.type === 'unclassified').length
  const classified = thoughts.length - unclassified

  const countsByType = useMemo(() => {
    const counts: Partial<Record<ThoughtType, number>> = {}
    for (const thought of thoughts) {
      counts[thought.type] = (counts[thought.type] ?? 0) + 1
    }
    return counts
  }, [thoughts])

  // Unclassified always shows so the filter is reachable; the rest appear
  // once the workspace actually holds one.
  const filterableTypes = useMemo(
    () =>
      THOUGHT_TYPES.filter(
        (type) => type === 'unclassified' || (countsByType[type] ?? 0) > 0,
      ),
    [countsByType],
  )

  const onlyUnclassified = typeFilter.length === 1 && typeFilter[0] === 'unclassified'

  const toggleType = (type: ThoughtType) =>
    setTypeFilter((current) =>
      current.includes(type)
        ? current.filter((entry) => entry !== type)
        : [...current, type],
    )

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
        <p className="muted" style={{ margin: 0 }} role="status" aria-live="polite">
          {[
            thoughts.length === 0
              ? 'No thoughts yet'
              : unclassified === 0
                ? `All ${thoughts.length} thoughts have a type`
                : `${classified} of ${thoughts.length} given a type · ${unclassified} still unclassified`,
            typeFilter.length > 0 ? `showing ${visible.length}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <button
          type="button"
          className="button"
          aria-pressed={onlyUnclassified}
          onClick={() => setTypeFilter(onlyUnclassified ? [] : ['unclassified'])}
        >
          Show only unclassified
        </button>
      </div>

      <fieldset className="filter-bar" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="label">Filter by type</legend>
        <button
          type="button"
          className="button button--small"
          aria-pressed={typeFilter.length === 0}
          onClick={() => setTypeFilter([])}
        >
          All types <span className="faint">{thoughts.length}</span>
        </button>
        {filterableTypes.map((type) => (
          <button
            key={type}
            type="button"
            className="button button--small"
            aria-pressed={typeFilter.includes(type)}
            onClick={() => toggleType(type)}
          >
            {THOUGHT_TYPE_LABEL[type]} <span className="faint">{countsByType[type] ?? 0}</span>
          </button>
        ))}
      </fieldset>

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

        <ul className="row group-legend">
          {TYPE_GROUPS.map((group) => (
            <li
              key={group.id}
              className="chip"
              style={{
                borderColor: TYPE_GROUP_STYLE[group.id].stroke,
                background: TYPE_GROUP_STYLE[group.id].fill,
                color: TYPE_GROUP_STYLE[group.id].stroke,
              }}
              title={group.summary}
            >
              {group.label}
            </li>
          ))}
        </ul>

        <p className="faint">
          Colours group the types into families, and the same colours appear on the roadmap.
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
            {(countsByType[selectedType] ?? 0) > 0 ? (
              <div className="row">
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => setTypeFilter([selectedType])}
                >
                  Show only these below
                </button>
              </div>
            ) : null}
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
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => setBreakdownId(thought.id)}
                >
                  Break this down
                </button>
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
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        aria-label={`Remove relationship: ${RELATION_LABEL[relation.type]} ${
                          byId.get(relation.targetThoughtId)?.text ?? 'a removed thought'
                        }`}
                        onClick={() => deleteRelation(relation.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <QuickRelation sourceThoughtId={thought.id} />
            </li>
          )
        })}
      </ul>

      {visible.length === 0 ? (
        <div className="empty-state stack">
          <p style={{ margin: 0 }}>
            {thoughts.length === 0
              ? 'Nothing captured yet.'
              : 'No thoughts match this filter.'}
          </p>
          {typeFilter.length > 0 ? (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="button button--small"
                onClick={() => setTypeFilter([])}
              >
                Show all types
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {breakdownId ? (
        <BreakdownDialog thoughtId={breakdownId} onClose={() => setBreakdownId(null)} />
      ) : null}
    </div>
  )
}
