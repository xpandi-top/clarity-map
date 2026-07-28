import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BeliefUpdateDialog } from '../../components/learning/BeliefUpdateDialog'
import { ConfidenceChip, ConfidenceSelect } from '../../components/learning/ConfidenceSelect'
import { LearningGraphView } from '../../components/learning/LearningGraphView'
import { PersonalRuleDialog } from '../../components/learning/PersonalRuleDialog'
import { ThoughtLinkPicker } from '../../components/learning/ThoughtLinkPicker'
import { ConfirmButton } from '../../components/common/ConfirmButton'
import { nowIso } from '../../domain/ids'
import {
  BELIEF_STATUS_LABEL,
  HYPOTHESIS_STATUSES,
  HYPOTHESIS_STATUS_LABEL,
  MIXED_EVIDENCE_NOTICE,
  PERSONAL_RULE_STATUS_LABEL,
  hasMixedSupport,
  ruleNeedsReview,
} from '../../domain/learning'
import { buildLearningGraph } from '../../domain/learningGraph'
import type {
  ConfidenceLevel,
  HypothesisStatus,
  PersonalDefaultRule,
} from '../../domain/types'
import {
  useBeliefUpdates,
  useBeliefs,
  useEvidence,
  useHypotheses,
  useLearningData,
  useObservations,
  usePersonalRules,
  useStore,
  useThoughts,
} from '../../store'
import { formatDate, formatDateTime, t, tx } from '../../i18n/core'

type GraphMode = 'learning' | 'combined'

/**
 * How the user's model of themselves has changed, and why.
 *
 * Nothing here is a correction of an earlier mistake: a replaced belief keeps
 * its place in the timeline, because knowing what you used to think is part of
 * knowing what changed.
 */
