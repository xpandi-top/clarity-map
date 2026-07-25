import { useEffect, useId, useRef, type ReactNode } from 'react'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** `panel` slides in from the right; `modal` is centred. */
  variant?: 'panel' | 'modal'
  footer?: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog: labelled, focus-trapped, closes on Escape, and returns
 * focus to whatever opened it.
 */
export function Dialog({ title, onClose, children, variant = 'panel', footer }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const container = containerRef.current
    const first = container?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? container)?.focus()

    return () => {
      previouslyFocused.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return
      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  return (
    <div
      className={variant === 'modal' ? 'overlay overlay--center' : 'overlay'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={variant === 'modal' ? 'modal' : 'side-panel'}
      >
        <div className="spread" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 id={titleId} style={{ margin: 0 }}>
            {title}
          </h2>
          <button type="button" className="button button--quiet button--small" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
        {footer ? <div className="panel-section">{footer}</div> : null}
      </div>
    </div>
  )
}
