import { useCallback, useEffect, useState } from 'react'
import type { CollectionViewMode } from './CollectionBrowser'

export function useCollectionBrowser(length: number) {
  const [mode, setMode] = useState<CollectionViewMode>('focus')
  const [index, setIndex] = useState(0)
  const safeIndex = length === 0 ? 0 : Math.min(index, length - 1)

  const previous = useCallback(() => {
    setIndex((current) => Math.max(Math.min(current, length - 1) - 1, 0))
  }, [length])

  const next = useCallback(() => {
    setIndex((current) =>
      Math.min(Math.min(current, Math.max(length - 1, 0)) + 1, Math.max(length - 1, 0)),
    )
  }, [length])

  useEffect(() => {
    if (mode !== 'focus' || length === 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (document.querySelector('.overlay')) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        previous()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        next()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [length, mode, next, previous])

  return {
    mode,
    setMode,
    index: safeIndex,
    previous,
    next,
    start: mode === 'focus' ? safeIndex : 0,
    end: mode === 'focus' ? Math.min(safeIndex + 1, length) : length,
  }
}
