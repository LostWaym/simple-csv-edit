<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppToolbar from '../components/AppToolbar.vue'
import CsvTabPanel from '../components/CsvTabPanel.vue'
import SettingsDialog from '../components/SettingsDialog.vue'
import StatusBar from '../components/StatusBar.vue'
import TabBar from '../components/TabBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { useCsvWorkspace } from '../composables/useCsvWorkspace'
import { useFileDrop } from '../composables/useFileDrop'
import { useSettings } from '../composables/useSettings'
import { useToast, useToastLifecycle } from '../composables/useToast'
import { CSV_FILE_EXTENSION } from '../constants/csv'
import { backend } from '../utils/backend'
import { baseName, hasExtension } from '../utils/path'

const workspace = useCsvWorkspace()
const toast = useToast()
useToastLifecycle()
const { settings, updateSettings } = useSettings()
const { dropActive } = useFileDrop(openDroppedPaths)

const settingsOpen = ref(false)
const panelRef = ref<InstanceType<typeof CsvTabPanel> | null>(null)

workspace.bootstrap()

const activeTab = workspace.activeTab

const canUndo = computed(() => activeTab.value?.document.canUndo.value ?? false)
const canRedo = computed(() => activeTab.value?.document.canRedo.value ?? false)
const canCopy = computed(() => (activeTab.value?.document.rowCount.value ?? 0) > 0)
const canRevealInFolder = computed(() => Boolean(activeTab.value?.file.currentFilePath.value))
const isDirty = computed(() => activeTab.value?.document.isDirty.value ?? false)
const query = computed({
  get: () => activeTab.value?.query.value ?? '',
  set: (value: string) => {
    if (activeTab.value) {
      activeTab.value.query.value = value
    }
  },
})
const matchCount = computed(() => panelRef.value?.matches.length ?? 0)
const activeMatchIndex = computed(() => Math.max(panelRef.value?.activeMatchIndex ?? 0, 0))
const rowCount = computed(() => activeTab.value?.document.rowCount.value ?? 0)
const columnCount = computed(() => activeTab.value?.document.columnCount.value ?? 0)
const filePath = computed(() => activeTab.value?.file.currentFilePath.value ?? null)
const focusLabel = computed(() => activeTab.value?.navigation.focusLabel.value ?? '—')
const selectionLabel = computed(() => activeTab.value?.navigation.selectionLabel.value ?? '')
const statusMessage = computed(() => activeTab.value?.file.statusMessage.value ?? '')
const panelKey = computed(() => {
  const tab = activeTab.value
  return tab ? `${tab.id}:${tab.loadVersion.value}` : ''
})

function selectTab(id: number): void {
  workspace.activateTab(id)
}

async function closeTab(id: number): Promise<void> {
  workspace.closeTab(id)
}

async function openFile(): Promise<void> {
  const result = await workspace.openTab()
  if (result.error) {
    toast.show(result.error, 'error')
    return
  }
  if (result.notice) {
    toast.show(result.notice)
  }
}

async function openDroppedPaths(paths: string[]): Promise<void> {
  const csvPaths = paths.filter((path) => hasExtension(path, CSV_FILE_EXTENSION))
  const ignored = paths.length - csvPaths.length

  if (csvPaths.length === 0) {
    toast.show(`仅支持拖入 ${CSV_FILE_EXTENSION} 文件`, 'error')
    return
  }

  const result = await workspace.openPaths(csvPaths)
  if (result.error) {
    toast.show(result.error, 'error')
    return
  }
  if (ignored > 0) {
    toast.show(`已忽略 ${ignored} 个非 CSV 文件`, 'error')
    return
  }
  if (result.notice) {
    toast.show(result.notice)
    return
  }
  if (csvPaths.length === 1) {
    const tab = activeTab.value
    const name = tab?.file.currentFilePath.value
    toast.show(name ? `已打开 ${baseName(name)}` : '已打开文件')
    return
  }
  toast.show(`已打开 ${csvPaths.length} 个文件`)
}

function createFile(): void {
  workspace.newTab()
}

function undoNow(): void {
  panelRef.value?.undoNow()
}

