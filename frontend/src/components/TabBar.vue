<script setup lang="ts">
import type { TabView } from '../types/csv'

const props = defineProps<{
  tabs: TabView[]
  activeId: number
}>()

const emit = defineEmits<{
  (event: 'select', id: number): void
  (event: 'close', id: number): void
}>()

function select(id: number): void {
  if (id === props.activeId) {
    return
  }
  emit('select', id)
}

function close(id: number): void {
  emit('close', id)
}
</script>

<template>
  <nav class="tab-bar" role="tablist">
    <div class="tab-list">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: tab.id === activeId }"
        role="tab"
        :aria-selected="tab.id === activeId"
        @click="select(tab.id)"
        @mousedown.middle.prevent="close(tab.id)"
      >
        <span class="tab-title" :title="tab.title">{{ tab.title }}</span>
        <span v-if="tab.isDirty" class="dirty-dot">●</span>
        <button
          type="button"
          class="tab-close"
          title="关闭标签页 (Ctrl+W)"
          aria-label="关闭标签页"
          @click.stop="close(tab.id)"
        >
          ×
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  height: 32px;
  background: #f1f3f5;
  border-bottom: 1px solid #dee2e6;
  overflow: hidden;
}

.tab-list {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
  padding: 0 6px 0 12px;
  border-right: 1px solid #dee2e6;
  background: #f1f3f5;
  color: #495057;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.tab:hover {
  background: #e9ecef;
}

.tab.active {
  background: #ffffff;
  color: #212529;
  box-shadow: inset 0 -2px 0 #4c8bf5;
}

.tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.dirty-dot {
  font-size: 9px;
  color: #f08c00;
}

.tab-close {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #868e96;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
}

.tab:hover .tab-close,
.tab.active .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: #dee2e6;
  color: #212529;
}
</style>
