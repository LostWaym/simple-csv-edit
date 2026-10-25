import { ClipboardGetText, ClipboardSetText } from '../../wailsjs/runtime/runtime'

function hasWailsRuntime(): boolean {
  return typeof window !== 'undefined' && 'runtime' in window
}

export async function writeClipboardText(text: string): Promise<boolean> {
  if (hasWailsRuntime()) {
    try {
      return await ClipboardSetText(text)
    } catch {
      return false
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function readClipboardText(): Promise<string | null> {
  if (hasWailsRuntime()) {
    try {
      return await ClipboardGetText()
    } catch {
      return null
    }
  }

  try {
    return await navigator.clipboard.readText()
  } catch {
    return null
  }
}
