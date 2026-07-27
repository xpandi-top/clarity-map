import { useMemo, useState } from 'react'
import { Dialog } from '../common/Dialog'
import { buildChecklistMarkdown, collectChecklistItems } from '../../domain/checklist'
import type { Thought, ThoughtRelation } from '../../domain/types'

interface ChecklistDialogProps {
  thoughts: Thought[]
  relations: ThoughtRelation[]
  rootId: string
  rootText: string
  onClose: () => void
  onCopied: (message: string) => void
}

function filename(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'roadmap'}-checklist.md`
}

/**
 * Turns a finished roadmap into a Markdown checklist that can be copied,
 * downloaded, or printed.
 */
export function ChecklistDialog({
  thoughts,
  relations,
  rootId,
  rootText,
  onClose,
  onCopied,
}: ChecklistDialogProps) {
  const [onlyActionable, setOnlyActionable] = useState(false)
  const [includeTypes, setIncludeTypes] = useState(true)
  const [includeStatus, setIncludeStatus] = useState(false)

  const items = useMemo(
    () => collectChecklistItems(thoughts, relations, rootId),
    [thoughts, relations, rootId],
  )

  const markdown = useMemo(
    () =>
      buildChecklistMarkdown(thoughts, relations, rootId, {
        onlyActionable,
        includeTypes,
        includeStatus,
        generatedAt: new Date().toLocaleDateString(),
      }),
    [thoughts, relations, rootId, onlyActionable, includeTypes, includeStatus],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      onCopied('Checklist copied.')
    } catch {
      onCopied('Copying was blocked. Select the text and copy it manually.')
    }
  }

  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename(rootText)
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    onCopied('Checklist downloaded.')
  }

  return (
    <Dialog
      title="Checklist"
      variant="modal"
      onClose={onClose}
      footer={
        <div className="row">
          <button type="button" className="button button--primary" onClick={copy}>
            Copy Markdown
          </button>
          <button type="button" className="button" onClick={download}>
            Download .md
          </button>
          <button type="button" className="button" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="button button--quiet" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          {items.length - 1} thought{items.length - 1 === 1 ? '' : 's'} beneath “{rootText}”.
          Completed thoughts come through already ticked.
        </p>

        <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0, gap: 'var(--space-1)' }}>
          <legend className="label">Include</legend>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={onlyActionable}
              onChange={(event) => setOnlyActionable(event.target.checked)}
            />
            <span>Only actions and habits, as a flat list</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={includeTypes}
              onChange={(event) => setIncludeTypes(event.target.checked)}
            />
            <span>Thought types</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={includeStatus}
              onChange={(event) => setIncludeStatus(event.target.checked)}
            />
            <span>Status, when not active</span>
          </label>
        </fieldset>

        <div className="field">
          <label htmlFor="checklist-markdown">Markdown</label>
          <textarea
            id="checklist-markdown"
            className="textarea checklist-source"
            readOnly
            rows={14}
            value={markdown}
          />
        </div>

        {/* Only this block reaches the printer; see the print rules in CSS. */}
        <div className="checklist-print" aria-hidden="true">
          <h1>{rootText}</h1>
          <ul>
            {(onlyActionable
              ? items.slice(1).filter((item) => ['action', 'habit'].includes(item.thought.type))
              : items.slice(1)
            ).map((item) => (
              <li
                key={item.thought.id}
                style={{ marginLeft: `${(onlyActionable ? 1 : item.depth) - 1}rem` }}
              >
                <span className="checklist-print__box">{item.done ? '☑' : '☐'}</span>{' '}
                {item.thought.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Dialog>
  )
}
