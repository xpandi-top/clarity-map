import {
  Fragment,
  jsx as reactJsx,
  jsxs as reactJsxs,
} from 'react/jsx-runtime'
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
  let translated: Record<string, unknown> | undefined

  for (const [name, value] of Object.entries(props)) {
    const next =
      name === 'children'
        ? translateChildren(value)
        : TRANSLATED_PROPS.has(name) && typeof value === 'string'
          ? t(value)
          : value
    if (next !== value) {
      translated ??= { ...props }
      translated[name] = next
    }
  }

  return translated ?? props
}

export { Fragment }

export function jsx(
  type: Parameters<typeof reactJsx>[0],
  props: Parameters<typeof reactJsx>[1],
  key?: Parameters<typeof reactJsx>[2],
): ReturnType<typeof reactJsx> {
  return reactJsx(
    type,
    translateProps(props as Props) as Parameters<typeof reactJsx>[1],
    key,
  )
}

export function jsxs(
  type: Parameters<typeof reactJsxs>[0],
  props: Parameters<typeof reactJsxs>[1],
  key?: Parameters<typeof reactJsxs>[2],
): ReturnType<typeof reactJsxs> {
  return reactJsxs(
    type,
    translateProps(props as Props) as Parameters<typeof reactJsxs>[1],
    key,
  )
}
