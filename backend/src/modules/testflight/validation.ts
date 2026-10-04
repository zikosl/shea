import { GraphQLError } from 'graphql'

export function normalizeTestFlightEmail(value: string): string {
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GraphQLError('INVALID_TESTFLIGHT_EMAIL')
  return email
}
