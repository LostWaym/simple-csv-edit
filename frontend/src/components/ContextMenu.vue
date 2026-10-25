<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { MenuItem } from '../types/csv'

const props = defineProps<{
  x: number
  y: number
  title: string
  items: MenuItem[]
  countEnabled?: boolean
  count?: number
}>()

const emit = defineEmits<{
  (event: 'select', id: string): void
  (event: 'close'): void
  (event: 'update:count', value: number): void
}>()

const menuEl = ref<HTMLElement | null>(null)

function onPointerDown(event: MouseEvent): void {
  if (menuEl.value && !menuEl.value.contains(event.target as Node)) {
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('mousedown', onPointerDown)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onPointerDown)
  window.removeEventListener('keydown', onKeydown)
})

function select(item: MenuItem): void {
  if (item.disabled || item.divider) {
    return
  }
  emit('select', item.id)
}

function onCountInput(event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Number.parseInt(input.value, 10)
  emit('update:count', Number.isFinite(parsed) && parsed > 0 ? parsed : 1)
}

function onCountFocus(event: FocusEvent): void {
  const input = event.target as HTMLInputElement
  input.select()
}
</script>

<template>
  <div ref="menuEl" class="context-menu" :style="{ left: `${props.x}px`, top: `${props.y}px` }">
    <div class="menu-title">{{ props.title }}</div>
    <div v-if="countEnabled" class="count-row">
      <span class="count-label">数量</span>
      <input
        class="count-input"
        type="number"
        min="1"
        step="1"
        :value="props.count ?? 1"
        @focus="onCountFocus"
        @mouseup="onCountFocus"
        @input="onCountInput"
      />
    </div>
    <template v-for="item in items" :key="item.id">
      <hr v-if="item.divider" class="menu-divider" />
      <button
        v-else
        type="button"
        class="menu-item"
        :class="{ danger: item.danger }"
        :disabled="item.disabled"
        @click="select(item)"
      >
        {{ item.label }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 100;
  min-width: 180px;
  padding: 4px;
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}

.menu-title {
  padding: 4px 8px 6px;
  font-size: 11px;
  color: #868e96;
  border-bottom: 1px solid #f1f3f5;
  margin-bottom: 4px;
}

.count-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 8px 6px;
}

.count-label {
  font-size: 12px;
  color: #495057;
}

.count-input {
  width: 64px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 12px;
}

.menu-divider {
  margin: 4px 2px;
  border: none;
  border-top: 1px solid #f1f3f5;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  text-align: left;
  font-size: 13px;
  color: #212529;
  cursor: pointer;
}

.menu-item:hover:not(:disabled) {
  background: #e9ecef;
}

.menu-item.danger {
  color: #e03131;
}

.menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
