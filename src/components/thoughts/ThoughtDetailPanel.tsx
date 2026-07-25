import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '../common/Dialog'
import { ConfirmButton } from '../common/ConfirmButton'
import { DimensionInput } from '../dimensions/DimensionInput'
import { RelationEditor } from './RelationEditor'
import { BreakdownDialog } from './BreakdownDialog'
import {
  BREAKDOWN_TYPES,
  RELATION_LABEL,
  THOUGHT_TYPES,
  THOUGHT_TYPE_LABEL,
} from '../../domain/defaults'
import { getDimensionValue } from '../../domain/matrix'
import type { Thought, ThoughtStatus, ThoughtType } from '../../domain/types'
import {
  useActiveDimensions,
  useRelations,
  useStore,
  useSuggestionsFor,
  useThought,
  useThoughts,
} from '../../store'

/** Side panel for reading and editing a single thought. */
export function ThoughtDetailPanel() {
  const selectedThoughtId = useStore((state) => state.selectedThoughtId)
  const thought = useThought(selectedThoughtId)
  if (!thought) return null
  // Remounting on id change keeps the draft fields in sync without an effect.
  return <ThoughtDetail key={thought.id} thought={thought} />
}

function ThoughtDetail({ thought }: { thought: Thought }) {
  const navigate = useNavigate()
  const selectedThoughtId = thought.id
  const dimensions = useActiveDimensions()
  const relations = useRelations()
  const thoughts = useThoughts()
  const suggestions = useSuggestionsFor(selectedThoughtId)

  const selectThought = useStore((state) => state.selectThought)
  const updateThought = useStore((state) => state.updateThought)
  const setThoughtType = useStore((state) => state.setThoughtType)
  const setThoughtStatus = useStore((state) => state.setThoughtStatus)
  const setDimensionValue = useStore((state) => state.setDimensionValue)
  const deleteThought = useStore((state) => state.deleteThought)
  const duplicateThought = useStore((state) => state.duplicateThought)
  const deleteRelation = useStore((state) => state.deleteRelation)
  const addTag = useStore((state) => state.addTag)
  const removeTag = useStore((state) => state.removeTag)
  const acceptSuggestion = useStore((state) => state.acceptSuggestion)
  const dismissSuggestion = useStore((state) => state.dismissSuggestion)
  const showToast = useStore((state) => state.showToast)

  const [text, setText] = useState(thought.text)
  const [description, setDescription] = useState(thought.description)
  const [minutes, setMinutes] = useState(
    thought.estimatedMinutes === undefined ? '' : String(thought.estimatedMinutes),
  )
  const [tagDraft, setTagDraft] = useState('')
  const [showRelationEditor, setShowRelationEditor] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const byId = useMemo(
    () => new Map(thoughts.map((entry) => [entry.id, entry])),
    [thoughts],
  )

  const outgoing = useMemo(
    () => relations.filter((relation) => relation.sourceThoughtId === selectedThoughtId),
    [relations, selectedThoughtId],
  )
  const incoming = useMemo(
    () => relations.filter((relation) => relation.targetThoughtId === selectedThoughtId),
    [relations, selectedThoughtId],
  )

  const close = () => selectThought(null)

  const save = () => {
    const parsed = Number(minutes)
    updateThought(thought.id, {
      text,
      description,
      estimatedMinutes:
        minutes.trim() === '' || Number.isNaN(parsed) || parsed < 0 ? undefined : parsed,
    })
    showToast('Saved.')
  }

  return (
    <>
      <Dialog
        title="Thought"
        onClose={close}
        footer={
          <div className="row">
            <button type="button" className="button button--primary" onClick={save}>
              Save
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                const id = duplicateThought(thought.id)
                if (id) {
                  selectThought(id)
                  showToast('Duplicated.')
                }
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setThoughtStatus(thought.id, thought.status === 'archived' ? 'active' : 'archived')
                showToast(thought.status === 'archived' ? 'Restored.' : 'Archived.')
              }}
            >
              {thought.status === 'archived' ? 'Unarchive' : 'Archive'}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                close()
                navigate(`/roadmap/${thought.id}`)
              }}
            >
              Open roadmap
            </button>
            <ConfirmButton
              label="Delete"
              confirmLabel="Confirm delete"
              onConfirm={() => {
                deleteThought(thought.id)
                showToast('Thought deleted.')
              }}
            />
          </div>
        }
      >
        <div className="stack">
          <div className="field">
            <label htmlFor="detail-text">Thought</label>
            <textarea
              id="detail-text"
              className="textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="detail-description">Description</label>
            <textarea
              id="detail-description"
              className="textarea"
              value={description}
              placeholder="Optional. Anything that helps you remember what you meant."
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="detail-type">Type</label>
              <select
                id="detail-type"
                className="select"
                value={thought.type}
                onChange={(event) =>
                  setThoughtType(thought.id, event.target.value as ThoughtType)
                }
              >
                {THOUGHT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {THOUGHT_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="detail-status">Status</label>
              <select
                id="detail-status"
                className="select"
                value={thought.status}
                onChange={(event) =>
                  setThoughtStatus(thought.id, event.target.value as ThoughtStatus)
                }
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="detail-minutes">Estimated minutes</label>
            <input
              id="detail-minutes"
              className="input"
              type="number"
              min={0}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </div>

          <div className="field">
            <span className="label">Tags</span>
            <div className="row">
              {thought.tags.length === 0 ? <span className="faint">No tags yet.</span> : null}
              {thought.tags.map((tag) => (
                <span key={tag} className="chip chip--accent">
                  {tag}
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    aria-label={`Remove tag ${tag}`}
                    onClick={() => removeTag(thought.id, tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                className="input"
                value={tagDraft}
                aria-label="New tag"
                placeholder="Add a tag"
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addTag(thought.id, tagDraft)
                    setTagDraft('')
                  }
                }}
              />
              <button
                type="button"
                className="button"
                onClick={() => {
                  addTag(thought.id, tagDraft)
                  setTagDraft('')
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div className="panel-section stack">
            <h3>Dimensions</h3>
            {dimensions.map((dimension) => (
              <DimensionInput
                key={dimension.id}
                dimension={dimension}
                value={getDimensionValue(thought, dimension)}
                onChange={(value) => setDimensionValue(thought.id, dimension.id, value)}
              />
            ))}
          </div>

          {suggestions.length > 0 ? (
            <div className="panel-section stack">
              <h3>Suggestions</h3>
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="notice">
                  <p style={{ marginBottom: 'var(--space-2)' }}>{suggestion.message}</p>
                  <p className="faint">From the rule “{suggestion.ruleName}”.</p>
                  <div className="row">
                    {suggestion.applicable ? (
                      <button
                        type="button"
                        className="button button--small"
                        onClick={() => acceptSuggestion(suggestion)}
                      >
                        Apply
                      </button>
                    ) : null}
                    {suggestion.action.type === 'suggestBreakdown' ? (
                      <button
                        type="button"
                        className="button button--small"
                        onClick={() => setShowBreakdown(true)}
                      >
                        Break this down
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="button button--quiet button--small"
                      onClick={() => dismissSuggestion(suggestion.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="panel-section stack">
            <h3>Relationships</h3>
            <div>
              <p className="label">This thought points to</p>
              {outgoing.length === 0 ? (
                <p className="faint">Nothing yet.</p>
              ) : (
                <ul className="stack" style={{ gap: 'var(--space-1)' }}>
                  {outgoing.map((relation) => (
                    <li key={relation.id} className="spread">
                      <span>
                        <span className="faint">{RELATION_LABEL[relation.type]} </span>
                        {byId.get(relation.targetThoughtId)?.text ?? 'Unknown thought'}
                      </span>
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() => deleteRelation(relation.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="label">Pointing at this thought</p>
              {incoming.length === 0 ? (
                <p className="faint">Nothing yet.</p>
              ) : (
                <ul className="stack" style={{ gap: 'var(--space-1)' }}>
                  {incoming.map((relation) => (
                    <li key={relation.id} className="spread">
                      <span>
                        {byId.get(relation.sourceThoughtId)?.text ?? 'Unknown thought'}{' '}
                        <span className="faint">{RELATION_LABEL[relation.type]}</span>
                      </span>
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() => deleteRelation(relation.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {showRelationEditor ? (
              <RelationEditor
                sourceThoughtId={thought.id}
                onDone={(message) => showToast(message)}
              />
            ) : (
              <div className="row">
                <button
                  type="button"
                  className="button"
                  onClick={() => setShowRelationEditor(true)}
                >
                  Add relationship
                </button>
                {BREAKDOWN_TYPES.includes(thought.type) ? (
                  <button
                    type="button"
                    className="button"
                    onClick={() => setShowBreakdown(true)}
                  >
                    Break this down
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <p className="faint">
            Created {new Date(thought.createdAt).toLocaleString()} · Updated{' '}
            {new Date(thought.updatedAt).toLocaleString()}
          </p>
        </div>
      </Dialog>

      {showBreakdown ? (
        <BreakdownDialog thoughtId={thought.id} onClose={() => setShowBreakdown(false)} />
      ) : null}
    </>
  )
}
