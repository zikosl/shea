import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

type Source = { key: string; barcode: string; source: string; kind: 'cosmetics' | 'sweets' }

const args = process.argv.slice(2)
if (args.some((arg) => !['--apply', '--dry-run'].includes(arg)) ||
    args.includes('--apply') && args.includes('--dry-run')) {
  throw new Error('Use --dry-run (default) or --apply')
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const apply = args.includes('--apply')
const dataDir = path.join(process.cwd(), 'prisma/data')

function validGtin(value: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false
  const digits = [...value].map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 ? 1 : 3), 0)
  return (10 - sum % 10) % 10 === check
}

const cosmetics = JSON.parse(fs.readFileSync(path.join(dataDir, 'cosmetics-products.json'), 'utf8')) as
  Array<{ variants: Array<{ sku: string; barcode?: string | null; barcodeStatus?: string; barcodeSource?: string | null }> }>
const sweets = JSON.parse(fs.readFileSync(path.join(dataDir, 'sweets-catalog.json'), 'utf8')) as
  { products: Array<{ url: string; barcode?: string | null; barcodeSource?: string | null }> }
const sources: Source[] = [
  ...cosmetics.flatMap((product) => product.variants.flatMap((variant) =>
    variant.barcodeStatus === 'VERIFIED' && variant.barcode && variant.barcodeSource
      ? [{ key: variant.sku, barcode: variant.barcode, source: variant.barcodeSource, kind: 'cosmetics' as const }]
      : [])),
  ...sweets.products.flatMap((product) => product.barcode && product.barcodeSource
    ? [{ key: product.url, barcode: product.barcode, source: product.barcodeSource, kind: 'sweets' as const }]
    : []),
]

const seen = new Set<string>()
for (const item of sources) {
  if (!validGtin(item.barcode) || !item.source.startsWith('https://')) {
    throw new Error(`Invalid sourced GTIN for ${item.key}`)
  }
  if (seen.has(item.barcode)) throw new Error(`Duplicate source GTIN ${item.barcode}`)
  seen.add(item.barcode)
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
async function main() {
  const cosmeticSources = sources.filter((source) => source.kind === 'cosmetics')
  const sweetSources = sources.filter((source) => source.kind === 'sweets')
  const [cosmeticVariants, sweetTemplates, owners] = await Promise.all([
    prisma.variant.findMany({
      where: { sku: { in: cosmeticSources.map((source) => source.key) } },
      select: { id: true, sku: true, barcode: true, barcodeSource: true, barcodeVerifiedAt: true },
    }),
    prisma.productTemplate.findMany({
      where: { importSourceUrl: { in: sweetSources.map((source) => source.key) } },
      select: { id: true, importSourceUrl: true, variants: { select: { id: true, name: true, barcode: true, barcodeSource: true, barcodeVerifiedAt: true } } },
    }),
    prisma.variant.findMany({
      where: { barcode: { in: sources.map((source) => source.barcode) } },
      select: { id: true, barcode: true },
    }),
  ])
  const bySku = new Map(cosmeticVariants.map((variant) => [variant.sku, variant]))
  const byUrl = new Map(sweetTemplates.map((template) => [template.importSourceUrl, template]))
  const ownerByCode = new Map(owners.map((owner) => [owner.barcode, owner.id]))
  const missing: string[] = []
  const conflicts: string[] = []
  const updates: Array<{ id: number; barcode: string; source: string }> = []
  let alreadySourced = 0
  for (const item of sources) {
    const sweet = item.kind === 'sweets' ? byUrl.get(item.key) : null
    const variant = item.kind === 'cosmetics' ? bySku.get(item.key) :
      sweet?.variants.length === 1 && sweet.variants[0].name === 'Standard' ? sweet.variants[0] : null
    if (!variant) { missing.push(`${item.kind}: ${item.key}`); continue }
    if (variant.barcode && variant.barcode !== item.barcode ||
        ownerByCode.has(item.barcode) && ownerByCode.get(item.barcode) !== variant.id) {
      conflicts.push(`${item.kind}: ${item.key}`)
      continue
    }
    if (variant.barcode === item.barcode && variant.barcodeSource && variant.barcodeVerifiedAt) {
      alreadySourced++
      continue
    }
    updates.push({ id: variant.id, barcode: item.barcode, source: item.source })
  }
  if (conflicts.length) throw new Error(`Conflicting existing barcodes: ${conflicts.join(', ')}`)
  if (apply && updates.length) {
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.variant.update({
          where: { id: update.id },
          data: { barcode: update.barcode, barcodeSource: update.source, barcodeVerifiedAt: new Date() },
        })
      }
    })
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', sourced: sources.length,
    alreadySourced, updated: apply ? updates.length : 0, wouldUpdate: apply ? 0 : updates.length,
    missing, conflicts }, null, 2))
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message.includes("Can't reach database server")
    ? 'Database is unreachable. Run this inside the backend container or set a reachable DATABASE_URL.'
    : error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
