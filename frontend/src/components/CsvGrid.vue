<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  CellMatch,
  CellRange,
  FillDirection,
  GridScrollState,
  HighlightSegment,
} from '../types/csv'
import { GRID_BOTTOM_SAFE_AREA_PX } from '../constants/csv'
import { columnLabel } from '../utils/column'
import { createFillSequence } from '../utils/fill'
import { splitHighlight } from '../utils/filter'

const props = defineProps<{
  rows: string[][]
  focused: { row: number; col: number }
  selection: CellRange
  hasSelection: boolean
  editing: { row: number; col: number } | null
  draft: string
  query: string
  currentMatch: CellMatch | null
  selectAllOnEdit: boolean
  frozenRows: number
  frozenCols: number
}>()

const emit = defineEmits<{
  (event: 'cell-click', row: number, col: number, shiftKey: boolean): void
  (event: 'cell-drag-start', row: number, col: number): void
  (event: 'cell-drag-enter', row: number, col: number): void
  (event: 'cell-drag-end'): void
  (event: 'begin-edit', row: number, col: number, initial?: string): void
  (event: 'begin-composition', row: number, col: number): void
  (event: 'commit-edit', move: 'down' | 'right' | 'left' | 'none'): void
  (event: 'cancel-edit'): void
  (event: 'update:draft', value: string): void
  (event: 'row-head-click', row: number, shiftKey: boolean): void
  (event: 'column-head-click', col: number, shiftKey: boolean): void
  (event: 'open-row-menu', index: number, mouseEvent: MouseEvent): void
  (event: 'open-column-menu', index: number, mouseEvent: MouseEvent): void
  (event: 'open-cell-menu', row: number, col: number, mouseEvent: MouseEvent): void
  (event: 'fill-commit', direction: FillDirection, count: number): void
}>()

const highlightQuery = computed(() => props.query)

const frozenRowCount = computed(() =>
  Math.min(Math.max(Math.floor(props.frozenRows), 0), props.rows.length),
)

const frozenColCount = computed(() =>
  Math.min(Math.max(Math.floor(props.frozenCols), 0), props.rows[0]?.length ?? 0),
)

interface FrozenLayout {
  headerHeight: number
  rowHeight: number
  rowHeadWidth: number
  colLefts: number[]
  frozenColRight: number
}

const emptyLayout: FrozenLayout = {
  headerHeight: 0,
  rowHeight: 0,
  rowHeadWidth: 0,
  colLefts: [],
  frozenColRight: 0,
}

const layout = ref<FrozenLayout>({ ...emptyLayout })

function split(text: string): HighlightSegment[] {
  return splitHighlight(text, highlightQuery.value)
}

function isFocused(row: number, col: number): boolean {
  return props.focused.row === row && props.focused.col === col
}

function isEditingCell(row: number, col: number): boolean {
  return props.editing?.row === row && props.editing?.col === col
}

function isCurrentMatch(row: number, col: number): boolean {
  return props.currentMatch?.row === row && props.currentMatch?.col === col
}

function isSelected(row: number, col: number): boolean {
  if (!props.hasSelection) {
    return false
  }
  const { start, end } = props.selection
  return row >= start.row && row <= end.row && col >= start.col && col <= end.col
}

const fillDragging = ref(false)
const fillPreview = ref<{ direction: FillDirection; count: number } | null>(null)

const fillHandleVisible = computed(
  () => !props.hasSelection && props.editing === null && canFillFromFocused.value,
)

const canFillFromFocused = computed(() => {
  const source = props.rows[props.focused.row]?.[props.focused.col] ?? ''
  return createFillSequence(source, 'down') !== null
})

function isFillPreview(row: number, col: number): boolean {
  const preview = fillPreview.value
  if (!preview) {
    return false
  }
  const { row: originRow, col: originCol } = props.focused
  const { count } = preview
  switch (preview.direction) {
    case 'down':
      return col === originCol && row > originRow && row - originRow <= count
    case 'up':
      return col === originCol && row < originRow && originRow - row <= count
    case 'right':
      return row === originRow && col > originCol && col - originCol <= count
    case 'left':
      return row === originRow && col < originCol && originCol - col <= count
    default:
      return false
  }
}

