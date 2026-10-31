export interface ResolvedBlockMove {
  start: number
  count: number
  newStart: number
}

/**
 * 把“插入到 to”换算成移除原块之后的插入索引。
 * 返回 null 表示位置没有变化（原地放下）。
 */
export function resolveBlockMove(
  start: number,
  count: number,
  to: number,
  total: number,
): ResolvedBlockMove | null {
  if (total <= 0) {
    return null
  }
  const safeCount = Math.min(Math.max(Math.floor(count), 1), total)
  const safeStart = Math.min(Math.max(Math.floor(start), 0), total - safeCount)
  const requested = Math.min(Math.max(Math.floor(to), 0), total)
  const newStart = Math.min(
    Math.max(requested > safeStart ? requested - safeCount : requested, 0),
    total - safeCount,
  )

  if (newStart === safeStart) {
    return null
  }
  return { start: safeStart, count: safeCount, newStart }
}
