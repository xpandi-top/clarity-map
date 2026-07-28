import type { Locale } from '../i18n/core'

export type ReflectionHelpMode =
  | 'find_first_step'
  | 'clarify'
  | 'recover_energy'
  | 'recommend'

export type ReflectionEnergyLevel = 'very_low' | 'low' | 'medium'

export interface ReflectionBlocker {
  type: string
  description: string
  confidence: 'low' | 'medium' | 'high'
}

export interface ReflectionAction {
  energy_level: ReflectionEnergyLevel
  label: string
  action: string
  estimated_minutes: number
}

export interface ReflectionAnalysis {
  summary: string
  situation: string
  desired_outcome: string
  observations: string[]
  possible_blockers: ReflectionBlocker[]
  recommended_mode: ReflectionHelpMode
  actions: ReflectionAction[]
}

export type ReflectionModelProgress = (progress: string) => void

export const REFLECTION_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'situation',
    'desired_outcome',
    'observations',
    'possible_blockers',
    'recommended_mode',
    'actions',
  ],
  properties: {
    summary: { type: 'string' },
    situation: { type: 'string' },
    desired_outcome: { type: 'string' },
    observations: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: { type: 'string' },
    },
    possible_blockers: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'description', 'confidence'],
        properties: {
          type: { type: 'string' },
          description: { type: 'string' },
          confidence: { enum: ['low', 'medium', 'high'] },
        },
      },
    },
    recommended_mode: {
      enum: ['find_first_step', 'clarify', 'recover_energy', 'recommend'],
    },
    actions: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['energy_level', 'label', 'action', 'estimated_minutes'],
        properties: {
          energy_level: { enum: ['very_low', 'low', 'medium'] },
          label: { type: 'string' },
          action: { type: 'string' },
          estimated_minutes: { type: 'number', minimum: 1, maximum: 10 },
        },
      },
    },
  },
} as const

/**
 * The model-facing schema stays deliberately shallow. Small in-browser models
 * can loop on whitespace while satisfying deeply nested grammars. The result
 * is normalized into `ReflectionAnalysis` and validated below.
 */
const MODEL_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'situation',
    'desired_outcome',
    'observations',
    'possible_blockers',
    'recommended_mode',
    'very_low_action',
    'low_action',
    'medium_action',
  ],
  properties: {
    summary: { type: 'string' },
    situation: { type: 'string' },
    desired_outcome: { type: 'string' },
    observations: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { type: 'string' },
    },
    possible_blockers: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string' },
    },
    recommended_mode: {
      enum: ['find_first_step', 'clarify', 'recover_energy', 'recommend'],
    },
    very_low_action: { type: 'string' },
    low_action: { type: 'string' },
    medium_action: { type: 'string' },
  },
} as const

const ACTION_LIMIT: Record<ReflectionEnergyLevel, number> = {
  very_low: 2,
  low: 5,
  medium: 10,
}

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 800

function isChineseResponse(candidate: ReflectionAnalysis): boolean {
  const containsChinese = (value: string) => /[\u3400-\u9fff]/u.test(value)
  return (
    containsChinese(candidate.summary) &&
    containsChinese(candidate.desired_outcome) &&
    candidate.actions.every(
      (action) => containsChinese(action.label) && containsChinese(action.action),
    )
  )
}

export function validateReflectionAnalysis(
  value: unknown,
  locale?: Locale,
): ReflectionAnalysis | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ReflectionAnalysis>
  if (
    !isText(candidate.summary) ||
    !isText(candidate.situation) ||
    !isText(candidate.desired_outcome) ||
    !Array.isArray(candidate.observations) ||
    candidate.observations.length < 1 ||
    candidate.observations.length > 5 ||
    !candidate.observations.every(isText) ||
    !Array.isArray(candidate.possible_blockers) ||
    candidate.possible_blockers.length > 4 ||
    !['find_first_step', 'clarify', 'recover_energy', 'recommend'].includes(
      candidate.recommended_mode ?? '',
    ) ||
    !Array.isArray(candidate.actions) ||
    candidate.actions.length !== 3
  ) {
    return null
  }

  const blockersValid = candidate.possible_blockers.every(
    (blocker) =>
      blocker &&
      typeof blocker === 'object' &&
      isText(blocker.type) &&
      isText(blocker.description) &&
      ['low', 'medium', 'high'].includes(blocker.confidence),
  )
  const actionsValid =
    new Set(candidate.actions.map((action) => action.energy_level)).size === 3 &&
    candidate.actions.every(
    (action) =>
      action &&
      typeof action === 'object' &&
      ['very_low', 'low', 'medium'].includes(action.energy_level) &&
      isText(action.label) &&
      isText(action.action) &&
      typeof action.estimated_minutes === 'number' &&
      action.estimated_minutes >= 1 &&
      action.estimated_minutes <= ACTION_LIMIT[action.energy_level],
    )
  if (!blockersValid || !actionsValid) return null
  const validated = candidate as ReflectionAnalysis
  return locale === 'zh-CN' && !isChineseResponse(validated) ? null : validated
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s*|\n+/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
}

