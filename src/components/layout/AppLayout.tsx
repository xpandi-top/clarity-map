import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ThoughtDetailPanel } from '../thoughts/ThoughtDetailPanel'
import { Toast } from './Toast'
import { useCurrentWorkspace } from '../../store'

/**
 * The workflow in order: write it down, work out what each thought is and how
 * it connects, decide what is doable, rank by comparison, and only then read
 * the matrix — which is built from those rankings.
 */
const PLAN = [
  { to: '/capture', label: 'Capture', description: 'Write down what is on your mind' },
  { to: '/structure', label: 'Structure', description: 'Name and connect your thoughts' },
  { to: '/roadmap', label: 'Roadmap', description: 'See what leads to what' },
  { to: '/actions', label: 'Actions', description: 'Work out what you can do next' },
  { to: '/compare', label: 'Compare', description: 'Choose what matters more' },
  { to: '/matrix', label: 'Matrix', description: 'See your priorities together' },
]

/**
 * The other direction: something happened, and it might mean something. This
 * loop runs from experience back to what the user believes, so it is a
 * separate group rather than another step in the plan.
 */
const LEARN = [
  { to: '/reflect', label: 'Reflect', description: 'Record what happened' },
  { to: '/evidence', label: 'Evidence', description: 'Review what it may mean' },
  { to: '/model', label: 'Model', description: 'See how your thinking changed' },
]

const WORKFLOW = [...PLAN, ...LEARN]

/**
 * Not part of either loop. These sit in the top bar so the two loops below it
 * stay the only things competing for attention.
 */
const UTILITY = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/settings/data', label: 'Settings' },
]

const active = ({ isActive }: { isActive: boolean }) => (isActive ? 'is-active' : undefined)

/**
 * Two tiers rather than one row of twelve links.
 *
 * The top bar carries identity and the things you reach for occasionally. The
 * row beneath carries the two loops as separate segmented groups, each with
 * its own label, so which loop you are in stays readable — and so a narrow
 * window wraps whole groups instead of shedding links into a ragged line.
 */
export function AppLayout() {
  const workspace = useCurrentWorkspace()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const navRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const currentWorkflow =
    WORKFLOW.find((entry) => pathname === entry.to || pathname.startsWith(`${entry.to}/`))
      ?.to ?? ''

  /**
   * Publishes the header's height as `--app-header-height`.
   *
   * Anything else that sticks has to sit below this bar, and the bar's height
   * changes with the breakpoint and with whether a workspace is open — so it
   * is measured rather than guessed at in each stylesheet.
   */
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const publish = () => {
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${header.getBoundingClientRect().height}px`,
      )
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(header)
    return () => observer.disconnect()
  }, [workspace])

  // On a narrow screen the row scrolls sideways, and the step you are on can
  // sit past the edge. Bring it back into view whenever the route changes.
  useEffect(() => {
    const current = navRef.current?.querySelector('a.is-active')
    current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  useEffect(() => {
    const routeName =
      [...UTILITY, ...WORKFLOW].find(
        (entry) => pathname === entry.to || pathname.startsWith(`${entry.to}/`),
      )?.label ?? 'Clarity Map'
    document.title =
      routeName === 'Clarity Map'
        ? routeName
        : `${routeName}${workspace ? ` · ${workspace.name}` : ''} · Clarity Map`
  }, [pathname, workspace])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header" ref={headerRef}>
        <div className="app-header__bar">
          <div className="app-header__identity">
            <NavLink to="/welcome" className="brand">
              <span className="brand__mark" aria-hidden="true">
                C
              </span>
              <span>Clarity Map</span>
            </NavLink>
            {workspace ? (
              <>
                <span className="app-header__sep" aria-hidden="true">
                  /
                </span>
                <NavLink to="/settings/data" className="app-header__workspace">
                  {workspace.name}
                </NavLink>
              </>
            ) : null}
          </div>

          {workspace ? (
            <nav className="utility-nav" aria-label="Tools">
              {UTILITY.map((entry) => (
                <NavLink key={entry.to} to={entry.to} className={active}>
                  {entry.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </div>

        {workspace ? (
          <div className="app-header__nav">
            <nav className="work-nav" aria-label="Main" ref={navRef}>
              <div className="nav-group">
                <span className="nav-group__label">Plan</span>
                <ol className="nav-group__items">
                  {PLAN.map((stage, index) => (
                    <li key={stage.to}>
                      <NavLink to={stage.to} className={active}>
                        <span className="nav-group__step" aria-hidden="true">
                          {index + 1}
                        </span>
                        <span title={stage.description}>{stage.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="nav-group nav-group--learn">
                <span className="nav-group__label">Learn</span>
                <ul className="nav-group__items">
                  {LEARN.map((entry) => (
                    <li key={entry.to}>
                      <NavLink to={entry.to} className={active}>
                        <span title={entry.description}>{entry.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            <div className="mobile-workflow">
              <label htmlFor="workflow-step">Workflow</label>
              <select
                id="workflow-step"
                value={currentWorkflow}
                onChange={(event) => {
                  if (event.target.value) navigate(event.target.value)
                }}
              >
                <option value="">Choose a step…</option>
                <optgroup label="Plan">
                  {PLAN.map((entry, index) => (
                    <option key={entry.to} value={entry.to}>
                      {index + 1}. {entry.label} — {entry.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Learn">
                  {LEARN.map((entry) => (
                    <option key={entry.to} value={entry.to}>
                      {entry.label} — {entry.description}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        ) : null}
      </header>

      <main className="app-main" id="main-content">
        <Outlet />
      </main>

      <ThoughtDetailPanel />
      <Toast />
    </div>
  )
}
