import { extendType, nonNull, objectType, intArg, stringArg, booleanArg, arg } from 'nexus'
import { GraphQLError } from 'graphql'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import { UPLOAD_DIR } from '../../utils/const'
import { ensureEmailAvailable, throwAccountWriteError } from '../../application/auth/auth.service'
import { generateAccessCode } from '../../utils/password'
import { sendAccessCodeEmail } from '../../utils/mailer'
import { requireGtin } from '../../modules/catalog/barcodes'
import { discoverBarcode } from '../../modules/catalog/sahim-discovery'

type ProductVariant = { name: string; tags: string[]; sku?: string; barcode?: string; image?: string }
type ProductInput = { name: string; nameAr?: string; description?: string; categoryId: number; productTypeId?: number; brandId?: number; mergeTemplateId?: number; image: string; variants: ProductVariant[]; sourceUrl?: string; sourceImageUrl?: string }
type BarcodeInput = { variantId: number; barcode: string; image?: string }

function imageUrl(value: unknown): string {
  if (typeof value !== 'string' || !/^\/uploads\/sahim\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(value)) throw new GraphQLError('PACKAGE_IMAGE_REQUIRED')
  return value
}

export function normalizeInput(kind: string, raw: string): ProductInput | BarcodeInput {
  if (raw.length > 30000) throw new GraphQLError('SUBMISSION_TOO_LARGE')
  let input: any
  try { input = JSON.parse(raw) } catch { throw new GraphQLError('INVALID_SUBMISSION') }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new GraphQLError('INVALID_SUBMISSION')
  if (kind === 'BARCODE') {
    if (!Number.isSafeInteger(input.variantId) || input.variantId < 1) throw new GraphQLError('VARIANT_REQUIRED')
    if (typeof input.barcode !== 'string') throw new GraphQLError('BARCODE_REQUIRED')
    return { variantId: input.variantId, barcode: requireGtin(input.barcode), ...(input.image == null ? {} : { image: imageUrl(input.image) }) }
  }
  if (kind !== 'PRODUCT') throw new GraphQLError('INVALID_SUBMISSION_KIND')
  const name = String(input.name ?? '').trim()
  if (name.length < 2 || name.length > 160 || !Number.isSafeInteger(input.categoryId) || input.categoryId < 1) throw new GraphQLError('PRODUCT_DETAILS_REQUIRED')
  if (!Array.isArray(input.variants) || !input.variants.length || input.variants.length > 20) throw new GraphQLError('VARIANTS_REQUIRED')
  const variants = input.variants.map((item: any) => {
    const variantName = String(item?.name ?? '').trim()
    const tags = Array.isArray(item?.tags) ? [...new Set<string>(item.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean))] : []
    if (!variantName || variantName.length > 120 || !tags.length || tags.length > 12) throw new GraphQLError('VARIANT_DETAILS_REQUIRED')
    const generated = [name, ...tags].join('-').normalize('NFKD').toUpperCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 70) || 'VARIANT'
    const sku = typeof item.sku === 'string' ? item.sku.trim().slice(0, 120) : ''
    return { name: variantName, tags, sku: sku || `${generated}-${randomUUID().slice(0, 7).toUpperCase()}`, barcode: item.barcode ? requireGtin(item.barcode) : undefined, image: item.image ? imageUrl(item.image) : undefined }
  })
  const barcodes = variants.map((variant: ProductVariant) => variant.barcode).filter(Boolean)
  if (new Set(barcodes).size !== barcodes.length) throw new GraphQLError('DUPLICATE_BARCODE')
  if (new Set(variants.map((variant: ProductVariant) => variant.sku)).size !== variants.length) throw new GraphQLError('DUPLICATE_SKU')
  return {
    name, nameAr: String(input.nameAr ?? '').trim().slice(0, 160), description: String(input.description ?? '').trim().slice(0, 2000), categoryId: input.categoryId,
    productTypeId: Number.isSafeInteger(input.productTypeId) ? input.productTypeId : undefined,
    brandId: Number.isSafeInteger(input.brandId) ? input.brandId : undefined,
    mergeTemplateId: Number.isSafeInteger(input.mergeTemplateId) && input.mergeTemplateId > 0 ? input.mergeTemplateId : undefined,
    sourceUrl: typeof input.sourceUrl === 'string' && /^https:\/\/world\.open(?:food|beauty|products|petfood)facts\.org\/product\/\d+$/.test(input.sourceUrl) ? input.sourceUrl : undefined,
    sourceImageUrl: typeof input.sourceImageUrl === 'string' && /^https:\/\/images\.open(?:food|beauty|products|petfood)facts\.org\//.test(input.sourceImageUrl) ? input.sourceImageUrl.slice(0, 600) : undefined,
    image: imageUrl(input.image), variants,
  }
}

