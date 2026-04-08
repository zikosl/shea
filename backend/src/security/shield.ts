import { allow, rule, shield } from 'graphql-shield'
import { getUserId } from '../utils'
import { createUnauthorizedError } from '../core/errors/app-error'

const isAuthenticated = rule({ cache: 'contextual' })(async (_parent, _args, ctx) => {
  try {
    getUserId(ctx)
    return true
  } catch (error) {
    return createUnauthorizedError('EXPIRED TOKEN')
  }
})

export const permissions = shield(
  {
    Query: {
      '*': isAuthenticated,
    },
    Mutation: {
      verifyOtp: allow,
      sendOtp: allow,
      signIn: allow,
      refreshToken: allow,
      '*': isAuthenticated,
    },
  },
  {
    fallbackRule: isAuthenticated,
    fallbackError: createUnauthorizedError(),
    allowExternalErrors: true,
  },
)
