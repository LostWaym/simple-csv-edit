<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { CSV_ENCODINGS } from '../constants/csv'
import type { CsvEncoding } from '../types/csv'
import type { AppSettings } from '../types/settings'

const props = defineProps<{
  settings: AppSettings
}>()

const emit = defineEmits<{
  (event: 'update', patch: Partial<AppSettings>): void
  (event: 'close'): void
}>()

const dialogEl = ref<HTMLElement | null>(null)

function onSelectAllChange(event: Event): void {
  emit('update', { selectAllOnEdit: (event.target as HTMLInputElement).checked })
}

function parseFrozenCount(event: Event): number {
  const value = Math.floor(Number.parseInt((event.target as HTMLInputElement).value, 10))
  return Number.isFinite(value) && value > 0 ? value : 0
}

function onFrozenRowsChange(event: Event): void {
  emit('update', { defaultFrozenRows: parseFrozenCount(event) })
}

function onFrozenColsChange(event: Event): void {
  emit('update', { defaultFrozenCols: parseFrozenCount(event) })
}

function onEncodingChange(event: Event): void {
  emit('update', { saveEncoding: (event.target as HTMLSelectElement).value as CsvEncoding })
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

function onBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="backdrop" @click="onBackdropClick">
    <div ref="dialogEl" class="dialog" role="dialog" aria-modal="true">
      <header class="dialog-head">
        <h2 class="title">设置</h2>
        <button type="button" class="close" aria-label="关闭" @click="emit('close')">×</button>
      </header>

      <div class="dialog-body">
        <label class="row">
          <input
            type="checkbox"
            :checked="props.settings.selectAllOnEdit"
            @change="onSelectAllChange"
          />
          <span class="row-text">
            <span class="row-title">编辑时全选单元格内容</span>
            <span class="row-desc">开启后，进入编辑模式会自动选中原有内容；关闭则把光标放到末尾。</span>
          </span>
        </label>

        <div class="row column">
          <span class="row-text">
            <span class="row-title">默认冻结</span>
            <span class="row-desc">新建或打开文件时应用的冻结行数、列数；已在编辑的标签不受影响。</span>
          </span>
        </div>

        <label class="row column">
          <span class="row-title">默认冻结行数</span>
          <input
            class="number-input"
            type="number"
            min="0"
            step="1"
            :value="props.settings.defaultFrozenRows"
            @change="onFrozenRowsChange"
          />
        </label>

        <label class="row column">
          <span class="row-title">默认冻结列数</span>
          <input
            class="number-input"
            type="number"
            min="0"
            step="1"
            :value="props.settings.defaultFrozenCols"
            @change="onFrozenColsChange"
          />
        </label>

        <label class="row column">
          <span class="row-text">
            <span class="row-title">保存编码</span>
            <span class="row-desc">所有标签保存文件时统一使用该编码。</span>
          </span>
          <select
            class="select-input"
            :value="props.settings.saveEncoding"
            @change="onEncodingChange"
          >
            <option v-for="option in CSV_ENCODINGS" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <footer class="dialog-foot">
        <button type="button" class="btn" @click="emit('close')">关闭</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(33, 37, 41, 0.35);
}

.dialog {
  width: 420px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #212529;
}

.close {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #868e96;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.close:hover {
  background: #f1f3f5;
  color: #212529;
}

.dialog-body {
  padding: 16px;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.row + .row {
  margin-top: 14px;
}

.row.column {
  align-items: center;
  justify-content: space-between;
}

.number-input {
  width: 88px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
  color: #212529;
}

.select-input {
  height: 28px;
  padding: 0 6px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #ffffff;
  font-size: 13px;
  color: #212529;
}

.row input {
  margin-top: 2px;
}

.row-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-title {
  font-size: 13px;
  color: #212529;
}

.row-desc {
  font-size: 12px;
  color: #868e96;
  line-height: 1.5;
}

.dialog-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.btn {
  height: 30px;
  padding: 0 16px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #ffffff;
  font-size: 13px;
  cursor: pointer;
}

.btn:hover {
  background: #e9ecef;
}
</style>
