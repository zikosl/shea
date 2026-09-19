// @ts-nocheck
import { arg, enumType, extendType, inputObjectType, intArg, list, nonNull, objectType, stringArg } from 'nexus'
import { getUserId } from '../../utils'
import { createCatalogSubmission, listCatalogSubmissions } from '../../modules/catalog/submissions'

const CatalogSubmissionStatus = enumType({
  name: 'CatalogSubmissionStatus',
  members: ['DRAFT', 'PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'MERGED', 'REJECTED'],
})

const CatalogVisibility = enumType({ name: 'CatalogVisibility', members: ['INTERNAL', 'PUBLIC'] })

const ProvisionalProduct = objectType({ name: 'ProvisionalProduct', definition(t) {
  t.nonNull.string('id'); t.nonNull.int('partnerId'); t.nonNull.int('requestVariantId'); t.int('canonicalProductId');
  t.nonNull.field('visibility', { type: 'CatalogVisibility' }); t.nonNull.string('name'); t.nonNull.string('nameAr');
  t.nonNull.float('price'); t.float('costPrice'); t.nonNull.int('stock'); t.nonNull.boolean('trackInventory'); t.string('localId');
} })

const CatalogSubmission = objectType({ name: 'CatalogSubmission', definition(t) {
  t.nonNull.string('id'); t.nonNull.int('partnerId'); t.string('localId'); t.string('title'); t.string('adminNote');
  t.nonNull.field('partner', { type: 'Partner' });
  t.nonNull.field('status', { type: 'CatalogSubmissionStatus' }); t.field('submittedAt', { type: 'DateTime' });
  t.field('reviewedAt', { type: 'DateTime' }); t.nonNull.field('createdAt', { type: 'DateTime' }); t.nonNull.field('updatedAt', { type: 'DateTime' });
  t.nonNull.list.nonNull.field('catalogProposals', { type: 'CatalogProposal' });
  t.nonNull.list.nonNull.field('productRequests', { type: 'ProductTemplateRequest' });
} })

const Mutation = extendType({ type: 'Mutation', definition(t) {
  t.nonNull.field('createCatalogSubmission', {
    type: 'CatalogSubmission',
    args: { localId: stringArg(), title: stringArg(), proposalIds: list(nonNull(stringArg())), productRequestIds: list(nonNull(intArg())) },
    resolve: (_root, args, ctx) => createCatalogSubmission(ctx.prisma, getUserId(ctx), args),
  })
} })

const Query = extendType({ type: 'Query', definition(t) {
  t.nonNull.list.nonNull.field('myCatalogSubmissions', {
    type: 'CatalogSubmission', args: { status: arg({ type: 'CatalogSubmissionStatus' }) },
    resolve: (_root, { status }, ctx) => listCatalogSubmissions(ctx.prisma, getUserId(ctx), false, status),
  })
  t.nonNull.list.nonNull.field('myProvisionalProducts', {
    type: 'ProvisionalProduct',
    resolve: (_root, _args, ctx) => ctx.prisma.provisionalProduct.findMany({
      where: { partnerId: getUserId(ctx), canonicalProductId: null }, orderBy: { createdAt: 'desc' }, take: 250,
    }),
  })
  t.nonNull.list.nonNull.field('adminCatalogSubmissions', {
    type: 'CatalogSubmission', args: { status: arg({ type: 'CatalogSubmissionStatus' }) },
    resolve: (_root, { status }, ctx) => listCatalogSubmissions(ctx.prisma, getUserId(ctx), true, status),
  })
} })

export default { CatalogSubmissionStatus, CatalogVisibility, ProvisionalProduct, CatalogSubmission, Mutation, Query }
