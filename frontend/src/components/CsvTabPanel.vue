<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CellEditBar from './CellEditBar.vue'
import ContextMenu from './ContextMenu.vue'
import CsvGrid from './CsvGrid.vue'
import { useToast } from '../composables/useToast'
import type { CsvTab } from '../composables/useCsvWorkspace'
import type { CellEditCommit, CellMatch, FillDirection, GridContextTarget, MenuItem } from '../types/csv'
import type { AppSettings } from '../types/settings'
import { readClipboardText, writeClipboardText } from '../utils/clipboard'
import { parseClipboardTable, serializeClipboardTable } from '../utils/csv'
import { createFillSequence } from '../utils/fill'
import { findCellMatches, nextMatch } from '../utils/filter'
import { isSizeMultipleOf, tileMatrixToSize } from '../utils/matrix'

const props = defineProps<{
  tab: CsvTab
  settings: AppSettings
}>()

const csvDoc = props.tab.document
const file = props.tab.file
const navigation = props.tab.navigation
const query = props.tab.query
const currentMatch = props.tab.currentMatch
const toast = useToast()

const gridRef = ref<InstanceType<typeof CsvGrid> | null>(null)
const editBarRef = ref<InstanceType<typeof CellEditBar> | null>(null)
const contextTarget = ref<GridContextTarget | null>(null)
const insertCount = ref(1)
const dragActive = ref(false)

const barValue = computed(() => {
  if (csvDoc.rowCount.value === 0) {
    return ''
  }
  const { row, col } = navigation.focused.value
  const target = navigation.editing.value
  if (target && target.row === row && target.col === col) {
    return navigation.draft.value
  }
  return csvDoc.rows.value[row]?.[col] ?? ''
})

function handleBarCommit(payload: CellEditCommit): void {
  csvDoc.setCell(payload.row, payload.col, payload.value)
  if (payload.move === 'down') {
    navigation.focusCell(payload.row + 1, payload.col)
    void scrollToFocus()
  }
  if (payload.move !== 'none') {
    gridRef.value?.focusGrid()
  }
}

function handleBarDismiss(): void {
  gridRef.value?.focusGrid()
}

const matches = computed<CellMatch[]>(() =>
  findCellMatches(csvDoc.rows.value, query.value),
)

const activeMatchIndex = computed(() => {
  const current = currentMatch.value
  if (!current) {
    return matches.value.length > 0 ? 0 : -1
  }
  return matches.value.findIndex(
    (match) => match.row === current.row && match.col === current.col,
  )
})

const rowMenuItems = computed<MenuItem[]>(() => {
  const rowIndex = contextTarget.value?.cell?.row ?? contextTarget.value?.index ?? 0
  return [
    { id: 'insert-row-above', label: '在上方插入行' },
    { id: 'insert-row-below', label: '在下方插入行' },
    {
      id: 'delete-row',
      label: '删除当前行',
      danger: true,
      disabled: csvDoc.rowCount.value <= 1,
    },
    { id: 'divider-row-freeze', label: '', divider: true },
    {
      id: 'freeze-row',
      label: '冻结到此行',
      disabled: props.tab.frozenRows.value === rowIndex + 1,
    },
    {
      id: 'unfreeze-row',
      label: '取消行冻结',
      disabled: props.tab.frozenRows.value === 0,
    },
  ]
})

const columnMenuItems = computed<MenuItem[]>(() => {
  const colIndex = contextTarget.value?.cell?.col ?? contextTarget.value?.index ?? 0
  return [
    { id: 'insert-column-left', label: '在左侧插入列' },
    { id: 'insert-column-right', label: '在右侧插入列' },
    {
      id: 'delete-column',
      label: '删除当前列',
      danger: true,
      disabled: csvDoc.columnCount.value <= 1,
    },
    { id: 'divider-column-freeze', label: '', divider: true },
    {
      id: 'freeze-column',
      label: '冻结到此列',
      disabled: props.tab.frozenCols.value === colIndex + 1,
    },
    {
      id: 'unfreeze-column',
      label: '取消列冻结',
      disabled: props.tab.frozenCols.value === 0,
    },
  ]
})

