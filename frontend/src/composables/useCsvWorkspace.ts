import { computed, ref, shallowRef, type Ref } from 'vue'
import { UNTITLED_TITLE_PREFIX } from '../constants/csv'
import type { CellMatch, GridScrollState, TabView } from '../types/csv'
import { backend } from '../utils/backend'
import { parseCsvText } from '../utils/csv'
import { baseName } from '../utils/path'
import { useCsvDocument, type CsvDocument } from './useCsvDocument'
import { useCsvFile, type CsvFile } from './useCsvFile'
import { useGridNavigation, type GridNavigation } from './useGridNavigation'
import { useSettings } from './useSettings'

export interface CsvTab {
  id: number
  document: CsvDocument
  file: CsvFile
  navigation: GridNavigation
  query: Ref<string>
  currentMatch: Ref<CellMatch | null>
  frozenRows: Ref<number>
  frozenCols: Ref<number>
  untitledIndex: number | null
  scroll: GridScrollState | null
  loadVersion: Ref<number>
}

export interface OpenTabResult {
  notice?: string
  error?: string
}

export function useCsvWorkspace() {
  const tabs = shallowRef<CsvTab[]>([])
  const activeId = ref(0)
  const { settings } = useSettings()

  let nextId = 1
  let nextUntitledIndex = 1

  const activeTab = computed<CsvTab | null>(
    () => tabs.value.find((tab) => tab.id === activeId.value) ?? null,
  )

  const tabsView = computed<TabView[]>(() =>
    tabs.value.map((tab) => ({
      id: tab.id,
      title: tabTitle(tab),
      isDirty: tab.document.isDirty.value,
    })),
  )

  function tabTitle(tab: CsvTab): string {
    const path = tab.file.currentFilePath.value
    if (path) {
      return baseName(path)
    }
    return `${UNTITLED_TITLE_PREFIX} ${tab.untitledIndex ?? 1}`
  }

  function defaultFrozenCount(value: number): number {
    const count = Math.floor(value)
    return Number.isFinite(count) && count > 0 ? count : 0
  }

  function createTab(): CsvTab {
    const document = useCsvDocument()
    document.createBlankDocument()

    const tab: CsvTab = {
      id: nextId,
      document,
      file: useCsvFile(document),
      navigation: useGridNavigation(document),
      query: ref(''),
      currentMatch: ref<CellMatch | null>(null),
      frozenRows: ref(defaultFrozenCount(settings.value.defaultFrozenRows)),
      frozenCols: ref(defaultFrozenCount(settings.value.defaultFrozenCols)),
      untitledIndex: nextUntitledIndex,
      scroll: null,
      loadVersion: ref(0),
    }

    nextId += 1
    nextUntitledIndex += 1
    return tab
  }

  function newTab(): CsvTab {
    const tab = createTab()
    tabs.value = [...tabs.value, tab]
    activeId.value = tab.id
    return tab
  }

  function activateTab(id: number): void {
    if (!tabs.value.some((tab) => tab.id === id)) {
      return
    }
    commitActiveEdit()
    activeId.value = id
  }

  function isPristine(tab: CsvTab): boolean {
    return tab.file.currentFilePath.value === null && !tab.document.isDirty.value
  }

  function commitActiveEdit(): void {
    const tab = activeTab.value
    if (tab?.navigation.editing.value) {
      tab.navigation.commitEdit()
    }
  }

  async function openTab(): Promise<OpenTabResult> {
    let path: string
    try {
      path = await backend.openFileDialog()
    } catch (error) {
      return { error: `打开失败：${describeError(error)}` }
    }
    if (!path) {
      return {}
    }

    const existing = tabs.value.find((tab) => tab.file.currentFilePath.value === path)
    if (existing) {
      activateTab(existing.id)
      return { notice: `该文件已在当前标签页打开：${baseName(path)}` }
    }

    let text: string
    try {
      text = await backend.readTextFile(path)
    } catch (error) {
      return { error: `打开失败：${describeError(error)}` }
    }

    commitActiveEdit()

    const current = activeTab.value
    const reuse = current !== null && isPristine(current)

    const tab = reuse ? current : createTab()
    tab.document.loadDocument(parseCsvText(text))
    tab.file.setLoadedFile(path)
    tab.query.value = ''
    tab.currentMatch.value = null
    tab.frozenRows.value = defaultFrozenCount(settings.value.defaultFrozenRows)
    tab.frozenCols.value = defaultFrozenCount(settings.value.defaultFrozenCols)
    tab.scroll = null
    tab.loadVersion.value += 1

    if (!reuse) {
      tabs.value = [...tabs.value, tab]
    }
    activeId.value = tab.id
    return {}
  }

  function confirmClose(tab: CsvTab): boolean {
    if (!tab.document.isDirty.value) {
      return true
    }
    return window.confirm(`“${tabTitle(tab)}”有未保存的修改，确定要关闭吗？`)
  }

  function closeTab(id: number): boolean {
    const index = tabs.value.findIndex((tab) => tab.id === id)
    if (index === -1) {
      return false
    }
    const tab = tabs.value[index]
    if (!confirmClose(tab)) {
      return false
    }

    const rest = tabs.value.filter((item) => item.id !== id)
    tabs.value = rest

    if (rest.length === 0) {
      const fallback = createTab()
      tabs.value = [fallback]
      activeId.value = fallback.id
      return true
    }

    if (activeId.value === id) {
      const neighbour = rest[Math.min(index, rest.length - 1)]
      activeId.value = neighbour.id
    }
    return true
  }

  function bootstrap(): void {
    if (tabs.value.length > 0) {
      return
    }
    const tab = createTab()
    tabs.value = [tab]
    activeId.value = tab.id
  }

  return {
    tabs,
    activeId,
    activeTab,
    tabsView,
    bootstrap,
    newTab,
    openTab,
    activateTab,
    closeTab,
    commitActiveEdit,
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export type CsvWorkspace = ReturnType<typeof useCsvWorkspace>
