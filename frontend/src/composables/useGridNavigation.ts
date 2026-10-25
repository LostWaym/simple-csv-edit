import { computed, ref } from 'vue'
import type { CellPosition, CellRange, EditTarget } from '../types/csv'
import type { CsvDocument } from './useCsvDocument'

function normalizeRange(anchor: CellPosition, focus: CellPosition): CellRange {
  return {
    start: {
      row: Math.min(anchor.row, focus.row),
      col: Math.min(anchor.col, focus.col),
    },
    end: {
      row: Math.max(anchor.row, focus.row),
      col: Math.max(anchor.col, focus.col),
    },
  }
}

export function useGridNavigation(document: CsvDocument) {
  const focused = ref<CellPosition>({ row: 0, col: 0 })
  const anchor = ref<CellPosition | null>(null)
  const rangeSelected = ref(false)
  const editing = ref<EditTarget | null>(null)
  const draft = ref('')

  const isEditing = computed(() => editing.value !== null)

  const activeCell = computed<CellPosition | null>(() => {
    if (document.rowCount.value === 0) {
      return null
    }
    return focused.value
  })

  const selection = computed<CellRange>(() =>
    normalizeRange(anchor.value ?? focused.value, focused.value),
  )

  const hasSelection = computed(() => {
    if (rangeSelected.value) {
      return true
    }
    const { start, end } = selection.value
    return end.row > start.row || end.col > start.col
  })

  const selectionLabel = computed(() => {
    if (!hasSelection.value) {
      return ''
    }
    const { start, end } = selection.value
    return `已选 ${end.row - start.row + 1} 行 × ${end.col - start.col + 1} 列`
  })

  const focusLabel = computed(() => {
    if (document.rowCount.value === 0) {
      return '—'
    }
    const { row, col } = focused.value
    return `第 ${row + 1} 行 · 第 ${col + 1} 列`
  })

  function clampToBounds(position: CellPosition): CellPosition {
    const maxRow = Math.max(document.rowCount.value - 1, 0)
    const maxCol = Math.max(document.columnCount.value - 1, 0)
    return {
      row: Math.min(Math.max(position.row, 0), maxRow),
      col: Math.min(Math.max(position.col, 0), maxCol),
    }
  }

  function focusCell(row: number, col: number): void {
    focused.value = clampToBounds({ row, col })
    anchor.value = null
    rangeSelected.value = false
  }

  function extendSelectionTo(row: number, col: number): void {
    if (!anchor.value) {
      anchor.value = focused.value
    }
    focused.value = clampToBounds({ row, col })
  }

  function clearSelection(): void {
    anchor.value = null
    rangeSelected.value = false
  }

  function selectRow(row: number, extend: boolean): void {
    clearEditing()
    const target = clampToBounds({ row, col: 0 })
    const anchorRow =
      extend && anchor.value ? clampToBounds({ row: anchor.value.row, col: 0 }).row : target.row
    const lastCol = Math.max(document.columnCount.value - 1, 0)

    anchor.value = { row: anchorRow, col: lastCol }
    focused.value = { row: target.row, col: 0 }
    rangeSelected.value = true
  }

  function selectColumn(col: number, extend: boolean): void {
    clearEditing()
    const target = clampToBounds({ row: 0, col })
    const anchorCol =
      extend && anchor.value ? clampToBounds({ row: 0, col: anchor.value.col }).col : target.col
    const lastRow = Math.max(document.rowCount.value - 1, 0)

    anchor.value = { row: lastRow, col: anchorCol }
    focused.value = { row: 0, col: target.col }
    rangeSelected.value = true
  }

  function reconcileBounds(): void {
    focused.value = clampToBounds(focused.value)
    if (anchor.value) {
      anchor.value = clampToBounds(anchor.value)
    }
  }

  function clearEditing(): void {
    editing.value = null
    draft.value = ''
  }

  function beginEdit(row: number, col: number, initial?: string): void {
    if (row < 0) {
      return
    }
    const target = clampToBounds({ row, col })
    focused.value = target
    anchor.value = null
    rangeSelected.value = false
    editing.value = target
    draft.value = initial ?? document.rows.value[target.row]?.[target.col] ?? ''
  }

  function beginComposition(row: number, col: number): void {
    if (row < 0) {
      return
    }
    const target = clampToBounds({ row, col })
    focused.value = target
    anchor.value = null
    rangeSelected.value = false
    editing.value = target
    draft.value = ''
  }

  function commitEdit(): void {
    const target = editing.value
    if (!target) {
      return
    }
    document.setCell(target.row, target.col, draft.value)
    clearEditing()
  }

  function cancelEdit(): void {
    clearEditing()
  }

  function moveBy(rowDelta: number, colDelta: number, extend = false): void {
    const { row, col } = focused.value
    if (extend) {
      extendSelectionTo(row + rowDelta, col + colDelta)
      return
    }
    focusCell(row + rowDelta, col + colDelta)
  }

  function startEditAtFocus(): void {
    beginEdit(focused.value.row, focused.value.col)
  }

  function clearSelectionCells(): boolean {
    return document.clearRange(selection.value)
  }

  function typeToEdit(event: KeyboardEvent): boolean {
    if (event.isComposing || event.key.length !== 1) {
      return false
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false
    }
    beginEdit(focused.value.row, focused.value.col, event.key)
    return true
  }

  function handleGridKeydown(event: KeyboardEvent): boolean {
    if (document.rowCount.value === 0 && document.columnCount.value === 0) {
      return false
    }

    const extend = event.shiftKey

    switch (event.key) {
      case 'ArrowUp':
        moveBy(-1, 0, extend)
        return true
      case 'ArrowDown':
        moveBy(1, 0, extend)
        return true
      case 'ArrowLeft':
        moveBy(0, -1, extend)
        return true
      case 'ArrowRight':
        moveBy(0, 1, extend)
        return true
      case 'Home':
        if (extend) {
          extendSelectionTo(focused.value.row, 0)
        } else {
          focusCell(focused.value.row, 0)
        }
        return true
      case 'End':
        if (extend) {
          extendSelectionTo(focused.value.row, document.columnCount.value - 1)
        } else {
          focusCell(focused.value.row, document.columnCount.value - 1)
        }
        return true
      case 'PageUp':
        moveBy(-10, 0, extend)
        return true
      case 'PageDown':
        moveBy(10, 0, extend)
        return true
      case 'Enter':
        startEditAtFocus()
        return true
      case 'Tab':
        moveBy(0, event.shiftKey ? -1 : 1)
        return true
      case 'Backspace':
      case 'Delete':
        clearSelectionCells()
        return true
      default:
        if (typeToEdit(event)) {
          return true
        }
        return false
    }
  }

  return {
    focused,
    anchor,
    editing,
    draft,
    isEditing,
    activeCell,
    selection,
    hasSelection,
    selectionLabel,
    focusLabel,
    focusCell,
    extendSelectionTo,
    clearSelection,
    selectRow,
    selectColumn,
    reconcileBounds,
    beginEdit,
    beginComposition,
    commitEdit,
    cancelEdit,
    startEditAtFocus,
    handleGridKeydown,
  }
}

export type GridNavigation = ReturnType<typeof useGridNavigation>