const cellMenuItems = computed<MenuItem[]>(() => [
  ...rowMenuItems.value,
  { id: 'divider-row-column', label: '', divider: true },
  ...columnMenuItems.value,
])

const menuTitle = computed(() => {
  const target = contextTarget.value
  if (!target) {
    return ''
  }
  if (target.kind === 'row') {
    return `第 ${target.index + 1} 行`
  }
  if (target.kind === 'column') {
    return `第 ${target.index + 1} 列`
  }
  return target.cell ? `第 ${target.cell.row + 1} 行 · 第 ${target.cell.col + 1} 列` : ''
})

const menuItems = computed<MenuItem[]>(() => {
  switch (contextTarget.value?.kind) {
    case 'row':
      return rowMenuItems.value
    case 'column':
      return columnMenuItems.value
    case 'cell':
      return cellMenuItems.value
    default:
      return []
  }
})

function closeMenu(): void {
  contextTarget.value = null
  insertCount.value = 1
}

function moveFocusTo(row: number, col: number): void {
  navigation.focusCell(row, col)
}

function handleCellClick(row: number, col: number, shiftKey: boolean): void {
  commitPendingEdit()
  if (shiftKey) {
    navigation.extendSelectionTo(row, col)
    return
  }
  navigation.focusCell(row, col)
}

function handleDragStart(row: number, col: number): void {
  commitPendingEdit()
  dragActive.value = true
  navigation.focusCell(row, col)
}

function handleDragEnter(row: number, col: number): void {
  if (!dragActive.value) {
    return
  }
  navigation.extendSelectionTo(row, col)
}

function handleDragEnd(): void {
  dragActive.value = false
}

function getSelectionMatrix(): string[][] {
  const { start, end } = navigation.selection.value
  return csvDoc.rows.value
    .slice(start.row, end.row + 1)
    .map((row) => row.slice(start.col, end.col + 1))
}

async function copySelection(): Promise<void> {
  const matrix = getSelectionMatrix()
  if (matrix.length === 0) {
    return
  }
  const text = serializeClipboardTable(matrix)
  const ok = await writeClipboardText(text)
  if (ok) {
    toast.show(`已复制 ${matrix.length} 行 × ${matrix[0].length} 列`)
  } else {
    toast.show('复制失败', 'error')
  }
}

async function pasteSelection(): Promise<void> {
  const text = await readClipboardText()
  if (text === null) {
    toast.show('读取剪贴板失败', 'error')
    return
  }
  const clipboardMatrix = parseClipboardTable(text)
  if (clipboardMatrix.length === 0 || clipboardMatrix[0].length === 0) {
    toast.show('剪贴板没有可粘贴的内容', 'error')
    return
  }

  const { start, end } = navigation.selection.value
  const selectionRows = end.row - start.row + 1
  const selectionCols = end.col - start.col + 1
  const blockRows = clipboardMatrix.length
  const blockCols = clipboardMatrix[0].length

  const tile =
    navigation.hasSelection.value
    && isSizeMultipleOf(selectionRows, selectionCols, blockRows, blockCols)

  const matrix = tile
    ? tileMatrixToSize(clipboardMatrix, selectionRows, selectionCols)
    : clipboardMatrix
  const origin = start

  if (!csvDoc.pasteMatrix(origin, matrix)) {
    toast.show('内容与目标区域相同，无需粘贴')
    return
  }

  toast.show(
    tile
      ? `已用 ${blockRows} 行 × ${blockCols} 列填充 ${selectionRows} 行 × ${selectionCols} 列`
      : `已粘贴 ${matrix.length} 行 × ${matrix[0].length} 列`,
  )

  await nextTick()
  navigation.focusCell(origin.row, origin.col)
  if (matrix.length > 1 || matrix[0].length > 1) {
    navigation.extendSelectionTo(
      origin.row + matrix.length - 1,
      origin.col + matrix[0].length - 1,
    )
  }
  await nextTick()
  gridRef.value?.scrollToCell(origin.row, origin.col)
}

async function goToMatch(match: CellMatch | null): Promise<void> {
  currentMatch.value = match
  if (!match) {
    return
  }
  if (match.row >= 0) {
    moveFocusTo(match.row, match.col)
  }
  await nextTick()
  gridRef.value?.scrollToCell(match.row, match.col)
}

