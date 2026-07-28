import { describe, expect, it } from 'vitest'
import {
  createFallbackAnalysis,
  parseModelJson,
  reflectionSystemPrompt,
  normalizeGeneratedAction,
  reduceAction,
  validateReflectionAnalysis,
} from './reflectionAssistant'

describe('reflection assistant', () => {
  it('keeps deterministic fallback observations grounded in the original text', () => {
    const result = createFallbackAnalysis('I feel sleepy. I opened my laptop.', 'en')
    expect(result.observations).toEqual(['I feel sleepy.', 'I opened my laptop.'])
    expect(result.actions).toHaveLength(3)
    expect(result.actions.map((action) => action.estimated_minutes)).toEqual([2, 3, 10])
  })

  it('rejects actions that exceed the energy limit', () => {
    const result = createFallbackAnalysis('Packing feels difficult.', 'en')
    result.actions[0].estimated_minutes = 8
    expect(validateReflectionAnalysis(result)).toBeNull()
  })

  it('rejects English model output for the Chinese interface', () => {
    const result = createFallbackAnalysis('Packing feels difficult.', 'en')
    expect(validateReflectionAnalysis(result, 'zh-CN')).toBeNull()
  })

  it('gives the model an explicit Simplified Chinese output requirement', () => {
    const prompt = reflectionSystemPrompt('zh-CN')
    expect(prompt).toContain('所有面向用户的 JSON 字符串值必须只使用')
    expect(prompt).toContain('不要把中文输入翻译成英文')
  })

  it('parses schema output wrapped by a model template', () => {
    expect(
      parseModelJson(`<think>

</think>

\`\`\`json
{"action":"打开清单。"}
\`\`\``),
    ).toEqual({ action: '打开清单。' })
  })

  it('reduces conditional or compound generated actions to one Chinese action', () => {
    expect(normalizeGeneratedAction('检查电脑是否能运行并尝试开始打包。', 'zh-CN')).toBe(
      '检查电脑是否能运行。',
    )
    expect(
      normalizeGeneratedAction('如果电脑无法使用，考虑打印清单或拍照。', 'zh-CN'),
    ).toBe('打印清单。')
  })

  it('deterministically makes compound or counted actions smaller', () => {
    expect(reduceAction('Open the document and write three headings.', 'en')).toBe(
      'Open the document.',
    )
    expect(reduceAction('Write down three shots.', 'en')).toBe('Write down one shots.')
  })
})
