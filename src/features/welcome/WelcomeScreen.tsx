import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { validateImport } from '../../domain/validation'
import { useStore } from '../../store'

export function WelcomeScreen() {
  const navigate = useNavigate()
  const workspaces = useStore((state) => state.workspaces)
  const currentWorkspaceId = useStore((state) => state.currentWorkspaceId)
  const startWorkspace = useStore((state) => state.startWorkspace)
  const loadExampleWorkspace = useStore((state) => state.loadExampleWorkspace)
  const setCurrentWorkspace = useStore((state) => state.setCurrentWorkspace)
  const importEnvelope = useStore((state) => state.importEnvelope)
  const showToast = useStore((state) => state.showToast)

  const fileInput = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])

  const mostRecent =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId) ??
    [...workspaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

  const handleFile = async (file: File) => {
    setErrors([])
    const result = validateImport(await file.text())
    if (!result.ok || !result.value) {
      setErrors(result.errors)
      return
    }
    const count = importEnvelope(result.value, 'merge')
    showToast(`Imported ${count} workspace${count === 1 ? '' : 's'}.`)
    navigate('/matrix')
  }

  return (
    <div className="stack" style={{ maxWidth: '46rem' }}>
      <div className="screen-header">
        <h1>Write down what is currently on your mind.</h1>
        <p>
          You do not need to decide whether it is reasonable, important, or actionable yet. We
          will organize it one question at a time.
        </p>
      </div>

      <div className="card stack">
        {mostRecent ? (
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              setCurrentWorkspace(mostRecent.id)
              navigate('/capture')
            }}
          >
            Continue “{mostRecent.name}”
          </button>
        ) : null}

        <button
          type="button"
          className={mostRecent ? 'button' : 'button button--primary'}
          onClick={() => {
            startWorkspace()
            navigate('/capture')
          }}
        >
          Start a new exploration
        </button>

        <button
          type="button"
          className="button"
          onClick={() => {
            loadExampleWorkspace()
            navigate('/matrix')
          }}
        >
          Load example workspace
        </button>

        <button type="button" className="button" onClick={() => fileInput.current?.click()}>
          Import workspace
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-label="Import workspace file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
            event.target.value = ''
          }}
        />

        {errors.length > 0 ? (
          <div className="notice notice--danger" role="alert">
            <p style={{ marginBottom: 'var(--space-1)' }}>That file could not be imported.</p>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
            <p className="faint" style={{ marginBottom: 0 }}>
              Nothing on this device was changed.
            </p>
          </div>
        ) : null}
      </div>

      {workspaces.length > 1 ? (
        <div className="card stack">
          <h2>Your workspaces</h2>
          <ul className="settings-list">
            {workspaces.map((workspace) => (
              <li key={workspace.id} className="settings-item spread">
                <span>
                  {workspace.name}
                  <span className="faint"> · updated {new Date(workspace.updatedAt).toLocaleDateString()}</span>
                </span>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => {
                    setCurrentWorkspace(workspace.id)
                    navigate('/capture')
                  }}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="faint">
        By default, your data is stored only in this browser. Clearing browser data may remove
        your workspace. Export a backup if the information is important.
      </p>
    </div>
  )
}
