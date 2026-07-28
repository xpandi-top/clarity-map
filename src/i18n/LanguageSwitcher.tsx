import { useLocale } from './locale-context'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="language-switcher" role="group" aria-label="Language">
      <button
        type="button"
        aria-pressed={locale === 'en'}
        title="Switch to English"
        onClick={() => setLocale('en')}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={locale === 'zh-CN'}
        title="Switch to Simplified Chinese"
        onClick={() => setLocale('zh-CN')}
      >
        中文
      </button>
    </div>
  )
}
