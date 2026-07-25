import { useMemo } from 'react'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { BUILTIN_DIMENSION, RELATION_LABEL, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { NODE_HEIGHT, NODE_WIDTH, layoutGraph } from '../../domain/roadmapLayout'
import type { Thought, ThoughtRelation } from '../../domain/types'

type RoadmapNodeData = { label: string; meta: string; isFocus: boolean }
type RoadmapNode = Node<RoadmapNodeData, 'roadmap'>

function RoadmapNodeView({ data }: NodeProps<RoadmapNode>) {
  return (
    <div className={`roadmap-node${data.isFocus ? ' is-focus' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <div className="roadmap-node__meta">{data.meta}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

// Defined once at module scope so React Flow does not warn about new types.
const nodeTypes = { roadmap: RoadmapNodeView }

interface RoadmapFlowProps {
  thoughts: Thought[]
  relations: ThoughtRelation[]
  focusId: string
  selectedEdgeId: string | null
  onSelectThought: (thoughtId: string) => void
  onSelectEdge: (edgeId: string | null) => void
}

export function RoadmapFlow({
  thoughts,
  relations,
  focusId,
  selectedEdgeId,
  onSelectThought,
  onSelectEdge,
}: RoadmapFlowProps) {
  const { nodes, edges } = useMemo(() => {
    // Edges are drawn from the higher-level thought downwards, which is the
    // direction the layout should flow.
    const positions = layoutGraph(
      thoughts.map((thought) => ({ id: thought.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
      relations.map((relation) => ({
        source: relation.targetThoughtId,
        target: relation.sourceThoughtId,
      })),
    )

    const flowNodes: RoadmapNode[] = thoughts.map((thought) => {
      const priority = thought.dimensionValues[BUILTIN_DIMENSION.priority]
      return {
        id: thought.id,
        type: 'roadmap',
        position: positions[thought.id] ?? { x: 0, y: 0 },
        data: {
          label: thought.text,
          meta: [
            THOUGHT_TYPE_LABEL[thought.type],
            thought.status,
            typeof priority === 'number' ? `Priority ${priority}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          isFocus: thought.id === focusId,
        },
      }
    })

    const flowEdges: Edge[] = relations.map((relation) => ({
      id: relation.id,
      source: relation.targetThoughtId,
      target: relation.sourceThoughtId,
      label: RELATION_LABEL[relation.type],
      selected: relation.id === selectedEdgeId,
      style: { stroke: relation.id === selectedEdgeId ? '#4a6b63' : '#cfc9be' },
    }))

    return { nodes: flowNodes, edges: flowEdges }
  }, [thoughts, relations, focusId, selectedEdgeId])

  return (
    <div className="roadmap-canvas">
      <ReactFlow
        // Remounting when the visible subgraph changes re-runs `fitView`, so
        // the roadmap always opens framed rather than at an arbitrary zoom.
        key={`${focusId}:${nodes.map((node) => node.id).join(',')}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesConnectable={false}
        onNodeClick={(_, node) => onSelectThought(node.id)}
        onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
        onPaneClick={() => onSelectEdge(null)}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
