import { useMemo, useState } from 'react'
import { Dialog } from '../common/Dialog'
import { RELATION_LABEL, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import {
  TYPE_GROUPS,
  TYPE_GROUP_STYLE,
  groupLabelOfType,
  styleOfType,
} from '../../domain/typeMap'
import type { RelationType, ThoughtType } from '../../domain/types'
import { useStore, useThought, useRelations, useThoughts } from '../../store'
import { t, tx } from '../../i18n/core'

interface Step {
  prompt: string
  helper: string
  type: ThoughtType
  relation: RelationType
}

type TemplateId = 'goal' | 'habit' | 'decision'

const TEMPLATES: Record<TemplateId, { label: string; shape: string; steps: Step[] }> = {
  goal: {
    label: 'Goal',
    shape: 'Goal → Milestone → Project → Action',
    steps: [
      {
        prompt: 'What would completion look like?',
        helper: 'One observable finished state.',
        type: 'outcome',
        relation: 'serves',
      },
      {
        prompt: 'What intermediate outcomes are needed?',
        helper: 'Add them one at a time.',
        type: 'milestone',
        relation: 'milestoneOf',
      },
      {
        prompt: 'Which projects produce those outcomes?',
        helper: 'A finite body of work.',
        type: 'project',
        relation: 'serves',
      },
      {
        prompt: 'Which actions are required?',
        helper: 'Something you could start directly.',
        type: 'action',
        relation: 'serves',
      },
      {
        prompt: 'Which repeated actions should become habits?',
        helper: 'Behaviour you would repeat.',
        type: 'habit',
        relation: 'serves',
      },
      {
        prompt: 'What is the smallest next action?',
        helper: 'Small enough to start today.',
        type: 'action',
        relation: 'serves',
      },
    ],
  },
  habit: {
    label: 'Habit',
    shape: 'Desired state → Habit → Trigger → Minimum version',
    steps: [
      {
        prompt: 'What is the desired state?',
        helper: 'What this habit is for.',
        type: 'outcome',
        relation: 'serves',
      },
      {
        prompt: 'What is the habit itself?',
        helper: 'The repeated behaviour.',
        type: 'habit',
        relation: 'serves',
      },
      {
        prompt: 'What is the trigger?',
        helper: 'What already happens that this can follow.',
        type: 'action',
        relation: 'prerequisiteFor',
      },
      {
        prompt: 'What is the minimum version?',
        helper: 'The version you could still do on a bad day.',
        type: 'action',
        relation: 'serves',
      },
    ],
  },
  decision: {
    label: 'Decision',
    shape: 'Decision → Options → Criteria → Next experiment',
    steps: [
      {
        prompt: 'What are the options?',
        helper: 'Add each option separately.',
        type: 'idea',
        relation: 'serves',
      },
      {
        prompt: 'What criteria matter?',
        helper: 'What would make one option better.',
        type: 'note',
        relation: 'relatedTo',
      },
      {
        prompt: 'What is the next experiment?',
        helper: 'Something small that would tell you more.',
        type: 'action',
        relation: 'serves',
      },
    ],
  },
}

/** "an outcome", but "a project". */
function article(word: string): string {
  return 'aeiou'.includes(word[0]?.toLowerCase() ?? '') ? 'an' : 'a'
}

function defaultTemplate(type: ThoughtType): TemplateId {
  if (type === 'habit') return 'habit'
  if (type === 'decision') return 'decision'
  return 'goal'
}

/**
 * Manual, structured breakdown. Every item is created by the user; nothing is
 * generated for them.
 */
export function BreakdownDialog({
  thoughtId,
  onClose,
}: {
  thoughtId: string
  onClose: () => void
}) {
  const [focusId, setFocusId] = useState(thoughtId)
  const focus = useThought(focusId)
  const thoughts = useThoughts()
  const relations = useRelations()
  const addThought = useStore((state) => state.addThought)
  const setThoughtType = useStore((state) => state.setThoughtType)
  const addRelation = useStore((state) => state.addRelation)

  const [templateId, setTemplateId] = useState<TemplateId>(
    defaultTemplate(focus?.type ?? 'goal'),
  )
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [status, setStatus] = useState<string | null>(null)

  const children = useMemo(() => {
    const ids = relations
      .filter((relation) => relation.targetThoughtId === focusId)
      .map((relation) => relation.sourceThoughtId)
    return thoughts.filter((thought) => ids.includes(thought.id))
  }, [relations, thoughts, focusId])

  if (!focus) return null

  const template = TEMPLATES[templateId]

  const createItem = (step: Step, index: number) => {
    const text = (drafts[index] ?? '').trim()
    if (!text) return
    const newId = addThought(text)
    if (!newId) return
    setThoughtType(newId, step.type)
    const result = addRelation(newId, step.relation, focusId)
    setDrafts((current) => ({ ...current, [index]: '' }))
    setStatus(
      result.ok
        ? tx('Added “{text}” as a {type}.', '已将“{text}”添加为“{type}”。', {
            text,
            type: t(THOUGHT_TYPE_LABEL[step.type]),
          })
        : (result.reason ?? 'Could not link the new thought.'),
    )
  }

  return (
    <Dialog title="Break this down" onClose={onClose} variant="modal">
      <div className="stack">
        <div>
          <p className="muted" style={{ marginBottom: 'var(--space-1)' }}>
            Breaking down
          </p>
          <h3 style={{ margin: 0 }}>{focus.text}</h3>
          <p className="faint">{THOUGHT_TYPE_LABEL[focus.type]}</p>
        </div>

        <div className="notice">
          <p className="label" style={{ marginBottom: 'var(--space-2)' }}>
            The four families, in the order a breakdown usually moves through them
          </p>
          <ul className="row group-legend" style={{ marginBottom: 'var(--space-2)' }}>
            {TYPE_GROUPS.map((group) => (
              <li
                key={group.id}
                className="chip"
                style={{
                  borderColor: TYPE_GROUP_STYLE[group.id].stroke,
                  background: TYPE_GROUP_STYLE[group.id].fill,
                  color: TYPE_GROUP_STYLE[group.id].stroke,
                }}
              >
                {group.label}
              </li>
            ))}
          </ul>
          <p className="faint" style={{ margin: 0 }}>
            Direction says where you are heading, results say what done looks like, work is what
            you actually do, and anything still open can stay a question.
          </p>
        </div>

        <div className="field">
          <label htmlFor="breakdown-template">Template</label>
          <select
            id="breakdown-template"
            className="select"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value as TemplateId)}
          >
            {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
              <option key={id} value={id}>
                {TEMPLATES[id].label} — {TEMPLATES[id].shape}
              </option>
            ))}
          </select>
        </div>

        {template.steps.map((step, index) => {
          const style = styleOfType(step.type)
          return (
          <div key={step.prompt} className="field">
            <label htmlFor={`breakdown-step-${index}`}>{step.prompt}</label>
            <span className="row" style={{ gap: 'var(--space-2)' }}>
              <span
                className="chip"
                style={{
                  borderColor: style.stroke,
                  background: style.fill,
                  color: style.stroke,
                }}
              >
                {groupLabelOfType(step.type)} · {THOUGHT_TYPE_LABEL[step.type]}
              </span>
            </span>
            <span className="faint">
              {style.guideline} {step.helper} Creates {article(THOUGHT_TYPE_LABEL[step.type])}{' '}
              {THOUGHT_TYPE_LABEL[step.type].toLowerCase()} that {RELATION_LABEL[step.relation]}{' '}
              this thought.
            </span>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                id={`breakdown-step-${index}`}
                className="input"
                value={drafts[index] ?? ''}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [index]: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    createItem(step, index)
                  }
                }}
              />
              <button
                type="button"
                className="button"
                onClick={() => createItem(step, index)}
                disabled={(drafts[index] ?? '').trim().length === 0}
              >
                Add
              </button>
            </div>
          </div>
          )
        })}

        <div className="panel-section">
          <h3>Created beneath this thought</h3>
          {children.length === 0 ? (
            <p className="muted">Nothing yet. There is no correct number of steps.</p>
          ) : (
            <ul className="stack" style={{ gap: 'var(--space-2)' }}>
              {children.map((child) => (
                <li key={child.id} className="spread">
                  <span>
                    {child.text}{' '}
                    <span className="faint">({THOUGHT_TYPE_LABEL[child.type]})</span>
                  </span>
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => {
                      setFocusId(child.id)
                      setTemplateId(defaultTemplate(child.type))
                      setDrafts({})
                      setStatus(null)
                    }}
                  >
                    Continue breaking down
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p role="status" className="faint">
          {status ?? ' '}
        </p>
      </div>
    </Dialog>
  )
}
