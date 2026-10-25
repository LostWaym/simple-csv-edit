export function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] ?? path
}

export function fileExtension(path: string): string {
  const name = baseName(path)
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.slice(dotIndex).toLowerCase() : ''
}

export function hasExtension(path: string, extension: string): boolean {
  return fileExtension(path) === extension.toLowerCase()
}

export function ensureExtension(name: string, extension: string): string {
  return name.toLowerCase().endsWith(extension.toLowerCase()) ? name : `${name}${extension}`
}
