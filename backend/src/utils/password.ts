import { randomInt } from 'node:crypto'

// Avoid ambiguous and HTML-sensitive characters so emailed credentials can be
// copied reliably across mail clients while retaining strong entropy.
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz'
const DIGITS = '23456789'
const ACCESS_CODE_ALPHABET = `${UPPERCASE}${LOWERCASE}${DIGITS}-_`

function randomCharacter(alphabet: string) {
  return alphabet[randomInt(alphabet.length)]
}

export function generateAccessCode(length = 12) {
  if (!Number.isInteger(length) || length < 12) {
    throw new Error('Access codes must contain at least 12 characters')
  }

  const characters = [
    randomCharacter(UPPERCASE),
    randomCharacter(LOWERCASE),
    randomCharacter(DIGITS),
    ...Array.from(
      { length: length - 3 },
      () => randomCharacter(ACCESS_CODE_ALPHABET),
    ),
  ]

  // A cryptographic Fisher-Yates shuffle prevents fixed character-class positions.
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    ;[characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]]
  }

  return characters.join('')
}
