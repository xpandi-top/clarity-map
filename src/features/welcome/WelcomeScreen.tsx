import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { validateImport } from '../../domain/validation'
import { useStore } from '../../store'

/**
 * The two loops as doors, not as a diagram.
 *
 * Both are named here because both are ways in: one starts from what is on
 * your mind, the other from something that already happened. Explaining them
 * without letting you enter either would leave the product looking like a
 * planner with an appendix.
 */
const PATHS = [
  {
    key: 'plan',
    label: 'Plan',
    heading: 'Something is on my mind',
    question: 'What matters, and what is the next step?',
    cta: 'Write it down',
    to: '/capture',
    steps: [
      { label: 'Capture', to: '/capture' },
      { label: 'Structure', to: '/structure' },
      { label: 'Roadmap', to: '/roadmap' },
      { label: 'Actions', to: '/actions' },
      { label: 'Compare', to: '/compare' },
      { label: 'Matrix', to: '/matrix' },
    ],
  },
  {
    key: 'learn',
    label: 'Learn',
    heading: 'Something happened',
    question: 'What happened, and what did it tell you?',
    cta: 'Record what happened',
    to: '/reflect',
    steps: [
      { label: 'Reflect', to: '/reflect' },
      { label: 'Evidence', to: '/evidence' },
      { label: 'Model', to: '/model' },
    ],
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

  /**
   * Enter one of the loops. With no workspace yet, the door makes one — so a
   * first visit chooses which loop to start in, rather than choosing "start"
   * and landing wherever the app happens to lead.
   */
  const enter = (to: string) => {
    if (!mostRecent) startWorkspace()
    else setCurrentWorkspace(mostRecent.id)
    navigate(to)
  }

  return (
    <div className="welcome">
      <header className="welcome__hero">
        <p className="welcome__eyebrow">Plan what matters. Learn what works.</p>
        <h1>Start with what is on your mind, or with what just happened.</h1>
        <p className="welcome__lede">
          Nothing has to be reasonable, important, or actionable first. We will organize it one
          question at a time — and keep what you notice along the way, so you do not work it out
          from scratch again next time.
        </p>
      </header>

      {/* Resuming beats choosing, so it sits above the two doors. */}
      {mostRecent ? (
        <section className="start-card">
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
        </section>
      ) : null}

      {/* Both loops, both enterable, neither privileged over the other. */}
      <section className="path-grid" aria-label="Ways to start">
        {PATHS.map((path) => (
          <article key={path.key} className={`path-card path-card--${path.key}`}>
            <span className="path-card__label">{path.label}</span>
            <h2 className="path-card__heading">{path.heading}</h2>
            <p className="path-card__question">{path.question}</p>

            <button
              type="button"
              className={
                mostRecent
                  ? 'button path-card__cta'
                  : 'button button--primary path-card__cta'
              }
              onClick={() => enter(path.to)}
            >
              {path.cta}
            </button>

            <ol className="path-card__steps">
              {path.steps.map((step) => (
                <li key={step.to}>
                  {/* Only a link once there is a workspace to open it in. */}
                  {mostRecent ? <Link to={step.to}>{step.label}</Link> : step.label}
                </li>
              ))}
            </ol>
          </article>
        ))}
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
