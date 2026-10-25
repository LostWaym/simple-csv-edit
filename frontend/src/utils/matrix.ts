export function isSizeMultipleOf(
  targetRows: number,
  targetCols: number,
  blockRows: number,
  blockCols: number,
): boolean {
  if (targetRows <= 0 || targetCols <= 0 || blockRows <= 0 || blockCols <= 0) {
    return false
  }
  return targetRows % blockRows === 0 && targetCols % blockCols === 0
}

export function tileMatrixToSize(
  matrix: string[][],
  targetRows: number,
  targetCols: number,
): string[][] {
  const blockRows = matrix.length
  const blockCols = matrix[0]?.length ?? 0
  if (blockRows === 0 || blockCols === 0) {
    return []
  }

  return Array.from({ length: targetRows }, (_, row) => {
    const sourceRow = matrix[row % blockRows]
    return Array.from({ length: targetCols }, (_, col) => sourceRow[col % blockCols] ?? '')
  })
}
