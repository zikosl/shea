import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

type VariantSeed = { sku?: string | null; barcode?: string | null; barcodeStatus?: string; barcodeSource?: string | null }
type ProductSeed = { variants: VariantSeed[] }

async function main() {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== '--apply')) throw new Error('Only --apply is supported')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const file = path.join(process.cwd(), 'prisma', 'data', 'cosmetics-products.json')
  const products = JSON.parse(fs.readFileSync(file, 'utf8')) as ProductSeed[]
  const variants = products.flatMap((product) => product.variants)
  const skus = variants.map((variant) => variant.sku).filter((sku): sku is string => Boolean(sku))
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  try {
    const approved = await prisma.variant.findMany({
      where: { sku: { in: skus }, barcode: { not: null }, barcodeVerifiedAt: { not: null } },
      select: { sku: true, barcode: true, barcodeSource: true },
    })
    const bySku = new Map(approved.map((variant) => [variant.sku, variant]))
    let changed = 0
    for (const variant of variants) {
      const match = bySku.get(variant.sku ?? null)
      if (!match?.barcode || variant.barcode === match.barcode && variant.barcodeStatus === 'VERIFIED') continue
      if (variant.barcode && variant.barcodeStatus === 'VERIFIED' && variant.barcode !== match.barcode) {
        throw new Error(`Conflicting verified barcode for ${variant.sku}`)
      }
      variant.barcode = match.barcode
      variant.barcodeStatus = 'VERIFIED'
      variant.barcodeSource = match.barcodeSource
      changed += 1
    }
    if (args.includes('--apply') && changed) {
      fs.copyFileSync(file, `${file}.${new Date().toISOString().replace(/[:.]/g, '-')}.backup`)
      fs.writeFileSync(file, `${JSON.stringify(products, null, 2)}\n`)
    }
    console.log(JSON.stringify({ approvedInDatabase: approved.length, updatedInJson: changed, applied: args.includes('--apply') }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