function resolveFillDirection(
  origin: { row: number; col: number },
  row: number,
  col: number,
): FillDirection | null {
  const rowDelta = row - origin.row
  const colDelta = col - origin.col
  if (Math.abs(rowDelta) >= Math.abs(colDelta)) {
    if (rowDelta > 0) {
      return 'down'
    }
    if (rowDelta < 0) {
      return 'up'
    }
  }
  if (colDelta > 0) {
    return 'right'
  }
  if (colDelta < 0) {
    return 'left'
  }
  return null
}

function onFillHandleMouseDown(event: MouseEvent): void {
  if (event.button !== 0 || !canFillFromFocused.value) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  fillDragging.value = true
  fillPreview.value = null
}

function onCellMouseEnter(row: number, col: number): void {
  if (fillDragging.value) {
    updateFillPreview(row, col)
    return
  }
  if (!dragging.value) {
    return
  }
  const origin = dragOrigin.value
  if (origin && origin.row === row && origin.col === col) {
    return
  }
  dragMoved.value = true
  emit('cell-drag-enter', row, col)
}

function updateFillPreview(row: number, col: number): void {
  const origin = props.focused
  const direction = resolveFillDirection(origin, row, col)
  if (!direction) {
    fillPreview.value = null
    return
  }
  const count =
    direction === 'down' || direction === 'up'
      ? Math.abs(row - origin.row)
      : Math.abs(col - origin.col)
  fillPreview.value = count > 0 ? { direction, count } : null
}

function stopFillDragging(commit: boolean): void {
  if (!fillDragging.value) {
    return
  }
  const preview = fillPreview.value
  fillDragging.value = false
  fillPreview.value = null
  if (commit && preview) {
    emit('fill-commit', preview.direction, preview.count)
  }
  void nextTick(focusGhostInput)
}

function onFillMouseUp(): void {
  if (fillDragging.value) {
    stopFillDragging(true)
  }
}

function onFillKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    stopFillDragging(false)
  }
}

function isRowActive(row: number): boolean {
  if (!props.hasSelection) {
    return false
  }
  const { start, end } = props.selection
  const lastCol = (props.rows[0]?.length ?? 0) - 1
  return start.col === 0 && end.col === lastCol && row >= start.row && row <= end.row
}

function isColumnActive(col: number): boolean {
  if (!props.hasSelection) {
    return false
  }
  const { start, end } = props.selection
  const lastRow = props.rows.length - 1
  return start.row === 0 && end.row === lastRow && col >= start.col && col <= end.col
}

function cellClass(row: number, col: number): Record<string, boolean> {
  return {
    'is-focused': isFocused(row, col),
    'is-editing': isEditingCell(row, col),
    'is-match': isCurrentMatch(row, col),
    'is-selected': isSelected(row, col),
    'is-frozen-row': row < frozenRowCount.value,
    'is-frozen-col': col < frozenColCount.value,
    'is-frozen-row-edge': isFrozenRowEdge(row, col),
    'is-frozen-col-edge': isFrozenColEdge(col, row),
    'is-fill-preview': isFillPreview(row, col),
  }
}

function isFrozenRowEdge(row: number, col: number | null): boolean {
  if (frozenRowCount.value === 0 || row !== frozenRowCount.value - 1) {
    return false
  }
  if (col === null) {
    return frozenColCount.value === 0
  }
  return col >= frozenColCount.value
}

function isFrozenColEdge(col: number, row: number | null): boolean {
  if (frozenColCount.value === 0 || col !== frozenColCount.value - 1) {
    return false
  }
  if (row === null) {
    return frozenRowCount.value === 0
  }
  return row >= frozenRowCount.value
}

