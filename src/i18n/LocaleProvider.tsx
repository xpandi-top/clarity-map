import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  detectLocale,
  LOCALE_STORAGE_KEY,
  setActiveLocale,
  type Locale,
} from './core'
import { LocaleContext, type LocaleContextValue } from './locale-context'

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const detected = detectLocale()
    setActiveLocale(detected)
    return detected
  })

  useEffect(() => {
    document.documentElement.lang = locale
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) {
      description.content =
        locale === 'zh-CN'
          ? '清晰地图把零散想法整理成目标、行动和路线图。数据本地保存，无需账户。'
          : 'Clarity Map turns unstructured thoughts into goals, actions, and roadmaps. Local-first, no account required.'
    }
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale(next) {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
        setActiveLocale(next)
        setLocaleState(next)
      },
    }),
    [locale],
  )

  return (
    <LocaleContext.Provider value={value}>
      <div key={locale} className="locale-root">
        {children}
      </div>
    </LocaleContext.Provider>
  )
}
