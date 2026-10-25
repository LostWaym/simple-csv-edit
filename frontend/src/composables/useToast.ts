import { onBeforeUnmount, ref } from 'vue'
import { TOAST_DURATION_MS } from '../constants/toast'

export type ToastKind = 'success' | 'error'

const message = ref('')
const kind = ref<ToastKind>('success')
let timer: number | undefined

function hide(): void {
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timer = undefined
  }
  message.value = ''
}

function show(text: string, toastKind: ToastKind = 'success'): void {
  hide()
  message.value = text
  kind.value = toastKind
  timer = window.setTimeout(() => {
    timer = undefined
    message.value = ''
  }, TOAST_DURATION_MS)
}

export function useToast() {
  return { message, kind, show, hide }
}

export function useToastLifecycle(): void {
  onBeforeUnmount(hide)
}

export type Toast = ReturnType<typeof useToast>
