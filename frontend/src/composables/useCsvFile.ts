import { ref } from 'vue'
import { CSV_FILE_EXTENSION, DEFAULT_FILE_NAME } from '../constants/csv'
import { backend } from '../utils/backend'
import { serializeCsv } from '../utils/csv'
import { baseName, ensureExtension } from '../utils/path'
import type { CsvDocument } from './useCsvDocument'
import { useSettings } from './useSettings'

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useCsvFile(document: CsvDocument) {
  const currentFilePath = ref<string | null>(null)
  const statusMessage = ref('')
  const saveError = ref('')
  const { settings } = useSettings()

  function confirmDiscard(): boolean {
    if (!document.isDirty.value) {
      return true
    }
    return window.confirm('当前文件有未保存的修改，确定要放弃这些修改吗？')
  }

  function setLoadedFile(path: string): void {
    currentFilePath.value = path
    statusMessage.value = `已打开 ${baseName(path)}`
  }

  async function writeToFile(path: string): Promise<boolean> {
    saveError.value = ''
    try {
      const content = serializeCsv(document.snapshot.value, settings.value.saveEncoding)
      await backend.writeTextFile(path, content)
      currentFilePath.value = path
      document.markClean()
      statusMessage.value = `已保存 ${baseName(path)}`
      return true
    } catch (error) {
      saveError.value = `保存失败：${describeError(error)}`
      statusMessage.value = saveError.value
      return false
    }
  }

  async function saveFile(): Promise<boolean> {
    if (currentFilePath.value) {
      return writeToFile(currentFilePath.value)
    }
    return saveFileAs()
  }

  async function saveFileAs(): Promise<boolean> {
    saveError.value = ''
    const suggested = currentFilePath.value
      ? baseName(currentFilePath.value)
      : DEFAULT_FILE_NAME
    try {
      const path = await backend.saveFileDialog(ensureExtension(suggested, CSV_FILE_EXTENSION))
      if (!path) {
        return false
      }
      return writeToFile(path)
    } catch (error) {
      saveError.value = `另存为失败：${describeError(error)}`
      statusMessage.value = saveError.value
      return false
    }
  }

  return {
    currentFilePath,
    statusMessage,
    saveError,
    saveFile,
    saveFileAs,
    confirmDiscard,
    setLoadedFile,
  }
}

export type CsvFile = ReturnType<typeof useCsvFile>
