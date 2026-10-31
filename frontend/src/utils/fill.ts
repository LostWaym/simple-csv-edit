import type { FillDirection } from '../types/csv'

interface NumericParts {
  prefix: string
  digits: string
  suffix: string
  value: number
}

const NUMERIC_PATTERN = /^(.*?)(\d+)(.*)$/s

function parseNumericParts(source: string): NumericParts | null {
  const match = NUMERIC_PATTERN.exec(source)
  if (!match) {
    return null
  }
  const [, prefix, digits, suffix] = match
  const value = Number.parseInt(digits, 10)
  if (!Number.isFinite(value)) {
    return null
  }
  return { prefix, digits, suffix, value }
}

export interface FillSequence {
  valueAt: (index: number) => string
}

export function createFillSequence(
  source: string,
  direction: FillDirection,
): FillSequence | null {
  const parts = parseNumericParts(source)
  if (!parts) {
    return null
  }

  const step = direction === 'down' || direction === 'right' ? 1 : -1
  const padWidth = parts.digits.length
  const padLength = Math.max(padWidth, String(parts.value).length)
  const usePadding = padWidth > 1

  return {
    valueAt: (index: number) => {
      const next = parts.value + step * (index + 1)
      if (next < 0) {
        return ''
      }
      const text = String(next)
      const padded = usePadding ? text.padStart(Math.max(padLength, text.length), '0') : text
      return `${parts.prefix}${padded}${parts.suffix}`
    },
  }
}
