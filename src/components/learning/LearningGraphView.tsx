import { useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  LEARNING_NODE_COLOUR,
  LEARNING_NODE_LABEL,
  LEARNING_RELATION_LABEL,
  LEARNING_RELATION_STYLE,
  type LearningGraph,
} from '../../domain/learningGraph'
import { NODE_HEIGHT, NODE_WIDTH, layoutGraph } from '../../domain/roadmapLayout'

type LearningNodeData = {
  label: string
  kind: string
  meta: string
  stroke: string
  isFocus: boolean
}
type FlowNode = Node<LearningNodeData, 'learning'>

function LearningNodeView({ data }: NodeProps<FlowNode>) {
  return (
    <div
      className={`roadmap-node${data.isFocus ? ' is-focus' : ''}`}
      style={{ borderLeft: `4px solid ${data.stroke}` }}
    >
      <Handle type="target" position={Position.Top} className="roadmap-handle" />
      <div>{data.label}</div>
      <div className="roadmap-node__meta">
        <span style={{ color: data.stroke }}>{data.kind}</span>
        {data.meta ? ` · ${data.meta}` : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="roadmap-handle" />
    </div>
  )
}

const nodeTypes = { learning: LearningNodeView }

interface LearningGraphViewProps {
  graph: LearningGraph
  focusId?: string
  onSelectNode?: (nodeId: string) => void
}

function buildNodes(graph: LearningGraph, focusId?: string): FlowNode[] {
  const positions = layoutGraph(
    graph.nodes.map((node) => ({ id: node.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    graph.edges.map((edge) => ({ source: edge.source, target: edge.target })),
  )

  return graph.nodes.map((node) => ({
    id: node.id,
    type: 'learning' as const,
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: {
      label: node.label,
      kind: LEARNING_NODE_LABEL[node.kind],
      meta: node.meta,
      stroke: LEARNING_NODE_COLOUR[node.kind],
      isFocus: node.id === focusId,
    },
  }))
}

function buildEdges(graph: LearningGraph): Edge[] {
  return graph.edges.map((edge) => {
    const style = LEARNING_RELATION_STYLE[edge.type]
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: LEARNING_RELATION_LABEL[edge.type],
      markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke, width: 16, height: 16 },
      style: { stroke: style.stroke, strokeWidth: style.width, strokeDasharray: style.dash },
      labelStyle: { fill: 'var(--text-muted)', fontSize: 11 },
      labelBgStyle: { fill: 'var(--surface-raised)' },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    }
  })
}

/** Read-only view of how records led to one another. */
export function LearningGraphView(props: LearningGraphViewProps) {
  return (
    <ReactFlowProvider>
      <LearningCanvas {...props} />
    </ReactFlowProvider>
  )
}

function LearningCanvas({ graph, focusId, onSelectNode }: LearningGraphViewProps) {
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(buildNodes(graph, focusId))
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(buildEdges(graph))

  const signature = useMemo(
    () =>
      [
        graph.nodes.map((node) => `${node.id}:${node.label}:${node.meta}`).join('|'),
        graph.edges.map((edge) => edge.id).join('|'),
        focusId ?? '',
      ].join('#'),
    [graph, focusId],
  )

  useEffect(() => {
    setNodes(buildNodes(graph, focusId))
    setEdges(buildEdges(graph))
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 200 })
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return (
    <div className="roadmap-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelectNode?.(node.id)}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
