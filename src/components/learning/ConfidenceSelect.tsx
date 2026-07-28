import { useId } from 'react'
import { CONFIDENCE_LABEL, CONFIDENCE_LEVELS } from '../../domain/learning'
import type { ConfidenceLevel } from '../../domain/types'

interface ConfidenceSelectProps {
  value: ConfidenceLevel
  onChange: (value: ConfidenceLevel) => void
  label?: string
}

/**
 * Confidence in words. A percentage would suggest a measurement, and what the
 * user has is a handful of their own observations.
 */
export function ConfidenceSelect({
  value,
  onChange,
  label = 'How much weight does this carry?',
}: ConfidenceSelectProps) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="select"
        value={value}
        onChange={(event) => onChange(event.target.value as ConfidenceLevel)}
      >
        {CONFIDENCE_LEVELS.map((level) => (
          <option key={level} value={level}>
            {CONFIDENCE_LABEL[level]}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Read-only confidence badge. */
export function ConfidenceChip({ value }: { value: ConfidenceLevel }) {
  return <span className="chip">{CONFIDENCE_LABEL[value]}</span>
}
