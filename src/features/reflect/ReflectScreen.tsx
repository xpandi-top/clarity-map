import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveLocale, tx } from '../../i18n/core'
import {
  analyzeReflection,
  createFallbackAnalysis,
  fallbackActions,
  generateReflectionActions,
  makeActionSmallerWithModel,
  reduceAction,
  type ReflectionAction,
  type ReflectionAnalysis,
  type ReflectionHelpMode,
} from '../../domain/reflectionAssistant'
import { useCurrentWorkspaceId, useStore } from '../../store'

type ReflectionStep =
  | 'capture'
  | 'reviewing_understanding'
  | 'choosing_help_mode'
  | 'choosing_action'
  | 'focusing'
  | 'recording_outcome'
  | 'optional_reflection'

type ModelState = 'idle' | 'loading' | 'ready' | 'fallback'
type ActionGenerationState = 'idle' | 'loading' | 'ready' | 'fallback'
type Outcome = 'easier' | 'no_change' | 'more_tired' | 'different_blocker'

interface ReflectionDraft {
  step: ReflectionStep
  originalEntry: string
  analysis: ReflectionAnalysis | null
  helpMode: ReflectionHelpMode
  actions: ReflectionAction[]
  selectedAction: ReflectionAction | null
  outcome: Outcome | null
  modelState: ModelState
}

const EMPTY_DRAFT: ReflectionDraft = {
  step: 'capture',
  originalEntry: '',
  analysis: null,
  helpMode: 'recommend',
  actions: [],
  selectedAction: null,
  outcome: null,
  modelState: 'idle',
}

const HELP_MODES: Array<{ value: ReflectionHelpMode; label: string }> = [
  { value: 'find_first_step', label: 'Find the first step' },
  { value: 'clarify', label: 'Make the situation clearer' },
  { value: 'recover_energy', label: 'Recover some energy' },
  { value: 'recommend', label: 'I am not sure — recommend one' },
]

const OUTCOMES: Array<{ value: Outcome; label: string }> = [
  { value: 'easier', label: 'It became easier to continue' },
  { value: 'no_change', label: 'No noticeable change' },
  { value: 'more_tired', label: 'I feel more tired' },
  { value: 'different_blocker', label: 'I discovered a different blocker' },
]

const ENERGY_COPY: Record<ReflectionAction['energy_level'], { name: string; detail: string }> = {
  very_low: { name: 'Very low energy', detail: 'About two minutes' },
  low: { name: 'Low energy', detail: 'Three to five minutes' },
  medium: { name: 'Medium energy', detail: 'No more than ten minutes' },
}

function storageKey(workspaceId: string | null) {
  return `clarity-map-reflection-draft:${workspaceId ?? 'none'}`
}

function restoreDraft(workspaceId: string | null): ReflectionDraft {
  try {
    const saved = window.localStorage.getItem(storageKey(workspaceId))
    if (!saved) return EMPTY_DRAFT
    const value = JSON.parse(saved) as Partial<ReflectionDraft>
    if (
      typeof value.originalEntry !== 'string' ||
      ![
        'capture',
        'reviewing_understanding',
        'choosing_help_mode',
        'choosing_action',
        'focusing',
        'recording_outcome',
        'optional_reflection',
      ].includes(value.step ?? '')
    ) {
      return EMPTY_DRAFT
    }
    return {
      ...EMPTY_DRAFT,
      ...value,
      modelState: value.modelState === 'loading' ? 'fallback' : (value.modelState ?? 'idle'),
    }
  } catch {
    return EMPTY_DRAFT
  }
}

