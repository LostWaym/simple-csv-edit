<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { CellEditCommit } from '../types/csv'
import { columnLabel } from '../utils/column'

const MAX_VISIBLE_ROWS = 3
const LINE_HEIGHT_PX = 18
const VERTICAL_PADDING_PX = 10
const MAX_HEIGHT_PX = MAX_VISIBLE_ROWS * LINE_HEIGHT_PX + VERTICAL_PADDING_PX

const props = defineProps<{
  row: number
  col: number
  value: string
  disabled: boolean
}>()

const emit = defineEmits<{
  (event: 'commit', payload: CellEditCommit): void
  (event: 'dismiss'): void
}>()

const text = ref(props.value)
const editing = ref(false)
const editTarget = ref<{ row: number; col: number } | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
let composing = false

const address = computed(() => `${columnLabel(props.col)}${props.row + 1}`)

function resize(): void {
  const element = textareaRef.value
  if (!element) {
    return
  }
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`
}

function beginEditing(): void {
  if (props.disabled || editing.value) {
    return
  }
  editTarget.value = { row: props.row, col: props.col }
  text.value = props.value
  editing.value = true
  void nextTick(resize)
}

function commit(move: CellEditCommit['move']): void {
  const target = editTarget.value
  if (!target) {
    return
  }
  editing.value = false
  editTarget.value = null
  emit('commit', { row: target.row, col: target.col, value: text.value, move })
}

function cancel(): void {
  if (!editing.value) {
    return
  }
  editing.value = false
  editTarget.value = null
  text.value = props.value
  emit('dismiss')
}

function commitNow(): void {
  if (!editing.value || composing) {
    return
  }
  commit('none')
}

function onInput(event: Event): void {
  if (composing) {
    return
  }
  text.value = (event.target as HTMLTextAreaElement).value
  resize()
}

function insertNewline(): void {
  const element = textareaRef.value
  if (!element) {
    return
  }
  const start = element.selectionStart ?? 0
  const end = element.selectionEnd ?? start
  element.setRangeText('\n', start, end, 'end')
  text.value = element.value
  resize()
}

function onKeydown(event: KeyboardEvent): void {
  if (!editing.value || event.isComposing) {
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      insertNewline()
      return
    }
    commit('down')
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
  }
}

function onBlur(): void {
  if (composing || !editing.value) {
    return
  }
  commit('none')
}

function onCompositionStart(): void {
  composing = true
}

function onCompositionEnd(event: Event): void {
  composing = false
  text.value = (event.target as HTMLTextAreaElement).value
  resize()
}

watch(
  () => [props.row, props.col],
  () => {
    if (editing.value) {
      commit('none')
    }
    text.value = props.value
    void nextTick(resize)
  },
)

watch(
  () => props.value,
  (value) => {
    if (!editing.value) {
      text.value = value
      void nextTick(resize)
    }
  },
)

defineExpose({ commitNow })

onMounted(resize)

</script>

<template>
  <div class="edit-bar">
    <span class="address">{{ address }}</span>
    <textarea
      ref="textareaRef"
      class="edit-input"
      rows="1"
      spellcheck="false"
      :value="text"
      :disabled="disabled"
      :placeholder="disabled ? '' : '当前单元格内容'"
      @focus="beginEditing"
      @input="onInput"
      @keydown="onKeydown"
      @blur="onBlur"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    ></textarea>
  </div>
</template>

<style scoped>
.edit-bar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.address {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: #e9ecef;
  color: #495057;
  font-size: 12px;
  font-weight: 600;
  user-select: none;
}

.edit-input {
  flex: 1;
  min-height: 26px;
  max-height: 64px;
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #ffffff;
  color: #212529;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  resize: none;
  overflow-y: auto;
  box-sizing: border-box;
}

.edit-input:focus {
  outline: none;
  border-color: #4c8bf5;
}

.edit-input:disabled {
  background: #f1f3f5;
  cursor: not-allowed;
}
</style>