export function fallbackActions(
  mode: ReflectionHelpMode,
  locale: Locale,
): ReflectionAction[] {
  const zh = locale === 'zh-CN'
  const actionsByMode: Record<ReflectionHelpMode, ReflectionAction[]> = {
    find_first_step: [
      {
        energy_level: 'very_low',
        label: zh ? '打开开始的位置' : 'Open the starting place',
        action: zh ? '打开这件事最先会用到的页面或物品。' : 'Open the page or item where this task begins.',
        estimated_minutes: 2,
      },
      {
        energy_level: 'low',
        label: zh ? '写下一个动作' : 'Name one movement',
        action: zh ? '写下一个可以直接做的动作。' : 'Write down one action you can do directly.',
        estimated_minutes: 3,
      },
      {
        energy_level: 'medium',
        label: zh ? '做最小的一部分' : 'Do the smallest part',
        action: zh ? '完成这件事中最小、看得见的一部分。' : 'Complete the smallest visible part of the task.',
        estimated_minutes: 10,
      },
    ],
    clarify: [
      {
        energy_level: 'very_low',
        label: zh ? '写下核心问题' : 'Name the central question',
        action: zh ? '用一句话写下你现在要回答的问题。' : 'Write the question you need to answer in one sentence.',
        estimated_minutes: 2,
      },
      {
        energy_level: 'low',
        label: zh ? '圈出已知信息' : 'Mark what is known',
        action: zh ? '圈出原文中一条已经确定的信息。' : 'Mark one thing in your note that is already known.',
        estimated_minutes: 3,
      },
      {
        energy_level: 'medium',
        label: zh ? '分成两栏' : 'Make two columns',
        action: zh ? '写下“已知”和“待确认”两栏，各不超过三条。' : 'Write two columns, “known” and “to check,” with at most three items each.',
        estimated_minutes: 10,
      },
    ],
    recover_energy: [
      {
        energy_level: 'very_low',
        label: zh ? '放松肩膀' : 'Release your shoulders',
        action: zh ? '让肩膀自然下沉十秒。' : 'Let your shoulders drop for ten seconds.',
        estimated_minutes: 1,
      },
      {
        energy_level: 'low',
        label: zh ? '喝一点水' : 'Drink some water',
        action: zh ? '慢慢喝一杯水。' : 'Slowly drink a glass of water.',
        estimated_minutes: 3,
      },
      {
        energy_level: 'medium',
        label: zh ? '离开屏幕片刻' : 'Step away briefly',
        action: zh ? '离开屏幕，在安静处坐五分钟。' : 'Sit somewhere quiet away from the screen for five minutes.',
        estimated_minutes: 5,
      },
    ],
    recommend: [],
  }
  return mode === 'recommend' ? actionsByMode.find_first_step : actionsByMode[mode]
}

export function createFallbackAnalysis(text: string, locale: Locale): ReflectionAnalysis {
  const zh = locale === 'zh-CN'
  const observed = sentences(text)
  return {
    summary: zh
      ? '你写下了当前的情况。我们可以先从一个很小的动作开始。'
      : 'You described what is happening. We can begin with one very small action.',
    situation: text.trim(),
    desired_outcome: zh ? '让眼前的情况向前一点。' : 'Make the current situation a little easier.',
    observations: observed.length ? observed : [text.trim()],
    possible_blockers: [],
    recommended_mode: 'find_first_step',
    actions: fallbackActions('find_first_step', locale),
  }
}

export function reduceAction(action: string, locale: Locale): string | null {
  const zh = locale === 'zh-CN'
  const firstClause = action.split(/\s+(?:and|then)\s+|[；;]/iu)[0]?.trim()
  if (firstClause && firstClause !== action.trim() && firstClause.length > 4) {
    return /[.!?。！？]$/.test(firstClause) ? firstClause : `${firstClause}${zh ? '。' : '.'}`
  }

  const replacements: Array<[RegExp, string]> = zh
    ? [
        [/三(个|条|项)/, '一$1'],
        [/两(个|条|项|栏|份)/, '一$1'],
        [/五(个|条|项)/, '一$1'],
        [/十分钟/, '两分钟'],
        [/五分钟/, '两分钟'],
      ]
    : [
        [/\bthree\b/i, 'one'],
        [/\btwo\b/i, 'one'],
        [/\bfive items?\b/i, 'one item'],
        [/\bten minutes?\b/i, 'two minutes'],
        [/\bfive minutes?\b/i, 'two minutes'],
      ]
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(action)) return action.replace(pattern, replacement)
  }
  return null
}

