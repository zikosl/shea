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
    t.string('description')
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
    t.string('description')
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
    t.int('category_id')
    t.string('categoryProposalId')
    t.string('productTypeProposalId')
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
      resolve: (parent, _args, ctx) => parent.product_type_id
        ? ctx.prisma.productType.findUnique({ where: { id: parent.product_type_id } })
        : null,
    })
    t.field('category', {
      type: 'Category',
      resolve: (parent, _args, ctx) => parent.category_id
        ? ctx.prisma.category.findUnique({ where: { id: parent.category_id } })
        : null,
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
        category_id: intArg(),
        categoryProposalId: stringArg(),
        product_type_id: intArg(),
        productTypeProposalId: stringArg(),
        brand_id: intArg(),
        variants: list(arg({ type: 'ProductTemplateRequestVariantInput' })),
      },
      resolve: async (_parent, data, ctx: Context) => {
        const partnerId = getUserId(ctx)
        if (!data.category_id && !data.categoryProposalId) throw new Error('CATEGORY_OR_PROPOSAL_REQUIRED')
        if (data.category_id && data.categoryProposalId) throw new Error('CHOOSE_CATEGORY_OR_PROPOSAL')
        if (data.product_type_id && data.productTypeProposalId) throw new Error('CHOOSE_PRODUCT_TYPE_OR_PROPOSAL')
        const category = data.category_id ? await ctx.prisma.category.findUnique({
          where: { id: data.category_id }, select: { niche_id: true },
        }) : null
        if (data.category_id && !category) throw new Error('CATEGORY_NOT_FOUND')

        const categoryProposal = data.categoryProposalId ? await ctx.prisma.catalogProposal.findFirst({
          where: { id: data.categoryProposalId, partnerId, entityType: 'CATEGORY', status: { in: ['PENDING', 'APPROVED', 'MERGED'] } },
        }) : null
        if (data.categoryProposalId && !categoryProposal) throw new Error('CATEGORY_PROPOSAL_NOT_FOUND')

        const resolvedCategoryId = category ? data.category_id : categoryProposal?.resolvedCategoryId ?? null
        const nicheId = category?.niche_id ?? categoryProposal?.nicheId

        if (data.product_type_id) {
          const productType = await ctx.prisma.productType.findFirst({
            where: { id: data.product_type_id, category_id: resolvedCategoryId ?? -1 },
            select: { id: true },
          })
          if (!productType) throw new Error('PRODUCT_TYPE_DOES_NOT_BELONG_TO_CATEGORY')
        }

        const productTypeProposal = data.productTypeProposalId ? await ctx.prisma.catalogProposal.findFirst({
          where: { id: data.productTypeProposalId, partnerId, entityType: 'PRODUCT_TYPE', status: { in: ['PENDING', 'APPROVED', 'MERGED'] } },
        }) : null
        if (data.productTypeProposalId && !productTypeProposal) throw new Error('PRODUCT_TYPE_PROPOSAL_NOT_FOUND')
        if (productTypeProposal && productTypeProposal.nicheId !== nicheId) throw new Error('PRODUCT_TYPE_PROPOSAL_NOT_IN_NICHE')
        if (productTypeProposal && resolvedCategoryId && productTypeProposal.categoryId !== resolvedCategoryId) {
          throw new Error('PRODUCT_TYPE_PROPOSAL_DOES_NOT_BELONG_TO_CATEGORY')
        }
        if (productTypeProposal && categoryProposal && productTypeProposal.parentProposalId !== categoryProposal.id && productTypeProposal.categoryId !== categoryProposal.resolvedCategoryId) {
          throw new Error('PRODUCT_TYPE_PROPOSAL_DOES_NOT_BELONG_TO_CATEGORY_PROPOSAL')
        }

        if (data.brand_id) {
          const brand = await ctx.prisma.brand.findUnique({ where: { id: data.brand_id }, select: { niche_id: true } })
          if (!brand) throw new Error('BRAND_NOT_FOUND')
          if (brand.niche_id && nicheId && brand.niche_id !== nicheId) {
            throw new Error('BRAND_DOES_NOT_BELONG_TO_NICHE')
          }
        }

        const submittedVariants = data.variants?.length ? data.variants : [{ name: 'Default', tags: [] }]
        const variants = submittedVariants.map((variant: any) => {
          const name = variant?.name?.trim() || null
          const tags = Array.from(new Set((variant?.tags ?? []).map((tag: string) => tag.trim()).filter(Boolean)))
          if (!name && !tags.length) throw new Error('VARIANT_NAME_OR_TAG_REQUIRED')
          return {
            name,
            description: variant?.description?.trim() || null,
            sku: variant?.sku?.trim() || null,
            image: variant?.image?.trim() || null,
            tags,
            price: variant?.price ?? null,
            stock: variant?.stock ?? null,
          }
        })
        return ctx.prisma.productTemplateRequest.create({
          data: {
            name: data.name.trim(),
            name_ar: data.name_ar?.trim() ?? '',
            description: data.description?.trim() ?? '',
            images: data.images?.images ?? [],
            category_id: resolvedCategoryId,
            categoryProposalId: data.categoryProposalId ?? null,
            product_type_id: data.product_type_id ?? productTypeProposal?.resolvedProductTypeId ?? null,
            productTypeProposalId: data.productTypeProposalId ?? null,
            brand_id: data.brand_id ?? null,
            partnerId,
            variants: {
              create: variants,
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
        if (!request.category_id) throw new Error('CATEGORY_PROPOSAL_MUST_BE_RESOLVED_FIRST')
        if (request.productTypeProposalId && !request.product_type_id) throw new Error('PRODUCT_TYPE_PROPOSAL_MUST_BE_RESOLVED_FIRST')

        const template = await ctx.prisma.productTemplate.create({
          data: {
            name: request.name,
            name_ar: request.name_ar,
            description: request.description,
            category_id: request.category_id,
            product_type_id: request.product_type_id,
            brand_id: request.brand_id,
            images: {
              create: request.images.map((url: string) => ({ url })),
            },
            variants: {
              create: (request.variants.length ? request.variants : [{ name: 'Default', description: '', sku: null, image: null, tags: [] }]).map((variant: any) => ({
                name: variant.name,
                description: variant.description,
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
        search: stringArg(),
        niche_id: intArg(),
        category_id: intArg(),
        product_type_id: intArg(),
        page: nonNull(intArg()),
        limit: nonNull(intArg()),
      },
      resolve: async (_parent, { status, search, niche_id, category_id, product_type_id, page, limit }, ctx: Context) => {
        const where: any = {
          ...(status ? { status } : {}),
          ...(category_id ? { category_id } : {}),
          ...(product_type_id ? { product_type_id } : {}),
          ...(niche_id ? { category: { niche_id } } : {}),
          ...(search?.trim() ? {
            OR: [
              { name: { contains: search.trim(), mode: 'insensitive' } },
              { name_ar: { contains: search.trim(), mode: 'insensitive' } },
              { description: { contains: search.trim(), mode: 'insensitive' } },
              { brand: { name: { contains: search.trim(), mode: 'insensitive' } } },
            ],
          } : {}),
        }
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
