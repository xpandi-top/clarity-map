import { useMemo, useState } from 'react'
import { Dialog } from '../common/Dialog'
import { ConfidenceSelect } from './ConfidenceSelect'
import { RecordPicker } from './RecordPicker'
import { ThoughtLinkPicker } from './ThoughtLinkPicker'
import { createId } from '../../domain/ids'
import { PERSONAL_RULE_STATUSES, PERSONAL_RULE_STATUS_LABEL } from '../../domain/learning'
import type {
  ConfidenceLevel,
  PersonalDefaultRule,
  PersonalRuleStatus,
} from '../../domain/types'
import { useEvidence, useStore } from '../../store'

interface PersonalRuleDialogProps {
  /** Editing an existing rule, or writing a replacement for one. */
  rule?: PersonalDefaultRule
  mode?: 'create' | 'edit' | 'replace'
  presetEvidenceIds?: string[]
  presetThoughtIds?: string[]
  onClose: () => void
  onDone?: (ruleId: string) => void
}

/**
 * A default the user is trying, not an instruction. The wording of every
 * label here stays on the "try this first" side; "must", "always", and
 * "failure" have no place in a record of what has helped before.
 */
export function PersonalRuleDialog({
  rule,
  mode = 'create',
  presetEvidenceIds = [],
  presetThoughtIds = [],
  onClose,
  onDone,
}: PersonalRuleDialogProps) {
  const evidence = useEvidence()
  const addPersonalRule = useStore((state) => state.addPersonalRule)
  const updatePersonalRule = useStore((state) => state.updatePersonalRule)
  const replacePersonalRule = useStore((state) => state.replacePersonalRule)
  const showToast = useStore((state) => state.showToast)

  const [name, setName] = useState(rule?.name ?? '')
  const [trigger, setTrigger] = useState(rule?.triggerDescription ?? '')
  const [conditions, setConditions] = useState<string[]>(
    rule?.conditions.map((condition) => condition.description) ?? [''],
  )
  const [response, setResponse] = useState(rule?.defaultResponse ?? '')
  const [exception, setException] = useState(rule?.exceptionDescription ?? '')
  const [evidenceIds, setEvidenceIds] = useState<string[]>(
    rule?.evidenceIds ?? presetEvidenceIds,
  )
  const [contradictingIds, setContradictingIds] = useState<string[]>(
    rule?.contradictingEvidenceIds ?? [],
  )
  const [thoughtIds, setThoughtIds] = useState<string[]>(
    rule
      ? [...rule.relatedGoalIds, ...(rule.relatedThoughtIds ?? [])]
      : presetThoughtIds,
  )
  const [confidence, setConfidence] = useState<ConfidenceLevel>(rule?.confidence ?? 'veryLow')
  const [status, setStatus] = useState<PersonalRuleStatus>(
    mode === 'edit' ? (rule?.status ?? 'experimental') : 'experimental',
  )
  const [reviewAt, setReviewAt] = useState(rule?.reviewAt?.slice(0, 10) ?? '')

  const evidenceOptions = useMemo(
    () => evidence.map((entry) => ({ id: entry.id, label: entry.statement })),
    [evidence],
  )

  const save = () => {
    const payload = {
      name: name.trim(),
      triggerDescription: trigger.trim(),
      conditions: conditions
        .map((description) => description.trim())
        .filter(Boolean)
        .map((description) => ({ id: createId('pcond'), description })),
      defaultResponse: response.trim(),
      exceptionDescription: exception.trim() || undefined,
      evidenceIds,
      contradictingEvidenceIds: contradictingIds,
      relatedThoughtIds: thoughtIds,
      confidence,
      status,
      reviewAt: reviewAt || undefined,
    }

    if (mode === 'edit' && rule) {
      updatePersonalRule(rule.id, payload)
      showToast('Rule updated.')
      onDone?.(rule.id)
      onClose()
      return
    }

    const id =
      mode === 'replace' && rule
        ? replacePersonalRule(rule.id, payload)
        : addPersonalRule(payload)

    if (!id) {
      showToast('A rule needs a name and a default response.')
      return
    }
    showToast(
      mode === 'replace'
        ? 'Replacement saved. The earlier rule is kept and linked to it.'
        : 'Default rule saved as experimental.',
    )
    onDone?.(id)
    onClose()
  }

  const title =
    mode === 'edit' ? 'Edit default rule' : mode === 'replace' ? 'Replace this rule' : 'Create a default rule'

  return (
    <Dialog
      title={title}
      variant="modal"
      onClose={onClose}
      footer={
        <div className="row">
          <button
            type="button"
            className="button button--primary"
            disabled={name.trim().length === 0 || response.trim().length === 0}
            onClick={save}
          >
            Save
          </button>
          <button type="button" className="button button--quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      }
    >
      <div className="stack">
        <p className="faint">
          A default is a starting point you can try and then reassess — not a rule you have to
          obey.
        </p>

        <div className="field">
          <label htmlFor="rule-name">Name</label>
          <input
            id="rule-name"
            className="input"
            value={name}
            placeholder="Short enough to recognise later"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="rule-trigger">When does this apply?</label>
          <textarea
            id="rule-trigger"
            className="textarea"
            value={trigger}
            placeholder="My energy is low and I have been deliberating for a while"
            onChange={(event) => setTrigger(event.target.value)}
          />
        </div>

        <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="label">Conditions</legend>
          <span className="faint">Optional. One recognisable signal each.</span>
          {conditions.map((condition, index) => (
            <div key={index} className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                className="input"
                value={condition}
                aria-label={`Condition ${index + 1}`}
                onChange={(event) =>
                  setConditions((current) =>
                    current.map((entry, position) =>
                      position === index ? event.target.value : entry,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="button button--quiet button--small"
                aria-label={`Remove condition ${index + 1}`}
                onClick={() =>
                  setConditions((current) => current.filter((_, position) => position !== index))
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button button--small"
            onClick={() => setConditions((current) => [...current, ''])}
          >
            Add a condition
          </button>
        </fieldset>

        <div className="field">
          <label htmlFor="rule-response">Default response</label>
          <textarea
            id="rule-response"
            className="textarea"
            value={response}
            placeholder="Try choosing a good-enough option, then reassess afterwards"
            onChange={(event) => setResponse(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="rule-exception">When might this not apply?</label>
          <textarea
            id="rule-exception"
            className="textarea"
            value={exception}
            placeholder="Optional. For example: not when the decision has major consequences."
            onChange={(event) => setException(event.target.value)}
          />
        </div>

        <RecordPicker
          label="Evidence behind this default"
          options={evidenceOptions}
          selectedIds={evidenceIds}
          onChange={setEvidenceIds}
          emptyText="You have not written any evidence yet."
        />

        <RecordPicker
          label="Evidence that points the other way"
          options={evidenceOptions}
          selectedIds={contradictingIds}
          onChange={setContradictingIds}
          hint="Kept visible. A default with mixed evidence is flagged rather than hidden."
          emptyText="You have not written any evidence yet."
        />

        <ThoughtLinkPicker
          label="Related values, goals, or habits"
          selectedIds={thoughtIds}
          onChange={setThoughtIds}
          hint="Optional. Linked thoughts show this default in their detail panel."
        />

        <ConfidenceSelect value={confidence} onChange={setConfidence} />

        {mode === 'edit' ? (
          <div className="field">
            <label htmlFor="rule-status">Status</label>
            <select
              id="rule-status"
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value as PersonalRuleStatus)}
            >
              {PERSONAL_RULE_STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {PERSONAL_RULE_STATUS_LABEL[entry]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="rule-review">Look at this again on</label>
          <input
            id="rule-review"
            className="input"
            type="date"
            value={reviewAt}
            onChange={(event) => setReviewAt(event.target.value)}
          />
          <span className="faint">Optional.</span>
        </div>
      </div>
    </Dialog>
  )
}
