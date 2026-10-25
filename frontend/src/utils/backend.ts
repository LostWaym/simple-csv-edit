import {
  OpenFileDialog,
  ReadTextFile,
  RevealInFileManager,
  SaveFileDialog,
  WriteTextFile,
} from '../../wailsjs/go/main/App'

export const backend = {
  openFileDialog: (): Promise<string> => OpenFileDialog(),
  saveFileDialog: (defaultName: string): Promise<string> => SaveFileDialog(defaultName),
  readTextFile: (path: string): Promise<string> => ReadTextFile(path),
  writeTextFile: (path: string, content: string): Promise<void> => WriteTextFile(path, content),
  revealInFileManager: (path: string): Promise<void> => RevealInFileManager(path),
}
