import dagre from '@dagrejs/dagre'

export interface LayoutNode {
  id: string
  width: number
  height: number
}

export interface LayoutEdge {
  source: string
  target: string
}

export const NODE_WIDTH = 200
export const NODE_HEIGHT = 64

/**
 * Deterministic top-down layout. Same input always produces the same
 * coordinates, so the roadmap does not jump around between renders.
 */
export function layoutGraph(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  direction: 'TB' | 'LR' = 'TB',
): Record<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 })

  for (const node of nodes) {
    graph.setNode(node.id, { width: node.width, height: node.height })
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target)
    }
  }

  dagre.layout(graph)

  const positions: Record<string, { x: number; y: number }> = {}
  for (const node of nodes) {
    const laidOut = graph.node(node.id)
    positions[node.id] = laidOut
      ? { x: laidOut.x - node.width / 2, y: laidOut.y - node.height / 2 }
      : { x: 0, y: 0 }
  }
  return positions
}
