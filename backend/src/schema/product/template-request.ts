// @ts-nocheck
import { arg, enumType, extendType, floatArg, inputObjectType, intArg, list, nonNull, objectType, stringArg } from 'nexus'
import { getUserId } from '../../utils'
import { Context } from '../../context'

export const ProductTemplateRequestStatusEnum = enumType({
  name: 'ProductTemplateRequestStatus',
  members: ['PENDING', 'APPROVED', 'REJECTED', 'MERGED'],
})

export const ProductTemplateRequestVariantInput = inputObjectType({
  name: 'ProductTemplateRequestVariantInput',
  definition(t) {
    t.string('name')
    t.string('sku')
    t.string('image')
    t.list.string('tags')
    t.float('price')
    t.int('stock')
  },
})

export const ProductTemplateRequestVariant = objectType({
  name: 'ProductTemplateRequestVariant',
  definition(t) {
    t.nonNull.int('id')
    t.int('requestId')
    t.string('name')
    t.string('sku')
    t.string('image')
    t.list.string('tags')
    t.float('price')
    t.int('stock')
  },
})

export const ProductTemplateRequest = objectType({
  name: 'ProductTemplateRequest',
  definition(t) {
    t.nonNull.int('id')
    t.string('name')
    t.string('name_ar')
    t.string('description')
    t.list.string('images')
    t.int('product_type_id')
    t.int('brand_id')
    t.int('partnerId')
    t.field('status', { type: 'ProductTemplateRequestStatus' })
    t.string('rejectionReason')
    t.string('adminNote')
    t.int('approvedTemplateId')
    t.int('mergedIntoTemplateId')
    t.boolean('hasOrder')
    t.field('createdAt', { type: 'DateTime' })
    t.field('updatedAt', { type: 'DateTime' })
    t.field('partner', {
      type: 'Partner',
      resolve: (parent, _args, ctx) => ctx.prisma.partner.findUnique({ where: { userId: parent.partnerId } }),
    })
    t.field('productType', {
      type: 'ProductType',
      resolve: (parent, _args, ctx) => ctx.prisma.productType.findUnique({ where: { id: parent.product_type_id } }),
    })
    t.field('brand', {
      type: 'Brand',
      resolve: (parent, _args, ctx) => parent.brand_id ? ctx.prisma.brand.findUnique({ where: { id: parent.brand_id } }) : null,
    })
    t.nonNull.list.field('variants', {
      type: 'ProductTemplateRequestVariant',
      resolve: (parent, _args, ctx) => ctx.prisma.productTemplateRequestVariant.findMany({ where: { requestId: parent.id } }),
    })
  },
})

export const ProductTemplateRequestResult = objectType({
  name: 'ProductTemplateRequestResult',
  definition(t) {
    t.nonNull.list.nonNull.field('requests', { type: 'ProductTemplateRequest' })
    t.int('totalRequests')
  },
})

