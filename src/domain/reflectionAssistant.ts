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
      minItems: 1,
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

const ACTION_LIMIT: Record<ReflectionEnergyLevel, number> = {
  very_low: 2,
  low: 5,
  medium: 10,
}

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 800

export function validateReflectionAnalysis(value: unknown): ReflectionAnalysis | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ReflectionAnalysis>
  if (
    !isText(candidate.summary) ||
    !isText(candidate.situation) ||
    !isText(candidate.desired_outcome) ||
    !Array.isArray(candidate.observations) ||
    candidate.observations.length > 5 ||
    !candidate.observations.every(isText) ||
    !Array.isArray(candidate.possible_blockers) ||
    candidate.possible_blockers.length > 4 ||
    !['find_first_step', 'clarify', 'recover_energy', 'recommend'].includes(
      candidate.recommended_mode ?? '',
    ) ||
    !Array.isArray(candidate.actions) ||
    candidate.actions.length < 1 ||
    candidate.actions.length > 3
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
  const actionsValid = candidate.actions.every(
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
  return blockersValid && actionsValid ? (candidate as ReflectionAnalysis) : null
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

let enginePromise: Promise<import('@mlc-ai/web-llm').MLCEngineInterface> | null = null

async function getEngine(onProgress?: ReflectionModelProgress) {
  if (!('gpu' in navigator)) throw new Error('webgpu-unavailable')
  if (!enginePromise) {
    enginePromise = import('@mlc-ai/web-llm').then(({ CreateMLCEngine }) =>
      CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
        initProgressCallback: (report) => onProgress?.(report.text),
      }),
    )
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
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Application language: ${locale === 'zh-CN' ? 'Simplified Chinese' : 'English'}\n\nUser text:\n${text}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 900,
    response_format: {
      type: 'json_object',
      schema: JSON.stringify(REFLECTION_RESPONSE_SCHEMA),
    },
  })
  const content = reply.choices[0]?.message.content
  if (!content) throw new Error('empty-model-response')
  const validated = validateReflectionAnalysis(JSON.parse(content))
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
        content: `${SYSTEM_PROMPT}\nReduce the supplied action to one concrete physical action taking no more than two minutes.`,
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
  const parsed = JSON.parse(content) as { action?: unknown }
  if (!isText(parsed.action)) throw new Error('invalid-model-response')
  return parsed.action.trim()
}
