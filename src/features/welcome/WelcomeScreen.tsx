import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { validateImport } from '../../domain/validation'
import { useStore } from '../../store'

/**
 * The two loops, said plainly before the user meets them in the navigation.
 * Someone arriving here has no idea why "Compare" and "Evidence" sit in
 * different groups; this is where that is explained, once.
 */
const PATHS = [
  {
    key: 'plan',
    label: 'Plan',
    question: 'What matters, and what is the next step?',
    steps: ['Capture', 'Structure', 'Roadmap', 'Actions', 'Compare', 'Matrix'],
  },
  {
    key: 'learn',
    label: 'Learn',
    question: 'What happened, and what did it tell you?',
    steps: ['Reflect', 'Evidence', 'Model'],
  },
]

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

  const others = workspaces.filter((workspace) => workspace.id !== mostRecent?.id)

  const handleFile = async (file: File) => {
    setErrors([])
    const result = validateImport(await file.text())
    if (!result.ok || !result.value) {
      setErrors(result.errors)
      return
    }
    const count = importEnvelope(result.value, 'merge')
    showToast(`Imported ${count} workspace${count === 1 ? '' : 's'}.`)
    navigate('/dashboard')
  }

  return (
    <div className="welcome">
      <header className="welcome__hero">
        <p className="welcome__eyebrow">Plan what matters. Learn what works.</p>
        <h1>Write down what is currently on your mind.</h1>
        <p className="welcome__lede">
          You do not need to decide whether it is reasonable, important, or actionable yet. We
          will organize it one question at a time — and keep what you notice along the way, so
          you do not work it out from scratch again next time.
        </p>
      </header>

      {/* One obvious way in. Everything else is deliberately quieter. */}
      <section className="start-card">
        {mostRecent ? (
          <>
            <div className="start-card__main">
              <span className="start-card__label">Pick up where you left off</span>
              <h2>{mostRecent.name}</h2>
              <p className="faint">
                Updated {new Date(mostRecent.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              className="button button--primary button--large"
              onClick={() => {
                setCurrentWorkspace(mostRecent.id)
                navigate('/dashboard')
              }}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <div className="start-card__main">
              <span className="start-card__label">First time here</span>
              <h2>Start with whatever is loudest</h2>
              <p className="faint">
                An empty page and one input. Nothing has to be sorted out first.
              </p>
            </div>
            <button
              type="button"
              className="button button--primary button--large"
              onClick={() => {
                startWorkspace()
                navigate('/capture')
              }}
            >
              Start
            </button>
          </>
        )}
      </section>

      <div className="row welcome__secondary">
        {mostRecent ? (
          <button
            type="button"
            className="button"
            onClick={() => {
              startWorkspace()
              navigate('/capture')
            }}
          >
            Start a new exploration
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          onClick={() => {
            loadExampleWorkspace()
            navigate('/dashboard')
          }}
        >
          Load example workspace
        </button>
        <button type="button" className="button" onClick={() => fileInput.current?.click()}>
          Import a file
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
      </div>

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

      <section className="path-grid" aria-label="How Clarity Map is organised">
        {PATHS.map((path) => (
          <article key={path.key} className={`path-card path-card--${path.key}`}>
            <span className="path-card__label">{path.label}</span>
            <p className="path-card__question">{path.question}</p>
            <ol className="path-card__steps">
              {path.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      {others.length > 0 ? (
        <section className="card stack">
          <h2>Your other workspaces</h2>
          <ul className="settings-list">
            {others.map((workspace) => (
              <li key={workspace.id} className="settings-item spread">
                <span>
                  {workspace.name}
                  <span className="faint">
                    {' '}
                    · updated {new Date(workspace.updatedAt).toLocaleDateString()}
                  </span>
                </span>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => {
                    setCurrentWorkspace(workspace.id)
                    navigate('/dashboard')
                  }}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="faint">
        By default, your data is stored only in this browser. Clearing browser data may remove
        your workspace. Export a backup if the information is important.
      </p>
    </div>
  )
}
