import type { CsvEncoding } from './csv'

export interface AppSettings {
  selectAllOnEdit: boolean
  defaultFrozenRows: number
  defaultFrozenCols: number
  saveEncoding: CsvEncoding
}
