import type { Thought } from '../../domain/types'
import { ThoughtMeta } from './ThoughtMeta'

export function FocusedThoughtCard({
  thought,
  label = 'Focused thought',
}: {
  thought: Thought
  label?: string
}) {
  return (
    <article className="focused-thought-card">
      <span className="focused-thought-card__label">{label}</span>
      <p className="focused-thought-card__text">{thought.text}</p>
      <ThoughtMeta thought={thought} />
    </article>
  )
}
