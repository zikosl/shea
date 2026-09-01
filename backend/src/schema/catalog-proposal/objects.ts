// @ts-nocheck
import { enumType, objectType } from 'nexus'

const CatalogProposalEntityType = enumType({
  name: 'CatalogProposalEntityType',
  members: ['CATEGORY', 'PRODUCT_TYPE'],
})

const CatalogProposalStatus = enumType({
  name: 'CatalogProposalStatus',
  members: ['PENDING', 'APPROVED', 'MERGED', 'REJECTED'],
})

const CatalogProposal = objectType({
  name: 'CatalogProposal',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.int('partnerId')
    t.string('deviceId')
    t.nonNull.string('localId')
    t.nonNull.field('entityType', { type: 'CatalogProposalEntityType' })
    t.nonNull.field('status', { type: 'CatalogProposalStatus' })
    t.nonNull.string('name')
    t.nonNull.string('name_ar')
    t.nonNull.string('description')
    t.string('image')
    t.nonNull.int('nicheId')
    t.int('categoryId')
    t.string('parentProposalId')
    t.int('resolvedCategoryId')
    t.int('resolvedProductTypeId')
    t.string('rejectionReason')
    t.string('adminNote')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.field('reviewedAt', { type: 'DateTime' })
    t.field('partner', {
      type: 'Partner',
      resolve: (parent, _args, ctx) => ctx.prisma.partner.findUnique({ where: { userId: parent.partnerId } }),
    })
  },
})

const CatalogProposalResult = objectType({
  name: 'CatalogProposalResult',
  definition(t) {
    t.nonNull.list.nonNull.field('proposals', { type: 'CatalogProposal' })
    t.nonNull.int('total')
  },
})

export default { CatalogProposalEntityType, CatalogProposalStatus, CatalogProposal, CatalogProposalResult }
