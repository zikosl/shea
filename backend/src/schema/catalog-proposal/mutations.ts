// @ts-nocheck
import { arg, extendType, intArg, nonNull, stringArg } from 'nexus'
import { GraphQLError } from 'graphql'
import { Context } from '../../context'
import { getUserId } from '../../utils'

async function assertProposalDependencies(ctx: Context, input: any) {
  const niche = await ctx.prisma.niche.findUnique({ where: { id: input.nicheId }, select: { id: true } })
  if (!niche) throw new GraphQLError('NICHE_NOT_FOUND')

  if (input.entityType === 'CATEGORY') {
    if (input.categoryId || input.parentProposalId) throw new GraphQLError('CATEGORY_PROPOSAL_CANNOT_HAVE_CATEGORY_PARENT')
    return
  }

  if (!input.categoryId && !input.parentProposalId) {
    throw new GraphQLError('PRODUCT_TYPE_CATEGORY_REQUIRED')
  }

  if (input.categoryId) {
    const category = await ctx.prisma.category.findFirst({
      where: { id: input.categoryId, niche_id: input.nicheId },
      select: { id: true },
    })
    if (!category) throw new GraphQLError('CATEGORY_NOT_IN_NICHE')
  }

  if (input.parentProposalId) {
    const parent = await ctx.prisma.catalogProposal.findFirst({
      where: {
        id: input.parentProposalId,
        partnerId: getUserId(ctx),
        entityType: 'CATEGORY',
        status: { in: ['PENDING', 'APPROVED', 'MERGED'] },
      },
    })
    if (!parent || parent.nicheId !== input.nicheId) throw new GraphQLError('INVALID_CATEGORY_PROPOSAL')
  }
}

async function resolveDependents(ctx: Context, proposalId: string, entityType: 'CATEGORY' | 'PRODUCT_TYPE', resolvedId: number) {
  if (entityType === 'CATEGORY') {
    await ctx.prisma.productTemplateRequest.updateMany({
      where: { categoryProposalId: proposalId },
      data: { category_id: resolvedId },
    })
    await ctx.prisma.catalogProposal.updateMany({
      where: { parentProposalId: proposalId, entityType: 'PRODUCT_TYPE' },
      data: { categoryId: resolvedId },
    })
    return
  }

  await ctx.prisma.productTemplateRequest.updateMany({
    where: { productTypeProposalId: proposalId },
    data: { product_type_id: resolvedId },
  })
}

const Mutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('submitCatalogProposal', {
      type: 'CatalogProposal',
      args: {
        localId: nonNull(stringArg()),
        entityType: nonNull(arg({ type: 'CatalogProposalEntityType' })),
        name: nonNull(stringArg()),
        name_ar: stringArg(),
        description: stringArg(),
        image: stringArg(),
        nicheId: nonNull(intArg()),
        categoryId: intArg(),
        parentProposalId: stringArg(),
        deviceId: stringArg(),
      },
      resolve: async (_parent, input: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        const partner = await ctx.prisma.partner.findUnique({ where: { userId: partnerId }, select: { userId: true } })
        if (!partner) throw new GraphQLError('PARTNER_REQUIRED')
        if (!input.name.trim()) throw new GraphQLError('PROPOSAL_NAME_REQUIRED')
        await assertProposalDependencies(ctx, input)

        if (input.deviceId) {
          const device = await ctx.prisma.device.findFirst({ where: { id: input.deviceId, partnerId, revokedAt: null } })
          if (!device) throw new GraphQLError('INVALID_POS_DEVICE')
        }

        const existing = await ctx.prisma.catalogProposal.findUnique({
          where: { partnerId_localId: { partnerId, localId: input.localId } },
        })
        if (existing && existing.status !== 'PENDING') return existing

        return ctx.prisma.catalogProposal.upsert({
          where: { partnerId_localId: { partnerId, localId: input.localId } },
          create: {
            partnerId,
            deviceId: input.deviceId ?? null,
            localId: input.localId,
            entityType: input.entityType,
            name: input.name.trim(),
            name_ar: input.name_ar?.trim() ?? '',
            description: input.description?.trim() ?? '',
            image: input.image?.trim() || null,
            nicheId: input.nicheId,
            categoryId: input.categoryId ?? null,
            parentProposalId: input.parentProposalId ?? null,
          },
          update: {
            deviceId: input.deviceId ?? undefined,
            name: input.name.trim(),
            name_ar: input.name_ar?.trim() ?? '',
            description: input.description?.trim() ?? '',
            image: input.image?.trim() || null,
            nicheId: input.nicheId,
            categoryId: input.categoryId ?? null,
            parentProposalId: input.parentProposalId ?? null,
          },
        })
      },
    })

    t.field('approveCatalogProposal', {
      type: 'CatalogProposal',
      args: { id: nonNull(stringArg()), adminNote: stringArg() },
      resolve: async (_parent, { id, adminNote }, ctx: Context) => {
        const proposal = await ctx.prisma.catalogProposal.findUnique({ where: { id } })
        if (!proposal) throw new GraphQLError('CATALOG_PROPOSAL_NOT_FOUND')
        if (proposal.status !== 'PENDING') throw new GraphQLError('CATALOG_PROPOSAL_ALREADY_REVIEWED')

        return ctx.prisma.$transaction(async (tx) => {
          let resolvedId: number
          if (proposal.entityType === 'CATEGORY') {
            const category = await tx.category.create({
              data: { name: proposal.name, name_ar: proposal.name_ar || proposal.name, image: proposal.image ?? '', niche_id: proposal.nicheId },
            })
            resolvedId = category.id
          } else {
            let categoryId = proposal.categoryId
            if (!categoryId && proposal.parentProposalId) {
              const parent = await tx.catalogProposal.findUnique({ where: { id: proposal.parentProposalId } })
              categoryId = parent?.resolvedCategoryId ?? null
            }
            if (!categoryId) throw new GraphQLError('CATEGORY_PROPOSAL_MUST_BE_RESOLVED_FIRST')
            const productType = await tx.productType.create({
              data: { name: proposal.name, name_ar: proposal.name_ar || proposal.name, category_id: categoryId },
            })
            resolvedId = productType.id
          }

          const reviewed = await tx.catalogProposal.update({
            where: { id },
            data: {
              status: 'APPROVED',
              resolvedCategoryId: proposal.entityType === 'CATEGORY' ? resolvedId : null,
              resolvedProductTypeId: proposal.entityType === 'PRODUCT_TYPE' ? resolvedId : null,
              adminNote: adminNote ?? null,
              reviewedAt: new Date(),
            },
          })
          if (proposal.entityType === 'CATEGORY') {
            await tx.productTemplateRequest.updateMany({ where: { categoryProposalId: id }, data: { category_id: resolvedId } })
            await tx.catalogProposal.updateMany({ where: { parentProposalId: id, entityType: 'PRODUCT_TYPE' }, data: { categoryId: resolvedId } })
          } else {
            await tx.productTemplateRequest.updateMany({ where: { productTypeProposalId: id }, data: { product_type_id: resolvedId } })
          }
          return reviewed
        })
      },
    })

    t.field('mergeCatalogProposal', {
      type: 'CatalogProposal',
      args: { id: nonNull(stringArg()), targetId: nonNull(intArg()), adminNote: stringArg() },
      resolve: async (_parent, { id, targetId, adminNote }, ctx: Context) => {
        const proposal = await ctx.prisma.catalogProposal.findUnique({ where: { id } })
        if (!proposal) throw new GraphQLError('CATALOG_PROPOSAL_NOT_FOUND')
        if (proposal.status !== 'PENDING') throw new GraphQLError('CATALOG_PROPOSAL_ALREADY_REVIEWED')

        if (proposal.entityType === 'CATEGORY') {
          const target = await ctx.prisma.category.findFirst({ where: { id: targetId, niche_id: proposal.nicheId } })
          if (!target) throw new GraphQLError('MERGE_CATEGORY_NOT_FOUND')
        } else {
          const target = await ctx.prisma.productType.findUnique({ where: { id: targetId }, include: { category: true } })
          if (!target || target.category.niche_id !== proposal.nicheId) throw new GraphQLError('MERGE_PRODUCT_TYPE_NOT_FOUND')
        }

        const reviewed = await ctx.prisma.catalogProposal.update({
          where: { id },
          data: {
            status: 'MERGED',
            resolvedCategoryId: proposal.entityType === 'CATEGORY' ? targetId : null,
            resolvedProductTypeId: proposal.entityType === 'PRODUCT_TYPE' ? targetId : null,
            adminNote: adminNote ?? null,
            reviewedAt: new Date(),
          },
        })
        await resolveDependents(ctx, id, proposal.entityType, targetId)
        return reviewed
      },
    })

    t.field('rejectCatalogProposal', {
      type: 'CatalogProposal',
      args: { id: nonNull(stringArg()), rejectionReason: nonNull(stringArg()), adminNote: stringArg() },
      resolve: async (_parent, { id, rejectionReason, adminNote }, ctx: Context) => {
        const proposal = await ctx.prisma.catalogProposal.findUnique({ where: { id } })
        if (!proposal) throw new GraphQLError('CATALOG_PROPOSAL_NOT_FOUND')
        if (proposal.status !== 'PENDING') throw new GraphQLError('CATALOG_PROPOSAL_ALREADY_REVIEWED')
        return ctx.prisma.catalogProposal.update({
          where: { id },
          data: { status: 'REJECTED', rejectionReason: rejectionReason.trim(), adminNote: adminNote ?? null, reviewedAt: new Date() },
        })
      },
    })
  },
})

export default Mutation
