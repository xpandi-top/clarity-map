import { ConfirmButton } from '../../components/common/ConfirmButton'
import { THOUGHT_TYPES, THOUGHT_TYPE_LABEL } from '../../domain/defaults'
import { createId } from '../../domain/ids'
import type {
  Rule,
  RuleAction,
  RuleCondition,
  RuleOperator,
  ThoughtType,
} from '../../domain/types'
import { useDimensions, useRules, useStore, useSuggestions, useThoughts } from '../../store'
import { t } from '../../i18n/core'

const OPERATORS: RuleOperator[] = [
  'equals',
  'notEquals',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'contains',
  'isEmpty',
  'isNotEmpty',
]

const ACTION_TYPES: Array<RuleAction['type']> = [
  'flag',
  'addTag',
  'removeTag',
  'suggestType',
  'suggestBreakdown',
  'suggestArchive',
]

export function RuleSettingsScreen() {
  const rules = useRules()
  const suggestions = useSuggestions()
  const thoughts = useThoughts()
  const addRule = useStore((state) => state.addRule)
  const dismissed = useStore((state) => state.dismissedSuggestionIds)
  const restoreDismissedSuggestions = useStore((state) => state.restoreDismissedSuggestions)
  const acceptSuggestion = useStore((state) => state.acceptSuggestion)
  const dismissSuggestion = useStore((state) => state.dismissSuggestion)
  const selectThought = useStore((state) => state.selectThought)

  const textById = new Map(thoughts.map((thought) => [thought.id, thought.text]))

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>Rules</h1>
        <p>
          Rules only ever produce suggestions. Nothing in your data changes until you choose to
          apply one.
        </p>
      </div>

      <div className="row">
        <button
          type="button"
          className="button button--primary"
          onClick={() =>
            addRule({
              name: 'New rule',
              enabled: true,
              match: 'all',
              conditions: [
                { id: createId('cond'), field: 'type', operator: 'equals', value: 'goal' },
              ],
              actions: [{ type: 'flag', value: 'Something to look at.' }],
            })
          }
        >
          Create a rule
        </button>
        {dismissed.length > 0 ? (
          <button type="button" className="button" onClick={restoreDismissedSuggestions}>
            Restore {dismissed.length} dismissed suggestion
            {dismissed.length === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>

      <section className="stack">
        <h2>Current suggestions ({suggestions.length})</h2>
        {suggestions.length === 0 ? (
          <p className="muted">No suggestions right now.</p>
        ) : (
          <ul className="settings-list">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} className="settings-item stack" style={{ gap: 'var(--space-2)' }}>
                <p style={{ margin: 0 }}>{suggestion.message}</p>
                <p className="faint" style={{ margin: 0 }}>
                  {textById.get(suggestion.thoughtId) ?? 'Unknown thought'} · rule “
                  {suggestion.ruleName}”
                </p>
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
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => selectThought(suggestion.thoughtId)}
                  >
                    Open thought
                  </button>
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => dismissSuggestion(suggestion.id)}
                  >
                    Dismiss permanently
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack">
        <h2>Rules</h2>
        <ul className="settings-list">
          {rules.map((rule) => (
            <li key={rule.id} className="settings-item">
              <RuleEditor rule={rule} />
            </li>
          ))}
        </ul>
        {rules.length === 0 ? <p className="empty-state">No rules yet.</p> : null}
      </section>
    </div>
  )
}

function RuleEditor({ rule }: { rule: Rule }) {
  const dimensions = useDimensions()
  const updateRule = useStore((state) => state.updateRule)
  const deleteRule = useStore((state) => state.deleteRule)

  const patch = (values: Partial<Rule>) => updateRule(rule.id, values)

  const patchCondition = (conditionId: string, values: Partial<RuleCondition>) =>
    patch({
      conditions: rule.conditions.map((condition) =>
        condition.id === conditionId ? { ...condition, ...values } : condition,
      ),
    })

  const patchAction = (index: number, action: RuleAction) =>
    patch({ actions: rule.actions.map((entry, position) => (position === index ? action : entry)) })

  return (
    <div className="stack">
      <div className="spread">
        <div className="field" style={{ flex: 1, minWidth: '12rem' }}>
          <label htmlFor={`rule-name-${rule.id}`}>Name</label>
          <input
            id={`rule-name-${rule.id}`}
            className="input"
            value={rule.builtIn ? t(rule.name) : rule.name}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />
          <span>Enabled</span>
        </label>
      </div>

      <div className="field">
        <label htmlFor={`rule-match-${rule.id}`}>Match</label>
        <select
          id={`rule-match-${rule.id}`}
          className="select"
          value={rule.match}
          onChange={(event) => patch({ match: event.target.value as 'all' | 'any' })}
        >
          <option value="all">All conditions</option>
          <option value="any">Any condition</option>
        </select>
      </div>

      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        <span className="label">Conditions</span>
        {rule.conditions.map((condition) => (
          <div key={condition.id} className="row">
            <label className="visually-hidden" htmlFor={`field-${condition.id}`}>
              Field
            </label>
            <select
              id={`field-${condition.id}`}
              className="select"
              style={{ maxWidth: '10rem' }}
              value={condition.field}
              onChange={(event) =>
                patchCondition(condition.id, {
                  field: event.target.value as RuleCondition['field'],
                })
              }
            >
              <option value="dimension">Dimension</option>
              <option value="type">Type</option>
              <option value="status">Status</option>
              <option value="tag">Tag</option>
              <option value="text">Text</option>
            </select>

            {condition.field === 'dimension' ? (
              <>
                <label className="visually-hidden" htmlFor={`dim-${condition.id}`}>
                  Dimension
                </label>
                <select
                  id={`dim-${condition.id}`}
                  className="select"
                  style={{ maxWidth: '12rem' }}
                  value={condition.dimensionId ?? ''}
                  onChange={(event) =>
                    patchCondition(condition.id, { dimensionId: event.target.value })
                  }
                >
                  <option value="">Choose a dimension</option>
                  {dimensions.map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <label className="visually-hidden" htmlFor={`op-${condition.id}`}>
              Operator
            </label>
            <select
              id={`op-${condition.id}`}
              className="select"
              style={{ maxWidth: '11rem' }}
              value={condition.operator}
              onChange={(event) =>
                patchCondition(condition.id, { operator: event.target.value as RuleOperator })
              }
            >
              {OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>

            {condition.operator !== 'isEmpty' && condition.operator !== 'isNotEmpty' ? (
              <>
                <label className="visually-hidden" htmlFor={`value-${condition.id}`}>
                  Value
                </label>
                <input
                  id={`value-${condition.id}`}
                  className="input"
                  style={{ maxWidth: '10rem' }}
                  value={condition.value === null || condition.value === undefined ? '' : String(condition.value)}
                  onChange={(event) => {
                    const raw = event.target.value
                    const numeric = Number(raw)
                    patchCondition(condition.id, {
                      value: raw !== '' && !Number.isNaN(numeric) ? numeric : raw,
                    })
                  }}
                />
              </>
            ) : null}

            <button
              type="button"
              className="button button--quiet button--small"
              onClick={() =>
                patch({
                  conditions: rule.conditions.filter((entry) => entry.id !== condition.id),
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button--small"
          onClick={() =>
            patch({
              conditions: [
                ...rule.conditions,
                { id: createId('cond'), field: 'type', operator: 'equals', value: 'goal' },
              ],
            })
          }
        >
          Add condition
        </button>
      </div>

      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        <span className="label">Suggestions this rule offers</span>
        {rule.actions.map((action, index) => (
          <div key={`${action.type}-${index}`} className="row">
            <label className="visually-hidden" htmlFor={`action-${rule.id}-${index}`}>
              Suggestion type
            </label>
            <select
              id={`action-${rule.id}-${index}`}
              className="select"
              style={{ maxWidth: '12rem' }}
              value={action.type}
              onChange={(event) => {
                const type = event.target.value as RuleAction['type']
                if (type === 'suggestBreakdown' || type === 'suggestArchive') {
                  patchAction(index, { type })
                } else if (type === 'suggestType') {
                  patchAction(index, { type, value: 'goal' })
                } else {
                  patchAction(index, { type, value: '' })
                }
              }}
            >
              {ACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {action.type === 'suggestType' ? (
              <>
                <label className="visually-hidden" htmlFor={`action-value-${rule.id}-${index}`}>
                  Suggested type
                </label>
                <select
                  id={`action-value-${rule.id}-${index}`}
                  className="select"
                  style={{ maxWidth: '11rem' }}
                  value={rule.builtIn ? t(action.value) : action.value}
                  onChange={(event) =>
                    patchAction(index, {
                      type: 'suggestType',
                      value: event.target.value as ThoughtType,
                    })
                  }
                >
                  {THOUGHT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {THOUGHT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {action.type === 'flag' || action.type === 'addTag' || action.type === 'removeTag' ? (
              <>
                <label className="visually-hidden" htmlFor={`action-text-${rule.id}-${index}`}>
                  Suggestion text
                </label>
                <input
                  id={`action-text-${rule.id}-${index}`}
                  className="input"
                  value={action.value}
                  onChange={(event) =>
                    patchAction(index, { type: action.type, value: event.target.value })
                  }
                />
              </>
            ) : null}

            <button
              type="button"
              className="button button--quiet button--small"
              onClick={() =>
                patch({ actions: rule.actions.filter((_, position) => position !== index) })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button--small"
          onClick={() =>
            patch({ actions: [...rule.actions, { type: 'flag', value: 'Something to look at.' }] })
          }
        >
          Add suggestion
        </button>
      </div>

      <div className="row">
        <ConfirmButton
          label="Delete rule"
          confirmLabel="Confirm delete"
          onConfirm={() => deleteRule(rule.id)}
        />
      </div>
    </div>
  )
}
