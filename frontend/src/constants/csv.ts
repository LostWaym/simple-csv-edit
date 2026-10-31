import type { CsvEncoding, CsvEncodingOption } from '../types/csv'

export const CSV_BOM = '\uFEFF'
export const CSV_DELIMITER = ','
export const CSV_NEWLINE = '\r\n'

export const CLIPBOARD_DELIMITER = '\t'
export const CLIPBOARD_NEWLINE = '\n'

export const CSV_ENCODINGS: CsvEncodingOption[] = [
  { id: 'utf8', label: 'UTF-8', withBom: false },
  { id: 'utf8-bom', label: 'UTF-8 with BOM', withBom: true },
]

export const DEFAULT_CSV_ENCODING: CsvEncoding = 'utf8'

export function csvEncodingOption(id: CsvEncoding): CsvEncodingOption {
  return (
    CSV_ENCODINGS.find((option) => option.id === id)
    ?? CSV_ENCODINGS.find((option) => option.id === DEFAULT_CSV_ENCODING)!
  )
}

export const CSV_FILE_EXTENSION = '.csv'
export const DEFAULT_FILE_NAME = `未命名${CSV_FILE_EXTENSION}`

export const DEFAULT_COLUMN_COUNT = 3
export const DEFAULT_ROW_COUNT = 20

export const UNTITLED_TITLE_PREFIX = '未命名'

export const FILTER_PLACEHOLDER = '过滤关键词，空格分隔（需全部匹配）'

export const GRID_BOTTOM_SAFE_AREA_PX = 600

export const HISTORY_LIMIT = 100