function isFrozenRow(row: number): boolean {
  return row < frozenRowCount.value
}

function isFrozenCol(col: number): boolean {
  return col < frozenColCount.value
}

function frozenTop(row: number): number {
  return layout.value.headerHeight + row * layout.value.rowHeight
}

function frozenLeft(col: number): number {
  return layout.value.rowHeadWidth + (layout.value.colLefts[col] ?? 0)
}

function cellStyle(row: number, col: number): Record<string, string> {
  const style: Record<string, string> = {}
  const rowFrozen = isFrozenRow(row)
  const colFrozen = isFrozenCol(col)
  if (rowFrozen) {
    style.top = `${frozenTop(row)}px`
  }
  if (colFrozen) {
    style.left = `${frozenLeft(col)}px`
  }
  return style
}

function rowHeadStyle(row: number): Record<string, string> {
  if (!isFrozenRow(row)) {
    return {}
  }
  return { top: `${frozenTop(row)}px` }
}

function colHeadStyle(col: number): Record<string, string> {
  if (!isFrozenCol(col)) {
    return {}
  }
  return { left: `${frozenLeft(col)}px` }
}

const dragging = ref(false)
const dragMoved = ref(false)
const dragOrigin = ref<{ row: number; col: number } | null>(null)
let suppressNextClick = false

function onCellClick(row: number, col: number, event: MouseEvent): void {
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }
  if (event.target instanceof HTMLInputElement || isEditingCell(row, col)) {
    return
  }
  emit('cell-click', row, col, event.shiftKey)
  void nextTick(focusGhostInput)
}

function onCellMouseDown(row: number, col: number, event: MouseEvent): void {
  if (event.button !== 0) {
    return
  }
  if (event.target instanceof HTMLInputElement || isEditingCell(row, col)) {
    return
  }
  event.preventDefault()
  dragging.value = true
  dragMoved.value = false
  dragOrigin.value = { row, col }
  emit('cell-drag-start', row, col)
}

function stopDragging(): void {
  if (!dragging.value) {
    return
  }
  dragging.value = false
  dragOrigin.value = null
  suppressNextClick = dragMoved.value
  dragMoved.value = false
  emit('cell-drag-end')
  void nextTick(focusGhostInput)
}

function onCellDblClick(row: number, col: number, event: MouseEvent): void {
  if (event.target instanceof HTMLInputElement) {
    return
  }
  emit('begin-edit', row, col)
}

function onEditKeydown(event: KeyboardEvent): void {
  if (!props.editing || event.isComposing) {
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    emit('commit-edit', 'down')
    return
  }
  if (event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    emit('commit-edit', event.shiftKey ? 'left' : 'right')
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('cancel-edit')
  }
}

function onEditBlur(row: number, col: number): void {
  if (composing || !isEditingCell(row, col)) {
    return
  }
  emit('commit-edit', 'none')
}

function onCellInput(row: number, col: number, event: Event): void {
  if (composing) {
    return
  }
  const value = (event.target as HTMLInputElement).value
  if (isEditingCell(row, col)) {
    emit('update:draft', value)
    return
  }
  emit('begin-edit', row, col, value)
}

let composing = false

function onCellCompositionStart(row: number, col: number): void {
  composing = true
  if (!isEditingCell(row, col)) {
    emit('begin-composition', row, col)
  }
}

function onCellCompositionEnd(row: number, col: number, event: Event): void {
  composing = false
  const value = (event.target as HTMLInputElement).value
  if (isEditingCell(row, col)) {
    emit('update:draft', value)
    return
  }
  emit('begin-edit', row, col, value)
}

function getFocusedInput(): HTMLInputElement | null {
  const container = scrollEl.value
  if (!container) {
    return null
  }
  const { row, col } = props.focused
  return container.querySelector<HTMLInputElement>(
    `td[data-row="${row}"][data-col="${col}"] input.cell-input`,
  )
}

