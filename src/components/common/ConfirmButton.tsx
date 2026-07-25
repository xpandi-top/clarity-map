import { useEffect, useState } from 'react'

interface ConfirmButtonProps {
  label: string
  confirmLabel: string
  onConfirm: () => void
  className?: string
}

/**
 * Two-step control for destructive actions: the first click arms it, the
 * second performs it. Resets itself after a few seconds.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = 'button button--danger',
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 6000)
    return () => window.clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}
