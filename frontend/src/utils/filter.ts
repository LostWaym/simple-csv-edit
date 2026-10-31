import type { CellMatch, HighlightSegment } from '../types/csv'

export function parseKeywords(query: string): string[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((keyword) => keyword.length > 0)
  return Array.from(new Set(keywords))
}

interface MatchRange {
  start: number
  end: number
}

function cellMatchesKeywords(cell: string, keywords: string[]): boolean {
  const haystack = cell.toLowerCase()
  return keywords.every((keyword) => haystack.includes(keyword))
}

function findRanges(text: string, keywords: string[]): MatchRange[] {
  const haystack = text.toLowerCase()
  const ranges: MatchRange[] = []

  keywords.forEach((keyword) => {
    let cursor = 0
    while (cursor < haystack.length) {
      const hit = haystack.indexOf(keyword, cursor)
      if (hit === -1) {
        break
      }
      ranges.push({ start: hit, end: hit + keyword.length })
      cursor = hit + keyword.length
    }
  })

  ranges.sort((a, b) => a.start - b.start)
  const merged: MatchRange[] = []
  ranges.forEach((range) => {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end)
      return
    }
    merged.push({ ...range })
  })
  return merged
}

export function splitHighlight(text: string, query: string): HighlightSegment[] {
  const keywords = parseKeywords(query)
  if (keywords.length === 0 || !cellMatchesKeywords(text, keywords)) {
    return [{ text, matched: false }]
  }

  const ranges = findRanges(text, keywords)
  if (ranges.length === 0) {
    return [{ text, matched: false }]
  }

  const segments: HighlightSegment[] = []
  let cursor = 0

  ranges.forEach((range) => {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), matched: false })
    }
    segments.push({ text: text.slice(range.start, range.end), matched: true })
    cursor = range.end
  })

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false })
  }
  return segments
}

export function findCellMatches(rows: string[][], query: string): CellMatch[] {
  const keywords = parseKeywords(query)
  if (keywords.length === 0) {
    return []
  }
  const matches: CellMatch[] = []

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, col) => {
      if (cellMatchesKeywords(cell, keywords)) {
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
