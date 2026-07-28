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
    document.title = locale === 'zh-CN' ? '思路梳理' : 'Clarity Map'
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) {
      description.content =
        locale === 'zh-CN'
          ? '“思路梳理”帮助你把纷乱的思绪整理成目标、行动与经验。数据只保存在本地，无需注册账户。'
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
