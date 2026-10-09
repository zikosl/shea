import 'dotenv/config'
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

type CategorySeed = { key: string; name: string; name_ar: string; image: string }
type ProductSeed = {
  image: string | null
  url: string
  name: string
  name_ar: string
  description: string
  category_id: string
}
type SeedData = { categories: CategorySeed[]; products: ProductSeed[] }

const NICHE = { name: 'Jewelry', name_ar: 'مجوهرات' }
const OTHER_BRAND = { name: 'Other', name_ar: 'أخرى' }
const DATA_PATH = path.join(process.cwd(), 'prisma', 'data', 'jewelry-catalog.json')

function clean(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

function skuFor(product: ProductSeed) {
  const slug = clean(product.name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'ITEM'
  const hash = createHash('sha256').update(product.url).digest('hex').slice(0, 12).toUpperCase()
  return `JW-${slug}-${hash}`
}

function validate(data: SeedData) {
  const categoryKeys = new Set<string>()
  const sourceUrls = new Set<string>()
  const imageUrls = new Set<string>()
  const skus = new Set<string>()

  for (const category of data.categories) {
    if (!category.key || !clean(category.name) || !clean(category.name_ar) || !clean(category.image)) {
      throw new Error(`Incomplete category: ${JSON.stringify(category)}`)
    }
    if (categoryKeys.has(category.key)) throw new Error(`Duplicate category key: ${category.key}`)
    categoryKeys.add(category.key)
  }

  for (const [index, product] of data.products.entries()) {
    if (!clean(product.url) || !clean(product.name) || !clean(product.name_ar)) {
      throw new Error(`Incomplete product at row ${index + 2}`)
    }
    if (!product.url.startsWith('https://ilyes-bijoux.com/products/')) {
      throw new Error(`Unexpected source URL at row ${index + 2}`)
    }
    if (sourceUrls.has(product.url)) throw new Error(`Duplicate source URL: ${product.url}`)
    sourceUrls.add(product.url)
    if (!categoryKeys.has(product.category_id)) throw new Error(`Unknown category ${product.category_id} at row ${index + 2}`)

    const sku = skuFor(product)
    if (skus.has(sku)) throw new Error(`Duplicate generated SKU: ${sku}`)
    skus.add(sku)

    if (product.image) {
      if (imageUrls.has(product.image)) throw new Error(`Duplicate assigned image URL: ${product.image}`)
      imageUrls.add(product.image)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) ||
      (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new Error('Use --dry-run (default) or --apply')
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as SeedData
  validate(data)
  const nameCounts = new Map<string, number>()
  for (const product of data.products) nameCounts.set(product.name, (nameCounts.get(product.name) ?? 0) + 1)
  const summary = {
    niche: NICHE.name,
    categories: data.categories.length,
    products: data.products.length,
    productsUsingOtherBrand: data.products.length,
    productsWithoutImage: data.products.filter(product => !product.image).length,
    repeatedNameRows: [...nameCounts.values()].reduce((count, value) => count + Math.max(0, value - 1), 0),
    variantsPerTemplate: 1,
  }
  if (!args.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...summary }, null, 2))
    return
  }

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for --apply')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  try {
    const niches = await prisma.niche.findMany({ where: { name: NICHE.name } })
    if (niches.length > 1) throw new Error(`Multiple niches named ${NICHE.name}`)

    const importedTemplates = await prisma.productTemplate.findMany({
      where: { importSourceUrl: { in: data.products.map(product => product.url) } },
      select: { id: true, importSourceUrl: true },
    })
    const importedByUrl = new Map(importedTemplates.map(template => [template.importSourceUrl, template.id]))
    const existingImages = await prisma.productImage.findMany({
      where: { url: { in: data.products.flatMap(product => product.image ? [product.image] : []) } },
      select: { url: true, product_template_id: true },
    })
    const imageOwnerByUrl = new Map(existingImages.map(image => [image.url, image.product_template_id]))
    for (const product of data.products) {
      const imageOwner = product.image ? imageOwnerByUrl.get(product.image) : undefined
      if (imageOwner !== undefined && imageOwner !== importedByUrl.get(product.url)) {
        throw new Error(`Image already belongs to another template: ${product.image}`)
      }
    }

    const niche = niches[0] ?? await prisma.niche.create({
      data: { ...NICHE, image: data.categories.find(category => category.key === 'rings')?.image ?? '' },
    })
    const [existingCategories, existingBrands] = await Promise.all([
      prisma.category.findMany({ where: { niche_id: niche.id } }),
      prisma.brand.findMany({ where: { niche_id: niche.id } }),
    ])
    const categoryIds = new Map<string, number>()
    for (const categorySeed of data.categories) {
      const matches = existingCategories.filter(category => category.name === categorySeed.name)
      if (matches.length > 1) throw new Error(`Multiple categories named ${categorySeed.name} in ${NICHE.name}`)
      const category = matches[0] ?? await prisma.category.create({
        data: { name: categorySeed.name, name_ar: categorySeed.name_ar, image: categorySeed.image, niche_id: niche.id },
      })
      categoryIds.set(categorySeed.key, category.id)
    }

    const otherBrands = existingBrands.filter(brand => brand.name === OTHER_BRAND.name)
    if (otherBrands.length > 1) throw new Error(`Multiple ${OTHER_BRAND.name} brands in ${NICHE.name}`)
    const otherBrand = otherBrands[0] ?? await prisma.brand.create({
      data: { ...OTHER_BRAND, image: '', niche_id: niche.id },
    })

    const pending = data.products.filter(product => !importedByUrl.has(product.url))
    let created = 0
    for (let offset = 0; offset < pending.length; offset += 50) {
      const batch = pending.slice(offset, offset + 50)
      const operations = batch.map(product => prisma.productTemplate.create({
        data: {
          importSourceUrl: product.url,
          name: product.name,
          name_ar: product.name_ar,
          description: product.description,
          category_id: categoryIds.get(product.category_id)!,
          brand_id: otherBrand.id,
          variants: { create: { name: 'Standard', sku: skuFor(product) } },
          ...(product.image ? { images: { create: { url: product.image, altText: product.name } } } : {}),
        },
      }))
      await prisma.$transaction(operations)
      created += batch.length
    }

    console.log(JSON.stringify({ mode: 'apply', ...summary, created, skipped: data.products.length - created }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
