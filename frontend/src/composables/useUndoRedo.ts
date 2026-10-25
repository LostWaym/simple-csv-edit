import { computed, ref } from 'vue'
import type { CsvSnapshot, HistoryEntry } from '../types/csv'

export function useUndoRedo(limit: number) {
  const undoStack = ref<HistoryEntry[]>([])
  const redoStack = ref<HistoryEntry[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function record(entry: HistoryEntry): void {
    undoStack.value.push(entry)
    if (undoStack.value.length > limit) {
      undoStack.value.shift()
    }
    redoStack.value = []
  }

  function takeUndo(current: CsvSnapshot): CsvSnapshot | null {
    const entry = undoStack.value.pop()
    if (!entry) {
      return null
    }
    redoStack.value.push({ label: entry.label, snapshot: current })
    return entry.snapshot
  }

  function takeRedo(current: CsvSnapshot): CsvSnapshot | null {
    const entry = redoStack.value.pop()
    if (!entry) {
      return null
    }
    undoStack.value.push({ label: entry.label, snapshot: current })
    return entry.snapshot
  }

  function reset(): void {
    undoStack.value = []
    redoStack.value = []
  }

  return { canUndo, canRedo, record, takeUndo, takeRedo, reset }
}
