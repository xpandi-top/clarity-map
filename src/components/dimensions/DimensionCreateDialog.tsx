import { useState } from 'react'
import { Dialog } from '../common/Dialog'
import { createId } from '../../domain/ids'
import { suggestComparativeQuestion } from '../../domain/prompts'
import type { DimensionKind, DimensionOption, DimensionStage } from '../../domain/types'
import { useStore } from '../../store'

const KIND_LABEL: Record<DimensionKind, string> = {
  binary: 'Two choices (a quadrant axis)',
  scale: 'A scale between two numbers',
  singleSelect: 'One of several options',
  multiSelect: 'Any number of options',
  boolean: 'Yes or no',
}

const STAGES: DimensionStage[] = ['capture', 'review', 'structure', 'action', 'optional']

interface DimensionCreateDialogProps {
  onClose: () => void
  /** Called with the new dimension id once it exists. */
  onCreated?: (dimensionId: string) => void
  /** Shown above the form to explain why it opened. */
  intro?: string
}

function blankOption(index: number): DimensionOption {
  return {
    id: createId('opt'),
    label: `Option ${index + 1}`,
    value: `option_${index + 1}`,
    order: index,
  }
}

/**
 * Creates a custom dimension without leaving the current screen — used from
 * the matrix axis pickers and from settings.
 */
