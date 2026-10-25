const ALPHABET_SIZE = 26
const BASE_CHAR_CODE = 'A'.charCodeAt(0)

export function columnLabel(index: number): string {
  if (index < 0) {
    return ''
  }

  let remaining = index
  let label = ''
  while (remaining >= 0) {
    label = String.fromCharCode(BASE_CHAR_CODE + (remaining % ALPHABET_SIZE)) + label
    remaining = Math.floor(remaining / ALPHABET_SIZE) - 1
  }
  return label
}
