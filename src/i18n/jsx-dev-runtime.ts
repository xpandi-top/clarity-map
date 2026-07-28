import { jsxDEV as reactJsxDEV } from 'react/jsx-dev-runtime'
import { Fragment } from 'react/jsx-runtime'
import { t } from './core'

type Props = Record<string, unknown> | null

const TRANSLATED_PROPS = new Set(['aria-label', 'alt', 'placeholder', 'title'])

function translateChildren(value: unknown): unknown {
  if (typeof value === 'string') return t(value)
  if (Array.isArray(value)) return value.map(translateChildren)
  return value
}

function translateProps(props: Props): Props {
  if (!props) return props
  const translated = { ...props }
  let changed = false

  for (const [name, value] of Object.entries(props)) {
    const next =
      name === 'children'
        ? translateChildren(value)
        : TRANSLATED_PROPS.has(name) && typeof value === 'string'
          ? t(value)
          : value
    if (next !== value) {
      translated[name] = next
      changed = true
    }
  }

  return changed ? translated : props
}

export { Fragment }

export function jsxDEV(
  type: Parameters<typeof reactJsxDEV>[0],
  props: Parameters<typeof reactJsxDEV>[1],
  key: Parameters<typeof reactJsxDEV>[2],
  isStaticChildren: Parameters<typeof reactJsxDEV>[3],
  source: Parameters<typeof reactJsxDEV>[4],
  self: Parameters<typeof reactJsxDEV>[5],
): ReturnType<typeof reactJsxDEV> {
  return reactJsxDEV(
    type,
    translateProps(props as Props) as Parameters<typeof reactJsxDEV>[1],
    key,
    isStaticChildren,
    source,
    self,
  )
}

export type { JSX } from 'react/jsx-dev-runtime'
