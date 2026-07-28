import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { BUILTIN_DIMENSION, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { hierarchy, relationPhrase } from '../../domain/graph'
import { RELATION_STYLE } from '../../domain/relationStyle'
import { NODE_HEIGHT, NODE_WIDTH, layoutGraph } from '../../domain/roadmapLayout'
import { groupLabelOfType, styleOfType } from '../../domain/typeMap'
import type { Thought, ThoughtRelation } from '../../domain/types'
import { t, tx } from '../../i18n/core'

type RoadmapNodeData = {
  label: string
  meta: string
  isFocus: boolean
  group: string
  stroke: string
  fill: string
}
type RoadmapNode = Node<RoadmapNodeData, 'roadmap'>

function RoadmapNodeView({ data, selected }: NodeProps<RoadmapNode>) {
  return (
    <div
      className={`roadmap-node${data.isFocus ? ' is-focus' : ''}${selected ? ' is-selected' : ''}`}
      // The family colour, always alongside the family name in the meta line.
      style={{ borderLeft: `4px solid ${data.stroke}`, background: data.fill }}
    >
      <Handle type="target" position={Position.Top} className="roadmap-handle" />
      <div>{data.label}</div>
      <div className="roadmap-node__meta">
        <span style={{ color: data.stroke }}>{data.group}</span> · {data.meta}
      </div>
      <Handle type="source" position={Position.Bottom} className="roadmap-handle" />
    </div>
  )
}

// Defined once at module scope so React Flow does not warn about new types.
const nodeTypes = { roadmap: RoadmapNodeView }

interface RoadmapFlowProps {
  thoughts: Thought[]
  relations: ThoughtRelation[]
  focusId: string
  /** Levels below the thought in focus, shown on each node. */
  depthById: Map<string, number>
  selectedEdgeId: string | null
  onSelectThought: (thoughtId: string) => void
  onSelectEdge: (edgeId: string | null) => void
  /** A connection was drawn from `upperId` down to `lowerId`. */
  onConnectThoughts: (upperId: string, lowerId: string) => void
  onDeleteRelations: (relationIds: string[]) => void
}

/**
 * Which end of a relationship is drawn on top. `hierarchy` knows that
 * `breaksDownInto` runs the opposite way to `serves` and friends; lateral
 * relationships keep their stored order.
 */
function drawnDirection(relation: ThoughtRelation): { from: string; to: string } {
  const levels = hierarchy(relation)
  return levels
    ? { from: levels.upper, to: levels.lower }
    : { from: relation.sourceThoughtId, to: relation.targetThoughtId }
}

function buildNodes(
  thoughts: Thought[],
  relations: ThoughtRelation[],
  focusId: string,
  depthById: Map<string, number>,
  savedPositions: Map<string, { x: number; y: number }>,
): RoadmapNode[] {
  // Edges run from the higher-level thought downwards, which is the direction
  // the layout should flow.
  const positions = layoutGraph(
    thoughts.map((thought) => ({ id: thought.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    relations.map((relation) => {
      const { from, to } = drawnDirection(relation)
      return { source: from, target: to }
    }),
  )

  return thoughts.map((thought) => {
    const priority = thought.dimensionValues[BUILTIN_DIMENSION.priority]
    const level = depthById.get(thought.id)
    const style = styleOfType(thought.type)
    return {
      id: thought.id,
      type: 'roadmap',
      // A position the user dragged wins over the computed layout.
      position: savedPositions.get(thought.id) ?? positions[thought.id] ?? { x: 0, y: 0 },
      data: {
        label: thought.text,
        meta: [
          t(THOUGHT_TYPE_LABEL[thought.type]),
          level !== undefined && level > 0
            ? tx('Level {level}', '第 {level} 层', { level })
            : null,
          typeof priority === 'number'
            ? tx('Priority {priority}', '优先级 {priority}', { priority })
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
        isFocus: thought.id === focusId,
        group: groupLabelOfType(thought.type),
        stroke: style.stroke,
        fill: thought.id === focusId ? style.fill : 'var(--surface-raised)',
      },
    }
  })
}

function buildEdges(relations: ThoughtRelation[], selectedEdgeId: string | null): Edge[] {
  return relations.map((relation) => {
    const style = RELATION_STYLE[relation.type]
    const isSelected = relation.id === selectedEdgeId
    const { from, to } = drawnDirection(relation)
    return {
      id: relation.id,
      // Drawn from the higher-level thought downwards, so the label has to
      // read in that direction too.
      source: from,
      target: to,
      label: relationPhrase(relation, from),
      selected: isSelected,
      focusable: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: style.stroke,
        width: 16,
        height: 16,
      },
      style: {
        stroke: style.stroke,
        strokeWidth: isSelected ? style.width + 1.5 : style.width,
        strokeDasharray: style.dash,
      },
      labelStyle: { fill: 'var(--text-muted)', fontSize: 11 },
      labelBgStyle: { fill: 'var(--surface-raised)' },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    }
  })
}

export function RoadmapFlow(props: RoadmapFlowProps) {
  return (
    <ReactFlowProvider>
      <RoadmapCanvas {...props} />
    </ReactFlowProvider>
  )
}

function RoadmapCanvas({
  thoughts,
  relations,
  focusId,
  depthById,
  selectedEdgeId,
  onSelectThought,
  onSelectEdge,
  onConnectThoughts,
  onDeleteRelations,
}: RoadmapFlowProps) {
  const { fitView } = useReactFlow()
  // Positions the user dragged, kept for the session so re-layouts do not
  // undo their arrangement.
  const savedPositions = useRef(new Map<string, { x: number; y: number }>())

  // Seeded from the computed layout; the effect below re-applies any positions
  // the user has since dragged.
  const [nodes, setNodes, onNodesChange] = useNodesState<RoadmapNode>(
    buildNodes(thoughts, relations, focusId, depthById, new Map()),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    buildEdges(relations, selectedEdgeId),
  )

  // Rebuild only when the graph itself changes, never on every render, so
  // dragging and selecting stay responsive.
  const graphSignature = useMemo(
    () =>
      [
        thoughts.map((thought) => `${thought.id}:${thought.text}:${thought.type}:${thought.status}`).join('|'),
        relations.map((relation) => `${relation.id}:${relation.type}`).join('|'),
        focusId,
      ].join('#'),
    [thoughts, relations, focusId],
  )

  const nodeCount = nodes.length

  useEffect(() => {
    setNodes(buildNodes(thoughts, relations, focusId, depthById, savedPositions.current))
    setEdges(buildEdges(relations, selectedEdgeId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphSignature])

  useEffect(() => {
    setEdges((current) =>
      current.map((edge) => {
        const relation = relations.find((entry) => entry.id === edge.id)
        if (!relation) return edge
        const style = RELATION_STYLE[relation.type]
        const isSelected = edge.id === selectedEdgeId
        return {
          ...edge,
          selected: isSelected,
          style: {
            ...edge.style,
            strokeWidth: isSelected ? style.width + 1.5 : style.width,
          },
        }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEdgeId])

  // Frame the graph whenever the set of visible nodes changes.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 200 })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [graphSignature, nodeCount, fitView])

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return
      onConnectThoughts(connection.source, connection.target)
    },
    [onConnectThoughts],
  )

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      onDeleteRelations(deleted.map((edge) => edge.id))
    },
    [onDeleteRelations],
  )

  return (
    <div className="roadmap-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => {
          for (const change of changes) {
            if (change.type === 'position' && change.position) {
              savedPositions.current.set(change.id, change.position)
            }
          }
          onNodesChange(changes)
        }}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        onNodeClick={(_, node) => onSelectThought(node.id)}
        onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
        onPaneClick={() => onSelectEdge(null)}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        deleteKeyCode={['Backspace', 'Delete']}
        connectionRadius={30}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