function stepMatch(direction: 1 | -1): void {
  void goToMatch(nextMatch(matches.value, currentMatch.value, direction))
}

watch(query, async () => {
  currentMatch.value = matches.value[0] ?? null
  if (matches.value.length > 0) {
    await nextTick()
    gridRef.value?.scrollToCell(matches.value[0].row, matches.value[0].col)
  }
})

async function scrollToFocus(): Promise<void> {
  const { row, col } = navigation.focused.value
  await nextTick()
  gridRef.value?.scrollToCell(row, col)
}

watch(
  () => [csvDoc.rowCount.value, csvDoc.columnCount.value],
  ([rowCount, columnCount]) => {
    if (navigation.editing.value) {
      const { row, col } = navigation.editing.value
      if (row >= rowCount || col >= columnCount) {
        navigation.cancelEdit()
      }
    }
    props.tab.frozenRows.value = Math.min(props.tab.frozenRows.value, rowCount)
    props.tab.frozenCols.value = Math.min(props.tab.frozenCols.value, columnCount)
    navigation.reconcileBounds()
  },
)

function handleCommit(move: 'down' | 'right' | 'left' | 'none'): void {
  const target = navigation.editing.value
  if (!target) {
    return
  }
  navigation.commitEdit()
  if (move === 'none') {
    return
  }

  const nextRow = move === 'down' ? target.row + 1 : target.row
  const nextCol =
    move === 'down' ? target.col : target.col + (move === 'right' ? 1 : -1)

  const insideRows = nextRow >= 0 && nextRow < csvDoc.rowCount.value
  const insideCols = nextCol >= 0 && nextCol < csvDoc.columnCount.value
  if (insideRows && insideCols) {
    navigation.beginEdit(nextRow, nextCol)
    void scrollToFocus()
    return
  }
  navigation.focusCell(nextRow, nextCol)
  void scrollToFocus()
}

function openRowMenu(index: number, event: MouseEvent): void {
  commitPendingEdit()
  navigation.selectRow(index, false)
  contextTarget.value = { kind: 'row', index, cell: null, x: event.clientX, y: event.clientY }
}

function openColumnMenu(index: number, event: MouseEvent): void {
  commitPendingEdit()
  navigation.selectColumn(index, false)
  contextTarget.value = { kind: 'column', index, cell: null, x: event.clientX, y: event.clientY }
}

function openCellMenu(row: number, col: number, event: MouseEvent): void {
  commitPendingEdit()
  navigation.focusCell(row, col)
  contextTarget.value = {
    kind: 'cell',
    index: row,
    cell: { row, col },
    x: event.clientX,
    y: event.clientY,
  }
}

function handleMenuSelect(id: string): void {
  const target = contextTarget.value
  const count = insertCount.value
  closeMenu()
  if (!target) {
    return
  }

  const rowIndex = target.cell ? target.cell.row : target.index
  const colIndex = target.cell ? target.cell.col : target.index

  switch (id) {
    case 'insert-row-above':
      csvDoc.insertRows(rowIndex, count)
      break
    case 'insert-row-below':
      csvDoc.insertRows(rowIndex + 1, count)
      break
    case 'delete-row':
      csvDoc.deleteRow(rowIndex)
      break
    case 'insert-column-left':
      csvDoc.insertColumns(colIndex, count)
      break
    case 'insert-column-right':
      csvDoc.insertColumns(colIndex + 1, count)
      break
    case 'delete-column':
      csvDoc.deleteColumn(colIndex)
      break
    case 'freeze-row':
      props.tab.frozenRows.value = rowIndex + 1
      break
    case 'unfreeze-row':
      props.tab.frozenRows.value = 0
      break
    case 'freeze-column':
      props.tab.frozenCols.value = colIndex + 1
      break
    case 'unfreeze-column':
      props.tab.frozenCols.value = 0
      break
    default:
      break
  }
}

function commitPendingEdit(): void {
  editBarRef.value?.commitNow()
  if (navigation.editing.value) {
    navigation.commitEdit()
  }
}

function undoNow(): void {
  commitPendingEdit()
  csvDoc.undo()
}

