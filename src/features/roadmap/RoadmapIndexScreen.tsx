import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { THOUGHT_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { downstreamIds, rootIds, upstreamIds } from '../../domain/graph'
import { filterThoughts } from '../../domain/selectors'
import type { ThoughtType } from '../../domain/types'
import { useRelations, useStore, useVisibleThoughts } from '../../store'

/** Types that usually make a useful roadmap root. */
const STRUCTURAL_TYPES: ThoughtType[] = ['value', 'vision', 'goal', 'outcome', 'project']

export function RoadmapIndexScreen() {
  const thoughts = useVisibleThoughts()
  const relations = useRelations()
  const selectThought = useStore((state) => state.selectThought)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ThoughtType[]>([])
  const [onlyConnected, setOnlyConnected] = useState(true)
  const [onlyRoots, setOnlyRoots] = useState(true)

  /** Thoughts with nothing above them — the top of each structure. */
  const roots = useMemo(
    () => new Set(rootIds(relations, thoughts.map((thought) => thought.id))),
    [relations, thoughts],
  )

  /** How many thoughts sit above and below each thought. */
  const connections = useMemo(() => {
    const table = new Map<string, { above: number; below: number }>()
    for (const thought of thoughts) {
      table.set(thought.id, {
        above: upstreamIds(relations, thought.id).length,
        below: downstreamIds(relations, thought.id).length,
      })
    }
    return table
  }, [thoughts, relations])

  const countsByType = useMemo(() => {
    const counts: Partial<Record<ThoughtType, number>> = {}
    for (const thought of thoughts) {
      counts[thought.type] = (counts[thought.type] ?? 0) + 1
    }
    return counts
  }, [thoughts])

  const listed = useMemo(() => {
    const matching = filterThoughts(thoughts, { search, types: typeFilter })
    const connected = onlyConnected
      ? matching.filter((thought) => {
          const entry = connections.get(thought.id)
          return (entry?.above ?? 0) + (entry?.below ?? 0) > 0
        })
      : matching
    const scoped = onlyRoots ? connected.filter((thought) => roots.has(thought.id)) : connected

    return [...scoped].sort((a, b) => {
      const aEntry = connections.get(a.id)
      const bEntry = connections.get(b.id)
      // Biggest structures first — they are the ones worth opening.
      const aBelow = aEntry?.below ?? 0
      const bBelow = bEntry?.below ?? 0
      if (bBelow !== aBelow) return bBelow - aBelow
      const aTotal = aBelow + (aEntry?.above ?? 0)
      const bTotal = bBelow + (bEntry?.above ?? 0)
      if (bTotal !== aTotal) return bTotal - aTotal
      return a.text.localeCompare(b.text)
    })
  }, [thoughts, search, typeFilter, onlyConnected, onlyRoots, roots, connections])

  const suggested = useMemo(
    () => listed.filter((thought) => STRUCTURAL_TYPES.includes(thought.type)).slice(0, 3),
    [listed],
  )

  const filterableTypes = useMemo(
    () => THOUGHT_TYPES.filter((type) => (countsByType[type] ?? 0) > 0),
    [countsByType],
  )

  const toggleType = (type: ThoughtType) =>
    setTypeFilter((current) =>
      current.includes(type) ? current.filter((entry) => entry !== type) : [...current, type],
    )

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>Roadmap</h1>
        <p>Choose a thought to see what sits above and below it.</p>
      </div>

      {suggested.length > 0 ? (
        <section className="card stack" style={{ gap: 'var(--space-2)' }}>
          <h2 style={{ margin: 0 }}>Good places to start</h2>
          <div className="row">
            {suggested.map((thought) => (
              <Link key={thought.id} className="button" to={`/roadmap/${thought.id}`}>
                {thought.text}
                <span className="faint">
                  {connections.get(thought.id)?.below ?? 0} beneath
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="filter-bar">
        <div className="field" style={{ flex: '1 1 16rem' }}>
          <label htmlFor="roadmap-search">Search</label>
          <input
            id="roadmap-search"
            className="input"
            value={search}
            placeholder="Find a thought"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="button"
          aria-pressed={onlyRoots}
          onClick={() => setOnlyRoots((value) => !value)}
        >
          Top of each structure only
        </button>
        <button
          type="button"
          className="button"
          aria-pressed={onlyConnected}
          onClick={() => setOnlyConnected((value) => !value)}
        >
          Only thoughts with relationships
        </button>
      </div>

      {onlyRoots ? (
        <p className="faint" style={{ margin: 0 }}>
          Showing only thoughts with nothing above them, so each structure appears once. Every
          thought beneath is reachable from its roadmap.
        </p>
      ) : null}

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

      <p className="muted" style={{ margin: 0 }} role="status" aria-live="polite">
        Showing {listed.length} of {thoughts.length}
      </p>

      {listed.length === 0 ? (
        <div className="empty-state stack">
          <p style={{ margin: 0 }}>
            {onlyConnected
              ? 'Nothing here has a relationship yet. Add one from Structure or a thought’s detail panel.'
              : 'No thoughts match this filter.'}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            {onlyRoots ? (
              <button
                type="button"
                className="button button--small"
                onClick={() => setOnlyRoots(false)}
              >
                Show every level
              </button>
            ) : null}
            {onlyConnected ? (
              <button
                type="button"
                className="button button--small"
                onClick={() => setOnlyConnected(false)}
              >
                Show unconnected thoughts too
              </button>
            ) : null}
            <Link className="button button--small" to="/structure">
              Open Structure
            </Link>
          </div>
        </div>
      ) : (
        <ul className="settings-list">
          {listed.map((thought) => {
            const entry = connections.get(thought.id)
            return (
              <li key={thought.id} className="settings-item spread">
                <span>
                  {thought.text}{' '}
                  <span className="faint">
                    ({THOUGHT_TYPE_LABEL[thought.type]}) · {entry?.above ?? 0} above ·{' '}
                    {entry?.below ?? 0} beneath
                  </span>
                </span>
                <span className="row">
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => selectThought(thought.id)}
                  >
                    Details
                  </button>
                  <Link className="button button--small" to={`/roadmap/${thought.id}`}>
                    Open roadmap
                  </Link>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
