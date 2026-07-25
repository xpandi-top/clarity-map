import type { Thought } from '../../domain/types'
import { ThoughtMeta } from './ThoughtMeta'

interface ThoughtButtonProps {
  thought: Thought
  onSelect: (thoughtId: string) => void
  selected?: boolean
}

/** List row that opens the thought detail panel. */
export function ThoughtButton({ thought, onSelect, selected = false }: ThoughtButtonProps) {
  return (
    <button
      type="button"
      className="thought-item"
      aria-pressed={selected}
      onClick={() => onSelect(thought.id)}
    >
      <span className="thought-item__text">{thought.text}</span>
      <ThoughtMeta thought={thought} />
    </button>
  )
}
