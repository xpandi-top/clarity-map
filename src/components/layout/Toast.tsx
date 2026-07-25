import { useEffect } from 'react'
import { useStore } from '../../store'

/** Status announcements. Offers undo while a deletion can still be restored. */
export function Toast() {
  const toast = useStore((state) => state.toast)
  const dismissToast = useStore((state) => state.dismissToast)
  const lastDeletion = useStore((state) => state.lastDeletion)
  const undoDelete = useStore((state) => state.undoDelete)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismissToast, 6000)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])

  return (
    <div role="status" aria-live="polite">
      {toast ? (
        <div className="toast">
          <span>{toast.message}</span>
          {lastDeletion ? (
            <button
              type="button"
              onClick={() => {
                undoDelete()
                dismissToast()
              }}
            >
              Undo
            </button>
          ) : null}
          <button type="button" onClick={dismissToast}>
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  )
}
