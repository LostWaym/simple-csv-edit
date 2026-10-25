import type { CellMatch, HighlightSegment } from '../types/csv'

export function splitHighlight(text: string, query: string): HighlightSegment[] {
  const trimmed = query.trim()
  if (trimmed.length === 0) {
    return [{ text, matched: false }]
  }

  const needle = trimmed.toLowerCase()
  const haystack = text.toLowerCase()
  const segments: HighlightSegment[] = []
  let cursor = 0

  while (cursor < text.length) {
    const hit = haystack.indexOf(needle, cursor)
    if (hit === -1) {
      segments.push({ text: text.slice(cursor), matched: false })
      break
    }

    if (hit > cursor) {
      segments.push({ text: text.slice(cursor, hit), matched: false })
    }
    segments.push({ text: text.slice(hit, hit + trimmed.length), matched: true })
    cursor = hit + trimmed.length
  }

  return segments.length > 0 ? segments : [{ text, matched: false }]
}

export function findCellMatches(rows: string[][], query: string): CellMatch[] {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) {
    return []
  }
  const matches: CellMatch[] = []

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, col) => {
      if (cell.toLowerCase().includes(needle)) {
        matches.push({ row: rowIndex, col })
      }
    })
  })

  return matches
}

export function nextMatch(
  matches: CellMatch[],
  current: CellMatch | null,
  step: 1 | -1,
): CellMatch | null {
  if (matches.length === 0) {
    return null
  }
  if (!current) {
    return step === 1 ? matches[0] : matches[matches.length - 1]
  }

  const index = matches.findIndex(
    (match) => match.row === current.row && match.col === current.col,
  )
  if (index === -1) {
    return matches[0]
  }

  const nextIndex = (index + step + matches.length) % matches.length
  return matches[nextIndex]
}