function redoNow(): void {
  panelRef.value?.redoNow()
}

function saveNow(): void {
  panelRef.value?.saveNow()
}

function saveAsNow(): void {
  panelRef.value?.saveAsNow()
}

function copyNow(): void {
  panelRef.value?.copyNow()
}

function pasteNow(): void {
  panelRef.value?.pasteNow()
}

async function revealInFolder(): Promise<void> {
  const tab = activeTab.value
  const path = tab?.file.currentFilePath.value
  if (!tab || !path) {
    return
  }
  try {
    await backend.revealInFileManager(path)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    toast.show(`打开所在文件夹失败：${detail}`, 'error')
  }
}

function stepMatch(direction: 1 | -1): void {
  panelRef.value?.stepMatch(direction)
}

function isEditableTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) {
    return false
  }
  if (target instanceof HTMLInputElement && target.dataset.gridInput !== undefined) {
    return false
  }
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLSelectElement
  )
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || settingsOpen.value) {
    return
  }

  const mod = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()
  const tab = activeTab.value
  const editing = tab?.navigation.isEditing.value ?? false

  if (mod && key === 's') {
    event.preventDefault()
    saveNow()
    return
  }
  if (mod && key === 'w') {
    event.preventDefault()
    if (tab) {
      void closeTab(tab.id)
    }
    return
  }
  if (mod && key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undoNow()
    return
  }
  if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) {
    event.preventDefault()
    redoNow()
    return
  }
  if (mod && key === 'c' && !editing && !isEditableTarget(event)) {
    event.preventDefault()
    copyNow()
    return
  }
  if (mod && key === 'v' && !editing && !isEditableTarget(event)) {
    event.preventDefault()
    pasteNow()
    return
  }

  if (editing || isEditableTarget(event)) {
    return
  }
  if (mod || event.altKey) {
    return
  }

  if (tab?.navigation.handleGridKeydown(event)) {
    event.preventDefault()
    void panelRef.value?.scrollToFocus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="editor">
    <AppToolbar
      :can-undo="canUndo"
      :can-redo="canRedo"
      :can-copy="canCopy"
      :can-reveal-in-folder="canRevealInFolder"
      :is-dirty="isDirty"
      :query="query"
      :match-count="matchCount"
      :active-match-index="activeMatchIndex"
      @open="openFile()"
      @create="createFile()"
      @save="saveNow()"
      @save-as="saveAsNow()"
      @undo="undoNow()"
      @redo="redoNow()"
      @copy="copyNow()"
      @paste="pasteNow()"
      @reveal-in-folder="revealInFolder()"
      @update:query="query = $event"
      @next-match="stepMatch(1)"
      @prev-match="stepMatch(-1)"
      @open-settings="settingsOpen = true"
    />

    <TabBar
      :tabs="workspace.tabsView.value"
      :active-id="workspace.activeId.value"
      @select="selectTab"
      @close="closeTab"
    />

    <CsvTabPanel
      v-if="activeTab"
      :key="panelKey"
      ref="panelRef"
      :tab="activeTab"
      :settings="settings"
    />

    <StatusBar
      :file-path="filePath"
      :encoding="settings.saveEncoding"
      :meta="{ rowCount, columnCount }"
      :focus-label="focusLabel"
      :selection-label="selectionLabel"
      :message="statusMessage"
    />

    <SettingsDialog
      v-if="settingsOpen"
      :settings="settings"
      @update="updateSettings"
      @close="settingsOpen = false"
    />

    <ToastMessage :message="toast.message.value" :kind="toast.kind.value" />

    <div v-if="dropActive" class="drop-overlay">
      <span class="drop-hint">松开以打开 CSV 文件</span>
    </div>
  </div>
</template>

<style scoped>
.editor {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
  color: #212529;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(76, 139, 245, 0.12);
  border: 3px dashed #4c8bf5;
  box-sizing: border-box;
}

.drop-hint {
  padding: 10px 20px;
  border-radius: 6px;
  background: #4c8bf5;
  color: #ffffff;
  font-size: 15px;
}
</style>
