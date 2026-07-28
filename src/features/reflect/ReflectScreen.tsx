import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BeliefUpdateDialog } from '../../components/learning/BeliefUpdateDialog'
import { PersonalRuleDialog } from '../../components/learning/PersonalRuleDialog'
import { RecordPicker } from '../../components/learning/RecordPicker'
import { RelevantLearning } from '../../components/learning/RelevantLearning'
import { ThoughtLinkPicker } from '../../components/learning/ThoughtLinkPicker'
import { rulesMatchingSituation } from '../../domain/relevance'
import type { ObservationContext } from '../../domain/types'
import {
  useBeliefs,
  useHypotheses,
  usePersonalRules,
  useStore,
} from '../../store'
import { tx } from '../../i18n/core'

type ModelChange =
  | 'none'
  | 'supports'
  | 'weakens'
  | 'contradicts'
  | 'newBelief'
  | 'unsure'

const MODEL_CHANGES: Array<{ value: ModelChange; label: string }> = [
  { value: 'none', label: 'No, this is only an observation.' },
  { value: 'supports', label: 'It supports an existing belief.' },
  { value: 'weakens', label: 'It weakens an existing belief.' },
  { value: 'contradicts', label: 'It contradicts an existing belief.' },
  { value: 'newBelief', label: 'It suggests a new belief.' },
  { value: 'unsure', label: 'I am not sure yet.' },
]

type Keep = 'rule' | 'evidence' | 'later' | 'no'

const KEEP_OPTIONS: Array<{ value: Keep; label: string }> = [
  { value: 'rule', label: 'Create a default rule.' },
  { value: 'evidence', label: 'Add it as evidence only.' },
  { value: 'later', label: 'Review it later.' },
  { value: 'no', label: 'No.' },
]

const REVIEW_LATER_TAG = 'review later'

/**
 * The bottom-up half of the app: something happened, and it might mean
 * something. Deliberately lightweight — one sentence is a complete entry, and
 * every question after the first can be skipped.
 */
