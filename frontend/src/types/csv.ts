export interface CellPosition {
  row: number
  col: number
}

export interface CellRange {
  start: CellPosition
  end: CellPosition
}

export interface CsvSnapshot {
  rows: string[][]
}

export interface HistoryEntry {
  label: string
  snapshot: CsvSnapshot
}

export interface EditTarget extends CellPosition {}

export type CellEditMove = 'down' | 'none'

export interface CellEditCommit extends CellPosition {
  value: string
  move: CellEditMove
}

export interface CellMatch extends CellPosition {}

export type FillDirection = 'down' | 'up' | 'right' | 'left'

export interface FillPreview {
  row: number
  col: number
}

export type ContextTargetKind = 'row' | 'column' | 'cell'

export interface GridContextTarget {
  kind: ContextTargetKind
  index: number
  cell: CellPosition | null
  x: number
  y: number
}

export interface MenuItem {
  id: string
  label: string
  disabled?: boolean
  danger?: boolean
  divider?: boolean
}

export interface HighlightSegment {
  text: string
  matched: boolean
}

export interface CsvTableMeta {
  rowCount: number
  columnCount: number
}

export interface GridScrollState {
  top: number
  left: number
}

export interface TabView {
  id: number
  title: string
  isDirty: boolean
}

export type CsvEncoding = 'utf8' | 'utf8-bom'

export interface CsvEncodingOption {
  id: CsvEncoding
  label: string
  withBom: boolean
}
