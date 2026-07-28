import { THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import {
  FULL_MAP_EDGES,
  FULL_MAP_NODES,
  SIMPLE_MAP_EDGES,
  SIMPLE_MAP_NODES,
  TYPE_MAP_ASIDE,
  TYPE_MAP_HEIGHT,
  TYPE_MAP_WIDTH,
  TYPE_NODE_HEIGHT,
  TYPE_NODE_WIDTH,
  groupLabelOfType,
  styleOfType,
  type TypeMapEdge,
  type TypeMapNode,
} from '../../domain/typeMap'
import type { ThoughtType } from '../../domain/types'
import { t, tx } from '../../i18n/core'

interface TypeMapDiagramProps {
  simplified: boolean
  selected: ThoughtType | null
  onSelect: (type: ThoughtType) => void
  /** How many thoughts the workspace holds of each type. */
  counts: Partial<Record<ThoughtType, number>>
}

function centre(node: TypeMapNode) {
  return { x: node.x + TYPE_NODE_WIDTH / 2, y: node.y + TYPE_NODE_HEIGHT / 2 }
}

/**
 * Elbow path between two nodes: straight down when they are stacked, an
 * L-shape otherwise. Deterministic, so the map never shifts around.
 */
function edgePath(from: TypeMapNode, to: TypeMapNode): string {
  const a = centre(from)
  const b = centre(to)
  const verticalGap = to.y - (from.y + TYPE_NODE_HEIGHT)

  if (verticalGap >= 0) {
    const startY = from.y + TYPE_NODE_HEIGHT
    const endY = to.y
    const midY = startY + verticalGap / 2
    return `M ${a.x} ${startY} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${endY}`
  }

  // Same row: leave from the side.
  const fromRight = b.x > a.x
  const startX = fromRight ? from.x + TYPE_NODE_WIDTH : from.x
  const endX = fromRight ? to.x : to.x + TYPE_NODE_WIDTH
  return `M ${startX} ${a.y} L ${endX} ${b.y}`
}

export function TypeMapDiagram({
  simplified,
  selected,
  onSelect,
  counts,
}: TypeMapDiagramProps) {
  const nodes = simplified ? SIMPLE_MAP_NODES : FULL_MAP_NODES
  const edges: TypeMapEdge[] = simplified ? SIMPLE_MAP_EDGES : FULL_MAP_EDGES
  const nodeByType = new Map(nodes.map((node) => [node.type, node]))

  return (
    <svg
      className="type-map"
      viewBox={`0 0 ${TYPE_MAP_WIDTH} ${TYPE_MAP_HEIGHT}`}
      role="group"
      aria-label="How the thought types relate to one another"
    >
      <defs>
        <marker
          id="type-map-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const from = nodeByType.get(edge.from)
        const to = nodeByType.get(edge.to)
        if (!from || !to) return null
        // Vertical edges get their label in the gap between the rows; side-by-side
        // edges get it just above the connecting line.
        const stacked = to.y - (from.y + TYPE_NODE_HEIGHT) >= 0
        const midpoint = stacked
          ? {
              x: (centre(from).x + centre(to).x) / 2,
              y: (from.y + TYPE_NODE_HEIGHT + to.y) / 2,
            }
          : { x: (centre(from).x + centre(to).x) / 2, y: centre(from).y - 6 }
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <path
              d={edgePath(from, to)}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth={1.5}
              strokeDasharray={edge.tentative ? '5 4' : undefined}
              markerEnd="url(#type-map-arrow)"
            />
            {edge.label ? (
              <text
                x={midpoint.x}
                y={midpoint.y - 4}
                textAnchor="middle"
                className="type-map__edge-label"
              >
                {edge.label}
              </text>
            ) : null}
          </g>
        )
      })}

      {nodes.map((node) => {
        const isSelected = selected === node.type
        const count = counts[node.type] ?? 0
        const style = styleOfType(node.type)
        return (
          <g
            key={node.type}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={tx(
              count === 1
                ? '{type}, {group}, {count} thought'
                : '{type}, {group}, {count} thoughts',
              '{type}，{group}，{count} 条想法',
              {
                type: t(THOUGHT_TYPE_LABEL[node.type]),
                group: t(groupLabelOfType(node.type)),
                count,
              },
            )}
            className={`type-map__node${isSelected ? ' is-selected' : ''}`}
            onClick={() => onSelect(node.type)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(node.type)
              }
            }}
          >
            <rect
              x={node.x}
              y={node.y}
              width={TYPE_NODE_WIDTH}
              height={TYPE_NODE_HEIGHT}
              rx={8}
              fill={style.fill}
              stroke={style.stroke}
            />
            <text
              x={node.x + TYPE_NODE_WIDTH / 2}
              y={node.y + 20}
              textAnchor="middle"
              className="type-map__node-label"
            >
              {THOUGHT_TYPE_LABEL[node.type]}
            </text>
            <text
              x={node.x + TYPE_NODE_WIDTH / 2}
              y={node.y + 36}
              textAnchor="middle"
              className="type-map__node-count"
            >
              {count === 0
                ? 'none yet'
                : tx(
                    count === 1 ? '{count} thought' : '{count} thoughts',
                    '{count} 条想法',
                    { count },
                  )}
            </text>
          </g>
        )
      })}

      {simplified ? null : (
        <g>
          <text x={560} y={16} className="type-map__column-label">
            Still open
          </text>
          <line
            x1={TYPE_MAP_ASIDE.arrow.x1}
            y1={TYPE_MAP_ASIDE.arrow.y1}
            x2={TYPE_MAP_ASIDE.arrow.x2}
            y2={TYPE_MAP_ASIDE.arrow.y2}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            markerEnd="url(#type-map-arrow)"
          />
          {TYPE_MAP_ASIDE.lines.map((line, index) => (
            <text
              key={line}
              x={TYPE_MAP_ASIDE.textX}
              y={TYPE_MAP_ASIDE.textY + index * 14}
              className="type-map__edge-label"
            >
              {line}
            </text>
          ))}
        </g>
      )}
    </svg>
  )
}
