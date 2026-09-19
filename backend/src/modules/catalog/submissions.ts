import { CatalogSubmissionStatus, Prisma, PrismaClient } from '@prisma/client'
import { GraphQLError } from 'graphql'

type Database = PrismaClient | Prisma.TransactionClient

export async function refreshCatalogSubmissionStatus(tx: Database, submissionId: string) {
  const submission = await tx.catalogSubmission.findUnique({
    where: { id: submissionId },
    include: { catalogProposals: { select: { status: true } }, productRequests: { select: { status: true } } },
  })
  if (!submission) return null
  const statuses = [...submission.catalogProposals, ...submission.productRequests].map((entry) => entry.status)
  let status: CatalogSubmissionStatus = submission.status
  if (statuses.length && statuses.every((value) => value === 'REJECTED')) status = 'REJECTED'
  else if (statuses.length && statuses.every((value) => value === 'APPROVED')) status = 'APPROVED'
  else if (statuses.length && statuses.every((value) => value === 'APPROVED' || value === 'MERGED')) status = statuses.includes('MERGED') ? 'MERGED' : 'APPROVED'
  else if (statuses.some((value) => value !== 'PENDING')) status = 'PARTIALLY_APPROVED'
  else if (submission.submittedAt) status = 'PENDING'
  return tx.catalogSubmission.update({
    where: { id: submissionId },
    data: { status, reviewedAt: ['APPROVED', 'MERGED', 'REJECTED'].includes(status) ? new Date() : null },
  })
}

export async function createCatalogSubmission(
  prisma: PrismaClient,
  partnerId: number,
  input: { localId?: string | null; title?: string | null; proposalIds?: string[] | null; productRequestIds?: number[] | null },
) {
  const proposalIds = [...new Set(input.proposalIds ?? [])]
  const productRequestIds = [...new Set(input.productRequestIds ?? [])]
  if (!proposalIds.length && !productRequestIds.length) throw new GraphQLError('CATALOG_SUBMISSION_EMPTY')
  if (input.localId && !/^[a-zA-Z0-9:_-]{3,120}$/.test(input.localId)) throw new GraphQLError('INVALID_LOCAL_ID')

  const localId = input.localId?.trim() || null
  if (localId) {
    const existing = await prisma.catalogSubmission.findUnique({
      where: { partnerId_localId: { partnerId, localId } },
      include: { catalogProposals: true, productRequests: { include: { variants: true } } },
    })
    if (existing) return existing
  }

  try {
    return await prisma.$transaction(async (tx) => {
    const [proposals, requests] = await Promise.all([
      tx.catalogProposal.findMany({ where: { id: { in: proposalIds }, partnerId, status: 'PENDING' } }),
      tx.productTemplateRequest.findMany({ where: { id: { in: productRequestIds }, partnerId, status: 'PENDING' }, include: { variants: true } }),
    ])
    if (proposals.length !== proposalIds.length || requests.length !== productRequestIds.length) {
      throw new GraphQLError('CATALOG_SUBMISSION_ITEM_NOT_FOUND')
    }
    const submission = await tx.catalogSubmission.create({ data: {
      partnerId, localId, title: input.title?.trim() || null,
      status: 'PENDING', submittedAt: new Date(),
    } })
    if (proposalIds.length) await tx.catalogProposal.updateMany({ where: { id: { in: proposalIds } }, data: { submissionId: submission.id } })
    if (productRequestIds.length) await tx.productTemplateRequest.updateMany({ where: { id: { in: productRequestIds } }, data: { submissionId: submission.id } })
    for (const request of requests) {
      for (const variant of request.variants) {
        await tx.provisionalProduct.upsert({
          where: { partnerId_requestVariantId: { partnerId, requestVariantId: variant.id } },
          create: {
            partnerId, requestVariantId: variant.id, visibility: 'INTERNAL',
            name: [request.name, variant.name].filter(Boolean).join(' - '), nameAr: request.name_ar,
            price: variant.price ?? 0, costPrice: variant.costPrice, stock: variant.stock ?? 0,
            trackInventory: variant.trackInventory, localId: variant.localId,
          },
          update: {
            name: [request.name, variant.name].filter(Boolean).join(' - '), nameAr: request.name_ar,
            price: variant.price ?? 0, costPrice: variant.costPrice, stock: variant.stock ?? 0,
            trackInventory: variant.trackInventory,
          },
        })
      }
    }
    return tx.catalogSubmission.findUniqueOrThrow({
      where: { id: submission.id }, include: { catalogProposals: true, productRequests: { include: { variants: true } } },
    })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    // A retry can race the original request after the server committed but before
    // the client received the response. Return that committed submission.
    if (localId && typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return prisma.catalogSubmission.findUniqueOrThrow({
        where: { partnerId_localId: { partnerId, localId } },
        include: { catalogProposals: true, productRequests: { include: { variants: true } } },
      })
    }
    throw error
  }
}

export async function listCatalogSubmissions(prisma: PrismaClient, actorId: number, admin: boolean, status?: CatalogSubmissionStatus | null) {
  return prisma.catalogSubmission.findMany({
    where: { ...(admin ? {} : { partnerId: actorId }), ...(status ? { status } : {}) },
    include: { partner: true, catalogProposals: true, productRequests: { include: { variants: true } } },
    orderBy: { createdAt: 'desc' }, take: 100,
  })
}
