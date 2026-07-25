import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node 26 exposes a `localStorage` global that is unavailable without a CLI
// flag, and that shadows the one jsdom would otherwise provide. Persistence is
// central to this app, so install a plain in-memory Storage for tests.
if (!window.localStorage) {
  const store = new Map<string, string>()
  const memoryStorage: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: memoryStorage,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memoryStorage,
  })
}

// jsdom does not implement matchMedia, which the responsive views rely on.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// React Flow measures nodes with APIs jsdom lacks; the roadmap graph is only
// exercised in the browser, but this keeps unrelated renders quiet.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.localStorage.clear()
})
