import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '../common/Dialog'
import { ConfirmButton } from '../common/ConfirmButton'
import { RelevantLearning } from '../learning/RelevantLearning'
import { DimensionInput } from '../dimensions/DimensionInput'
import { RelationEditor } from './RelationEditor'
import { BreakdownDialog } from './BreakdownDialog'
import { THOUGHT_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { relationPhrase } from '../../domain/graph'
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

/** The same complete editor, placed beneath a thought in focused browsing. */
export function InlineThoughtDetails({ thoughtId }: { thoughtId: string }) {
  const thought = useThought(thoughtId)
  if (!thought) return null
  return <ThoughtDetail key={thought.id} thought={thought} inline />
}

function ThoughtDetail({ thought, inline = false }: { thought: Thought; inline?: boolean }) {
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

  /** Every relationship this thought takes part in, either way round. */
  const related = useMemo(
    () =>
      relations
        .filter(
          (relation) =>
            relation.sourceThoughtId === selectedThoughtId ||
            relation.targetThoughtId === selectedThoughtId,
        )
        .map((relation) => ({
          relation,
          otherId:
            relation.sourceThoughtId === selectedThoughtId
              ? relation.targetThoughtId
              : relation.sourceThoughtId,
        })),
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
      <ThoughtDetailFrame
        inline={inline}
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
                  if (!inline) selectThought(id)
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
            <button
              type="button"
              className="button"
              onClick={() => {
                close()
                navigate('/reflect')
              }}
            >
              Reflect
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

          {/* The user's own records, shown where they might matter again. */}
          <RelevantLearning thoughtId={thought.id} />

          <div className="panel-section stack">
            <h3>Relationships</h3>
            {/* One list in both directions — the phrase says which way it runs. */}
            {related.length === 0 ? (
              <p className="faint">Nothing yet.</p>
            ) : (
              <ul className="stack" style={{ gap: 'var(--space-1)' }}>
                {related.map(({ relation, otherId }) => (
                  <li key={relation.id} className="spread">
                    <span>
                      <span className="faint">{relationPhrase(relation, thought.id)} </span>
                      {byId.get(otherId)?.text ?? 'Unknown thought'}
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
                {/* Anything can be broken down, not only goals and projects. */}
                <button
                  type="button"
                  className="button"
                  onClick={() => setShowBreakdown(true)}
                >
                  Break this down
                </button>
              </div>
            )}
          </div>

          <p className="faint">
            Created {new Date(thought.createdAt).toLocaleString()} · Updated{' '}
            {new Date(thought.updatedAt).toLocaleString()}
          </p>
        </div>
      </ThoughtDetailFrame>

      {showBreakdown ? (
        <BreakdownDialog thoughtId={thought.id} onClose={() => setShowBreakdown(false)} />
      ) : null}
    </>
  )
}

function ThoughtDetailFrame({
  inline,
  title,
  onClose,
  footer,
  children,
}: {
  inline: boolean
  title: string
  onClose: () => void
  footer: ReactNode
  children: ReactNode
}) {
  if (!inline) {
    return (
      <Dialog title={title} onClose={onClose} footer={footer}>
        {children}
      </Dialog>
    )
  }

  return (
    <section className="inline-thought-details" aria-label="Thought details">
      <header className="inline-thought-details__header">
        <span className="inline-thought-details__label">Details</span>
        <h3>Manage this thought</h3>
        <p>Review or change anything below, then save when you are finished.</p>
      </header>
      <div className="inline-thought-details__body">{children}</div>
      <footer className="inline-thought-details__footer">{footer}</footer>
    </section>
  )
}
