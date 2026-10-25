export function hasWailsRuntime(): boolean {
  return typeof window !== 'undefined' && 'runtime' in window
}
