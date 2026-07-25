import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentWorkspace } from '../store'

/** Sends people back to the welcome screen when no workspace is open. */
export function RequireWorkspace() {
  const workspace = useCurrentWorkspace()
  if (!workspace) return <Navigate to="/welcome" replace />
  return <Outlet />
}
