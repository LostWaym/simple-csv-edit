import { ref } from 'vue'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../constants/settings'
import type { AppSettings } from '../types/settings'

function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_SETTINGS }
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function persistSettings(settings: AppSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    return
  }
}

const settings = ref<AppSettings>(loadSettings())

export function useSettings() {
  function updateSettings(patch: Partial<AppSettings>): void {
    settings.value = { ...settings.value, ...patch }
    persistSettings(settings.value)
  }

  return { settings, updateSettings }
}