export function ModelScreen() {
  const beliefs = useBeliefs()
  const beliefUpdates = useBeliefUpdates()
  const evidence = useEvidence()
  const observations = useObservations()
  const personalRules = usePersonalRules()
  const thoughts = useThoughts()
  const learning = useLearningData()

  const [focusId, setFocusId] = useState('')
  const [graphMode, setGraphMode] = useState<GraphMode>('learning')
  const [beliefDialog, setBeliefDialog] = useState<{ previousBeliefId?: string } | null>(null)
  const [ruleDialog, setRuleDialog] = useState<{
    rule?: PersonalDefaultRule
    mode: 'create' | 'edit' | 'replace'
  } | null>(null)

  const evidenceById = useMemo(
    () => new Map(evidence.map((entry) => [entry.id, entry])),
    [evidence],
  )
  const observationById = useMemo(
    () => new Map(observations.map((entry) => [entry.id, entry])),
    [observations],
  )
  const beliefById = useMemo(
    () => new Map(beliefs.map((belief) => [belief.id, belief])),
    [beliefs],
  )

  const timeline = useMemo(
    () => [...beliefUpdates].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [beliefUpdates],
  )

  /** Rules that grew out of the same evidence as a given belief update. */
  const rulesFromEvidence = (evidenceIds: string[]) =>
    personalRules.filter((rule) => rule.evidenceIds.some((id) => evidenceIds.includes(id)))

  const graph = useMemo(
    () =>
      buildLearningGraph(learning, {
        focusId: focusId || undefined,
        maxDepth: 3,
        // Combining both graphs is opt-in: with every thought drawn in, the
        // picture stops being readable well before it becomes useful.
        thoughts: graphMode === 'combined' ? thoughts : [],
      }),
    [learning, focusId, graphMode, thoughts],
  )

  const focusOptions = [
    ...beliefs.map((belief) => ({
      id: belief.id,
      label: tx('Belief — {text}', '信念——{text}', { text: belief.statement }),
    })),
    ...personalRules.map((rule) => ({
      id: rule.id,
      label: tx('Rule — {text}', '应对策略——{text}', { text: rule.name }),
    })),
  ]

  return (
    <div className="stack">
      <div className="screen-header spread">
        <div>
          <h1>Model</h1>
          <p>
            What you used to think, what changed it, and what you decided to try instead. Nothing
            is overwritten.
          </p>
        </div>
        <div className="row">
          <Link className="button button--primary" to="/reflect">
            Record something
          </Link>
          <button
            type="button"
            className="button"
            onClick={() => setBeliefDialog({ previousBeliefId: undefined })}
          >
            Record a belief
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setRuleDialog({ mode: 'create' })}
          >
            Create a default rule
          </button>
        </div>
      </div>

      <section className="card stack">
        <h2>Timeline</h2>
        {timeline.length === 0 ? (
          <p className="faint">
            No belief updates recorded yet. They appear here as your reading of things changes.
          </p>
        ) : (
          <ol className="stack" style={{ gap: 'var(--space-4)' }}>
            {timeline.map((update) => {
              const supporting = update.supportingEvidenceIds
                .map((id) => evidenceById.get(id))
                .filter((entry) => entry !== undefined)
              const contradicting = update.contradictingEvidenceIds
                .map((id) => evidenceById.get(id))
                .filter((entry) => entry !== undefined)
              const sourceObservations = [
                ...new Set(
                  supporting.flatMap((entry) => [
                    ...entry.observationIds,
                    ...entry.supportingObservationIds,
                  ]),
                ),
              ]
              const rules = rulesFromEvidence(update.supportingEvidenceIds)
              const updatedBelief = beliefById.get(update.updatedBeliefId)

              return (
                <li key={update.id} className="model-step stack">
                  <p className="faint" style={{ margin: 0 }}>
                    {formatDateTime(update.createdAt)}
                  </p>

                  {update.previousStatement ? (
                    <div>
                      <span className="faint">Previous belief</span>
                      <p style={{ margin: 0 }}>{update.previousStatement}</p>
                    </div>
                  ) : (
                    <p className="faint" style={{ margin: 0 }}>
                      A first working model — nothing was replaced.
                    </p>
                  )}

                  {sourceObservations.length > 0 ? (
                    <div>
                      <span className="faint">Relevant experience</span>
                      <ul style={{ margin: 0 }}>
                        {sourceObservations.map((id) => (
                          <li key={id}>
                            {observationById.get(id)?.description ?? 'A removed observation'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {supporting.length > 0 ? (
                    <div>
                      <span className="faint">Evidence</span>
                      <ul style={{ margin: 0 }}>
                        {supporting.map((entry) => (
                          <li key={entry.id}>{entry.statement}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {contradicting.length > 0 ? (
                    <div>
                      <span className="faint">Evidence pointing the other way</span>
                      <ul style={{ margin: 0 }}>
                        {contradicting.map((entry) => (
                          <li key={entry.id}>{entry.statement}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <span className="faint">Updated belief</span>
                    <p style={{ margin: 0 }}>{update.updatedStatement}</p>
                  </div>

                  {update.reason ? (
                    <p className="faint" style={{ margin: 0 }}>
                      {tx('Why: {reason}', '原因：{reason}', { reason: update.reason })}
                    </p>
                  ) : null}

                  <div className="row">
                    <ConfidenceChip value={update.confidence} />
                    {updatedBelief ? (
                      <span className="chip">{BELIEF_STATUS_LABEL[updatedBelief.status]}</span>
                    ) : null}
                    {update.reviewAt ? (
                      <span className="chip">
                        Review {formatDate(update.reviewAt)}
                      </span>
                    ) : null}
                  </div>

                  {rules.length > 0 ? (
                    <div>
                      <span className="faint">Default rule</span>
                      <ul style={{ margin: 0 }}>
                        {rules.map((rule) => (
                          <li key={rule.id}>
                            {rule.defaultResponse}
                            <span className="faint">
                              {tx(' ({status})', '（{status}）', {
                                status: t(PERSONAL_RULE_STATUS_LABEL[rule.status]),
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="row">
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => setFocusId(update.updatedBeliefId)}
                    >
                      Show in graph
                    </button>
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => setBeliefDialog({ previousBeliefId: update.updatedBeliefId })}
                    >
                      This changed again
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="card stack">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Learning graph</h2>
          <div className="row">
            <button
              type="button"
              className="button button--small"
              aria-pressed={graphMode === 'learning'}
              onClick={() => setGraphMode('learning')}
            >
              Learning only
            </button>
            <button
              type="button"
              className="button button--small"
              aria-pressed={graphMode === 'combined'}
              onClick={() => setGraphMode('combined')}
            >
              Combined with plans
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="graph-focus">Centre on</label>
          <select
            id="graph-focus"
            className="select"
            value={focusId}
            onChange={(event) => setFocusId(event.target.value)}
          >
            <option value="">Choose a belief or rule</option>
            {focusOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="faint">
            One belief or rule at a time — the whole graph is unreadable long before it is
            useful.
          </span>
        </div>

        {focusId && graph.nodes.length > 0 ? (
          <LearningGraphView graph={graph} focusId={focusId} />
        ) : (
          <p className="faint">Pick something above to see how the records led to it.</p>
        )}
      </section>

      <section className="card stack">
        <h2>Beliefs</h2>
        {beliefs.length === 0 ? (
          <p className="faint">Nothing recorded yet.</p>
        ) : (
          <ul className="settings-list">
            {beliefs.map((belief) => (
              <li key={belief.id} className="settings-item stack">
                <div className="spread">
                  <p style={{ margin: 0 }}>{belief.statement}</p>
                  <span className="chip">{BELIEF_STATUS_LABEL[belief.status]}</span>
                </div>
                <div className="row">
                  <ConfidenceChip value={belief.confidence} />
                  {hasMixedSupport(belief) ? (
                    <span className="chip chip--should">Mixed evidence</span>
                  ) : null}
                </div>
                {belief.previousBeliefId ? (
                  <p className="faint" style={{ margin: 0 }}>
                    Replaced: {beliefById.get(belief.previousBeliefId)?.statement ?? 'an earlier belief'}
                  </p>
                ) : null}
                <div className="row">
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => setBeliefDialog({ previousBeliefId: belief.id })}
                  >
                    Record an update
                  </button>
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => setFocusId(belief.id)}
                  >
                    Show in graph
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HypothesesSection />

      <section className="card stack">
        <h2>Default rules</h2>
        {personalRules.length === 0 ? (
          <p className="faint">
            Nothing yet. A default comes out of something that has already worked more than once.
          </p>
        ) : (
          <ul className="settings-list">
            {personalRules.map((rule) => {
              const review = ruleNeedsReview(rule)
              return (
                <li key={rule.id} className="settings-item stack">
                  <div className="spread">
                    <p style={{ margin: 0 }}>
                      <strong>{rule.name}</strong>
                    </p>
                    <span className="chip">{PERSONAL_RULE_STATUS_LABEL[rule.status]}</span>
                  </div>
                  <p className="faint" style={{ margin: 0 }}>
                    {tx('Applies when: {text}', '适用情境：{text}', {
                      text: rule.triggerDescription,
                    })}
                  </p>
                  <p style={{ margin: 0 }}>{rule.defaultResponse}</p>
                  {rule.exceptionDescription ? (
                    <p className="faint" style={{ margin: 0 }}>
                      {tx('Not when: {text}', '以下情况不适用：{text}', {
                        text: rule.exceptionDescription,
                      })}
                    </p>
                  ) : null}
                  <div className="row">
                    <ConfidenceChip value={rule.confidence} />
                    <span className="chip">
                      {rule.evidenceIds.length} supporting ·{' '}
                      {(rule.contradictingEvidenceIds ?? []).length} against
                    </span>
                    {rule.lastUsedAt ? (
                      <span className="chip">
                        Last used {formatDate(rule.lastUsedAt)}
                      </span>
                    ) : null}
                  </div>
                  {review.due ? (
                    <p className="notice notice--warning" style={{ margin: 0 }}>
                      {review.reason ?? MIXED_EVIDENCE_NOTICE}
                    </p>
                  ) : null}
                  <div className="row">
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() =>
                        useStore
                          .getState()
                          .updatePersonalRule(rule.id, { lastUsedAt: nowIso() })
                      }
                    >
                      I used this
                    </button>
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => setRuleDialog({ rule, mode: 'edit' })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => setRuleDialog({ rule, mode: 'replace' })}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => setFocusId(rule.id)}
                    >
                      Show in graph
                    </button>
                    <ConfirmButton
                      label="Retire"
                      confirmLabel="Confirm retire"
                      onConfirm={() =>
                        useStore
                          .getState()
                          .updatePersonalRule(rule.id, { status: 'retired' })
                      }
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {beliefDialog ? (
        <BeliefUpdateDialog
          previousBeliefId={beliefDialog.previousBeliefId}
          onClose={() => setBeliefDialog(null)}
        />
      ) : null}
      {ruleDialog ? (
        <PersonalRuleDialog
          rule={ruleDialog.rule}
          mode={ruleDialog.mode}
          onClose={() => setRuleDialog(null)}
        />
      ) : null}
    </div>
  )
}

/** Create, edit, and retire the things the user is deliberately testing. */
function HypothesesSection() {
  const hypotheses = useHypotheses()
  const addHypothesis = useStore((state) => state.addHypothesis)
  const updateHypothesis = useStore((state) => state.updateHypothesis)
  const deleteHypothesis = useStore((state) => state.deleteHypothesis)
  const showToast = useStore((state) => state.showToast)

  const [statement, setStatement] = useState('')
  const [confidence, setConfidence] = useState<ConfidenceLevel>('veryLow')
  const [goalIds, setGoalIds] = useState<string[]>([])

  const create = () => {
    const id = addHypothesis({ statement, relatedGoalIds: goalIds, confidence })
    if (!id) {
      showToast('Write the hypothesis first.')
      return
    }
    setStatement('')
    setGoalIds([])
    showToast('Hypothesis saved as untested.')
  }

  return (
    <section className="card stack">
      <h2>Hypotheses</h2>
      <p className="faint">Something you want to try, phrased so you would notice the answer.</p>

      {hypotheses.length > 0 ? (
        <ul className="settings-list">
          {hypotheses.map((hypothesis) => (
            <li key={hypothesis.id} className="settings-item stack">
              <p style={{ margin: 0 }}>{hypothesis.statement}</p>
              <div className="row">
                <ConfidenceChip value={hypothesis.confidence} />
                <span className="chip">
                  {hypothesis.evidenceIds.length} supporting ·{' '}
                  {(hypothesis.contradictingEvidenceIds ?? []).length} against
                </span>
              </div>
              <div className="row">
                <div className="field" style={{ flex: '1 1 14rem' }}>
                  <label htmlFor={`hyp-status-${hypothesis.id}`}>Status</label>
                  <select
                    id={`hyp-status-${hypothesis.id}`}
                    className="select"
                    value={hypothesis.status}
                    onChange={(event) =>
                      updateHypothesis(hypothesis.id, {
                        status: event.target.value as HypothesisStatus,
                      })
                    }
                  >
                    {HYPOTHESIS_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {HYPOTHESIS_STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <ConfirmButton
                  label="Delete"
                  confirmLabel="Confirm delete"
                  onConfirm={() => deleteHypothesis(hypothesis.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="field">
        <label htmlFor="hypothesis-statement">New hypothesis</label>
        <textarea
          id="hypothesis-statement"
          className="textarea"
          value={statement}
          placeholder="If I make a good-enough decision within ten minutes, I may keep more energy."
          onChange={(event) => setStatement(event.target.value)}
        />
      </div>
      <ThoughtLinkPicker
        label="Related values or goals"
        selectedIds={goalIds}
        onChange={setGoalIds}
      />
      <ConfidenceSelect value={confidence} onChange={setConfidence} />
      <div className="row">
        <button
          type="button"
          className="button button--primary"
          disabled={statement.trim().length === 0}
          onClick={create}
        >
          Add hypothesis
        </button>
      </div>
    </section>
  )
}
