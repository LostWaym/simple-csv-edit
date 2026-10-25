import { DEFAULT_CSV_ENCODING } from './csv'
import type { AppSettings } from '../types/settings'

export const SETTINGS_STORAGE_KEY = 'simple-csv-edit:settings'

export const DEFAULT_SETTINGS: AppSettings = {
  selectAllOnEdit: false,
  defaultFrozenRows: 1,
  defaultFrozenCols: 0,
  saveEncoding: DEFAULT_CSV_ENCODING,
}