export const ProductTemplateRequestMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('submitProductTemplateRequest', {
      type: 'ProductTemplateRequest',
      args: {
        name: nonNull(stringArg()),
        name_ar: stringArg(),
        description: stringArg(),
        images: arg({ type: 'ImagesList' }),
        product_type_id: nonNull(intArg()),
        brand_id: intArg(),
        variants: list(arg({ type: 'ProductTemplateRequestVariantInput' })),
      },
      resolve: async (_parent, data, ctx: Context) => {
        const partnerId = getUserId(ctx)
        return ctx.prisma.productTemplateRequest.create({
          data: {
            name: data.name.trim(),
            name_ar: data.name_ar?.trim() ?? '',
            description: data.description?.trim() ?? '',
            images: data.images?.images ?? [],
            product_type_id: data.product_type_id,
            brand_id: data.brand_id ?? null,
            partnerId,
            variants: {
              create: (data.variants ?? []).map((variant: any) => ({
                name: variant?.name?.trim() || null,
                sku: variant?.sku?.trim() || null,
                image: variant?.image?.trim() || null,
                tags: variant?.tags ?? [],
                price: variant?.price ?? null,
                stock: variant?.stock ?? null,
              })),
            },
          },
        })
      },
    })

    t.field('approveProductTemplateRequest', {
      type: 'ProductTemplateRequest',
      args: {
        id: nonNull(intArg()),
        adminNote: stringArg(),
      },
      resolve: async (_parent, { id, adminNote }, ctx: Context) => {
        const request = await ctx.prisma.productTemplateRequest.findUnique({
          where: { id },
          include: { variants: true },
        })
        if (!request) throw new Error('Product request not found')
        if (request.status !== 'PENDING') throw new Error('Product request already reviewed')

        const template = await ctx.prisma.productTemplate.create({
          data: {
            name: request.name,
            name_ar: request.name_ar,
            description: request.description,
            product_type_id: request.product_type_id,
            brand_id: request.brand_id,
            images: {
              create: request.images.map((url: string) => ({ url })),
            },
            variants: {
              create: request.variants.map((variant: any) => ({
                name: variant.name,
                sku: variant.sku,
                images: variant.image ? { create: [{ url: variant.image }] } : undefined,
                tags: { create: (variant.tags ?? []).map((value: string) => ({ value })) },
              })),
            },
          },
        })

        return ctx.prisma.productTemplateRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedTemplateId: template.id,
            adminNote: adminNote ?? null,
          },
        })
      },
    })

    t.field('rejectProductTemplateRequest', {
      type: 'ProductTemplateRequest',
      args: {
        id: nonNull(intArg()),
        rejectionReason: stringArg(),
        adminNote: stringArg(),
      },
      resolve: (_parent, { id, rejectionReason, adminNote }, ctx: Context) => {
        return ctx.prisma.productTemplateRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: rejectionReason ?? null,
            adminNote: adminNote ?? null,
          },
        })
      },
    })

    t.field('mergeProductTemplateRequest', {
      type: 'ProductTemplateRequest',
      args: {
        id: nonNull(intArg()),
        targetTemplateId: nonNull(intArg()),
        adminNote: stringArg(),
      },
      resolve: async (_parent, { id, targetTemplateId, adminNote }, ctx: Context) => {
        const request = await ctx.prisma.productTemplateRequest.findUnique({
          where: { id },
          select: { partnerId: true, status: true },
        })

        if (!request) {
          throw new Error('PRODUCT_TEMPLATE_REQUEST_NOT_FOUND')
        }

        const targetTemplate = await ctx.prisma.productTemplate.findUnique({
          where: { id: targetTemplateId },
          select: { id: true },
        })

        if (!targetTemplate) {
          throw new Error('TARGET_PRODUCT_TEMPLATE_NOT_FOUND')
        }

        const completedOrders = await ctx.prisma.order.count({
          where: { partnerId: request.partnerId },
        })

        if (completedOrders < 1) {
          throw new Error('MERGE_REQUIRES_AT_LEAST_ONE_ORDER')
        }

        return ctx.prisma.productTemplateRequest.update({
          where: { id },
          data: {
            status: 'MERGED',
            mergedIntoTemplateId: targetTemplateId,
            adminNote: adminNote ?? null,
          },
        })
      },
    })
  },
})

export const ProductTemplateRequestQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field('findManyProductTemplateRequests', {
      type: 'ProductTemplateRequestResult',
      args: {
        status: 'ProductTemplateRequestStatus',
        page: nonNull(intArg()),
        limit: nonNull(intArg()),
      },
      resolve: async (_parent, { status, page, limit }, ctx: Context) => {
        const where = status ? { status } : {}
        const [requests, totalRequests] = await Promise.all([
          ctx.prisma.productTemplateRequest.findMany({
            where,
            take: limit,
            skip: limit * (page - 1),
            orderBy: { id: 'desc' },
          }),
          ctx.prisma.productTemplateRequest.count({ where }),
        ])
        return { requests, totalRequests }
      },
    })

    t.nonNull.list.field('findMyProductTemplateRequests', {
      type: 'ProductTemplateRequest',
      resolve: (_parent, _args, ctx: Context) => {
        const partnerId = getUserId(ctx)
        return ctx.prisma.productTemplateRequest.findMany({
          where: { partnerId },
          orderBy: { id: 'desc' },
        })
      },
    })
  },
})

export default {
  ProductTemplateRequestStatusEnum,
  ProductTemplateRequestVariantInput,
  ProductTemplateRequestVariant,
  ProductTemplateRequest,
  ProductTemplateRequestResult,
  ProductTemplateRequestMutation,
  ProductTemplateRequestQuery,
}
