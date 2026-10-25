import { onBeforeUnmount, onMounted, ref } from 'vue'
import { OnFileDrop, OnFileDropOff } from '../../wailsjs/runtime/runtime'
import { hasWailsRuntime } from '../utils/wails'

export function useFileDrop(onDrop: (paths: string[]) => void) {
  const active = ref(false)
  const available = hasWailsRuntime()
  let dragDepth = 0

  function isFileDrag(event: DragEvent): boolean {
    const types = event.dataTransfer?.types
    return types ? Array.from(types).includes('Files') : false
  }

  function onDragEnter(event: DragEvent): void {
    if (!available || !isFileDrag(event)) {
      return
    }
    dragDepth += 1
    active.value = true
  }

  function onDragOver(event: DragEvent): void {
    if (!isFileDrag(event)) {
      return
    }
    event.preventDefault()
    if (available) {
      active.value = true
    }
  }

  function onDragLeave(event: DragEvent): void {
    if (!available || !isFileDrag(event)) {
      return
    }
    dragDepth = Math.max(dragDepth - 1, 0)
    if (dragDepth === 0) {
      active.value = false
    }
  }

  function resetActive(): void {
    dragDepth = 0
    active.value = false
  }

  function onFileDrop(_x: number, _y: number, paths: string[]): void {
    resetActive()
    if (paths.length > 0) {
      onDrop(paths)
    }
  }

  onMounted(() => {
    if (available) {
      OnFileDrop(onFileDrop, false)
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', resetActive)
    window.addEventListener('blur', resetActive)
  })

  onBeforeUnmount(() => {
    if (available) {
      OnFileDropOff()
    }
    window.removeEventListener('dragenter', onDragEnter)
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragleave', onDragLeave)
    window.removeEventListener('drop', resetActive)
    window.removeEventListener('blur', resetActive)
  })

  return { dropActive: active }
}
