import { useMemo, useState } from 'react'
import { RELATION_LABEL, RELATION_TYPES } from '../../domain/defaults'
import type { RelationType } from '../../domain/types'
import { useStore, useThoughts } from '../../store'

interface RelationEditorProps {
  sourceThoughtId: string
  onDone?: (message: string) => void
}

/** Source → relationship type → existing or new target → confirm. */
export function RelationEditor({ sourceThoughtId, onDone }: RelationEditorProps) {
  const thoughts = useThoughts()
  const addRelation = useStore((state) => state.addRelation)
  const addThought = useStore((state) => state.addThought)

  const [type, setType] = useState<RelationType>('serves')
  const [search, setSearch] = useState('')
  const [targetId, setTargetId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase()
    return thoughts
      .filter((thought) => thought.id !== sourceThoughtId)
      .filter((thought) => (term ? thought.text.toLowerCase().includes(term) : true))
      .slice(0, 40)
  }, [thoughts, search, sourceThoughtId])

  const confirm = (resolvedTargetId: string) => {
    const result = addRelation(sourceThoughtId, type, resolvedTargetId)
    if (!result.ok) {
      setMessage(result.reason ?? 'That relationship could not be added.')
      return
    }
    const note = result.warning ?? 'Relationship added.'
    setMessage(note)
    setSearch('')
    setTargetId('')
    onDone?.(note)
  }

  const createAndLink = () => {
    const text = search.trim()
    if (!text) return
    const newId = addThought(text)
    if (newId) confirm(newId)
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-3)' }}>
      <div className="field">
        <label htmlFor="relation-type">Relationship</label>
        <select
          id="relation-type"
          className="select"
          value={type}
          onChange={(event) => setType(event.target.value as RelationType)}
        >
          {RELATION_TYPES.map((relationType) => (
            <option key={relationType} value={relationType}>
              This thought {RELATION_LABEL[relationType]}…
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="relation-search">Find or create the other thought</label>
        <input
          id="relation-search"
          className="input"
          value={search}
          placeholder="Search your thoughts"
          onChange={(event) => {
            setSearch(event.target.value)
            setTargetId('')
          }}
        />
      </div>

      {candidates.length > 0 ? (
        <div className="field">
          <label htmlFor="relation-target">Existing thought</label>
          <select
            id="relation-target"
            className="select"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            <option value="">Choose a thought</option>
            {candidates.map((thought) => (
              <option key={thought.id} value={thought.id}>
                {thought.text}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="row">
        <button
          type="button"
          className="button button--primary"
          disabled={!targetId}
          onClick={() => confirm(targetId)}
        >
          Add relationship
        </button>
        <button
          type="button"
          className="button"
          disabled={search.trim().length === 0}
          onClick={createAndLink}
        >
          Create “{search.trim() || '…'}” and link
        </button>
      </div>

      {message ? (
        <p className="notice" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
