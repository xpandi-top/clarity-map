import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { validateImport } from '../../domain/validation'
import { useStore } from '../../store'
import { formatDate, tx } from '../../i18n/core'

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
    label: 'Start planning',
    heading: 'I have something on my mind',
    question: 'Capture it now. You can organize and prioritize it later.',
    cta: 'Capture a thought',
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
    label: 'Start reflecting',
    heading: 'Something just happened',
    question: 'Record what happened, then decide what — if anything — it means.',
    cta: 'Reflect on it',
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
    showToast(
      tx(
        count === 1 ? 'Imported {count} workspace.' : 'Imported {count} workspaces.',
        '已导入 {count} 个工作区。',
        { count },
      ),
    )
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
        <p className="welcome__eyebrow">A private space to think clearly</p>
        <h1>Turn what is on your mind into a clear next step.</h1>
        <p className="welcome__lede">
          Capture a thought, work out what it means, and connect it to what matters. When
          something happens, save what you learned for next time.
        </p>
      </header>

      {/* Resuming beats choosing, so it sits above the two doors. */}
      {mostRecent ? (
        <section className="start-card">
          <div className="start-card__main">
            <span className="start-card__label">Pick up where you left off</span>
            <h2>{mostRecent.name}</h2>
            <p className="faint">
              Updated {formatDate(mostRecent.updatedAt)}
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
            Start a new workspace
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
                    · updated {formatDate(workspace.updatedAt)}
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

      <div className="local-note">
        <span className="local-note__icon" aria-hidden="true">
          ✓
        </span>
        <p>
          <strong>Stored on this device.</strong> Your work stays in this browser unless you
          export it. Clearing browser data may remove it.
        </p>
      </div>
    </div>
  )
}
