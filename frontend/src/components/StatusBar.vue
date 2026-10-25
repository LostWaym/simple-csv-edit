<script setup lang="ts">
import type { CsvEncoding, CsvTableMeta } from '../types/csv'
import { csvEncodingOption } from '../constants/csv'

const props = defineProps<{
  filePath: string | null
  encoding: CsvEncoding
  meta: CsvTableMeta
  focusLabel: string
  selectionLabel: string
  message: string
}>()
</script>

<template>
  <footer class="status-bar">
    <span class="item path" :title="filePath ?? ''">{{ filePath ?? '未保存的新文件' }}</span>
    <span class="item">{{ csvEncodingOption(props.encoding).label }}</span>
    <span class="item">{{ meta.rowCount }} 行</span>
    <span class="item">{{ meta.columnCount }} 列</span>
    <span class="item focus">{{ focusLabel }}</span>
    <span v-if="selectionLabel" class="item selection">{{ selectionLabel }}</span>
    <span class="item message">{{ message }}</span>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 28px;
  padding: 0 12px;
  background: #f1f3f5;
  border-top: 1px solid #dee2e6;
  font-size: 12px;
  color: #495057;
  overflow: hidden;
}

.item {
  white-space: nowrap;
}

.path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.focus {
  color: #1c7ed6;
}

.selection {
  color: #2f9e44;
}

.message {
  color: #868e96;
}
</style>