export function ReflectScreen() {
  const workspaceId = useCurrentWorkspaceId()
  const [draft, setDraft] = useState<ReflectionDraft>(() => restoreDraft(workspaceId))
  const [editing, setEditing] = useState(false)
  const [editingActions, setEditingActions] = useState(false)
  const [actionGenerationState, setActionGenerationState] =
    useState<ActionGenerationState>('idle')
  const [actionGenerationNote, setActionGenerationNote] = useState('')
  const [modelNote, setModelNote] = useState(() =>
    draft.modelState === 'fallback'
      ? 'On-device suggestions are unavailable. The simple version is ready to use.'
      : '',
  )
  const [started, setStarted] = useState(false)
  const [saveObservation, setSaveObservation] = useState(true)
  const [saveEvidence, setSaveEvidence] = useState(false)
  const [saveStrategy, setSaveStrategy] = useState(false)
  const [reviewLater, setReviewLater] = useState(false)
  const [evidenceStatement, setEvidenceStatement] = useState('')
  const [strategy, setStrategy] = useState('')
  const requestId = useRef(0)
  const actionRequestId = useRef(0)

  const addObservation = useStore((state) => state.addObservation)
  const addEvidence = useStore((state) => state.addEvidence)
  const addPersonalRule = useStore((state) => state.addPersonalRule)
  const showToast = useStore((state) => state.showToast)

  useEffect(() => {
    window.localStorage.setItem(storageKey(workspaceId), JSON.stringify(draft))
  }, [draft, workspaceId])

  const updateAnalysis = (patch: Partial<ReflectionAnalysis>) => {
    setDraft((current) =>
      current.analysis ? { ...current, analysis: { ...current.analysis, ...patch } } : current,
    )
  }

  const begin = () => {
    const text = draft.originalEntry.trim()
    if (!text) return
    const locale = getActiveLocale()
    const fallback = createFallbackAnalysis(text, locale)
    const currentRequest = ++requestId.current
    setDraft((current) => ({
      ...current,
      originalEntry: text,
      analysis: fallback,
      helpMode: fallback.recommended_mode,
      actions: fallback.actions,
      step: 'reviewing_understanding',
      modelState: 'loading',
    }))
    setModelNote('Preparing a private on-device reading… You can continue now.')

    void analyzeReflection(text, locale, () => {
      if (requestId.current === currentRequest) {
        setModelNote(
          tx(
            'Loading the on-device model for first use… You can continue now.',
            '首次加载设备本地模型……你现在就可以继续。',
            {},
          ),
        )
      }
    })
      .then((analysis) => {
        if (requestId.current !== currentRequest) return
        setDraft((current) => {
          if (current.originalEntry !== text || current.step === 'capture' || editing) return current
          const canApplySuggestedActions =
            current.step === 'reviewing_understanding' ||
            current.step === 'choosing_help_mode'
          return {
            ...current,
            analysis,
            helpMode:
              current.step === 'reviewing_understanding'
                ? analysis.recommended_mode
                : current.helpMode,
            actions: canApplySuggestedActions ? analysis.actions : current.actions,
            modelState: 'ready',
          }
        })
        setModelNote('On-device suggestions are ready.')
      })
      .catch((error: unknown) => {
        if (requestId.current !== currentRequest) return
        console.warn('On-device reflection suggestions failed.', error)
        setDraft((current) => ({ ...current, modelState: 'fallback' }))
        setModelNote('On-device suggestions are unavailable. The simple version is ready to use.')
      })
  }

  const confirmUnderstanding = () => {
    setEditing(false)
    setDraft((current) => ({ ...current, step: 'choosing_help_mode' }))
  }

  const chooseHelpMode = (mode: ReflectionHelpMode) => {
    requestId.current += 1
    actionRequestId.current += 1
    setDraft((current) => ({ ...current, helpMode: mode }))
  }

  const requestGeneratedActions = (
    analysis: ReflectionAnalysis,
    mode: ReflectionHelpMode,
  ) => {
    const locale = getActiveLocale()
    const currentRequest = ++actionRequestId.current
    setEditingActions(false)
    setActionGenerationState('loading')
    setActionGenerationNote('Generating suggestions for this situation…')

    void generateReflectionActions({
      originalEntry: draft.originalEntry,
      analysis,
      mode,
      locale,
    })
      .then((actions) => {
        if (actionRequestId.current !== currentRequest) return
        setDraft((current) =>
          current.step === 'choosing_action' ? { ...current, actions } : current,
        )
        setActionGenerationState('ready')
        setActionGenerationNote('New suggestions are ready.')
      })
      .catch((error: unknown) => {
        if (actionRequestId.current !== currentRequest) return
        console.warn('On-device action generation failed.', error)
        setActionGenerationState('fallback')
        setActionGenerationNote(
          'New suggestions could not be generated. You can edit the current ones.',
        )
      })
  }

  const continueToActions = () => {
    if (!draft.analysis) return
    const effective =
      draft.helpMode === 'recommend' ? draft.analysis.recommended_mode : draft.helpMode
    const actions =
      effective === draft.analysis.recommended_mode
        ? draft.analysis.actions.slice(0, 3)
        : fallbackActions(effective, getActiveLocale())
    setDraft((current) => ({ ...current, actions, step: 'choosing_action' }))
    requestGeneratedActions(draft.analysis, effective)
  }

  const chooseAction = (action: ReflectionAction) => {
    actionRequestId.current += 1
    setEditingActions(false)
    setStarted(false)
    setDraft((current) => ({ ...current, selectedAction: action, step: 'focusing' }))
  }

  const updateAction = (energyLevel: ReflectionAction['energy_level'], action: string) => {
    actionRequestId.current += 1
    setActionGenerationState('idle')
    setActionGenerationNote('Your edits are ready to choose.')
    setDraft((current) => ({
      ...current,
      actions: current.actions.map((item) =>
        item.energy_level === energyLevel ? { ...item, action } : item,
      ),
    }))
  }

  const makeSmaller = () => {
    const selected = draft.selectedAction
    if (!selected) return
    const deterministic = reduceAction(selected.action, getActiveLocale())
    const smaller =
      deterministic ??
      tx(
        'Open the place where this action would begin.',
        '打开这个行动会开始的页面或物品。',
        {},
      )
    setDraft((current) => ({
      ...current,
      selectedAction: {
        ...selected,
        label: tx('A smaller version', '再小一点', {}),
        action: smaller,
        energy_level: 'very_low',
        estimated_minutes: Math.min(2, selected.estimated_minutes),
      },
    }))
    setStarted(false)

    // Only ask the local model when the predictable reductions (split a
    // compound action, lower a count or duration) could not safely help.
    if (!deterministic) {
      const request = ++requestId.current
      void makeActionSmallerWithModel(selected.action, getActiveLocale())
        .then((modelAction) => {
          if (requestId.current !== request) return
          setDraft((current) =>
            current.step === 'focusing' && current.selectedAction?.action === smaller
              ? {
                  ...current,
                  selectedAction: { ...current.selectedAction, action: modelAction },
                }
              : current,
          )
        })
        .catch(() => {
          // The deterministic generic reduction already shown remains usable.
        })
    }
  }

  const saveOptionalReflection = () => {
    let observationId: string | null = null
    if (saveObservation || saveEvidence || reviewLater) {
      observationId = addObservation({
        description: draft.originalEntry,
        title: draft.selectedAction?.action,
        context: { tags: reviewLater ? ['review later'] : [] },
      })
    }
    if (saveEvidence && evidenceStatement.trim()) {
      addEvidence({
        statement: evidenceStatement,
        observationIds: observationId ? [observationId] : [],
        supportingObservationIds: observationId ? [observationId] : [],
        contradictingObservationIds: [],
      })
    }
    if (saveStrategy && strategy.trim()) {
      addPersonalRule({
        name: tx('A step that may help', '一个可能有帮助的做法', {}),
        triggerDescription: draft.analysis?.situation ?? draft.originalEntry,
        defaultResponse: strategy,
        evidenceIds: [],
      })
    }
    showToast('Saved.')
    window.localStorage.removeItem(storageKey(workspaceId))
    requestId.current += 1
    setDraft(EMPTY_DRAFT)
    setEvidenceStatement('')
    setStrategy('')
    setSaveEvidence(false)
    setSaveStrategy(false)
    setReviewLater(false)
  }

  const progress = useMemo(() => {
    const order: ReflectionStep[] = [
      'capture',
      'reviewing_understanding',
      'choosing_help_mode',
      'choosing_action',
      'focusing',
      'recording_outcome',
      'optional_reflection',
    ]
    return order.indexOf(draft.step) + 1
  }, [draft.step])

  return (
    <div className="reflection-flow">
      <div className="reflection-flow__header">
        <div>
          <span className="reflection-flow__eyebrow">
            {tx('Reflect · Step {step} of 7', '回顾 · 第 {step} 步，共 7 步', { step: progress })}
          </span>
          <h1>{draft.step === 'capture' ? 'Find one next step' : 'Reflect'}</h1>
        </div>
        {draft.step !== 'capture' && (
          <button
            type="button"
            className="button button--quiet button--small"
            onClick={() => {
              requestId.current += 1
              setDraft(EMPTY_DRAFT)
            }}
          >
            Start over
          </button>
        )}
      </div>

      {draft.step === 'capture' && (
        <section className="card reflection-stage reflection-stage--capture">
          <div className="stack">
            <div>
              <h2>What is happening right now?</h2>
              <p className="muted">Write it in any form. You do not need to organize it first.</p>
            </div>
            <div className="field">
              <label className="visually-hidden" htmlFor="reflection-entry">
                What is happening right now?
              </label>
              <textarea
                id="reflection-entry"
                className="textarea reflection-entry"
                autoFocus
                value={draft.originalEntry}
                placeholder="Start wherever it feels easiest…"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, originalEntry: event.target.value }))
                }
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') begin()
                }}
              />
            </div>
            <div className="spread reflection-stage__footer">
              <span className="faint">Your words stay in this browser.</span>
              <button
                type="button"
                className="button button--primary"
                disabled={!draft.originalEntry.trim()}
                onClick={begin}
              >
                Help me find the next step
              </button>
            </div>
          </div>
        </section>
      )}

      {draft.step === 'reviewing_understanding' && draft.analysis && (
        <section className="card reflection-stage" aria-labelledby="understanding-heading">
          <div className="reflection-stage__intro">
            <span className="reflection-stage__number">01</span>
            <div>
              <h2 id="understanding-heading">Is this understanding close?</h2>
              <p className="muted">
                Observations come from your words. Possible blockers are tentative interpretations.
              </p>
            </div>
          </div>

          <div className="understanding-grid">
            <div className="understanding-block understanding-block--wide">
              <span className="label">Situation</span>
              {editing ? (
                <input
                  className="input"
                  aria-label="Situation"
                  value={draft.analysis.situation}
                  onChange={(event) => updateAnalysis({ situation: event.target.value })}
                />
              ) : (
                <p>{draft.analysis.situation}</p>
              )}
            </div>
            <div className="understanding-block understanding-block--wide">
              <span className="label">Desired outcome</span>
              {editing ? (
                <input
                  className="input"
                  aria-label="Desired outcome"
                  value={draft.analysis.desired_outcome}
                  onChange={(event) => updateAnalysis({ desired_outcome: event.target.value })}
                />
              ) : (
                <p>{draft.analysis.desired_outcome}</p>
              )}
            </div>
            <div className="understanding-block understanding-block--observed">
              <span className="understanding-block__kind">Directly observed</span>
              {editing ? (
                <textarea
                  className="textarea"
                  aria-label="Directly observed signals"
                  value={draft.analysis.observations.join('\n')}
                  onChange={(event) =>
                    updateAnalysis({
                      observations: event.target.value.split('\n').filter(Boolean).slice(0, 5),
                    })
                  }
                />
              ) : (
                <ul className="reflection-list">
                  {draft.analysis.observations.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </div>
            <div className="understanding-block understanding-block--possible">
              <span className="understanding-block__kind">Possible interpretations</span>
              {editing ? (
                <textarea
                  className="textarea"
                  aria-label="Possible blockers"
                  value={draft.analysis.possible_blockers.map((item) => item.description).join('\n')}
                  onChange={(event) =>
                    updateAnalysis({
                      possible_blockers: event.target.value
                        .split('\n')
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((description) => ({
                          type: 'user_edit',
                          description,
                          confidence: 'medium',
                        })),
                    })
                  }
                />
              ) : draft.analysis.possible_blockers.length ? (
                <ul className="reflection-list">
                  {draft.analysis.possible_blockers.map((item) => (
                    <li key={`${item.type}-${item.description}`}>{item.description}</li>
                  ))}
                </ul>
              ) : (
                <p className="faint">No blocker is being assumed.</p>
              )}
            </div>
          </div>

          <details className="original-entry">
            <summary>Your original words</summary>
            <p>{draft.originalEntry}</p>
          </details>

          <div className="model-status" role="status">
            <span className={`model-status__dot model-status__dot--${draft.modelState}`} />
            <span>{modelNote}</span>
          </div>
          <div className="row reflection-stage__actions">
            <button type="button" className="button button--primary" onClick={confirmUnderstanding}>
              Yes, that is right
            </button>
            <button
              type="button"
              className="button button--secondary"
              aria-pressed={editing}
              onClick={() => {
                requestId.current += 1
                setEditing((value) => !value)
              }}
            >
              {editing ? 'Finish editing' : 'Edit'}
            </button>
          </div>
        </section>
      )}

      {draft.step === 'choosing_help_mode' && draft.analysis && (
        <section className="card reflection-stage">
          <div className="reflection-stage__intro">
            <span className="reflection-stage__number">02</span>
            <div>
              <h2>What would help most right now?</h2>
              <p className="muted">Choose one. You can change it on the next screen.</p>
            </div>
          </div>
          <div className="choice-list" role="group" aria-label="Kind of help">
            {HELP_MODES.map((mode) => {
              const recommended = mode.value === draft.analysis?.recommended_mode
              return (
                <button
                  type="button"
                  key={mode.value}
                  className="choice-row"
                  aria-pressed={draft.helpMode === mode.value}
                  onClick={() => chooseHelpMode(mode.value)}
                >
                  <span className="choice-row__marker" aria-hidden="true" />
                  <span>{mode.label}</span>
                  {recommended && <span className="chip chip--accent">Suggested</span>}
                </button>
              )
            })}
          </div>
          <button type="button" className="button button--primary" onClick={continueToActions}>
            Show small actions
          </button>
        </section>
      )}

      {draft.step === 'choosing_action' && (
        <section className="reflection-stage">
          <div className="reflection-stage__intro">
            <span className="reflection-stage__number">03</span>
            <div>
              <h2>Choose or adjust a step</h2>
              <p className="muted">
                These suggestions use your situation and chosen kind of help. Smaller is still
                useful.
              </p>
            </div>
          </div>
          <div className="action-tools">
            <div className="row">
              <button
                type="button"
                className="button button--secondary"
                disabled={actionGenerationState === 'loading' || !draft.analysis}
                onClick={() => {
                  if (!draft.analysis) return
                  const effective =
                    draft.helpMode === 'recommend'
                      ? draft.analysis.recommended_mode
                      : draft.helpMode
                  requestGeneratedActions(draft.analysis, effective)
                }}
              >
                {actionGenerationState === 'loading'
                  ? 'Generating suggestions…'
                  : 'Generate new suggestions'}
              </button>
              <button
                type="button"
                className="button button--quiet"
                aria-pressed={editingActions}
                disabled={
                  editingActions && draft.actions.some((action) => !action.action.trim())
                }
                onClick={() => {
                  actionRequestId.current += 1
                  setActionGenerationState('idle')
                  setActionGenerationNote(
                    editingActions
                      ? 'Your edits are ready to choose.'
                      : 'Edit any suggestion below.',
                  )
                  setEditingActions((value) => !value)
                }}
              >
                {editingActions ? 'Finish editing' : 'Edit suggestions'}
              </button>
            </div>
            {actionGenerationNote && (
              <div className="model-status action-generation-status" role="status">
                <span
                  className={`model-status__dot model-status__dot--${actionGenerationState}`}
                />
                <span>{actionGenerationNote}</span>
              </div>
            )}
          </div>
          <div className="action-options">
            {draft.actions.slice(0, 3).map((action) =>
              editingActions ? (
                <div
                  key={action.energy_level}
                  className="card action-option action-option--editing"
                >
                  <span className={`energy-mark energy-mark--${action.energy_level}`} />
                  <label
                    className="action-option__energy"
                    htmlFor={`action-${action.energy_level}`}
                  >
                    {ENERGY_COPY[action.energy_level].name}
                  </label>
                  <textarea
                    id={`action-${action.energy_level}`}
                    className="textarea action-option__editor"
                    aria-label={`${ENERGY_COPY[action.energy_level].name} suggestion`}
                    value={action.action}
                    onChange={(event) =>
                      updateAction(action.energy_level, event.target.value)
                    }
                  />
                  <span className="faint">{ENERGY_COPY[action.energy_level].detail}</span>
                </div>
              ) : (
                <button
                  type="button"
                  key={`${action.energy_level}-${action.action}`}
                  className="card action-option"
                  onClick={() => chooseAction(action)}
                >
                  <span className={`energy-mark energy-mark--${action.energy_level}`} />
                  <span className="action-option__energy">
                    {ENERGY_COPY[action.energy_level].name}
                  </span>
                  <strong>{action.action}</strong>
                  <span className="faint">{ENERGY_COPY[action.energy_level].detail}</span>
                  <span className="action-option__choose">Choose this →</span>
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            className="button button--quiet"
            onClick={() => {
              actionRequestId.current += 1
              setEditingActions(false)
              setDraft((current) => ({ ...current, step: 'choosing_help_mode' }))
            }}
          >
            Choose a different kind of help
          </button>
        </section>
      )}

      {draft.step === 'focusing' && draft.selectedAction && (
        <section className="card focus-card">
          <span className="focus-card__label">Only do this now:</span>
          <h2>{draft.selectedAction.action}</h2>
          <span className="faint">
            {tx(
              'About {minutes} minutes',
              '大约 {minutes} 分钟',
              { minutes: draft.selectedAction.estimated_minutes },
            )}
          </span>
          <div className="row focus-card__actions">
            {!started && (
              <button type="button" className="button button--primary" onClick={() => setStarted(true)}>
                Start
              </button>
            )}
            <button
              type="button"
              className={started ? 'button button--primary' : 'button button--secondary'}
              onClick={() =>
                setDraft((current) => ({ ...current, step: 'recording_outcome' }))
              }
            >
              Done
            </button>
            <button type="button" className="button button--quiet" onClick={makeSmaller}>
              Still too difficult — make it smaller
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => setDraft((current) => ({ ...current, step: 'choosing_action' }))}
            >
              Choose another action
            </button>
          </div>
          {started && <p className="focus-card__started" role="status">Started. Nothing else is required right now.</p>}
        </section>
      )}

      {draft.step === 'recording_outcome' && (
        <section className="card reflection-stage">
          <div>
            <h2>What changed after taking this step?</h2>
            <p className="muted">One tap is enough.</p>
          </div>
          <div className="choice-list" role="group" aria-label="What changed">
            {OUTCOMES.map((outcome) => (
              <button
                type="button"
                key={outcome.value}
                className="choice-row"
                aria-pressed={draft.outcome === outcome.value}
                onClick={() => setDraft((current) => ({ ...current, outcome: outcome.value }))}
              >
                <span className="choice-row__marker" aria-hidden="true" />
                <span>{outcome.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="button button--primary"
            disabled={!draft.outcome}
            onClick={() => {
              setEvidenceStatement(
                draft.outcome === 'easier'
                  ? tx(
                      'This small action made it easier to continue.',
                      '这个小行动让继续做下去变得容易了一些。',
                      {},
                    )
                  : '',
              )
              setStrategy(draft.selectedAction?.action ?? '')
              setDraft((current) => ({ ...current, step: 'optional_reflection' }))
            }}
          >
            Continue
          </button>
        </section>
      )}

      {draft.step === 'optional_reflection' && (
        <section className="card reflection-stage">
          <div>
            <span className="reflection-stage__eyebrow">Optional</span>
            <h2>Would you like to keep anything from this?</h2>
            <p className="muted">You can save one item, several, or nothing.</p>
          </div>
          <div className="optional-save-list">
            <label className="optional-save">
              <input
                type="checkbox"
                checked={saveObservation}
                onChange={(event) => setSaveObservation(event.target.checked)}
              />
              <span><strong>Observation</strong><small>Keep your original words unchanged.</small></span>
            </label>
            <label className="optional-save">
              <input
                type="checkbox"
                checked={saveEvidence}
                onChange={(event) => setSaveEvidence(event.target.checked)}
              />
              <span><strong>Supporting evidence</strong><small>Save what this experience may indicate.</small></span>
            </label>
            {saveEvidence && (
              <div className="field optional-save__field">
                <label htmlFor="reflection-evidence">What might this experience support?</label>
                <textarea
                  id="reflection-evidence"
                  className="textarea"
                  value={evidenceStatement}
                  onChange={(event) => setEvidenceStatement(event.target.value)}
                />
              </div>
            )}
            <label className="optional-save">
              <input
                type="checkbox"
                checked={saveStrategy}
                onChange={(event) => setSaveStrategy(event.target.checked)}
              />
              <span><strong>Reusable strategy</strong><small>Keep the action as something to try in a similar situation.</small></span>
            </label>
            {saveStrategy && (
              <div className="field optional-save__field">
                <label htmlFor="reflection-strategy">Strategy to remember</label>
                <input
                  id="reflection-strategy"
                  className="input"
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value)}
                />
              </div>
            )}
            <label className="optional-save">
              <input
                type="checkbox"
                checked={reviewLater}
                onChange={(event) => setReviewLater(event.target.checked)}
              />
              <span><strong>Reminder to review later</strong><small>Mark this observation for the evidence inbox.</small></span>
            </label>
          </div>

          <details className="progressive-details">
            <summary>Beliefs and model building</summary>
            <p className="faint">
              Belief updates are available after saving evidence. They are optional and never
              replace the original experience.
            </p>
            <div className="row">
              <Link className="button button--quiet button--small" to="/evidence">Evidence inbox</Link>
              <Link className="button button--quiet button--small" to="/model">Review beliefs</Link>
            </div>
          </details>

          <div className="row">
            <button type="button" className="button button--primary" onClick={saveOptionalReflection}>
              Save selected items
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => {
                window.localStorage.removeItem(storageKey(workspaceId))
                setDraft(EMPTY_DRAFT)
              }}
            >
              Finish without saving
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
