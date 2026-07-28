import { ZH_CN } from './zh-CN'

export type Locale = 'en' | 'zh-CN'

export const LOCALE_STORAGE_KEY = 'clarity-map-locale'

let activeLocale: Locale = 'en'

export function detectLocale(): Locale {
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved === 'en' || saved === 'zh-CN') return saved
  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function setActiveLocale(locale: Locale) {
  activeLocale = locale
}

export function getActiveLocale(): Locale {
  return activeLocale
}

/** Translate application-authored copy while preserving JSX's surrounding spaces. */
export function t(value: string): string {
  if (activeLocale === 'en' || value.length === 0) return value

  const leading = value.match(/^\s*/)?.[0] ?? ''
  const trailing = value.match(/\s*$/)?.[0] ?? ''
  const key = value.slice(leading.length, value.length - trailing.length)
  const translated = ZH_CN[key] ?? ZH_CN[key.replace(/\s+/g, ' ')]
  return `${leading}${translated ?? key}${trailing}`
}

/** Interpolate a translated message without putting user-authored text in the dictionary. */
export function tx(
  english: string,
  chinese: string,
  values: Record<string, string | number>,
): string {
  const source = activeLocale === 'zh-CN' ? chinese : english
  return source.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

export function formatDate(value: string | number | Date): string {
  return new Intl.DateTimeFormat(activeLocale === 'zh-CN' ? 'zh-CN' : 'en').format(
    new Date(value),
  )
}

export function formatDateTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat(activeLocale === 'zh-CN' ? 'zh-CN' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
