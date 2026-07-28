import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { LearningReminder } from '../../domain/relevance'
import { useObservations, useRelevantLearning } from '../../store'
import { formatDate } from '../../i18n/core'

const KIND_LABEL: Record<LearningReminder['kind'], string> = {
  observation: 'You recorded',
  evidence: 'Evidence',
  belief: 'Working model',
  hypothesis: 'Being tested',
  rule: 'Your default',
}

interface RelevantLearningProps {
  thoughtId: string
  /** Heading is dropped when the caller supplies its own. */
  heading?: string | null
}

/**
 * What the user has already learned that touches this thought.
 *
 * Every line is one of their own records with its source attached — never
 * encouragement, and never a claim the app worked out on its own.
 */
export function RelevantLearning({
  thoughtId,
  heading = 'Relevant things you have learned',
}: RelevantLearningProps) {
  const reminders = useRelevantLearning(thoughtId)
  const observations = useObservations()

  const byId = useMemo(
    () => new Map(observations.map((observation) => [observation.id, observation])),
    [observations],
  )

  if (reminders.length === 0) return null

  return (
    <div className="panel-section stack">
      {heading ? <h3>{heading}</h3> : null}
      <ul className="stack" style={{ gap: 'var(--space-2)' }}>
        {reminders.map((reminder) => (
          <li key={reminder.id} className="learning-reminder">
            <span className="faint">{KIND_LABEL[reminder.kind]}</span>
            <p style={{ margin: 0 }}>{reminder.message}</p>
            {reminder.detail ? <p className="faint">{reminder.detail}</p> : null}
            {reminder.caution ? (
              <p className="notice notice--warning" style={{ margin: 0 }}>
                {reminder.caution}
              </p>
            ) : null}
            {reminder.via === 'tag' ? (
              <p className="faint">Surfaced by a shared tag, not an explicit link.</p>
            ) : null}
            {reminder.sourceObservationIds.length > 0 ? (
              <details>
                <summary>
                  Where this came from ({reminder.sourceObservationIds.length})
                </summary>
                <ul className="stack" style={{ gap: 'var(--space-1)' }}>
                  {reminder.sourceObservationIds.map((observationId) => {
                    const observation = byId.get(observationId)
                    if (!observation) return null
                    return (
                      <li key={observationId}>
                        {observation.description}{' '}
                        <span className="faint">
                          {formatDate(observation.occurredAt)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="faint" style={{ margin: 0 }}>
        From your own records. <Link to="/evidence">Evidence</Link> ·{' '}
        <Link to="/model">Model history</Link>
      </p>
    </div>
  )
}
