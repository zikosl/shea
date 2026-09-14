import { GraphQLError } from 'graphql'
import type { IMiddlewareFunction } from 'graphql-middleware'
import { getOptionalUserId } from '../utils'

const catalogLists = new Set(['findManyNiches', 'findManyBrands', 'findManyCategories', 'findManyProductTypes', 'findManyPartners', 'findManyProducts', 'findManyProductPartners'])

export function boundedCatalogArgs(args: Record<string, any>) {
  const page = args.page ?? 1
  const limit = args.limit ?? 20
  if (!Number.isSafeInteger(page) || page < 1 || page > 100 || !Number.isSafeInteger(limit) || limit < 1) {
    throw new GraphQLError('CATALOG_PAGE_LIMIT', { extensions: { code: 'BAD_USER_INPUT' } })
  }
  if (typeof args.search === 'string' && args.search.length > 120) {
    throw new GraphQLError('SEARCH_TOO_LONG', { extensions: { code: 'BAD_USER_INPUT' } })
  }
  return { ...args, page, limit: Math.min(limit, 100), isFull: false }
}

export const catalogGuard: IMiddlewareFunction = async (resolve, parent, args, context, info) => {
  if (info.parentType.name === 'Query' && catalogLists.has(info.fieldName)) {
    const id = getOptionalUserId(context)
    const user = id ? await context.prisma.user.findUnique({ where: { id }, select: { role: true } }) : null
    if (user?.role !== 'ADMIN' && user?.role !== 'PARTNER') {
      return resolve(parent, boundedCatalogArgs(args), context, info)
    }
  }
  return resolve(parent, args, context, info)
}
