import { NavLink, Outlet } from 'react-router-dom'
import { ThoughtDetailPanel } from '../thoughts/ThoughtDetailPanel'
import { Toast } from './Toast'
import { useCurrentWorkspace } from '../../store'

/** The six stages of the workflow, in order. */
const STAGES = [
  { to: '/capture', label: 'Capture' },
  { to: '/review/importance', label: 'Importance' },
  { to: '/matrix', label: 'Matrix' },
  { to: '/structure', label: 'Structure' },
  { to: '/actions', label: 'Actions' },
  { to: '/roadmap', label: 'Roadmap' },
]

/** Available at any point, so they sit outside the numbered sequence. */
const TOOLS = [
  { to: '/compare', label: 'Compare' },
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
