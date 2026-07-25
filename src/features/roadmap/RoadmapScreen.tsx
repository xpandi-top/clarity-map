import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { RoadmapFlow } from '../../components/roadmap/RoadmapFlow'
import { RoadmapList } from '../../components/roadmap/RoadmapList'
import { RelationEditor } from '../../components/thoughts/RelationEditor'
import { RELATION_LABEL, RELATION_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { neighbourhoodIds } from '../../domain/graph'
import type { RelationType } from '../../domain/types'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useRelations, useStore, useThought, useThoughts } from '../../store'

type Direction = 'both' | 'up' | 'down'

export function RoadmapScreen() {
  const { thoughtId = '' } = useParams()
  const focus = useThought(thoughtId)
  const thoughts = useThoughts()
  const relations = useRelations()
  const selectThought = useStore((state) => state.selectThought)
  const deleteRelation = useStore((state) => state.deleteRelation)
  const showToast = useStore((state) => state.showToast)

  const isNarrow = useMediaQuery('(max-width: 760px)')
  const [forceList, setForceList] = useState(false)
  const [direction, setDirection] = useState<Direction>('both')
  const [expandAll, setExpandAll] = useState(true)
  const [hiddenTypes, setHiddenTypes] = useState<RelationType[]>([])
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [showRelationEditor, setShowRelationEditor] = useState(false)

  const visibleRelations = useMemo(
    () => relations.filter((relation) => !hiddenTypes.includes(relation.type)),
    [relations, hiddenTypes],
  )

  const includedIds = useMemo(() => {
    if (!focus) return []
    return neighbourhoodIds(visibleRelations, focus.id, {
      direction,
      maxDepth: expandAll ? Infinity : 1,
    })
  }, [visibleRelations, focus, direction, expandAll])

  const subgraphThoughts = useMemo(
    () => thoughts.filter((thought) => includedIds.includes(thought.id)),
    [thoughts, includedIds],
  )

  const subgraphRelations = useMemo(
    () =>
      visibleRelations.filter(
        (relation) =>
          includedIds.includes(relation.sourceThoughtId) &&
          includedIds.includes(relation.targetThoughtId),
      ),
    [visibleRelations, includedIds],
  )

  const selectedEdge = subgraphRelations.find((relation) => relation.id === selectedEdgeId)
  const listMode = isNarrow || forceList

  if (!thoughtId) return <Navigate to="/roadmap" replace />
  if (!focus) {
    return (
      <div className="stack">
        <h1>Roadmap</h1>
        <p className="empty-state">
          That thought no longer exists. <Link to="/roadmap">Choose another one.</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="screen-header spread">
        <div>
          <h1>{focus.text}</h1>
          <p>
            {THOUGHT_TYPE_LABEL[focus.type]} · {subgraphThoughts.length} connected thought
            {subgraphThoughts.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="row">
          <Link className="button" to="/matrix">
            Back to matrix
          </Link>
          <button
            type="button"
            className="button"
            onClick={() => selectThought(focus.id)}
          >
            Open details
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="roadmap-direction">Show</label>
          <select
            id="roadmap-direction"
            className="select"
            value={direction}
            onChange={(event) => setDirection(event.target.value as Direction)}
          >
            <option value="both">Above and below</option>
            <option value="up">Upstream only</option>
            <option value="down">Downstream only</option>
          </select>
        </div>
        <button
          type="button"
          className="button"
          aria-pressed={expandAll}
          onClick={() => setExpandAll((value) => !value)}
        >
          {expandAll ? 'Showing all connected' : 'Showing one level'}
        </button>
        <button
          type="button"
          className="button"
          aria-pressed={listMode}
          disabled={isNarrow}
          onClick={() => setForceList((value) => !value)}
        >
          {listMode ? 'Showing list' : 'Switch to list'}
        </button>
      </div>

      <fieldset className="filter-bar" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="label">Relationship types</legend>
        {RELATION_TYPES.map((type) => {
          const shown = !hiddenTypes.includes(type)
          return (
            <button
              key={type}
              type="button"
              className="button button--small"
              aria-pressed={shown}
              onClick={() =>
                setHiddenTypes((current) =>
                  shown ? [...current, type] : current.filter((entry) => entry !== type),
                )
              }
            >
              {RELATION_LABEL[type]}
            </button>
          )
        })}
      </fieldset>

      {listMode ? (
        <RoadmapList
          thoughts={subgraphThoughts}
          relations={subgraphRelations}
          focusId={focus.id}
          onSelectThought={selectThought}
        />
      ) : (
        <RoadmapFlow
          thoughts={subgraphThoughts}
          relations={subgraphRelations}
          focusId={focus.id}
          selectedEdgeId={selectedEdgeId}
          onSelectThought={selectThought}
          onSelectEdge={setSelectedEdgeId}
        />
      )}

      {selectedEdge ? (
        <div className="notice spread">
          <span>Selected relationship: {RELATION_LABEL[selectedEdge.type]}</span>
          <button
            type="button"
            className="button button--danger button--small"
            onClick={() => {
              deleteRelation(selectedEdge.id)
              setSelectedEdgeId(null)
              showToast('Relationship removed.')
            }}
          >
            Delete relationship
          </button>
        </div>
      ) : null}

      <section className="card stack">
        <h2>Add to this roadmap</h2>
        {showRelationEditor ? (
          <RelationEditor
            sourceThoughtId={focus.id}
            onDone={(message) => showToast(message)}
          />
        ) : (
          <button
            type="button"
            className="button"
            onClick={() => setShowRelationEditor(true)}
          >
            Add a thought or relationship
          </button>
        )}
      </section>

      {listMode ? null : (
        <details>
          <summary>List view of the same structure</summary>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <RoadmapList
              thoughts={subgraphThoughts}
              relations={subgraphRelations}
              focusId={focus.id}
              onSelectThought={selectThought}
            />
          </div>
        </details>
      )}
    </div>
  )
}