export function ReflectScreen() {
  const beliefs = useBeliefs()
  const hypotheses = useHypotheses()
  const personalRules = usePersonalRules()
  const addObservation = useStore((state) => state.addObservation)
  const addEvidence = useStore((state) => state.addEvidence)
  const updateBelief = useStore((state) => state.updateBelief)
  const updateHypothesis = useStore((state) => state.updateHypothesis)
  const showToast = useStore((state) => state.showToast)

  const [description, setDescription] = useState('')
  const [interpretation, setInterpretation] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [context, setContext] = useState<ObservationContext>({ tags: [] })
  const [tagDraft, setTagDraft] = useState('')
  const [energyBefore, setEnergyBefore] = useState('')
  const [energyAfter, setEnergyAfter] = useState('')
  const [moodBefore, setMoodBefore] = useState('')
  const [moodAfter, setMoodAfter] = useState('')
  const [attempt, setAttempt] = useState('')
  const [thoughtIds, setThoughtIds] = useState<string[]>([])
  const [beliefIds, setBeliefIds] = useState<string[]>([])
  const [hypothesisIds, setHypothesisIds] = useState<string[]>([])
  const [modelChange, setModelChange] = useState<ModelChange>('none')
  const [keep, setKeep] = useState<Keep>('evidence')
  const [situation, setSituation] = useState('')

  const [beliefDialog, setBeliefDialog] = useState<{
    evidenceIds: string[]
    thenRule: boolean
  } | null>(null)
  const [ruleDialog, setRuleDialog] = useState<{ evidenceIds: string[] } | null>(null)

  const matchingRules = useMemo(
    () => rulesMatchingSituation(personalRules, situation || description),
    [personalRules, situation, description],
  )

  const beliefOptions = useMemo(
    () =>
      beliefs
        .filter((belief) => belief.status !== 'replaced' && belief.status !== 'retired')
        .map((belief) => ({ id: belief.id, label: belief.statement })),
    [beliefs],
  )

  const hypothesisOptions = useMemo(
    () =>
      hypotheses
        .filter((hypothesis) => hypothesis.status !== 'retired')
        .map((hypothesis) => ({ id: hypothesis.id, label: hypothesis.statement })),
    [hypotheses],
  )

  const number = (value: string) => {
    const parsed = Number(value)
    return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed
  }

  const reset = () => {
    setDescription('')
    setInterpretation('')
    setOccurredAt('')
    setContext({ tags: [] })
    setEnergyBefore('')
    setEnergyAfter('')
    setMoodBefore('')
    setMoodAfter('')
    setAttempt('')
    setThoughtIds([])
    setBeliefIds([])
    setHypothesisIds([])
    setModelChange('none')
    setKeep('evidence')
  }

  const save = () => {
    const tags = keep === 'later' ? [...context.tags, REVIEW_LATER_TAG] : context.tags
    const observationId = addObservation({
      description,
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
      context: { ...context, tags },
      energyBefore: number(energyBefore),
      energyAfter: number(energyAfter),
      moodBefore: number(moodBefore),
      moodAfter: number(moodAfter),
      title: attempt.trim() || undefined,
      relatedThoughtIds: thoughtIds,
    })

    if (!observationId) {
      showToast('Write down what happened first.')
      return
    }

    // Interpretation is optional: an observation on its own is a complete
    // entry, and the app must not decide what it means.
    let evidenceId: string | null = null
    if (interpretation.trim()) {
      evidenceId = addEvidence({
        statement: interpretation,
        observationIds: [observationId],
        supportingObservationIds: modelChange === 'contradicts' ? [] : [observationId],
        contradictingObservationIds: modelChange === 'contradicts' ? [observationId] : [],
        relatedThoughtIds: thoughtIds,
        context: { ...context, tags },
      })
    }

    if (evidenceId) {
      for (const beliefId of beliefIds) {
        const belief = beliefs.find((entry) => entry.id === beliefId)
        if (!belief) continue
        const weakens = modelChange === 'weakens' || modelChange === 'contradicts'
        updateBelief(beliefId, {
          evidenceIds: weakens ? belief.evidenceIds : [...belief.evidenceIds, evidenceId],
          contradictingEvidenceIds: weakens
            ? [...(belief.contradictingEvidenceIds ?? []), evidenceId]
            : (belief.contradictingEvidenceIds ?? []),
          status: weakens ? 'uncertain' : belief.status,
        })
      }
      for (const hypothesisId of hypothesisIds) {
        const hypothesis = hypotheses.find((entry) => entry.id === hypothesisId)
        if (!hypothesis) continue
        const contradicts = modelChange === 'contradicts'
        updateHypothesis(hypothesisId, {
          evidenceIds: contradicts
            ? hypothesis.evidenceIds
            : [...hypothesis.evidenceIds, evidenceId],
          contradictingEvidenceIds: contradicts
            ? [...(hypothesis.contradictingEvidenceIds ?? []), evidenceId]
            : (hypothesis.contradictingEvidenceIds ?? []),
          status: contradicts ? 'contradicted' : 'partiallySupported',
        })
      }
    }

    const evidenceIds = evidenceId ? [evidenceId] : []
    const wantsBeliefUpdate =
      modelChange === 'weakens' ||
      modelChange === 'contradicts' ||
      modelChange === 'newBelief'
    const wantsRule = keep === 'rule'

    showToast('Saved.')
    reset()

    // Both can be wanted at once; the rule form follows the belief update.
    if (wantsBeliefUpdate) setBeliefDialog({ evidenceIds, thenRule: wantsRule })
    else if (wantsRule) setRuleDialog({ evidenceIds })
  }

  return (
    <div className="stack" style={{ maxWidth: '48rem' }}>
      <div className="screen-header">
        <h1>Reflect</h1>
        <p>
          Something happened. Write it down before deciding what it means — the two are easier to
          tell apart afterwards.
        </p>
      </div>

      <section className="card stack">
        <h2>1 · What happened?</h2>
        <div className="field">
          <label htmlFor="reflect-description">In your own words</label>
          <textarea
            id="reflect-description"
            className="textarea"
            value={description}
            placeholder="After I left the house, I became more willing to move."
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="faint">One sentence is enough. Everything below is optional.</span>
        </div>

        <details>
          <summary>Add context</summary>
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="reflect-when">When</label>
                <input
                  id="reflect-when"
                  className="input"
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="reflect-location">Where</label>
                <input
                  id="reflect-location"
                  className="input"
                  value={context.location ?? ''}
                  onChange={(event) =>
                    setContext((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="reflect-energy-before">Energy before</label>
                <input
                  id="reflect-energy-before"
                  className="input"
                  type="number"
                  value={energyBefore}
                  onChange={(event) => setEnergyBefore(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="reflect-energy-after">Energy after</label>
                <input
                  id="reflect-energy-after"
                  className="input"
                  type="number"
                  value={energyAfter}
                  onChange={(event) => setEnergyAfter(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="reflect-mood-before">Mood before</label>
                <input
                  id="reflect-mood-before"
                  className="input"
                  type="number"
                  value={moodBefore}
                  onChange={(event) => setMoodBefore(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="reflect-mood-after">Mood after</label>
                <input
                  id="reflect-mood-after"
                  className="input"
                  type="number"
                  value={moodAfter}
                  onChange={(event) => setMoodAfter(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="reflect-physical">Physical state</label>
                <input
                  id="reflect-physical"
                  className="input"
                  value={context.physicalState ?? ''}
                  onChange={(event) =>
                    setContext((current) => ({ ...current, physicalState: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="reflect-social">Alone or with others</label>
                <input
                  id="reflect-social"
                  className="input"
                  value={context.socialContext ?? ''}
                  onChange={(event) =>
                    setContext((current) => ({ ...current, socialContext: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="reflect-attempt">What were you trying to do?</label>
              <input
                id="reflect-attempt"
                className="input"
                value={attempt}
                onChange={(event) => setAttempt(event.target.value)}
              />
            </div>

            <div className="field">
              <span className="label">Tags</span>
              <div className="row">
                {context.tags.map((tag) => (
                  <span key={tag} className="chip chip--accent">
                    {tag}
                    <button
                      type="button"
                      className="button button--quiet button--small"
                      aria-label={tx('Remove tag {tag}', '移除标签“{tag}”', { tag })}
                      onClick={() =>
                        setContext((current) => ({
                          ...current,
                          tags: current.tags.filter((entry) => entry !== tag),
                        }))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input
                  className="input"
                  aria-label="New tag"
                  value={tagDraft}
                  placeholder="energy, movement, decisions…"
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    const tag = tagDraft.trim()
                    if (!tag) return
                    setContext((current) =>
                      current.tags.includes(tag)
                        ? current
                        : { ...current, tags: [...current.tags, tag] },
                    )
                    setTagDraft('')
                  }}
                />
              </div>
              <span className="faint">
                Tags are how a record finds its way back to you later.
              </span>
            </div>
          </div>
        </details>
      </section>

      <section className="card stack">
        <h2>2 · Observation and interpretation</h2>
        <p className="faint">
          The first field is what happened. The second is what you make of it. Keeping them apart
          means you can change your mind later without losing the record.
        </p>
        <div className="field">
          <label htmlFor="reflect-observed">What did you directly observe?</label>
          <textarea
            id="reflect-observed"
            className="textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="reflect-meaning">What do you think this may indicate?</label>
          <textarea
            id="reflect-meaning"
            className="textarea"
            value={interpretation}
            placeholder="Changing environments may help me regain movement motivation."
            onChange={(event) => setInterpretation(event.target.value)}
          />
          <span className="faint">
            Optional, and provisional. This is your reading of one experience, not a conclusion.
          </span>
        </div>
      </section>

      <section className="card stack">
        <h2>3 · Connect it</h2>
        <ThoughtLinkPicker
          label="Related thoughts"
          selectedIds={thoughtIds}
          onChange={setThoughtIds}
          hint="Values, goals, habits, actions, decisions, problems — whatever this touches."
        />
        <RecordPicker
          label="Related beliefs"
          options={beliefOptions}
          selectedIds={beliefIds}
          onChange={setBeliefIds}
          emptyText="No beliefs recorded yet."
        />
        <RecordPicker
          label="Related hypotheses"
          options={hypothesisOptions}
          selectedIds={hypothesisIds}
          onChange={setHypothesisIds}
          emptyText="No hypotheses recorded yet."
        />

        {thoughtIds.map((thoughtId) => (
          <RelevantLearning
            key={thoughtId}
            thoughtId={thoughtId}
            heading="What you have already learned about this"
          />
        ))}
      </section>

      <section className="card stack">
        <h2>4 · Did this change how you understand yourself or the situation?</h2>
        <div className="stack" style={{ gap: 'var(--space-1)' }}>
          {MODEL_CHANGES.map((option) => (
            <label key={option.value} className="checkbox-row">
              <input
                type="radio"
                name="model-change"
                checked={modelChange === option.value}
                onChange={() => setModelChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="faint">
          Choosing one of the belief options opens the update form after saving. Your previous
          belief is kept either way.
        </p>
      </section>

      <section className="card stack">
        <h2>5 · Would this be useful to remember in a similar situation?</h2>
        <div className="stack" style={{ gap: 'var(--space-1)' }}>
          {KEEP_OPTIONS.map((option) => (
            <label key={option.value} className="checkbox-row">
              <input
                type="radio"
                name="keep"
                checked={keep === option.value}
                onChange={() => setKeep(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="faint">Most observations are not rules. It is fine to leave it here.</p>
      </section>

      <div className="row">
        <button
          type="button"
          className="button button--primary"
          disabled={description.trim().length === 0}
          onClick={save}
        >
          Save this reflection
        </button>
        <Link className="button button--quiet" to="/evidence">
          Evidence inbox
        </Link>
      </div>

      <section className="card stack">
        <h2>Check your defaults</h2>
        <p className="faint">
          Describe the situation you are in. Anything you have written down before that matches
          will appear — nothing is watching in the background.
        </p>
        <div className="field">
          <label htmlFor="reflect-situation">Where are you right now?</label>
          <input
            id="reflect-situation"
            className="input"
            value={situation}
            placeholder="Low energy, been deciding for half an hour"
            onChange={(event) => setSituation(event.target.value)}
          />
        </div>
        {matchingRules.length === 0 ? (
          <p className="faint">Nothing you have recorded matches yet.</p>
        ) : (
          <ul className="stack" style={{ gap: 'var(--space-2)' }}>
            {matchingRules.map((rule) => (
              <li key={rule.id}>
                <strong>{rule.name}</strong>
                <p style={{ margin: 0 }}>{rule.defaultResponse}</p>
                <p className="faint" style={{ margin: 0 }}>
                  When {rule.triggerDescription}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {beliefDialog ? (
        <BeliefUpdateDialog
          presetEvidenceIds={beliefDialog.evidenceIds}
          onClose={() => {
            if (beliefDialog.thenRule) setRuleDialog({ evidenceIds: beliefDialog.evidenceIds })
            setBeliefDialog(null)
          }}
        />
      ) : null}

      {ruleDialog ? (
        <PersonalRuleDialog
          presetEvidenceIds={ruleDialog.evidenceIds}
          onClose={() => setRuleDialog(null)}
        />
      ) : null}
    </div>
  )
}
