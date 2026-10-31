<script setup lang="ts">
import { FILTER_PLACEHOLDER } from '../constants/csv'
import { RELOAD_BUTTON_LABEL, RELOAD_BUTTON_TITLE } from '../constants/reload'

const props = defineProps<{
  canUndo: boolean
  canRedo: boolean
  canCopy: boolean
  canRevealInFolder: boolean
  canReload: boolean
  isDirty: boolean
  query: string
  matchCount: number
  activeMatchIndex: number
}>()

const emit = defineEmits<{
  (event: 'open'): void
  (event: 'create'): void
  (event: 'save'): void
  (event: 'save-as'): void
  (event: 'undo'): void
  (event: 'redo'): void
  (event: 'copy'): void
  (event: 'paste'): void
  (event: 'reveal-in-folder'): void
  (event: 'reload'): void
  (event: 'update:query', value: string): void
  (event: 'next-match'): void
  (event: 'prev-match'): void
  (event: 'open-settings'): void
}>()

function onQueryInput(event: Event): void {
  emit('update:query', (event.target as HTMLInputElement).value)
}

function onSearchKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) {
      emit('prev-match')
    } else {
      emit('next-match')
    }
  }
}
</script>

<template>
  <header class="toolbar">
    <div class="group">
      <button type="button" class="btn" @click="emit('open')">打开文件</button>
      <button type="button" class="btn" @click="emit('create')">新建</button>
      <button type="button" class="btn btn-primary" @click="emit('save')">
        保存<span v-if="isDirty" class="dirty-dot">●</span><span class="hint">Ctrl+S</span>
      </button>
      <button type="button" class="btn" @click="emit('save-as')">另存为</button>
      <button
        type="button"
        class="btn"
        :disabled="!canRevealInFolder"
        title="打开文件所在文件夹"
        @click="emit('reveal-in-folder')"
      >
        打开所在文件夹
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!canReload"
        :title="RELOAD_BUTTON_TITLE"
        @click="emit('reload')"
      >
        {{ RELOAD_BUTTON_LABEL }}
      </button>
    </div>

    <div class="group">
      <button type="button" class="btn btn-icon" :disabled="!canUndo" title="撤销 (Ctrl+Z)" @click="emit('undo')">
        ↶
      </button>
      <button type="button" class="btn btn-icon" :disabled="!canRedo" title="重做 (Ctrl+Y)" @click="emit('redo')">
        ↷
      </button>
      <button type="button" class="btn btn-icon" :disabled="!canCopy" title="复制选区 (Ctrl+C)" @click="emit('copy')">
        ⧉
      </button>
      <button type="button" class="btn btn-icon" title="粘贴 (Ctrl+V)" @click="emit('paste')">
        ⎘
      </button>
      <button type="button" class="btn" title="设置" @click="emit('open-settings')">设置</button>
    </div>

    <div class="group search">
      <input
        class="search-input"
        type="search"
        :placeholder="FILTER_PLACEHOLDER"
        :value="query"
        @input="onQueryInput"
        @keydown="onSearchKeydown"
      />
      <span class="match-count">{{ matchCount > 0 ? `${activeMatchIndex + 1}/${matchCount}` : '无匹配' }}</span>
      <button type="button" class="btn btn-icon" :disabled="matchCount === 0" title="上一个匹配" @click="emit('prev-match')">
        ↑
      </button>
      <button type="button" class="btn btn-icon" :disabled="matchCount === 0" title="下一个匹配" @click="emit('next-match')">
        ↓
      </button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  flex-wrap: wrap;
}

.group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.search {
  margin-left: auto;
}

.btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #ffffff;
  color: #212529;
  font-size: 13px;
  cursor: pointer;
}

.btn:hover:not(:disabled) {
  background: #e9ecef;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4c8bf5;
  border-color: #4c8bf5;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #3b78e0;
}

.btn-icon {
  width: 30px;
  padding: 0;
  font-size: 15px;
  line-height: 1;
}

.hint {
  margin-left: 6px;
  font-size: 11px;
  opacity: 0.75;
}

.dirty-dot {
  margin-left: 4px;
  font-size: 9px;
  vertical-align: middle;
}

.search-input {
  height: 30px;
  width: 220px;
  padding: 0 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
}

.match-count {
  min-width: 52px;
  font-size: 12px;
  color: #868e96;
  text-align: center;
}
</style>