export function normalizeGeneratedAction(action: string, locale: Locale): string {
  let normalized = action.trim()
  if (locale === 'zh-CN') {
    if (/^(?:如果|当|若)/u.test(normalized) && normalized.includes('，')) {
      normalized = normalized.slice(normalized.indexOf('，') + 1).trim()
    }
    normalized = normalized
      .replace(/^(?:请|建议|可以|尝试|考虑|先)\s*/u, '')
      .split(/并(?:且)?|然后|再|或/u)[0]
      .trim()
    return /[。！？]$/u.test(normalized) ? normalized : `${normalized}。`
  }

  if (/^(?:if|when)\b/iu.test(normalized) && normalized.includes(',')) {
    normalized = normalized.slice(normalized.indexOf(',') + 1).trim()
  }
  normalized = normalized
    .replace(/^(?:please|try to|consider|you can|first)\s+/iu, '')
    .split(/\s+(?:and|then|or)\s+/iu)[0]
    .trim()
  return /[.!?]$/u.test(normalized) ? normalized : `${normalized}.`
}

const SYSTEM_PROMPT = `
You turn a person's unstructured account into cautious understanding and an immediately usable next step.
Never add an observation that is not directly supported by the user's text.
Keep observations separate from interpretations. Mark every blocker as possible or tentative.
Do not diagnose. Do not recommend medication or treatment.
Do not turn one experience into a stable personal trait.
Preserve the user's meaning and respond only in the currently selected application language.
Generate practical, low-risk actions for very low, low, and medium energy.
Each action must contain exactly one task, start with a concrete verb, require no additional decision,
be smaller than the original task, take no more than 2, 5, or 10 minutes respectively,
and prefer reducing scope over encouraging willpower. Reduced capacity and rest are not failure.
Return only JSON matching the supplied schema.
`.trim()

export function reflectionSystemPrompt(locale: Locale): string {
  if (locale === 'zh-CN') {
    return `${SYSTEM_PROMPT}

重要语言要求：
- 所有面向用户的 JSON 字符串值必须只使用自然、简洁的简体中文。
- 不要用英文概括、解释或命名行动。专有名词可以保留原文。
- 保持用户原本的语气和意思，不要把中文输入翻译成英文。
- “可能的阻碍”必须使用“可能”“也许”“看起来”等谨慎说法。`
  }
  return `${SYSTEM_PROMPT}

Language requirement: write every user-facing JSON string in clear, natural English.`
}

// Qwen 2.5 follows Chinese instructions well without Qwen 3's `<think>`
// preamble, which conflicts with schema-constrained JSON generation.
const REFLECTION_MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'

let enginePromise: Promise<import('@mlc-ai/web-llm').MLCEngineInterface> | null = null

async function getEngine(onProgress?: ReflectionModelProgress) {
  if (!('gpu' in navigator)) throw new Error('webgpu-unavailable')
  if (!enginePromise) {
    enginePromise = import('@mlc-ai/web-llm')
      .then(({ CreateMLCEngine }) =>
        CreateMLCEngine(REFLECTION_MODEL_ID, {
          initProgressCallback: (report) => onProgress?.(report.text),
        }),
      )
      .catch((error: unknown) => {
        // A failed download/device request must not poison every later attempt.
        enginePromise = null
        throw error
      })
  }
  return enginePromise
}

