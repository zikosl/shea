import { booleanArg, extendType, intArg, nonNull, objectType, stringArg } from 'nexus'
import { GraphQLError } from 'graphql'
import { Context } from '../../../context'
import { requireGtin } from '../../../modules/catalog/barcodes'

const BarcodeCandidate = objectType({
  name: 'BarcodeCandidate',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.int('variantId')
    t.nonNull.string('barcode')
    t.nonNull.string('sourceUrl')
    t.string('sourceName')
    t.nonNull.int('matchScore')
    t.nonNull.string('status')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.field('variant', {
      type: 'Variant',
      resolve: (parent, _args, ctx: Context) => ctx.prisma.variant.findUnique({ where: { id: parent.variantId } }),
    })
  },
})

const BarcodeCandidateResult = objectType({
  name: 'BarcodeCandidateResult',
  definition(t) {
    t.nonNull.int('total')
    t.nonNull.list.nonNull.field('candidates', { type: 'BarcodeCandidate' })
  },
})

const BarcodeCandidateQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('findBarcodeCandidates', {
      type: 'BarcodeCandidateResult',
      args: {
        status: stringArg(),
        page: nonNull(intArg()),
        limit: nonNull(intArg()),
      },
      resolve: async (_parent, { status, page, limit }, ctx: Context) => {
        if (page < 1 || limit < 1 || limit > 100) throw new GraphQLError('Invalid page or limit')
        if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) throw new GraphQLError('Invalid status')
        const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}
        const [total, candidates] = await Promise.all([
          ctx.prisma.barcodeCandidate.count({ where }),
          ctx.prisma.barcodeCandidate.findMany({
            where,
            orderBy: [{ matchScore: 'desc' }, { createdAt: 'asc' }],
            skip: (page - 1) * limit,
            take: limit,
          }),
        ])
        return { total, candidates }
      },
    })
  },
})

const BarcodeCandidateMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('submitBarcodeCandidate', {
      type: 'BarcodeCandidate',
      args: {
        variantId: nonNull(intArg()),
        barcode: nonNull(stringArg()),
        sourceUrl: nonNull(stringArg()),
        sourceName: stringArg(),
      },
      resolve: async (_parent, { variantId, barcode, sourceUrl, sourceName }, ctx: Context) => {
        const code = requireGtin(barcode)
        const source = sourceUrl.trim()
        if (!source || source.length > 500) throw new GraphQLError('A source is required')
        if (!source.startsWith('physical-package:')) {
          try {
            if (new URL(source).protocol !== 'https:') throw new Error('HTTPS required')
          } catch {
            throw new GraphQLError('Use an HTTPS source URL or a physical-package reference')
          }
        }
        const variant = await ctx.prisma.variant.findUnique({ where: { id: variantId }, select: { id: true } })
        if (!variant) throw new GraphQLError('Variant not found')
        const existing = await ctx.prisma.barcodeCandidate.findFirst({ where: { variantId, barcode: code, sourceUrl: source } })
        if (existing) return existing
        return ctx.prisma.barcodeCandidate.create({
          data: { variantId, barcode: code, sourceUrl: source, sourceName: sourceName?.trim() || null, matchScore: source.startsWith('physical-package:') ? 100 : 0 },
        })
      },
    })

    t.nonNull.field('reviewBarcodeCandidate', {
      type: 'BarcodeCandidate',
      args: { id: nonNull(stringArg()), approve: nonNull(booleanArg()) },
      resolve: async (_parent, { id, approve }, ctx: Context) => {
        return ctx.prisma.$transaction(async (tx) => {
          const candidate = await tx.barcodeCandidate.findUnique({ where: { id } })
          if (!candidate) throw new GraphQLError('Barcode candidate not found')
          if (candidate.status !== 'PENDING') throw new GraphQLError('This candidate has already been reviewed')
          if (approve) {
            const owner = await tx.variant.findFirst({ where: { barcode: candidate.barcode }, select: { id: true } })
            if (owner && owner.id !== candidate.variantId) throw new GraphQLError('This barcode belongs to another variant')
            await tx.variant.update({
              where: { id: candidate.variantId },
              data: { barcode: candidate.barcode, barcodeSource: candidate.sourceUrl, barcodeVerifiedAt: new Date() },
            })
            await tx.barcodeCandidate.updateMany({
              where: { variantId: candidate.variantId, status: 'PENDING', id: { not: id } },
              data: { status: 'REJECTED', reviewedAt: new Date() },
            })
          }
          return tx.barcodeCandidate.update({
            where: { id },
            data: { status: approve ? 'APPROVED' : 'REJECTED', reviewedAt: new Date() },
          })
        })
      },
    })
  },
})

export default { BarcodeCandidate, BarcodeCandidateResult, BarcodeCandidateQuery, BarcodeCandidateMutation }
