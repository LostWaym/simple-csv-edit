import Papa from 'papaparse'
import {
  CLIPBOARD_DELIMITER,
  CLIPBOARD_NEWLINE,
  CSV_BOM,
  CSV_DELIMITER,
  CSV_NEWLINE,
  csvEncodingOption,
} from '../constants/csv'
import type { CsvEncoding, CsvSnapshot } from '../types/csv'

function stripBom(text: string): string {
  return text.startsWith(CSV_BOM) ? text.slice(CSV_BOM.length) : text
}

function normalizeLineEndings(text: string): string {
  let result = ''
  let inQuotes = false
  let atFieldStart = true
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          result += '""'
          index += 1
          continue
        }
        inQuotes = false
      }
      result += char
      continue
    }
    if (char === '"' && atFieldStart) {
      inQuotes = true
      atFieldStart = false
      result += char
      continue
    }
    if (char === ',') {
      atFieldStart = true
      result += char
      continue
    }
    if (char === '\r') {
      result += '\n'
      if (text[index + 1] === '\n') {
        index += 1
      }
      atFieldStart = true
      continue
    }
    if (char === '\n') {
      atFieldStart = true
      result += char
      continue
    }
    atFieldStart = false
    result += char
  }
  return result
}

function normalizeRows(data: string[][]): CsvSnapshot {
  const columnCount = data.reduce((max, row) => Math.max(max, row.length), 0)
  if (columnCount === 0) {
    return { rows: [['']] }
  }

  const rows = data.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ''),
  )
  return { rows }
}

export function parseCsvText(text: string): CsvSnapshot {
  const result = Papa.parse<string[]>(normalizeLineEndings(stripBom(text)), {
    delimiter: CSV_DELIMITER,
    newline: '\n',
    header: false,
    skipEmptyLines: false,
  })

  const data = result.data.filter((row) => Array.isArray(row))
  while (data.length > 1 && data[data.length - 1].every((cell) => cell === '')) {
    data.pop()
  }

  if (data.length === 0) {
    return { rows: [['']] }
  }

  return normalizeRows(data)
}

export function serializeCsv(snapshot: CsvSnapshot, encoding: CsvEncoding): string {
  const body = Papa.unparse(snapshot.rows, {
    delimiter: CSV_DELIMITER,
    newline: CSV_NEWLINE,
  })
  return csvEncodingOption(encoding).withBom ? `${CSV_BOM}${body}` : body
}

export function serializeClipboardTable(matrix: string[][]): string {
  return Papa.unparse(matrix, {
    delimiter: CLIPBOARD_DELIMITER,
    newline: CLIPBOARD_NEWLINE,
  })
}

export function parseClipboardTable(text: string): string[][] {
  const result = Papa.parse<string[]>(normalizeLineEndings(stripBom(text)), {
    delimiter: CLIPBOARD_DELIMITER,
    newline: '\n',
    header: false,
    skipEmptyLines: false,
  })

  const data = result.data.filter((row) => Array.isArray(row))
  while (data.length > 0 && data[data.length - 1].every((cell) => cell === '')) {
    data.pop()
  }

  const columnCount = data.reduce((max, row) => Math.max(max, row.length), 0)
  return data.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ''),
  )
}
