<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { ConfirmDialogOptions } from '../composables/useConfirmDialog'
import { CONFIRM_CANCEL_LABEL, CONFIRM_OK_LABEL } from '../constants/confirm'

const props = defineProps<{
  options: ConfirmDialogOptions
}>()

const emit = defineEmits<{
  (event: 'settle', confirmed: boolean, suppress: boolean): void
}>()

const suppress = ref(false)

function onConfirm(): void {
  emit('settle', true, suppress.value)
}

function onCancel(): void {
  emit('settle', false, false)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    onCancel()
  }
}

function onBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    onCancel()
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
    <div class="dialog" role="alertdialog" aria-modal="true">
      <header class="dialog-head">
        <h2 class="title">{{ props.options.title }}</h2>
      </header>

      <div class="dialog-body">
        <p class="message">{{ props.options.message }}</p>
        <label v-if="props.options.checkLabel" class="check">
          <input v-model="suppress" type="checkbox" />
          <span>{{ props.options.checkLabel }}</span>
        </label>
      </div>

      <footer class="dialog-foot">
        <button type="button" class="btn" @click="onCancel">
          {{ props.options.cancelLabel ?? CONFIRM_CANCEL_LABEL }}
        </button>
        <button type="button" class="btn btn-primary" @click="onConfirm">
          {{ props.options.okLabel ?? CONFIRM_OK_LABEL }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 160;
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
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #212529;
}

.dialog-body {
  padding: 16px;
}

.message {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #212529;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-size: 13px;
  color: #495057;
  cursor: pointer;
}

.dialog-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

.btn-primary {
  background: #4c8bf5;
  border-color: #4c8bf5;
  color: #ffffff;
}

.btn-primary:hover {
  background: #3b78e0;
}
</style>