const SahimExternalProduct = objectType({ name: 'SahimExternalProduct', definition(t) {
  t.nonNull.string('name'); t.nonNull.string('nameAr'); t.nonNull.string('description'); t.nonNull.string('brand'); t.nonNull.string('quantity'); t.string('imageUrl'); t.nonNull.string('sourceUrl'); t.nonNull.string('sourceName')
} })
const SahimCandidateVariant = objectType({ name: 'SahimCandidateVariant', definition(t) {
  t.nonNull.int('id'); t.string('name'); t.string('barcode')
} })
const SahimTemplateMatch = objectType({ name: 'SahimTemplateMatch', definition(t) {
  t.nonNull.int('templateId'); t.nonNull.string('name'); t.nonNull.string('description'); t.nonNull.string('brand'); t.nonNull.int('categoryId'); t.int('nicheId'); t.int('productTypeId'); t.int('brandId'); t.nonNull.int('score'); t.nonNull.string('reason'); t.nonNull.list.nonNull.field('variants', { type: SahimCandidateVariant })
} })
const SahimExistingBarcode = objectType({ name: 'SahimExistingBarcode', definition(t) {
  t.nonNull.int('id'); t.string('name'); t.nonNull.string('productName')
} })
const SahimBarcodeDiscovery = objectType({ name: 'SahimBarcodeDiscovery', definition(t) {
  t.nonNull.string('status'); t.nonNull.int('retryAfterSeconds'); t.field('existing', { type: SahimExistingBarcode }); t.field('external', { type: SahimExternalProduct }); t.nonNull.list.nonNull.field('matches', { type: SahimTemplateMatch })
} })

async function sharedLookupBudget(): Promise<boolean> {
  const { redis } = await import('../../servers')
  if (redis.status !== 'ready') return true
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const window = Math.floor(Date.now() / 60_000)
    const count = await Promise.race([
      redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n", 1, `shea:sahim-lookup:${window}`, 60_000),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('LOOKUP_BUDGET_TIMEOUT')), 500) }),
    ])
    return Number(count) <= 10
  } catch { return true }
  finally { if (timer) clearTimeout(timer) }
}

const Contributor = objectType({
  name: 'ContributorAccount',
  definition(t) {
    t.nonNull.int('userId')
    t.nonNull.string('name')
    t.nonNull.boolean('active')
    t.string('email', { resolve: async (parent, _args, ctx: Context) => (await ctx.prisma.user.findUnique({ where: { id: parent.userId }, select: { email: true } }))?.email })
  },
})

const Contribution = objectType({
  name: 'SahimContribution',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('localId')
    t.nonNull.string('kind')
    t.nonNull.string('status')
    t.nonNull.int('contributorId')
    t.nonNull.string('payloadJson', { resolve: (parent) => JSON.stringify(parent.payload) })
    t.string('targetProductName', { resolve: (parent) => (parent as typeof parent & { targetProductName?: string }).targetProductName ?? null })
    t.string('targetVariantName', { resolve: (parent) => (parent as typeof parent & { targetVariantName?: string | null }).targetVariantName ?? null })
    t.string('reviewNote')
    t.nonNull.field('createdAt', { type: 'DateTime' })
  },
})

