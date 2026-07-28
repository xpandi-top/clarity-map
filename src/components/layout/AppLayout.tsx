import { NavLink, Outlet } from 'react-router-dom'
import { ThoughtDetailPanel } from '../thoughts/ThoughtDetailPanel'
import { Toast } from './Toast'
import { useCurrentWorkspace } from '../../store'

/**
 * The workflow in order: write it down, work out what each thought is and how
 * it connects, decide what is doable, rank by comparison, and only then read
 * the matrix — which is built from those rankings.
 */
const STAGES = [
  { to: '/capture', label: 'Capture' },
  { to: '/structure', label: 'Structure' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/actions', label: 'Actions' },
  { to: '/compare', label: 'Compare' },
  { to: '/matrix', label: 'Matrix' },
]

/**
 * The other direction: something happened, and it might mean something. This
 * loop runs from experience back to what the user believes, so it is a
 * separate group rather than another step in the plan.
 */
const LEARNING = [
  { to: '/reflect', label: 'Reflect' },
  { to: '/evidence', label: 'Evidence' },
  { to: '/model', label: 'Model' },
]

/**
 * Optional at any point. Importance is one way to answer a dimension directly,
 * but comparing on the Compare screen does the same job without it.
 */
const TOOLS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/review/importance', label: 'Importance' },
  { to: '/settings/data', label: 'Settings' },
]

export function AppLayout() {
  const workspace = useCurrentWorkspace()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink to="/welcome" className="brand">
            Clarity Map
          </NavLink>

          {workspace ? (
            <nav className="main-nav" aria-label="Main">
              <ol className="main-nav__stages">
                {STAGES.map((stage, index) => (
                  <li key={stage.to}>
                    <NavLink
                      to={stage.to}
                      className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                    >
                      <span className="main-nav__step" aria-hidden="true">
                        {index + 1}
                      </span>
                      {stage.label}
                    </NavLink>
                  </li>
                ))}
              </ol>
              <span className="main-nav__divider" aria-hidden="true" />
              <ul className="main-nav__tools" aria-label="Learning">
                {LEARNING.map((entry) => (
                  <li key={entry.to}>
                    <NavLink
                      to={entry.to}
                      className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                    >
                      {entry.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <span className="main-nav__divider" aria-hidden="true" />
              <ul className="main-nav__tools">
                {TOOLS.map((tool) => (
                  <li key={tool.to}>
                    <NavLink
                      to={tool.to}
                      className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                    >
                      {tool.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <ThoughtDetailPanel />
      <Toast />
    </div>
  )
}
