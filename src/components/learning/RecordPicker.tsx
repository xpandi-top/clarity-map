import { useId } from 'react'

export interface RecordOption {
  id: string
  label: string
  meta?: string
}

interface RecordPickerProps {
  label: string
  options: RecordOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  emptyText?: string
  hint?: string
}

/** Checkbox list over records the user has already written. */
export function RecordPicker({
  label,
  options,
  selectedIds,
  onChange,
  emptyText = 'Nothing recorded yet.',
  hint,
}: RecordPickerProps) {
  const id = useId()

  const toggle = (optionId: string) => {
    onChange(
      selectedIds.includes(optionId)
        ? selectedIds.filter((entry) => entry !== optionId)
        : [...selectedIds, optionId],
    )
  }

  return (
    <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="label" id={id}>
        {label}
      </legend>
      {hint ? <span className="faint">{hint}</span> : null}
      {options.length === 0 ? (
        <span className="faint">{emptyText}</span>
      ) : (
        <div
          className="stack"
          style={{ gap: 'var(--space-1)', maxHeight: '12rem', overflowY: 'auto' }}
        >
          {options.map((option) => (
            <label key={option.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                onChange={() => toggle(option.id)}
              />
              <span>
                {option.label}
                {option.meta ? <span className="faint"> · {option.meta}</span> : null}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