const Query = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('contributors', { type: Contributor, resolve: (_parent, _args, ctx: Context) => ctx.prisma.contributor.findMany({ orderBy: { name: 'asc' } }) })
    t.nonNull.list.nonNull.field('sahimReviewQueue', { type: Contribution, resolve: async (_parent, _args, ctx: Context) => {
      const queue = await ctx.prisma.catalogContribution.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 100 })
      const ids = queue.filter(item => item.kind === 'BARCODE').map(item => (item.payload as BarcodeInput).variantId).filter(Number.isSafeInteger)
      const variants = ids.length ? await ctx.prisma.variant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, product: { select: { name: true } } } }) : []
      const byId = new Map(variants.map(variant => [variant.id, variant]))
      return queue.map(item => {
        const target = item.kind === 'BARCODE' ? byId.get((item.payload as BarcodeInput).variantId) : null
        return { ...item, targetProductName: target?.product.name ?? null, targetVariantName: target?.name ?? null }
      })
    } })
    t.nonNull.list.nonNull.field('mySahimContributions', { type: Contribution, resolve: (_parent, _args, ctx: Context) => ctx.prisma.catalogContribution.findMany({ where: { contributorId: getUserId(ctx) }, orderBy: { createdAt: 'desc' }, take: 100 }) })
    t.field('sahimBarcodeLookup', {
      type: 'Variant',
      args: { barcode: nonNull(stringArg()) },
      resolve: (_parent, { barcode }, ctx: Context) => ctx.prisma.variant.findUnique({ where: { barcode: requireGtin(barcode) } }),
    })
    t.nonNull.field('sahimDiscoverBarcode', {
      type: SahimBarcodeDiscovery,
      args: { barcode: nonNull(stringArg()) },
      resolve: (_parent, { barcode }, ctx: Context) => discoverBarcode(ctx.prisma, barcode, fetch, sharedLookupBudget),
    })
  },
})

const Mutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('uploadSahimPhoto', {
      type: 'FileUploadResponse',
      args: { file: nonNull(arg({ type: 'File' })) },
      resolve: async (_parent, { file }: { file: File }) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new GraphQLError('IMAGE_TYPE_NOT_SUPPORTED')
        if (file.size > 8 * 1024 * 1024) throw new GraphQLError('IMAGE_TOO_LARGE')
        const buffer = Buffer.from(await file.arrayBuffer())
        if (buffer.length > 8 * 1024 * 1024 || buffer.length < 12) throw new GraphQLError('IMAGE_TOO_LARGE')
        const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
        if (!((file.type === 'image/jpeg' && jpeg) || (file.type === 'image/png' && png) || (file.type === 'image/webp' && webp))) throw new GraphQLError('INVALID_IMAGE')
        const extension = jpeg ? 'jpg' : png ? 'png' : 'webp'
        const filename = `${randomUUID()}.${extension}`
        await fs.mkdir(path.join(UPLOAD_DIR, 'sahim'), { recursive: true })
        await fs.writeFile(path.join(UPLOAD_DIR, 'sahim', filename), buffer, { flag: 'wx' })
        return { filename, mimetype: file.type, encoding: 'binary', url: `/uploads/sahim/${filename}` }
      },
    })
    t.field('createContributor', {
      type: Contributor,
      args: { email: nonNull(stringArg()), name: nonNull(stringArg()) },
      resolve: async (_parent, { email: rawEmail, name: rawName }, ctx: Context) => {
        const email = await ensureEmailAvailable(ctx.prisma, rawEmail)
        const name = rawName.trim()
        if (name.length < 2 || name.length > 120) throw new GraphQLError('NAME_REQUIRED')
        const password = generateAccessCode()
        const passwordHash = await bcrypt.hash(password, 12)
        const user = await ctx.prisma.user.create({ data: { email, passwordHash, authMethod: 'EMAIL_PASSWORD', role: 'CONTRIBUTOR', contributor: { create: { name } } } })
          .catch((error: unknown) => throwAccountWriteError(error, 'CONTRIBUTOR_CREATE_FAILED'))
        try { await sendAccessCodeEmail({ email, password, name, purpose: 'welcome', appName: 'Sahim' }) }
        catch { await ctx.prisma.user.delete({ where: { id: user.id } }); throw new GraphQLError('INVITE_EMAIL_FAILED') }
        await ctx.prisma.auditLog.create({ data: { actorId: getUserId(ctx), action: 'CONTRIBUTOR_CREATED', entity: 'CONTRIBUTOR', entityId: String(user.id) } })
        return ctx.prisma.contributor.findUniqueOrThrow({ where: { userId: user.id } })
      },
    })
    t.nonNull.boolean('resetContributorAccess', {
      args: { userId: nonNull(intArg()) },
      resolve: async (_parent, { userId }, ctx: Context) => {
        const contributor = await ctx.prisma.contributor.findUnique({ where: { userId }, include: { user: true } })
        if (!contributor?.user.email) throw new GraphQLError('CONTRIBUTOR_NOT_FOUND')
        const password = generateAccessCode()
        const passwordHash = await bcrypt.hash(password, 12)
        await sendAccessCodeEmail({ email: contributor.user.email, password, name: contributor.name, purpose: 'reset', appName: 'Sahim' })
        await ctx.prisma.$transaction([
          ctx.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
          ctx.prisma.token.deleteMany({ where: { userId } }),
          ctx.prisma.auditLog.create({ data: { actorId: getUserId(ctx), action: 'CONTRIBUTOR_ACCESS_RESET', entity: 'CONTRIBUTOR', entityId: String(userId) } }),
        ])
        return true
      },
    })
    t.nonNull.field('setContributorActive', {
      type: Contributor,
      args: { userId: nonNull(intArg()), active: nonNull(booleanArg()) },
      resolve: async (_parent, { userId, active }, ctx: Context) => ctx.prisma.$transaction(async (tx) => {
        const profile = await tx.contributor.update({ where: { userId }, data: { active } })
        if (!active) await tx.token.deleteMany({ where: { userId } })
        await tx.auditLog.create({ data: { actorId: getUserId(ctx), action: active ? 'CONTRIBUTOR_ENABLED' : 'CONTRIBUTOR_DISABLED', entity: 'CONTRIBUTOR', entityId: String(userId) } })
        return profile
      }),
    })
    t.nonNull.field('submitSahimContribution', {
      type: Contribution,
      args: { localId: nonNull(stringArg()), kind: nonNull(stringArg()), inputJson: nonNull(stringArg()) },
      resolve: async (_parent, { localId, kind, inputJson }, ctx: Context) => {
        const contributorId = getUserId(ctx)
        const id = localId.trim()
        if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id)) throw new GraphQLError('INVALID_LOCAL_ID')
        const existing = await ctx.prisma.catalogContribution.findUnique({ where: { contributorId_localId: { contributorId, localId: id } } })
        if (existing) return existing
        const payload = normalizeInput(kind, inputJson)
        const submittedCodes = kind === 'BARCODE'
          ? [(payload as BarcodeInput).barcode]
          : (payload as ProductInput).variants.flatMap(variant => variant.barcode ? [variant.barcode] : [])
        if (submittedCodes.length) {
          const pending = await ctx.prisma.catalogContribution.findMany({ where: { status: 'PENDING' }, select: { payload: true } })
          if (pending.some(item => {
            const other = item.payload as Record<string, any>
            return submittedCodes.includes(other.barcode) || (Array.isArray(other.variants) && other.variants.some((variant: ProductVariant) => variant.barcode && submittedCodes.includes(variant.barcode)))
          })) throw new GraphQLError('BARCODE_ALREADY_PENDING')
        }
        if (kind === 'BARCODE') {
          const entry = payload as BarcodeInput
          const target = await ctx.prisma.variant.findUnique({ where: { id: entry.variantId }, select: { barcode: true } })
          if (!target) throw new GraphQLError('VARIANT_NOT_FOUND')
          if (target.barcode) throw new GraphQLError('VARIANT_ALREADY_HAS_BARCODE')
          const owner = await ctx.prisma.variant.findUnique({ where: { barcode: entry.barcode } })
          if (owner) throw new GraphQLError('BARCODE_ALREADY_ASSIGNED')
        } else {
          const entry = payload as ProductInput
          const category = await ctx.prisma.category.findUnique({ where: { id: entry.categoryId } })
          if (!category) throw new GraphQLError('CATEGORY_NOT_FOUND')
          if (entry.mergeTemplateId) {
            const template = await ctx.prisma.productTemplate.findUnique({ where: { id: entry.mergeTemplateId }, select: { category_id: true } })
            if (!template || template.category_id !== entry.categoryId) throw new GraphQLError('MERGE_CATEGORY_MISMATCH')
          }
          if (entry.productTypeId && !(await ctx.prisma.productType.findFirst({ where: { id: entry.productTypeId, category_id: entry.categoryId } }))) throw new GraphQLError('PRODUCT_TYPE_DOES_NOT_BELONG_TO_CATEGORY')
          if (entry.brandId && !(await ctx.prisma.brand.findFirst({ where: { id: entry.brandId, OR: [{ niche_id: null }, { niche_id: category.niche_id }] } }))) throw new GraphQLError('BRAND_DOES_NOT_BELONG_TO_NICHE')
          const codes = entry.variants.map((variant) => variant.barcode).filter((code): code is string => Boolean(code))
          if (codes.length && await ctx.prisma.variant.findFirst({ where: { barcode: { in: codes } } })) throw new GraphQLError('BARCODE_ALREADY_ASSIGNED')
        }
        return ctx.prisma.catalogContribution.create({ data: { contributorId, localId: id, kind: kind as 'BARCODE' | 'PRODUCT', payload } })
      },
    })
    t.nonNull.field('reviewSahimContribution', {
      type: Contribution,
      args: { id: nonNull(stringArg()), approve: nonNull(booleanArg()), note: stringArg(), mergeTemplateId: intArg() },
      resolve: (_parent, { id, approve, note, mergeTemplateId }, ctx: Context) => ctx.prisma.$transaction(async (tx) => {
        const contribution = await tx.catalogContribution.findUnique({ where: { id } })
        if (!contribution || contribution.status !== 'PENDING') throw new GraphQLError('SUBMISSION_NOT_PENDING')
        if (approve) {
          const payload = contribution.payload as any
          if (contribution.kind === 'BARCODE') {
            const owner = await tx.variant.findUnique({ where: { barcode: payload.barcode } })
            const target = await tx.variant.findUnique({ where: { id: payload.variantId } })
            if (!target || (owner && owner.id !== target.id) || (target.barcode && target.barcode !== payload.barcode)) throw new GraphQLError('BARCODE_CONFLICT')
            await tx.variant.update({ where: { id: target.id }, data: { barcode: payload.barcode, barcodeSource: payload.image ?? null, barcodeVerifiedAt: new Date() } })
          } else {
            const entry = payload as ProductInput
            const category = await tx.category.findUnique({ where: { id: entry.categoryId } })
            if (!category) throw new GraphQLError('CATEGORY_NOT_FOUND')
            if (entry.productTypeId && !(await tx.productType.findFirst({ where: { id: entry.productTypeId, category_id: entry.categoryId } }))) throw new GraphQLError('PRODUCT_TYPE_DOES_NOT_BELONG_TO_CATEGORY')
            const codes = entry.variants.map((variant) => variant.barcode).filter((code): code is string => Boolean(code))
            const skus = entry.variants.map((variant) => variant.sku).filter((sku): sku is string => Boolean(sku))
            if (codes.length && await tx.variant.findFirst({ where: { barcode: { in: codes } } })) throw new GraphQLError('BARCODE_CONFLICT')
            if (skus.length && await tx.variant.findFirst({ where: { sku: { in: skus } } })) throw new GraphQLError('SKU_CONFLICT')
            const chosenTemplateId = mergeTemplateId ?? entry.mergeTemplateId
            const template = chosenTemplateId
              ? await tx.productTemplate.findUnique({ where: { id: chosenTemplateId } })
              : await tx.productTemplate.create({ data: { name: entry.name, name_ar: entry.nameAr ?? '', description: entry.description ?? '', category_id: entry.categoryId, product_type_id: entry.productTypeId, brand_id: entry.brandId, images: { create: [{ url: entry.image }] } } })
            if (!template || template.category_id !== entry.categoryId) throw new GraphQLError('MERGE_CATEGORY_MISMATCH')
            const usedImages = new Set<string>(chosenTemplateId ? [] : [entry.image])
            for (const variant of entry.variants) {
              const variantImage = variant.image || (chosenTemplateId ? entry.image : undefined)
              const addImage = variantImage && !usedImages.has(variantImage)
              if (variantImage) usedImages.add(variantImage)
              await tx.variant.create({ data: {
                productId: template.id, name: variant.name, sku: variant.sku, barcode: variant.barcode,
                barcodeSource: variant.barcode ? (variant.image || entry.image) : null, barcodeVerifiedAt: variant.barcode ? new Date() : null,
                tags: { create: variant.tags.map((value) => ({ value })) },
                images: addImage ? { create: [{ url: variantImage }] } : undefined,
              } })
            }
          }
        }
        const reviewed = await tx.catalogContribution.update({ where: { id }, data: { status: approve ? 'APPROVED' : 'REJECTED', reviewNote: note?.trim().slice(0, 500) || null, reviewedAt: new Date() } })
        await tx.auditLog.create({ data: { actorId: getUserId(ctx), action: approve ? 'SAHIM_APPROVED' : 'SAHIM_REJECTED', entity: 'CatalogContribution', entityId: id, metadata: { kind: contribution.kind, contributorId: contribution.contributorId, mergeTemplateId: mergeTemplateId ?? (contribution.payload as ProductInput).mergeTemplateId ?? null } } })
        return reviewed
      }),
    })
  },
})

export default { Contributor, Contribution, Query, Mutation }
