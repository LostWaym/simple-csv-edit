import { ref } from 'vue'

export interface ConfirmDialogOptions {
  title: string
  message: string
  okLabel?: string
  cancelLabel?: string
  /** 勾选一次后，同一 sessionKey 不再弹出 */
  checkLabel?: string
  sessionKey?: string
}

interface PendingConfirm {
  options: ConfirmDialogOptions
  resolve: (confirmed: boolean) => void
}

const request = ref<PendingConfirm | null>(null)
const suppressedKeys = new Set<string>()

export function useConfirmDialog() {
  function confirm(options: ConfirmDialogOptions): Promise<boolean> {
    if (options.sessionKey && suppressedKeys.has(options.sessionKey)) {
      return Promise.resolve(true)
    }
    request.value?.resolve(false)
    return new Promise<boolean>((resolve) => {
      request.value = { options, resolve }
    })
  }

  function settle(confirmed: boolean, suppress = false): void {
    const pending = request.value
    request.value = null
    const key = pending?.options.sessionKey
    if (confirmed && suppress && key) {
      suppressedKeys.add(key)
    }
    pending?.resolve(confirmed)
  }

  return { request, confirm, settle }
}

export type ConfirmDialogState = ReturnType<typeof useConfirmDialog>
