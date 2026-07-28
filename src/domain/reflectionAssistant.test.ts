import { describe, expect, it } from 'vitest'
import {
  createFallbackAnalysis,
  parseModelJson,
  reflectionSystemPrompt,
  normalizeGeneratedAction,
  normalizeModelResponse,
  isConcreteGeneratedAction,
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

  it('keeps usable model fields and fills incomplete Chinese output', () => {
    const result = normalizeModelResponse(
      {
        summary: '当前有两件准备工作还没有开始。',
        situation: '',
        desired_outcome: 'English only',
        observations: [],
        possible_blockers: [],
        recommended_mode: 'find_first_step',
        very_low_action: '把证件放到桌上。',
      },
      '我明天要参加活动，现在还没有开始打包。',
      'zh-CN',
    )

    expect(result?.summary).toBe('当前有两件准备工作还没有开始。')
    expect(result?.situation).toBe('我明天要参加活动，现在还没有开始打包。')
    expect(result?.desired_outcome).toBe('让眼前的情况向前一点。')
    expect(result?.observations).toHaveLength(1)
    expect(result?.actions).toHaveLength(3)
    expect(result?.actions.every((action) => /[\u3400-\u9fff]/u.test(action.action))).toBe(true)
  })

  it('rejects questions and accepts concrete Chinese actions', () => {
    expect(isConcreteGeneratedAction('是否可以晚些时候再做。', 'zh-CN')).toBe(false)
    expect(isConcreteGeneratedAction('在电脑上创建一个清单。', 'zh-CN')).toBe(true)
  })

  it('deterministically makes compound or counted actions smaller', () => {
    expect(reduceAction('Open the document and write three headings.', 'en')).toBe(
      'Open the document.',
    )
    expect(reduceAction('Write down three shots.', 'en')).toBe('Write down one shots.')
  })
})
