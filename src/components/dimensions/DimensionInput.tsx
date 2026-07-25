import { useId } from 'react'
import type { Dimension, DimensionValue } from '../../domain/types'

interface DimensionInputProps {
  dimension: Dimension
  value: DimensionValue
  onChange: (value: DimensionValue) => void
}

/** Renders the right control for a dimension kind, always with a visible label. */
export function DimensionInput({ dimension, value, onChange }: DimensionInputProps) {
  const inputId = useId()
  const describedBy = dimension.description ? `${inputId}-help` : undefined

  const help = dimension.description ? (
    <span id={describedBy} className="faint">
      {dimension.description}
    </span>
  ) : null

  if (dimension.kind === 'binary' || dimension.kind === 'singleSelect') {
    const options = dimension.options ?? []
    const isCompact = dimension.kind === 'binary'
    return (
      <fieldset
        className="field"
        style={{ border: 'none', padding: 0, margin: 0 }}
        aria-describedby={describedBy}
      >
        <legend className="label">{dimension.question}</legend>
        {help}
        {isCompact ? (
          <div className="row">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="button button--small"
                aria-pressed={value === option.value}
                onClick={() => onChange(value === option.value ? null : option.value)}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className="button button--quiet button--small"
              aria-pressed={value === null || value === undefined}
              onClick={() => onChange(null)}
            >
              Not sure yet
            </button>
          </div>
        ) : (
          <select
            id={inputId}
            className="select"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value || null)}
          >
            <option value="">Not sure yet</option>
            {options.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </fieldset>
    )
  }

  if (dimension.kind === 'multiSelect') {
    const selected = Array.isArray(value) ? value : []
    return (
      <fieldset
        className="field"
        style={{ border: 'none', padding: 0, margin: 0 }}
        aria-describedby={describedBy}
      >
        <legend className="label">{dimension.question}</legend>
        {help}
        <div className="row">
          {(dimension.options ?? []).map((option) => {
            const checked = selected.includes(option.value)
            return (
              <button
                key={option.id}
                type="button"
                className="button button--small"
                aria-pressed={checked}
                onClick={() =>
                  onChange(
                    checked
                      ? selected.filter((entry) => entry !== option.value)
                      : [...selected, option.value],
                  )
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }

  if (dimension.kind === 'boolean') {
    return (
      <div className="field">
        <label className="checkbox-row" htmlFor={inputId}>
          <input
            id={inputId}
            type="checkbox"
            checked={value === true}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{dimension.question}</span>
        </label>
        {help}
      </div>
    )
  }

  const min = dimension.min ?? 1
  const max = dimension.max ?? 5
  const step = dimension.step && dimension.step > 0 ? dimension.step : 1
  const numeric = typeof value === 'number' ? value : null

  return (
    <div className="field">
      <label htmlFor={inputId}>{dimension.question}</label>
      {help}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <span className="faint">{dimension.lowLabel ?? min}</span>
        <input
          id={inputId}
          className="range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={numeric ?? Math.round((min + max) / 2)}
          aria-describedby={describedBy}
          aria-valuetext={numeric === null ? 'Not set' : String(numeric)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="faint">{dimension.highLabel ?? max}</span>
      </div>
      <div className="row">
        <output htmlFor={inputId} className="chip">
          {numeric === null ? 'Not set' : numeric}
        </output>
        {numeric !== null ? (
          <button
            type="button"
            className="button button--quiet button--small"
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}
