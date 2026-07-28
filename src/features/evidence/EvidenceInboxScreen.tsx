import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BeliefUpdateDialog } from '../../components/learning/BeliefUpdateDialog'
import { ConfidenceChip } from '../../components/learning/ConfidenceSelect'
import { PersonalRuleDialog } from '../../components/learning/PersonalRuleDialog'
import { nowIso } from '../../domain/ids'
import {
  EVIDENCE_STATUS_LABEL,
  PERSONAL_RULE_STATUS_LABEL,
  derivedEvidenceStatus,
} from '../../domain/learning'
import type { Evidence, Observation } from '../../domain/types'
import {
  useBeliefs,
  useEvidence,
  useHypotheses,
  useLearningInbox,
  useObservations,
  useStore,
  useThoughts,
} from '../../store'

const UNRESOLVED_TAG = 'unresolved'

/**
 * Everything recorded but not yet made sense of.
 *
 * The point is to make patterns visible without asking for a conclusion:
 * "mark as unresolved" is a first-class answer here, and nothing is
 * interpreted automatically.
 */
export function EvidenceInboxScreen() {
  const inbox = useLearningInbox()
  const observations = useObservations()
  const evidence = useEvidence()
  const beliefs = useBeliefs()
  const hypotheses = useHypotheses()
  const thoughts = useThoughts()

  const [beliefDialog, setBeliefDialog] = useState<{ evidenceIds: string[] } | null>(null)
  const [ruleDialog, setRuleDialog] = useState<{ evidenceIds: string[] } | null>(null)

  const observationById = useMemo(
    () => new Map(observations.map((observation) => [observation.id, observation])),
    [observations],
  )
  const thoughtById = useMemo(
    () => new Map(thoughts.map((thought) => [thought.id, thought])),
    [thoughts],
  )

  const archivedCount = observations.filter((observation) => observation.archivedAt).length

  return (
    <div className="stack">
      <div className="screen-header spread">
        <div>
          <h1>Evidence</h1>
          <p>
            What you have written down, and what has not been made sense of yet. Nothing here
            needs a conclusion today.
          </p>
        </div>
        <div className="row">
          <Link className="button button--primary" to="/reflect">
            Record something
          </Link>
          <Link className="button" to="/model">
            Model history
          </Link>
        </div>
      </div>

      {observations.length === 0 && evidence.length === 0 ? (
        <p className="empty-state">
          Nothing recorded yet. Start on the <Link to="/reflect">Reflect</Link> screen.
        </p>
      ) : null}

      <Section
        title="Observations awaiting interpretation"
        hint="Linked to something, but you have not yet said what it may indicate."
        empty="Nothing waiting."
      >
        {inbox.awaitingInterpretation.map((observation) => (
          <ObservationRow
            key={observation.id}
            observation={observation}
            thoughtLabels={observation.relatedThoughtIds
              .map((id) => thoughtById.get(id)?.text)
              .filter((text): text is string => Boolean(text))}
            onCreateBeliefUpdate={(evidenceIds) => setBeliefDialog({ evidenceIds })}
            onCreateRule={(evidenceIds) => setRuleDialog({ evidenceIds })}
          />
        ))}
      </Section>

      <Section
        title="Unlinked observations"
        hint="Recorded, but not attached to a thought or an interpretation."
        empty="Nothing loose."
      >
        {inbox.unlinkedObservations.map((observation) => (
          <ObservationRow
            key={observation.id}
            observation={observation}
            thoughtLabels={[]}
            onCreateBeliefUpdate={(evidenceIds) => setBeliefDialog({ evidenceIds })}
            onCreateRule={(evidenceIds) => setRuleDialog({ evidenceIds })}
          />
        ))}
      </Section>

      <Section
        title="Recent observations"
        hint="The last ten, whatever has become of them."
        empty="Nothing recorded yet."
      >
        {inbox.recentObservations.map((observation) => (
          <li key={observation.id} className="settings-item">
            <p style={{ margin: 0 }}>{observation.description}</p>
            <p className="faint" style={{ margin: 0 }}>
              {new Date(observation.occurredAt).toLocaleString()}
              {observation.context.tags.length > 0
                ? ` · ${observation.context.tags.join(', ')}`
                : ''}
            </p>
          </li>
        ))}
      </Section>

      <Section
        title="Evidence with weak support"
        hint="One observation, or none. Worth holding lightly."
        empty="Nothing thin."
      >
        {inbox.weaklySupported.map((entry) => (
          <EvidenceRow
            key={entry.id}
            evidence={entry}
            observationById={observationById}
            onCreateBeliefUpdate={() => setBeliefDialog({ evidenceIds: [entry.id] })}
            onCreateRule={() => setRuleDialog({ evidenceIds: [entry.id] })}
          />
        ))}
      </Section>

      <Section
        title="Contradictory evidence"
        hint="Records that disagree with each other. Both are kept."
        empty="Nothing contradictory recorded."
      >
        {inbox.contradictory.map((entry) => (
          <EvidenceRow
            key={entry.id}
            evidence={entry}
            observationById={observationById}
            onCreateBeliefUpdate={() => setBeliefDialog({ evidenceIds: [entry.id] })}
            onCreateRule={() => setRuleDialog({ evidenceIds: [entry.id] })}
          />
        ))}
      </Section>

      <Section
        title="Beliefs that may need review"
        hint="Uncertain, mixed, or resting on nothing you have written down."
        empty="Nothing flagged."
      >
        {inbox.beliefsNeedingReview.map(({ belief, reason }) => (
          <li key={belief.id} className="settings-item stack">
            <div className="spread">
              <p style={{ margin: 0 }}>{belief.statement}</p>
              <ConfidenceChip value={belief.confidence} />
            </div>
            <p className="faint" style={{ margin: 0 }}>
              {reason}
            </p>
            <div className="row">
              <button
                type="button"
                className="button button--small"
                onClick={() => setBeliefDialog({ evidenceIds: belief.evidenceIds })}
              >
                Record an update
              </button>
            </div>
          </li>
        ))}
      </Section>

      <Section
        title="Rules awaiting review"
        hint="Experimental defaults, and any whose evidence has since disagreed."
        empty="Nothing due."
      >
        {inbox.rulesAwaitingReview.map(({ rule, reason }) => (
          <li key={rule.id} className="settings-item stack">
            <div className="spread">
              <p style={{ margin: 0 }}>
                <strong>{rule.name}</strong>
              </p>
              <span className="chip">{PERSONAL_RULE_STATUS_LABEL[rule.status]}</span>
            </div>
            <p style={{ margin: 0 }}>{rule.defaultResponse}</p>
            <p className="faint" style={{ margin: 0 }}>
              {reason}
            </p>
            <div className="row">
              <Link className="button button--small" to="/model">
                Open in model history
              </Link>
            </div>
          </li>
        ))}
      </Section>

      {beliefs.length === 0 && hypotheses.length === 0 ? null : (
        <p className="faint">
          {beliefs.length} belief{beliefs.length === 1 ? '' : 's'} · {hypotheses.length} hypothes
          {hypotheses.length === 1 ? 'is' : 'es'} · {archivedCount} archived observation
          {archivedCount === 1 ? '' : 's'}
        </p>
      )}

      {beliefDialog ? (
        <BeliefUpdateDialog
          presetEvidenceIds={beliefDialog.evidenceIds}
          onClose={() => setBeliefDialog(null)}
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

function Section({
  title,
  hint,
  empty,
  children,
}: {
  title: string
  hint: string
  empty: string
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children
  const count = Array.isArray(items) ? items.length : items ? 1 : 0
  return (
    <section className="card stack">
      <div className="spread">
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span className="chip">{count}</span>
      </div>
      <p className="faint" style={{ margin: 0 }}>
        {hint}
      </p>
      {count === 0 ? (
        <p className="faint" style={{ margin: 0 }}>
          {empty}
        </p>
      ) : (
        <ul className="settings-list">{items}</ul>
      )}
    </section>
  )
}

interface ObservationRowProps {
  observation: Observation
  thoughtLabels: string[]
  onCreateBeliefUpdate: (evidenceIds: string[]) => void
  onCreateRule: (evidenceIds: string[]) => void
}

function ObservationRow({
  observation,
  thoughtLabels,
  onCreateBeliefUpdate,
  onCreateRule,
}: ObservationRowProps) {
  const beliefs = useBeliefs()
  const hypotheses = useHypotheses()
  const addEvidence = useStore((state) => state.addEvidence)
  const updateObservation = useStore((state) => state.updateObservation)
  const updateBelief = useStore((state) => state.updateBelief)
  const updateHypothesis = useStore((state) => state.updateHypothesis)
  const showToast = useStore((state) => state.showToast)

  const [statement, setStatement] = useState('')
  const [beliefId, setBeliefId] = useState('')
  const [hypothesisId, setHypothesisId] = useState('')
  const [open, setOpen] = useState(false)

  /** Turns this observation into a reading, and links it where asked. */
  const interpret = (then: 'stay' | 'belief' | 'rule') => {
    const evidenceId = addEvidence({
      statement,
      observationIds: [observation.id],
      supportingObservationIds: [observation.id],
      relatedThoughtIds: observation.relatedThoughtIds,
      context: observation.context,
    })
    if (!evidenceId) {
      showToast('Write what this may indicate first.')
      return
    }

    if (beliefId) {
      const belief = beliefs.find((entry) => entry.id === beliefId)
      if (belief) {
        updateBelief(beliefId, { evidenceIds: [...belief.evidenceIds, evidenceId] })
      }
    }
    if (hypothesisId) {
      const hypothesis = hypotheses.find((entry) => entry.id === hypothesisId)
      if (hypothesis) {
        updateHypothesis(hypothesisId, {
          evidenceIds: [...hypothesis.evidenceIds, evidenceId],
          status: 'partiallySupported',
        })
      }
    }

    setStatement('')
    setOpen(false)
    showToast('Evidence created.')
    if (then === 'belief') onCreateBeliefUpdate([evidenceId])
    if (then === 'rule') onCreateRule([evidenceId])
  }

  const unresolved = observation.context.tags.includes(UNRESOLVED_TAG)

  return (
    <li className="settings-item stack">
      <p style={{ margin: 0 }}>{observation.description}</p>
      <p className="faint" style={{ margin: 0 }}>
        {new Date(observation.occurredAt).toLocaleString()}
        {thoughtLabels.length > 0 ? ` · ${thoughtLabels.join(', ')}` : ''}
        {observation.context.tags.length > 0
          ? ` · ${observation.context.tags.join(', ')}`
          : ''}
      </p>

      {open ? (
        <div className="stack">
          <div className="field">
            <label htmlFor={`interpret-${observation.id}`}>What might this indicate?</label>
            <textarea
              id={`interpret-${observation.id}`}
              className="textarea"
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor={`belief-${observation.id}`}>Link to a belief</label>
              <select
                id={`belief-${observation.id}`}
                className="select"
                value={beliefId}
                onChange={(event) => setBeliefId(event.target.value)}
              >
                <option value="">None</option>
                {beliefs
                  .filter((belief) => belief.status !== 'replaced')
                  .map((belief) => (
                    <option key={belief.id} value={belief.id}>
                      {belief.statement}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`hypothesis-${observation.id}`}>Add to a hypothesis</label>
              <select
                id={`hypothesis-${observation.id}`}
                className="select"
                value={hypothesisId}
                onChange={(event) => setHypothesisId(event.target.value)}
              >
                <option value="">None</option>
                {hypotheses.map((hypothesis) => (
                  <option key={hypothesis.id} value={hypothesis.id}>
                    {hypothesis.statement}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <button
              type="button"
              className="button button--primary button--small"
              disabled={statement.trim().length === 0}
              onClick={() => interpret('stay')}
            >
              Create evidence
            </button>
            <button
              type="button"
              className="button button--small"
              disabled={statement.trim().length === 0}
              onClick={() => interpret('belief')}
            >
              …then update a belief
            </button>
            <button
              type="button"
              className="button button--small"
              disabled={statement.trim().length === 0}
              onClick={() => interpret('rule')}
            >
              …then write a default
            </button>
            <button
              type="button"
              className="button button--quiet button--small"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button type="button" className="button button--small" onClick={() => setOpen(true)}>
            Interpret this
          </button>
          <button
            type="button"
            className="button button--small"
            aria-pressed={unresolved}
            onClick={() =>
              updateObservation(observation.id, {
                context: {
                  ...observation.context,
                  tags: unresolved
                    ? observation.context.tags.filter((tag) => tag !== UNRESOLVED_TAG)
                    : [...observation.context.tags, UNRESOLVED_TAG],
                },
              })
            }
          >
            {unresolved ? 'Unmark unresolved' : 'Mark as unresolved'}
          </button>
          <button
            type="button"
            className="button button--quiet button--small"
            onClick={() => {
              updateObservation(observation.id, { archivedAt: nowIso() })
              showToast('Archived. It stays in your records and in exports.')
            }}
          >
            Archive
          </button>
        </div>
      )}
    </li>
  )
}

function EvidenceRow({
  evidence,
  observationById,
  onCreateBeliefUpdate,
  onCreateRule,
}: {
  evidence: Evidence
  observationById: Map<string, Observation>
  onCreateBeliefUpdate: () => void
  onCreateRule: () => void
}) {
  const sources = [
    ...new Set([...evidence.observationIds, ...evidence.supportingObservationIds]),
  ]
  const against = evidence.contradictingObservationIds

  return (
    <li className="settings-item stack">
      <div className="spread">
        <p style={{ margin: 0 }}>{evidence.statement}</p>
        <span className="chip">
          {EVIDENCE_STATUS_LABEL[derivedEvidenceStatus(evidence)]}
        </span>
      </div>
      <ConfidenceChip value={evidence.confidence} />

      {sources.length > 0 ? (
        <details>
          <summary>Supporting observations ({sources.length})</summary>
          <ul>
            {sources.map((id) => (
              <li key={id}>{observationById.get(id)?.description ?? 'A removed observation'}</li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="faint" style={{ margin: 0 }}>
          No observation is attached to this yet.
        </p>
      )}

      {against.length > 0 ? (
        <details>
          <summary>Observations that point the other way ({against.length})</summary>
          <ul>
            {against.map((id) => (
              <li key={id}>{observationById.get(id)?.description ?? 'A removed observation'}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="row">
        <button type="button" className="button button--small" onClick={onCreateBeliefUpdate}>
          Create a belief update
        </button>
        <button type="button" className="button button--small" onClick={onCreateRule}>
          Create a default rule
        </button>
      </div>
    </li>
  )
}