function redoNow(): void {
  commitPendingEdit()
  csvDoc.redo()
}

function saveNow(): void {
  commitPendingEdit()
  void notifySave(() => file.saveFile())
}

function saveAsNow(): void {
  commitPendingEdit()
  void notifySave(() => file.saveFileAs())
}

async function notifySave(action: () => Promise<boolean>): Promise<void> {
  const ok = await action()
  if (ok) {
    toast.show(file.statusMessage.value)
    return
  }
  if (file.saveError.value) {
    toast.show(file.saveError.value, 'error')
  }
}

function copyNow(): void {
  commitPendingEdit()
  void copySelection()
}

function pasteNow(): void {
  commitPendingEdit()
  void pasteSelection()
}

async function fillFromFocus(direction: FillDirection, count: number): Promise<void> {
  commitPendingEdit()
  const origin = navigation.focused.value
  const source = csvDoc.rows.value[origin.row]?.[origin.col] ?? ''
  const sequence = createFillSequence(source, direction)
  if (!sequence) {
    return
  }

  const values = Array.from({ length: count }, (_, index) => sequence.valueAt(index))
  if (!csvDoc.fillSequence(origin, direction, count, values)) {
    return
  }

  await nextTick()
  const rowStep = direction === 'down' ? 1 : direction === 'up' ? -1 : 0
  const colStep = direction === 'right' ? 1 : direction === 'left' ? -1 : 0
  navigation.extendSelectionTo(origin.row + rowStep * count, origin.col + colStep * count)
  gridRef.value?.scrollToCell(
    origin.row + rowStep * count,
    origin.col + colStep * count,
  )
}

function persistScroll(): void {
  const state = gridRef.value?.getScrollState()
  if (state) {
    props.tab.scroll = state
  }
}

onMounted(async () => {
  await nextTick()
  gridRef.value?.restoreScroll(props.tab.scroll)
})

onBeforeUnmount(() => {
  persistScroll()
})

defineExpose({
  undoNow,
  redoNow,
  saveNow,
  saveAsNow,
  copyNow,
  pasteNow,
  stepMatch,
  scrollToFocus,
  commitPendingEdit,
  matches,
  activeMatchIndex,
})
</script>

<template>
  <section class="tab-panel">
    <CellEditBar
      ref="editBarRef"
      :row="navigation.focused.value.row"
      :col="navigation.focused.value.col"
      :value="barValue"
      :disabled="csvDoc.rowCount.value === 0"
      @commit="handleBarCommit"
      @dismiss="handleBarDismiss"
    />

    <CsvGrid
      ref="gridRef"
      :rows="csvDoc.rows.value"
      :focused="navigation.focused.value"
      :selection="navigation.selection.value"
      :has-selection="navigation.hasSelection.value"
      :editing="navigation.editing.value"
      :draft="navigation.draft.value"
      :query="query"
      :current-match="currentMatch"
      :select-all-on-edit="props.settings.selectAllOnEdit"
      :frozen-rows="props.tab.frozenRows.value"
      :frozen-cols="props.tab.frozenCols.value"
      @cell-click="handleCellClick"
      @cell-drag-start="handleDragStart"
      @cell-drag-enter="handleDragEnter"
      @cell-drag-end="handleDragEnd"
      @begin-edit="navigation.beginEdit"
      @begin-composition="navigation.beginComposition"
      @commit-edit="handleCommit"
      @cancel-edit="navigation.cancelEdit()"
      @update:draft="navigation.draft.value = $event"
      @row-head-click="navigation.selectRow"
      @column-head-click="navigation.selectColumn"
      @open-row-menu="openRowMenu"
      @open-column-menu="openColumnMenu"
      @open-cell-menu="openCellMenu"
      @fill-commit="fillFromFocus"
    />

    <ContextMenu
      v-if="contextTarget"
      :x="contextTarget.x"
      :y="contextTarget.y"
      :title="menuTitle"
      :items="menuItems"
      :count-enabled="true"
      :count="insertCount"
      @update:count="insertCount = $event"
      @select="handleMenuSelect"
      @close="closeMenu"
    />
  </section>
</template>

<style scoped>
.tab-panel {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
