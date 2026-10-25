<script setup lang="ts">
import type { ToastKind } from '../composables/useToast'

defineProps<{
  message: string
  kind: ToastKind
}>()
</script>

<template>
  <Transition name="toast">
    <div v-if="message" class="toast" :class="kind" role="status">
      {{ message }}
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 52px;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  color: #ffffff;
  background: rgba(33, 37, 41, 0.92);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 200;
}

.toast.error {
  background: rgba(224, 49, 49, 0.94);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}
</style>
