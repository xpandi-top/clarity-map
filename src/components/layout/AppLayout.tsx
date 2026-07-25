import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ThoughtDetailPanel } from '../thoughts/ThoughtDetailPanel'
import { Toast } from './Toast'
import { useCurrentWorkspace } from '../../store'

const MAIN_NAV = [
  { to: '/capture', label: 'Capture' },
  { to: '/matrix', label: 'Matrix' },
  { to: '/compare', label: 'Compare' },
  { to: '/structure', label: 'Structure' },
  { to: '/actions', label: 'Actions' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/settings/data', label: 'Settings' },
]

const STAGES = [
  { to: '/capture', label: '1. Capture' },
  { to: '/review/importance', label: '2. Importance' },
  { to: '/matrix', label: '3. Matrix' },
  { to: '/structure', label: '4. Structure' },
  { to: '/actions', label: '5. Actions' },
  { to: '/roadmap', label: '6. Roadmap' },
]

export function AppLayout() {
  const workspace = useCurrentWorkspace()
  const location = useLocation()
  const onWelcome = location.pathname === '/welcome'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink to="/welcome" className="brand">
            Clarity Map
          </NavLink>
          {workspace ? (
            <nav className="main-nav" aria-label="Main">
              {MAIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </div>
        {workspace && !onWelcome ? (
          <nav className="stage-bar" aria-label="Stages">
            {STAGES.map((stage) => (
              <NavLink
                key={stage.to}
                to={stage.to}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                {stage.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <ThoughtDetailPanel />
      <Toast />
    </div>
  )
}