function focusGhostInput(): void {
  const input = getFocusedInput()
  if (!input || isEditingCell(props.focused.row, props.focused.col)) {
    return
  }
  if (input.value !== '') {
    input.value = ''
  }
  if (document.activeElement !== input) {
    input.focus({ preventScroll: true })
  }
}

function focusGrid(): void {
  void nextTick(focusGhostInput)
}

function isDraftUnchanged(): boolean {
  const target = props.editing
  if (!target) {
    return false
  }
  return (props.rows[target.row]?.[target.col] ?? '') === props.draft
}

function applyEditCaret(): void {
  const input = getFocusedInput()
  if (!input || composing || !props.editing) {
    return
  }
  if (input.value !== props.draft) {
    input.value = props.draft
  }
  if (document.activeElement !== input) {
    input.focus({ preventScroll: true })
  }
  if (props.selectAllOnEdit && isDraftUnchanged()) {
    input.select()
    return
  }
  const end = input.value.length
  input.setSelectionRange(end, end)
}

watch(
  () => [props.focused.row, props.focused.col],
  () => {
    if (props.editing) {
      return
    }
    void nextTick(focusGhostInput)
  },
)

watch(
  () => props.editing,
  () => {
    if (!props.editing) {
      void nextTick(focusGhostInput)
      return
    }
    void nextTick(applyEditCaret)
  },
)

function onRowHeadClick(row: number, event: MouseEvent): void {
  emit('row-head-click', row, event.shiftKey)
  void nextTick(focusGhostInput)
}

function onColumnHeadClick(col: number, event: MouseEvent): void {
  emit('column-head-click', col, event.shiftKey)
  void nextTick(focusGhostInput)
}

function onCellContextMenu(row: number, col: number, event: MouseEvent): void {
  emit('open-cell-menu', row, col, event)
}

const scrollEl = ref<HTMLElement | null>(null)

function measureLayout(): void {
  const container = scrollEl.value
  if (!container) {
    return
  }
  if (frozenRowCount.value === 0 && frozenColCount.value === 0) {
    layout.value = { ...emptyLayout }
    return
  }

  const headerCell = container.querySelector<HTMLElement>('th.col-head')
  const cornerCell = container.querySelector<HTMLElement>('th.corner')
  const firstRowHead = container.querySelector<HTMLElement>('th.row-head')

  const headerHeight = headerCell?.getBoundingClientRect().height ?? 0
  const rowHeight = firstRowHead?.getBoundingClientRect().height ?? 0
  const rowHeadWidth = cornerCell?.getBoundingClientRect().width ?? 0

  const colLefts: number[] = []
  let offset = 0
  for (let col = 0; col < frozenColCount.value; col += 1) {
    colLefts.push(offset)
    const head = container.querySelector<HTMLElement>(`th.col-head[data-col="${col}"]`)
    offset += head?.getBoundingClientRect().width ?? 0
  }

  layout.value = {
    headerHeight,
    rowHeight,
    rowHeadWidth,
    colLefts,
    frozenColRight: offset,
  }
}

function scheduleMeasure(): void {
  void nextTick(() => {
    measureLayout()
    syncResizeObserver()
  })
}

let resizeObserver: ResizeObserver | null = null

function syncResizeObserver(): void {
  const container = scrollEl.value
  if (!container) {
    return
  }
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => measureLayout())
  }
  resizeObserver.disconnect()
  container
    .querySelectorAll<HTMLElement>('th.corner, th.col-head, tbody tr:first-child th.row-head')
    .forEach((cell) => resizeObserver?.observe(cell))
}

watch(
  () => [
    frozenRowCount.value,
    frozenColCount.value,
    props.rows.length,
    props.rows[0]?.length ?? 0,
  ],
  () => {
    scheduleMeasure()
  },
)

function scrollToCell(row: number, col: number): void {
  const container = scrollEl.value
  if (!container) {
    return
  }
  const selector = `td[data-row="${row}"][data-col="${col}"]`
  const target = container.querySelector<HTMLElement>(selector)
  if (!target) {
    return
  }
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  adjustForFrozen(row, col, container, target)
}

