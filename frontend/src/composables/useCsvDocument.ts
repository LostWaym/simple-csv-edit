import { computed, ref } from 'vue'
import {
  DEFAULT_COLUMN_COUNT,
  DEFAULT_ROW_COUNT,
  HISTORY_LIMIT,
} from '../constants/csv'
import type { CellPosition, CellRange, CsvSnapshot } from '../types/csv'
import { useUndoRedo } from './useUndoRedo'

function createEmptyRow(columnCount: number): string[] {
  return Array.from({ length: columnCount }, () => '')
}

function createInitialDocument(): CsvSnapshot {
  return {
    rows: Array.from({ length: DEFAULT_ROW_COUNT }, () => createEmptyRow(DEFAULT_COLUMN_COUNT)),
  }
}

function normalizeCount(count: number): number {
  const value = Math.floor(count)
  return Number.isFinite(value) && value > 0 ? value : 1
}

export function useCsvDocument() {
  const rows = ref<string[][]>([])
  const isDirty = ref(false)

  const undoRedo = useUndoRedo(HISTORY_LIMIT)

  const columnCount = computed(() => rows.value[0]?.length ?? 0)
  const rowCount = computed(() => rows.value.length)

  const snapshot = computed<CsvSnapshot>(() => ({
    rows: rows.value.map((row) => [...row]),
  }))

  function record(label: string): void {
    undoRedo.record({ label, snapshot: snapshot.value })
  }

  function replaceDocument(next: CsvSnapshot, markDirty = true): void {
    rows.value = next.rows.map((row) => [...row])
    if (markDirty) {
      isDirty.value = true
    }
  }

  function loadDocument(next: CsvSnapshot): void {
    replaceDocument(next, false)
    isDirty.value = false
    undoRedo.reset()
  }

  function createBlankDocument(): void {
    loadDocument(createInitialDocument())
  }

  function setCell(row: number, col: number, value: string): void {
    if (row < 0 || row >= rows.value.length || col < 0 || col >= columnCount.value) {
      return
    }
    if (rows.value[row][col] === value) {
      return
    }
    record('编辑单元格')
    rows.value[row][col] = value
    isDirty.value = true
  }

  function insertRows(index: number, count: number): void {
    const amount = normalizeCount(count)
    const target = Math.min(Math.max(index, 0), rows.value.length)
    record('插入行')
    const newRows = Array.from({ length: amount }, () => createEmptyRow(columnCount.value))
    rows.value.splice(target, 0, ...newRows)
    isDirty.value = true
  }

  function deleteRow(index: number): void {
    if (rows.value.length <= 1 || index < 0 || index >= rows.value.length) {
      return
    }
    record('删除行')
    rows.value.splice(index, 1)
    isDirty.value = true
  }

  function insertColumns(index: number, count: number): void {
    const amount = normalizeCount(count)
    const target = Math.min(Math.max(index, 0), columnCount.value)
    record('插入列')
    const blanks = Array.from({ length: amount }, () => '')
    rows.value.forEach((row) => row.splice(target, 0, ...blanks))
    isDirty.value = true
  }

  function deleteColumn(index: number): void {
    if (columnCount.value <= 1 || index < 0 || index >= columnCount.value) {
      return
    }
    record('删除列')
    rows.value.forEach((row) => row.splice(index, 1))
    isDirty.value = true
  }

  function ensureGridSize(requiredRows: number, requiredColumns: number): void {
    while (columnCount.value < requiredColumns) {
      rows.value.forEach((row) => row.push(''))
    }
    while (rows.value.length < requiredRows) {
      rows.value.push(createEmptyRow(columnCount.value))
    }
  }

  function clearRange(range: CellRange): boolean {
    const { start, end } = range
    let changed = false

    for (let row = start.row; row <= end.row && !changed; row += 1) {
      for (let col = start.col; col <= end.col; col += 1) {
        if (rows.value[row]?.[col]) {
          changed = true
          break
        }
      }
    }

    if (!changed) {
      return false
    }

    record('清空选区')
    for (let row = start.row; row <= end.row; row += 1) {
      const targetRow = rows.value[row]
      if (!targetRow) {
        continue
      }
      for (let col = start.col; col <= end.col; col += 1) {
        targetRow[col] = ''
      }
    }
    isDirty.value = true
    return true
  }

  function pasteMatrix(origin: CellPosition, matrix: string[][]): boolean {
    if (matrix.length === 0 || matrix[0].length === 0) {
      return false
    }

    const requiredRows = origin.row + matrix.length
    const requiredColumns = origin.col + matrix[0].length
    const needsResize =
      requiredRows > rows.value.length || requiredColumns > columnCount.value

    let changed = needsResize
    for (let row = 0; row < matrix.length && !changed; row += 1) {
      for (let col = 0; col < matrix[row].length; col += 1) {
        if (rows.value[origin.row + row]?.[origin.col + col] !== matrix[row][col]) {
          changed = true
          break
        }
      }
    }

    if (!changed) {
      return false
    }

    record('粘贴')
    ensureGridSize(requiredRows, requiredColumns)
    matrix.forEach((rowValues, rowOffset) => {
      const row = origin.row + rowOffset
      rowValues.forEach((value, colOffset) => {
        rows.value[row][origin.col + colOffset] = value
      })
    })
    isDirty.value = true
    return true
  }

  function markClean(): void {
    isDirty.value = false
  }

  function undo(): boolean {
    const previous = undoRedo.takeUndo(snapshot.value)
    if (!previous) {
      return false
    }
    replaceDocument(previous)
    return true
  }

  function redo(): boolean {
    const next = undoRedo.takeRedo(snapshot.value)
    if (!next) {
      return false
    }
    replaceDocument(next)
    return true
  }

  return {
    rows,
    isDirty,
    columnCount,
    rowCount,
    snapshot,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    loadDocument,
    createBlankDocument,
    replaceDocument,
    setCell,
    insertRows,
    deleteRow,
    insertColumns,
    deleteColumn,
    clearRange,
    pasteMatrix,
    markClean,
    undo,
    redo,
  }
}

export type CsvDocument = ReturnType<typeof useCsvDocument>
