import { useState } from 'react'
import { ConfirmButton } from '../../components/common/ConfirmButton'
import { createId } from '../../domain/ids'
import type { Dimension, DimensionKind, DimensionStage } from '../../domain/types'
import { useDimensions, useStore } from '../../store'

const KINDS: DimensionKind[] = ['binary', 'scale', 'singleSelect', 'multiSelect', 'boolean']
const STAGES: DimensionStage[] = ['capture', 'review', 'structure', 'action', 'optional']

export function DimensionSettingsScreen() {
  const dimensions = useDimensions()
  const addDimension = useStore((state) => state.addDimension)
  const showToast = useStore((state) => state.showToast)
  const [editingId, setEditingId] = useState<string | null>(null)

  const ordered = [...dimensions].sort((a, b) => a.order - b.order)

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>Dimensions</h1>
        <p>
          Dimensions are the questions you can ask about a thought. Built-in ones can be turned
          off but not deleted.
        </p>
      </div>

      <div className="row">
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            const id = addDimension({
              name: 'New dimension',
              question: 'What would you like to ask?',
              kind: 'scale',
              min: 1,
              max: 5,
              step: 1,
              lowLabel: 'Low',
              highLabel: 'High',
              required: false,
              active: true,
              stage: 'optional',
            })
            if (id) {
              setEditingId(id)
              showToast('Dimension created.')
            }
          }}
        >
          Create a dimension
        </button>
      </div>

      <ul className="settings-list">
        {ordered.map((dimension, index) => (
          <li key={dimension.id} className="settings-item stack">
            <div className="spread">
              <div>
                <h3 style={{ margin: 0 }}>{dimension.name}</h3>
                <p className="faint" style={{ margin: 0 }}>
                  {dimension.kind} · stage: {dimension.stage}
                  {dimension.builtIn ? ' · built in' : ''}
                  {dimension.active ? '' : ' · disabled'}
                </p>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="button button--small"
                  disabled={index === 0}
                  onClick={() => useStore.getState().moveDimension(dimension.id, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="button button--small"
                  disabled={index === ordered.length - 1}
                  onClick={() => useStore.getState().moveDimension(dimension.id, 1)}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() =>
                    setEditingId((current) => (current === dimension.id ? null : dimension.id))
                  }
                >
                  {editingId === dimension.id ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>

            {editingId === dimension.id ? <DimensionEditor dimension={dimension} /> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DimensionEditor({ dimension }: { dimension: Dimension }) {
  const updateDimension = useStore((state) => state.updateDimension)
  const duplicateDimension = useStore((state) => state.duplicateDimension)
  const deleteDimension = useStore((state) => state.deleteDimension)
  const showToast = useStore((state) => state.showToast)

  const patch = (values: Partial<Dimension>) => updateDimension(dimension.id, values)
  const options = dimension.options ?? []
  const usesOptions =
    dimension.kind === 'binary' ||
    dimension.kind === 'singleSelect' ||
    dimension.kind === 'multiSelect'

  return (
    <div className="stack panel-section">
      <div className="grid-2">
        <div className="field">
          <label htmlFor={`name-${dimension.id}`}>Name</label>
          <input
            id={`name-${dimension.id}`}
            className="input"
            value={dimension.name}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor={`kind-${dimension.id}`}>Kind</label>
          <select
            id={`kind-${dimension.id}`}
            className="select"
            value={dimension.kind}
            disabled={dimension.builtIn}
            onChange={(event) => patch({ kind: event.target.value as DimensionKind })}
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor={`question-${dimension.id}`}>Question</label>
        <input
          id={`question-${dimension.id}`}
          className="input"
          value={dimension.question}
          onChange={(event) => patch({ question: event.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor={`helper-${dimension.id}`}>Helper text</label>
        <input
          id={`helper-${dimension.id}`}
          className="input"
          value={dimension.description ?? ''}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor={`stage-${dimension.id}`}>Stage</label>
          <select
            id={`stage-${dimension.id}`}
            className="select"
            value={dimension.stage}
            onChange={(event) => patch({ stage: event.target.value as DimensionStage })}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
        <div className="stack" style={{ gap: 'var(--space-1)' }}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={dimension.required}
              onChange={(event) => patch({ required: event.target.checked })}
            />
            <span>Required</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={dimension.active}
              onChange={(event) => patch({ active: event.target.checked })}
            />
            <span>Active</span>
          </label>
        </div>
      </div>

      {dimension.kind === 'scale' ? (
        <div className="grid-2">
          <div className="field">
            <label htmlFor={`min-${dimension.id}`}>Minimum</label>
            <input
              id={`min-${dimension.id}`}
              className="input"
              type="number"
              value={dimension.min ?? 1}
              onChange={(event) => patch({ min: Number(event.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor={`max-${dimension.id}`}>Maximum</label>
            <input
              id={`max-${dimension.id}`}
              className="input"
              type="number"
              value={dimension.max ?? 5}
              onChange={(event) => patch({ max: Number(event.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor={`step-${dimension.id}`}>Step</label>
            <input
              id={`step-${dimension.id}`}
              className="input"
              type="number"
              min={0.1}
              step={0.1}
              value={dimension.step ?? 1}
              onChange={(event) => patch({ step: Number(event.target.value) || 1 })}
            />
          </div>
          <div className="field">
            <label htmlFor={`low-${dimension.id}`}>Low label</label>
            <input
              id={`low-${dimension.id}`}
              className="input"
              value={dimension.lowLabel ?? ''}
              onChange={(event) => patch({ lowLabel: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`high-${dimension.id}`}>High label</label>
            <input
              id={`high-${dimension.id}`}
              className="input"
              value={dimension.highLabel ?? ''}
              onChange={(event) => patch({ highLabel: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      {usesOptions ? (
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <span className="label">Options</span>
          {options.map((option, index) => (
            <div key={option.id} className="row" style={{ flexWrap: 'nowrap' }}>
              <label className="visually-hidden" htmlFor={`option-${option.id}`}>
                Option label
              </label>
              <input
                id={`option-${option.id}`}
                className="input"
                value={option.label}
                onChange={(event) =>
                  patch({
                    options: options.map((entry) =>
                      entry.id === option.id ? { ...entry, label: event.target.value } : entry,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="button button--small"
                disabled={index === 0}
                onClick={() => {
                  const next = [...options]
                  const [moved] = next.splice(index, 1)
                  next.splice(index - 1, 0, moved)
                  patch({ options: next.map((entry, position) => ({ ...entry, order: position })) })
                }}
              >
                Up
              </button>
              <button
                type="button"
                className="button button--small"
                disabled={index === options.length - 1}
                onClick={() => {
                  const next = [...options]
                  const [moved] = next.splice(index, 1)
                  next.splice(index + 1, 0, moved)
                  patch({ options: next.map((entry, position) => ({ ...entry, order: position })) })
                }}
              >
                Down
              </button>
              <button
                type="button"
                className="button button--quiet button--small"
                disabled={dimension.builtIn}
                onClick={() =>
                  patch({ options: options.filter((entry) => entry.id !== option.id) })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button button--small"
            onClick={() => {
              const value = `option_${options.length + 1}`
              patch({
                options: [
                  ...options,
                  {
                    id: createId('opt'),
                    label: `Option ${options.length + 1}`,
                    value,
                    order: options.length,
                  },
                ],
              })
            }}
          >
            Add option
          </button>
        </div>
      ) : null}

      <div className="row">
        <button
          type="button"
          className="button"
          onClick={() => {
            duplicateDimension(dimension.id)
            showToast('Dimension duplicated.')
          }}
        >
          Duplicate
        </button>
        {dimension.builtIn ? (
          <span className="faint">Built-in dimensions can be disabled but not deleted.</span>
        ) : (
          <ConfirmButton
            label="Delete"
            confirmLabel="Confirm delete"
            onConfirm={() => {
              deleteDimension(dimension.id)
              showToast('Dimension deleted.')
            }}
          />
        )}
      </div>
    </div>
  )
}
