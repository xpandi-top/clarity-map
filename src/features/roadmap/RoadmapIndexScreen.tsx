import { Link } from 'react-router-dom'
import { THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { useRelations, useVisibleThoughts } from '../../store'

/** Picks which thought's roadmap to open. */
export function RoadmapIndexScreen() {
  const thoughts = useVisibleThoughts()
  const relations = useRelations()

  const connected = new Set(
    relations.flatMap((relation) => [relation.sourceThoughtId, relation.targetThoughtId]),
  )
  const candidates = thoughts.filter(
    (thought) =>
      connected.has(thought.id) ||
      ['value', 'vision', 'goal', 'outcome', 'project'].includes(thought.type),
  )

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>Roadmap</h1>
        <p>Choose a thought to see what sits above and below it.</p>
      </div>

      {candidates.length === 0 ? (
        <p className="empty-state">
          Nothing is connected yet. Add relationships from a thought's detail panel, or use{' '}
          <Link to="/structure">Structure</Link>.
        </p>
      ) : (
        <ul className="settings-list">
          {candidates.map((thought) => (
            <li key={thought.id} className="settings-item spread">
              <span>
                {thought.text}{' '}
                <span className="faint">({THOUGHT_TYPE_LABEL[thought.type]})</span>
              </span>
              <Link className="button button--small" to={`/roadmap/${thought.id}`}>
                Open roadmap
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