function adjustForFrozen(
  row: number,
  col: number,
  container: HTMLElement,
  target: HTMLElement,
): void {
  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const { headerHeight, rowHeight, rowHeadWidth, frozenColRight } = layout.value

  const topObstruction =
    row < frozenRowCount.value
      ? headerHeight
      : headerHeight + frozenRowCount.value * rowHeight
  if (targetRect.top < containerRect.top + topObstruction) {
    container.scrollTop -= containerRect.top + topObstruction - targetRect.top
  }

  const leftObstruction =
    col < frozenColCount.value ? rowHeadWidth : rowHeadWidth + frozenColRight
  if (targetRect.left < containerRect.left + leftObstruction) {
    container.scrollLeft -= containerRect.left + leftObstruction - targetRect.left
  }
}

function getScrollState(): GridScrollState {
  const container = scrollEl.value
  if (!container) {
    return { top: 0, left: 0 }
  }
  return { top: container.scrollTop, left: container.scrollLeft }
}

function restoreScroll(state: GridScrollState | null): boolean {
  const container = scrollEl.value
  if (!container || !state) {
    return false
  }
  container.scrollTop = state.top
  container.scrollLeft = state.left
  return true
}

defineExpose({ scrollToCell, getScrollState, restoreScroll, focusGrid })

onMounted(() => {
  window.addEventListener('mouseup', stopDragging)
  window.addEventListener('mouseup', onFillMouseUp)
  window.addEventListener('keydown', onFillKeydown)
  void nextTick(focusGhostInput)
  scheduleMeasure()
  syncResizeObserver()
})

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', stopDragging)
  window.removeEventListener('mouseup', onFillMouseUp)
  window.removeEventListener('keydown', onFillKeydown)
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    ref="scrollEl"
    class="grid-scroll"
    :style="{ paddingBottom: `${GRID_BOTTOM_SAFE_AREA_PX}px` }"
  >
    <table class="grid">
      <thead>
        <tr>
          <th class="corner" scope="col"></th>
          <th
            v-for="col in (rows[0]?.length ?? 0)"
            :key="col - 1"
            scope="col"
            class="col-head"
            :class="{
              'is-active': isColumnActive(col - 1),
              'is-frozen': isFrozenCol(col - 1),
              'is-frozen-edge': isFrozenColEdge(col - 1, null),
            }"
            :data-col="col - 1"
            :style="colHeadStyle(col - 1)"
            @click="onColumnHeadClick(col - 1, $event)"
            @contextmenu.prevent="emit('open-column-menu', col - 1, $event)"
          >
            {{ columnLabel(col - 1) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
          <th
            class="row-head"
            scope="row"
            :class="{
              'is-active': isRowActive(rowIndex),
              'is-frozen': isFrozenRow(rowIndex),
              'is-frozen-edge': isFrozenRowEdge(rowIndex, null),
            }"
            :style="rowHeadStyle(rowIndex)"
            @click="onRowHeadClick(rowIndex, $event)"
            @contextmenu.prevent="emit('open-row-menu', rowIndex, $event)"
          >
            {{ rowIndex + 1 }}
          </th>
          <td
            v-for="(cell, col) in row"
            :key="col"
            :data-row="rowIndex"
            :data-col="col"
            :class="cellClass(rowIndex, col)"
            :style="cellStyle(rowIndex, col)"
            @click="onCellClick(rowIndex, col, $event)"
            @mousedown="onCellMouseDown(rowIndex, col, $event)"
            @mouseenter="onCellMouseEnter(rowIndex, col)"
            @dblclick="onCellDblClick(rowIndex, col, $event)"
            @contextmenu.prevent="onCellContextMenu(rowIndex, col, $event)"
          >
            <input
              v-if="isFocused(rowIndex, col) || isEditingCell(rowIndex, col)"
              key="editor"
              data-grid-input
              class="cell-input"
              :class="{ 'is-ghost': !isEditingCell(rowIndex, col) }"
              @input="onCellInput(rowIndex, col, $event)"
              @compositionstart="onCellCompositionStart(rowIndex, col)"
              @compositionend="onCellCompositionEnd(rowIndex, col, $event)"
              @keydown="onEditKeydown"
              @blur="onEditBlur(rowIndex, col)"
            />
            <span v-show="!isEditingCell(rowIndex, col)" key="text" class="cell-text">
              <template v-for="(segment, index) in split(cell)" :key="index">
                <mark v-if="segment.matched" class="hit">{{ segment.text }}</mark>
                <template v-else>{{ segment.text }}</template>
              </template>
            </span>
            <span
              v-if="fillHandleVisible && isFocused(rowIndex, col)"
              class="fill-handle"
              @mousedown.stop.prevent="onFillHandleMouseDown"
            ></span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.grid-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #ffffff;
}