export function DimensionCreateDialog({
  onClose,
  onCreated,
  intro,
}: DimensionCreateDialogProps) {
  const addDimension = useStore((state) => state.addDimension)
  const showToast = useStore((state) => state.showToast)

  const [name, setName] = useState('')
  const [question, setQuestion] = useState('')
  const [comparativeQuestion, setComparativeQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<DimensionKind>('scale')
  const [stage, setStage] = useState<DimensionStage>('optional')
  const [required, setRequired] = useState(false)
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('5')
  const [step, setStep] = useState('1')
  const [lowLabel, setLowLabel] = useState('Low')
  const [highLabel, setHighLabel] = useState('High')
  const [options, setOptions] = useState<DimensionOption[]>([
    { ...blankOption(0), label: 'No' },
    { ...blankOption(1), label: 'Yes' },
  ])

  const usesOptions = kind === 'binary' || kind === 'singleSelect' || kind === 'multiSelect'
  const trimmedName = name.trim()
  const numericMin = Number(min)
  const numericMax = Number(max)

  const problems: string[] = []
  if (!trimmedName) problems.push('Give the dimension a name.')
  if (kind === 'scale' && !(numericMax > numericMin)) {
    problems.push('The maximum has to be greater than the minimum.')
  }
  if (kind === 'binary' && options.length !== 2) {
    problems.push('A two-choice dimension needs exactly two options.')
  }
  if (usesOptions && options.some((option) => option.label.trim() === '')) {
    problems.push('Every option needs a label.')
  }

  const save = () => {
    if (problems.length > 0) return
    const parsedStep = Number(step)
    const id = addDimension({
      name: trimmedName,
      question: question.trim() || `How would you rate ${trimmedName.toLowerCase()}?`,
      comparativeQuestion:
        comparativeQuestion.trim() || suggestComparativeQuestion(trimmedName),
      description: description.trim() || undefined,
      kind,
      options: usesOptions
        ? options.map((option, index) => ({
            ...option,
            label: option.label.trim(),
            value: option.value || `option_${index + 1}`,
            order: index,
          }))
        : undefined,
      min: kind === 'scale' ? numericMin : undefined,
      max: kind === 'scale' ? numericMax : undefined,
      step: kind === 'scale' && parsedStep > 0 ? parsedStep : undefined,
      lowLabel: kind === 'scale' ? lowLabel.trim() || undefined : undefined,
      highLabel: kind === 'scale' ? highLabel.trim() || undefined : undefined,
      required,
      active: true,
      stage,
    })
    if (!id) return
    showToast(`“${trimmedName}” created.`)
    onCreated?.(id)
    onClose()
  }

  return (
    <Dialog
      title="Create a dimension"
      variant="modal"
      onClose={onClose}
      footer={
        <div className="row">
          <button
            type="button"
            className="button button--primary"
            disabled={problems.length > 0}
            onClick={save}
          >
            Create
          </button>
          <button type="button" className="button button--quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      }
    >
      <div className="stack">
        {intro ? <p className="muted">{intro}</p> : null}

        <div className="field">
          <label htmlFor="new-dimension-name">Name</label>
          <input
            id="new-dimension-name"
            className="input"
            value={name}
            placeholder="Energy effect, Cost, Who it affects…"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="new-dimension-question">Question about one thought</label>
          <input
            id="new-dimension-question"
            className="input"
            value={question}
            placeholder="Optional — one is written for you if you leave this blank."
            onChange={(event) => setQuestion(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="new-dimension-compare">Question when comparing two</label>
          <input
            id="new-dimension-compare"
            className="input"
            value={comparativeQuestion}
            placeholder={
              suggestComparativeQuestion(trimmedName) || 'Which one would you put higher?'
            }
            onChange={(event) => setComparativeQuestion(event.target.value)}
          />
          <span className="faint">
            Used on the Compare screen, where a single-thought question would not make sense.
          </span>
        </div>

        <div className="field">
          <label htmlFor="new-dimension-help">Helper text</label>
          <input
            id="new-dimension-help"
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="new-dimension-kind">Kind</label>
            <select
              id="new-dimension-kind"
              className="select"
              value={kind}
              onChange={(event) => setKind(event.target.value as DimensionKind)}
            >
              {(Object.keys(KIND_LABEL) as DimensionKind[]).map((entry) => (
                <option key={entry} value={entry}>
                  {KIND_LABEL[entry]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-dimension-stage">Where it is asked</label>
            <select
              id="new-dimension-stage"
              className="select"
              value={stage}
              onChange={(event) => setStage(event.target.value as DimensionStage)}
            >
              {STAGES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
        </div>

        {kind === 'scale' ? (
          <div className="grid-2">
            <div className="field">
              <label htmlFor="new-dimension-min">Minimum</label>
              <input
                id="new-dimension-min"
                className="input"
                type="number"
                value={min}
                onChange={(event) => setMin(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="new-dimension-max">Maximum</label>
              <input
                id="new-dimension-max"
                className="input"
                type="number"
                value={max}
                onChange={(event) => setMax(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="new-dimension-step">Step</label>
              <input
                id="new-dimension-step"
                className="input"
                type="number"
                min={0.1}
                step={0.1}
                value={step}
                onChange={(event) => setStep(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="new-dimension-low">Label for the low end</label>
              <input
                id="new-dimension-low"
                className="input"
                value={lowLabel}
                onChange={(event) => setLowLabel(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="new-dimension-high">Label for the high end</label>
              <input
                id="new-dimension-high"
                className="input"
                value={highLabel}
                onChange={(event) => setHighLabel(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        {usesOptions ? (
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            <span className="label">
              Options{kind === 'binary' ? ' — the left one sits on the low side of an axis' : ''}
            </span>
            {options.map((option, index) => (
              <div key={option.id} className="row" style={{ flexWrap: 'nowrap' }}>
                <label className="visually-hidden" htmlFor={`new-option-${option.id}`}>
                  Option {index + 1}
                </label>
                <input
                  id={`new-option-${option.id}`}
                  className="input"
                  value={option.label}
                  onChange={(event) =>
                    setOptions((current) =>
                      current.map((entry) =>
                        entry.id === option.id
                          ? { ...entry, label: event.target.value }
                          : entry,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="button button--quiet button--small"
                  disabled={options.length <= 2}
                  onClick={() =>
                    setOptions((current) => current.filter((entry) => entry.id !== option.id))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            {kind === 'binary' ? null : (
              <button
                type="button"
                className="button button--small"
                onClick={() => setOptions((current) => [...current, blankOption(current.length)])}
              >
                Add option
              </button>
            )}
          </div>
        ) : null}

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          <span>Mark as required</span>
        </label>

        {problems.length > 0 && name.length > 0 ? (
          <div className="notice" role="status">
            <ul>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
