import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { RoadmapFlow } from '../../components/roadmap/RoadmapFlow'
import { RoadmapList } from '../../components/roadmap/RoadmapList'
import { RelationEditor } from '../../components/thoughts/RelationEditor'
import { RELATION_LABEL, RELATION_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { neighbourhoodIds, relationEndpoints } from '../../domain/graph'
import { RELATION_STYLE } from '../../domain/relationStyle'
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
  const addRelation = useStore((state) => state.addRelation)
  const showToast = useStore((state) => state.showToast)

  const isNarrow = useMediaQuery('(max-width: 760px)')
  const [forceList, setForceList] = useState(false)
  const [direction, setDirection] = useState<Direction>('both')
  const [expandAll, setExpandAll] = useState(true)
  const [hiddenTypes, setHiddenTypes] = useState<RelationType[]>([])
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [showRelationEditor, setShowRelationEditor] = useState(false)
  const [connectType, setConnectType] = useState<RelationType>('serves')

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

      <div className="field" style={{ maxWidth: '20rem' }}>
        <label htmlFor="roadmap-connect-type">Dragging between two thoughts creates</label>
        <select
          id="roadmap-connect-type"
          className="select"
          value={connectType}
          onChange={(event) => setConnectType(event.target.value as RelationType)}
        >
          {RELATION_TYPES.map((type) => (
            <option key={type} value={type}>
              lower {RELATION_LABEL[type]} upper
            </option>
          ))}
        </select>
      </div>

      {listMode ? null : (
        <p className="faint">
          Drag a node to move it. Drag from the dot under one node to the dot above another to
          connect them. Select a line and press Delete to remove it. Click any node to open its
          details.
        </p>
      )}

      <fieldset className="relation-legend" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="label">Relationship types — select to show or hide</legend>
        {RELATION_TYPES.map((type) => {
          const shown = !hiddenTypes.includes(type)
          const style = RELATION_STYLE[type]
          const count = relations.filter((relation) => relation.type === type).length
          return (
            <button
              key={type}
              type="button"
              className="button button--small"
              aria-pressed={shown}
              title={style.meaning}
              onClick={() =>
                setHiddenTypes((current) =>
                  shown ? [...current, type] : current.filter((entry) => entry !== type),
                )
              }
            >
              <svg width="26" height="10" aria-hidden="true">
                <line
                  x1="1"
                  y1="5"
                  x2="25"
                  y2="5"
                  stroke={style.stroke}
                  strokeWidth={style.width}
                  strokeDasharray={style.dash}
                  opacity={shown ? 1 : 0.35}
                />
              </svg>
              {RELATION_LABEL[type]}
              <span className="faint">{count}</span>
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
          onConnectThoughts={(upperId, lowerId) => {
            const { sourceThoughtId, targetThoughtId } = relationEndpoints(
              connectType,
              upperId,
              lowerId,
            )
            const result = addRelation(sourceThoughtId, connectType, targetThoughtId)
            showToast(
              result.ok
                ? (result.warning ?? `Added: ${RELATION_LABEL[connectType]}.`)
                : (result.reason ?? 'That relationship could not be added.'),
            )
          }}
          onDeleteRelations={(relationIds) => {
            for (const relationId of relationIds) deleteRelation(relationId)
            setSelectedEdgeId(null)
            showToast(
              relationIds.length === 1
                ? 'Relationship removed.'
                : `${relationIds.length} relationships removed.`,
            )
          }}
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