.grid {
  border-collapse: separate;
  border-spacing: 0;
  width: max-content;
  min-width: 100%;
  font-size: 13px;
  table-layout: auto;
}

.corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 6;
  width: 48px;
  background: #f1f3f5;
  border-right: 1px solid #dee2e6;
  border-bottom: 1px solid #dee2e6;
}

.col-head {
  position: sticky;
  top: 0;
  z-index: 4;
  background: #f1f3f5;
  border-right: 1px solid #dee2e6;
  border-bottom: 1px solid #dee2e6;
  padding: 0 10px;
  height: 32px;
  min-width: 120px;
  max-width: 360px;
  text-align: center;
  font-weight: 600;
  color: #495057;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.col-head.is-frozen {
  z-index: 5;
  background: #e9f0fa;
}.col-head:hover,
.row-head:hover {
  background: #e9ecef;
}

.col-head.is-active,
.row-head.is-active {
  background: #d0ebff;
  color: #1864ab;
}

.row-head {
  position: sticky;
  left: 0;
  z-index: 4;
  background: #f1f3f5;
  border-right: 1px solid #dee2e6;
  border-bottom: 1px solid #e9ecef;
  width: 48px;
  min-width: 48px;
  text-align: right;
  padding: 0 8px;
  font-weight: 500;
  color: #868e96;
  cursor: pointer;
  user-select: none;
}

.row-head.is-frozen {
  z-index: 5;
  background: #e9f0fa;
}

td {
  position: relative;
  border-right: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
  padding: 0 10px;
  height: 30px;
  min-width: 120px;
  max-width: 360px;
  background: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: cell;
  user-select: none;
}

td.is-frozen-row,
td.is-frozen-col {
  position: sticky;
  z-index: 2;
  background: #ffffff;
}

td.is-frozen-row.is-frozen-col {
  z-index: 3;
}

td.is-frozen-row-edge,
th.row-head.is-frozen-edge {
  box-shadow: inset 0 -2px 0 #868e96;
}

td.is-frozen-col-edge,
th.col-head.is-frozen-edge {
  box-shadow: inset -2px 0 0 #868e96;
}

td.is-focused {
  outline: 2px solid #4c8bf5;
  outline-offset: -2px;
}

td.is-selected {
  background: #e7f5ff;
}

td.is-match {
  background: #fff3bf;
}

td.is-selected.is-match {
  background: #d8f0c8;
}

.cell-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-input {
  position: absolute;
  inset: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 0 10px;
  border: none;
  outline: none;
  font: inherit;
  background: transparent;
}

.cell-input.is-ghost {
  color: transparent;
  caret-color: transparent;
  pointer-events: none;
}

.hit {
  background: #ffd43b;
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.fill-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 8px;
  height: 8px;
  background: #4c8bf5;
  border: 1px solid #ffffff;
  border-radius: 1px;
  cursor: crosshair;
}

td.is-fill-preview {
  background: #d0ebff;
}
</style>
