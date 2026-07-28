import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LocaleProvider } from './LocaleProvider'
import { LOCALE_STORAGE_KEY, setActiveLocale, t } from './core'
import { createExampleWorkspace } from '../domain/example'

function LocalizedCopy() {
  return (
    <>
      <LanguageSwitcher />
      <h1>Capture</h1>
      <input aria-label="Write a thought" placeholder="What is on your mind?" />
    </>
  )
}

afterEach(() => {
  window.localStorage.clear()
  setActiveLocale('en')
})

describe('Simplified Chinese localization', () => {
  it('loads the saved locale and translates visible and accessible copy', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN')

    render(
      <LocaleProvider>
        <LocalizedCopy />
      </LocaleProvider>,
    )

    expect(screen.getByRole('heading', { name: '记录' })).toBeInTheDocument()
    expect(screen.getByLabelText('写下脑中的念头')).toHaveAttribute(
      'placeholder',
      '最近有什么事一直占着你的注意力？',
    )
    expect(document.documentElement).toHaveAttribute('lang', 'zh-CN')
    expect(document.title).toBe('思路梳理')
  })

  it('switches back to English and saves the choice', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN')
    const user = userEvent.setup()

    render(
      <LocaleProvider>
        <LocalizedCopy />
      </LocaleProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(screen.getByRole('heading', { name: 'Capture' })).toBeInTheDocument()
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(document.title).toBe('Clarity Map')
  })

  it('creates Chinese sample content when Chinese is active', () => {
    setActiveLocale('zh-CN')
    const example = createExampleWorkspace()

    expect(example.workspace.name).toBe('示例工作区')
    expect(example.thoughts.some((thought) => thought.text === '每天散步')).toBe(true)
    expect(example.personalRules[0].defaultResponse).toBe(
      '先出门五分钟，再决定是否运动。',
    )
  })

  it('uses the refined product and psychology glossary consistently', () => {
    setActiveLocale('zh-CN')

    expect(t('Clarity Map')).toBe('思路梳理')
    expect(t('Reflect')).toBe('回顾')
    expect(t('Evidence')).toBe('证据')
    expect(t('Belief')).toBe('信念')
    expect(t('Default rule')).toBe('应对策略')
    expect(t('Compare')).toBe('权衡')
    expect(t('Roadmap')).toBe('行动路径')
  })
})
