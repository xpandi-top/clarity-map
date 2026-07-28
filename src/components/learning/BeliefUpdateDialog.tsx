import { useMemo, useState } from 'react'
import { Dialog } from '../common/Dialog'
import { ConfidenceSelect } from './ConfidenceSelect'
import { RecordPicker } from './RecordPicker'
import { ThoughtLinkPicker } from './ThoughtLinkPicker'
import type { ConfidenceLevel } from '../../domain/types'
import { useBeliefs, useEvidence, useStore } from '../../store'
import { tx } from '../../i18n/core'

interface BeliefUpdateDialogProps {
  /** The belief being revised. Leave empty to record a first working model. */
  previousBeliefId?: string
  presetEvidenceIds?: string[]
  presetThoughtIds?: string[]
  onClose: () => void
  onDone?: (beliefId: string) => void
}

/**
 * Records a change of working model. The previous belief is kept and marked
 * replaced — the history is the point, so nothing here overwrites anything.
 */
export function BeliefUpdateDialog({
  previousBeliefId,
  presetEvidenceIds = [],
  presetThoughtIds = [],
  onClose,
  onDone,
}: BeliefUpdateDialogProps) {
  const beliefs = useBeliefs()
  const evidence = useEvidence()
  const recordBeliefUpdate = useStore((state) => state.recordBeliefUpdate)
  const showToast = useStore((state) => state.showToast)

  const [previousId, setPreviousId] = useState(previousBeliefId ?? '')
  const [statement, setStatement] = useState('')
  const [reason, setReason] = useState('')
  const [supportingIds, setSupportingIds] = useState<string[]>(presetEvidenceIds)
  const [contradictingIds, setContradictingIds] = useState<string[]>([])
  const [thoughtIds, setThoughtIds] = useState<string[]>(presetThoughtIds)
  const [confidence, setConfidence] = useState<ConfidenceLevel>('low')
  const [reviewAt, setReviewAt] = useState('')

  const previous = beliefs.find((belief) => belief.id === previousId) ?? null

  const evidenceOptions = useMemo(
    () =>
      evidence.map((entry) => ({
        id: entry.id,
        label: entry.statement,
        meta: (() => {
          const count =
            entry.supportingObservationIds.length || entry.observationIds.length
          return tx(
            count === 1 ? '{count} observation' : '{count} observations',
            '{count} 条观察',
            { count },
          )
        })(),
      })),
    [evidence],
  )

  const openBeliefs = useMemo(
    () => beliefs.filter((belief) => belief.status !== 'replaced'),
    [beliefs],
  )

  const save = () => {
    const id = recordBeliefUpdate({
      previousBeliefId: previousId || undefined,
      updatedStatement: statement,
      reason,
      supportingEvidenceIds: supportingIds,
      contradictingEvidenceIds: contradictingIds,
      confidence,
      relatedThoughtIds: thoughtIds,
      reviewAt: reviewAt || undefined,
    })
    if (!id) {
      showToast('Write the updated belief first.')
      return
    }
    showToast('Belief update recorded. The previous belief is kept in your history.')
    onDone?.(id)
    onClose()
  }

  return (
    <Dialog
      title="Update a belief"
      variant="modal"
      onClose={onClose}
      footer={
        <div className="row">
          <button
            type="button"
            className="button button--primary"
            disabled={statement.trim().length === 0}
            onClick={save}
          >
            Record this update
          </button>
          <button type="button" className="button button--quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      }
    >
      <div className="stack">
        <p className="faint">
          The earlier belief stays in your history. Nothing here is deleted or corrected — it is
          recorded as a change.
        </p>

        <div className="field">
          <label htmlFor="belief-previous">Which belief is changing?</label>
          <select
            id="belief-previous"
            className="select"
            value={previousId}
            onChange={(event) => setPreviousId(event.target.value)}
          >
            <option value="">None — this is a new working model</option>
            {openBeliefs.map((belief) => (
              <option key={belief.id} value={belief.id}>
                {belief.statement}
              </option>
            ))}
          </select>
        </div>

        {previous ? (
          <div className="notice">
            <span className="faint">Previous belief</span>
            <p style={{ margin: 0 }}>{previous.statement}</p>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="belief-statement">Updated belief</label>
          <textarea
            id="belief-statement"
            className="textarea"
            value={statement}
            placeholder="What do you currently think is going on?"
            onChange={(event) => setStatement(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="belief-reason">Why did it change?</label>
          <textarea
            id="belief-reason"
            className="textarea"
            value={reason}
            placeholder="What happened, or what did you notice?"
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <RecordPicker
          label="Evidence that supports the updated belief"
          options={evidenceOptions}
          selectedIds={supportingIds}
          onChange={setSupportingIds}
          emptyText="You have not written any evidence yet."
        />

        <RecordPicker
          label="Evidence that points the other way"
          options={evidenceOptions}
          selectedIds={contradictingIds}
          onChange={setContradictingIds}
          hint="Contradictory records stay visible. A belief can be active and uncertain at once."
          emptyText="You have not written any evidence yet."
        />

        <ThoughtLinkPicker
          label="Where does this apply?"
          selectedIds={thoughtIds}
          onChange={setThoughtIds}
          hint="Optional. Linked thoughts show this belief in their detail panel."
        />

        <ConfidenceSelect value={confidence} onChange={setConfidence} />

        <div className="field">
          <label htmlFor="belief-review">Look at this again on</label>
          <input
            id="belief-review"
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
