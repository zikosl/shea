import { GraphQLError } from 'graphql'

export function createUnauthorizedError(message = 'Not authorized') {
  return new GraphQLError(message, {
    extensions: {
      code: 'UNAUTHENTICATED',
      http: { status: 401 },
    },
  })
}

export function createBadRequestError(message: string) {
  return new GraphQLError(message, {
    extensions: {
      code: 'BAD_USER_INPUT',
      http: { status: 400 },
    },
  })
}

export function createNotFoundError(message: string) {
  return new GraphQLError(message, {
    extensions: {
      code: 'NOT_FOUND',
      http: { status: 404 },
    },
  })
}