export async function analyzeReflection(
  text: string,
  locale: Locale,
  onProgress?: ReflectionModelProgress,
): Promise<ReflectionAnalysis> {
  const engine = await getEngine(onProgress)
  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: reflectionSystemPrompt(locale) },
      {
        role: 'user',
        content: `Application language: ${locale === 'zh-CN' ? 'Simplified Chinese' : 'English'}

Fill the JSON fields as follows:
- summary: one cautious sentence preserving the user's meaning
- situation: the current situation only
- desired_outcome: what the user appears to want, stated cautiously
- observations: only signals directly supported by the user text
- possible_blockers: tentative interpretations, each using cautious wording
- recommended_mode: the kind of help most useful now
- very_low_action: one concrete action taking at most 2 minutes
- low_action: one concrete action taking at most 5 minutes
- medium_action: one concrete action taking at most 10 minutes

User text:
${text}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 600,
    response_format: {
      type: 'json_object',
      schema: JSON.stringify(MODEL_RESPONSE_SCHEMA),
    },
  })
  const content = reply.choices[0]?.message.content
  if (!content) throw new Error('empty-model-response')
  const validated = normalizeModelResponse(parseModelJson(content), text, locale)
  if (!validated) throw new Error('invalid-model-response')
  return validated
}

export async function makeActionSmallerWithModel(
  action: string,
  locale: Locale,
): Promise<string> {
  const engine = await getEngine()
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['action'],
    properties: { action: { type: 'string' } },
  }
  const reply = await engine.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `${reflectionSystemPrompt(locale)}\nReduce the supplied action to one concrete physical action taking no more than two minutes.`,
      },
      {
        role: 'user',
        content: `Application language: ${locale === 'zh-CN' ? 'Simplified Chinese' : 'English'}\n\nAction:\n${action}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 120,
    response_format: { type: 'json_object', schema: JSON.stringify(schema) },
  })
  const content = reply.choices[0]?.message.content
  if (!content) throw new Error('empty-model-response')
  const parsed = parseModelJson(content) as { action?: unknown }
  if (
    !isText(parsed.action) ||
    (locale === 'zh-CN' && !/[\u3400-\u9fff]/u.test(parsed.action))
  ) {
    throw new Error('invalid-model-response')
  }
  return parsed.action.trim()
}

/**
 * JSON mode should return a bare object. Some model templates still wrap it in
 * a markdown fence or an empty reasoning tag, so remove only those known
 * wrappers before parsing. Arbitrary prose remains invalid.
 */
export function parseModelJson(content: string): unknown {
  const unwrapped = content
    .replace(/<think>[\s\S]*?<\/think>/giu, '')
    .replace(/^\s*```(?:json)?\s*|\s*```\s*$/giu, '')
    .trim()
  return JSON.parse(unwrapped)
}

export function normalizeModelResponse(
  value: unknown,
  originalText: string,
  locale: Locale,
): ReflectionAnalysis | null {
  if (!value || typeof value !== 'object') return null
  const result = value as Record<string, unknown>
  const fallback = createFallbackAnalysis(originalText, locale)
  const zh = locale === 'zh-CN'
  const containsChinese = (value: string) => /[\u3400-\u9fff]/u.test(value)
  const usableText = (value: unknown, fallbackValue: string) =>
    isText(value) && (!zh || containsChinese(value)) ? value.trim() : fallbackValue
  const observations = Array.isArray(result.observations)
    ? result.observations.filter(isText).slice(0, 5)
    : []
  const blockers = Array.isArray(result.possible_blockers)
    ? result.possible_blockers
        .filter(isText)
        .filter((blocker) => !zh || containsChinese(blocker))
        .slice(0, 4)
    : []
  const recommendedMode = [
    'find_first_step',
    'clarify',
    'recover_energy',
    'recommend',
  ].includes(String(result.recommended_mode))
    ? (result.recommended_mode as ReflectionHelpMode)
    : fallback.recommended_mode

  return validateReflectionAnalysis(
    {
      summary: usableText(result.summary, fallback.summary),
      situation: usableText(result.situation, fallback.situation),
      desired_outcome: usableText(result.desired_outcome, fallback.desired_outcome),
      observations: observations.length ? observations : fallback.observations,
      possible_blockers: blockers.map((description) => ({
        type: 'possible',
        description,
        confidence: 'medium' as const,
      })),
      recommended_mode: recommendedMode,
      actions: [
        {
          energy_level: 'very_low',
          label: zh ? '两分钟内' : 'Within two minutes',
          action: normalizeGeneratedAction(
            usableText(result.very_low_action, fallback.actions[0].action),
            locale,
          ),
          estimated_minutes: 2,
        },
        {
          energy_level: 'low',
          label: zh ? '五分钟内' : 'Within five minutes',
          action: normalizeGeneratedAction(
            usableText(result.low_action, fallback.actions[1].action),
            locale,
          ),
          estimated_minutes: 5,
        },
        {
          energy_level: 'medium',
          label: zh ? '十分钟内' : 'Within ten minutes',
          action: normalizeGeneratedAction(
            usableText(result.medium_action, fallback.actions[2].action),
            locale,
          ),
          estimated_minutes: 10,
        },
      ],
    },
    locale,
  )
}
