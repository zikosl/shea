import { GraphQLError } from 'graphql'

export function normalizeGtin(value: string) {
  return value.replace(/[\s-]/g, '')
}

export function isValidGtin(value: string) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false
  const digits = [...value].map(Number)
  const checkDigit = digits.pop()
  let sum = 0
  for (let index = digits.length - 1, weight = 3; index >= 0; index -= 1, weight = weight === 3 ? 1 : 3) {
    sum += digits[index] * weight
  }
  return (10 - (sum % 10)) % 10 === checkDigit
}

export function requireGtin(value: string) {
  const normalized = normalizeGtin(value.trim())
  if (!isValidGtin(normalized)) throw new GraphQLError('Enter a valid EAN, UPC, or GTIN with its check digit')
  return normalized
}
