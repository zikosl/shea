import 'dotenv/config'
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

type CategorySeed = { key: string; name: string; name_ar: string; image: string }
type BrandSeed = { key: string; name: string; name_ar: string }
type ProductSeed = {
  image: string | null
  url: string
  name: string
  name_ar: string
  description: string
  tags: string | null
  barcode?: string
  barcodeSource?: string
  category_id: string
  brand_id: string | null
}
type SeedData = { categories: CategorySeed[]; brands: BrandSeed[]; products: ProductSeed[] }

const NICHE = {
  name: 'Sweets & Snacks',
  name_ar: 'حلويات ووجبات خفيفة',
}
const OTHER_BRAND = { name: 'Other', name_ar: 'أخرى' }
const DATA_PATH = path.join(process.cwd(), 'prisma', 'data', 'sweets-catalog.json')

function clean(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

function categoryKey(key: string) {
  // Promotions are a merchandising state, not a permanent product category.
  return key === 'promo' ? 'chocolate' : key
}

function skuFor(product: ProductSeed) {
  const slug = clean(product.name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'ITEM'
  const tag = tagsFor(product.tags).join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 16)
  const hash = createHash('sha256').update(product.url).digest('hex').slice(0, 10).toUpperCase()
  return `SW-${slug}${tag ? `-${tag}` : ''}-${hash}`
}

function tagsFor(value: string | null) {
  return [...new Set(clean(value).split(',').map(clean).filter(Boolean))]
}

function validGtin(value: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false
  const digits = [...value].map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - sum % 10) % 10 === check
}

function validate(data: SeedData) {
  const categoryKeys = new Set<string>()
  const brandKeys = new Set<string>()
  const sourceUrls = new Set<string>()
  const imageUrls = new Set<string>()
  const skus = new Set<string>()
  const barcodes = new Set<string>()

  for (const category of data.categories) {
    if (!category.key || !clean(category.name) || !clean(category.name_ar) || !clean(category.image)) {
      throw new Error(`Incomplete category: ${JSON.stringify(category)}`)
    }
    if (categoryKeys.has(category.key)) throw new Error(`Duplicate category key: ${category.key}`)
    categoryKeys.add(category.key)
  }
  if (!categoryKeys.has('chocolate')) throw new Error('The promo category requires chocolate')

  for (const brand of data.brands) {
    if (!brand.key || !clean(brand.name) || !clean(brand.name_ar)) {
      throw new Error(`Incomplete brand: ${JSON.stringify(brand)}`)
    }
    if (brandKeys.has(brand.key)) throw new Error(`Duplicate brand key: ${brand.key}`)
    brandKeys.add(brand.key)
  }

  for (const [index, product] of data.products.entries()) {
    if (!clean(product.url) || !clean(product.name) || !clean(product.name_ar)) {
      throw new Error(`Incomplete product at row ${index + 2}`)
    }
    if (sourceUrls.has(product.url)) throw new Error(`Duplicate source URL: ${product.url}`)
    sourceUrls.add(product.url)
    const sku = skuFor(product)
    if (skus.has(sku)) throw new Error(`Duplicate generated SKU: ${sku}`)
    skus.add(sku)
    if (!categoryKeys.has(product.category_id) || !categoryKeys.has(categoryKey(product.category_id))) {
      throw new Error(`Unknown category ${product.category_id} at row ${index + 2}`)
    }
    if (product.brand_id && !brandKeys.has(product.brand_id)) {
      throw new Error(`Unknown brand ${product.brand_id} at row ${index + 2}`)
    }
    if (product.image) {
      if (imageUrls.has(product.image)) throw new Error(`Duplicate image URL: ${product.image}`)
      imageUrls.add(product.image)
    }
    if (product.barcode) {
      if (!validGtin(product.barcode) || !product.barcodeSource?.startsWith('https://')) {
        throw new Error(`Barcode requires a valid GTIN and HTTPS source at row ${index + 2}`)
      }
      if (barcodes.has(product.barcode)) throw new Error(`Duplicate barcode: ${product.barcode}`)
      barcodes.add(product.barcode)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some((arg) => !['--apply', '--dry-run'].includes(arg)) ||
      (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new Error('Use --dry-run (default) or --apply')
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as SeedData
  validate(data)
  const summary = {
    niche: NICHE.name,
    sourceCategories: data.categories.length,
    catalogCategories: data.categories.length - data.categories.filter((item) => item.key === 'promo').length,
    brands: data.brands.length + 1,
    products: data.products.length,
    productsUsingOtherBrand: data.products.filter((item) => !item.brand_id).length,
    productsWithoutImage: data.products.filter((item) => !item.image).length,
    productsWithSourcedBarcode: data.products.filter((item) => !!item.barcode).length,
    promotionsMappedToChocolate: data.products.filter((item) => item.category_id === 'promo').length,
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
      where: { importSourceUrl: { in: data.products.map((product) => product.url) } },
      select: { id: true, importSourceUrl: true },
    })
    const importedByUrl = new Map(importedTemplates.map((template) => [template.importSourceUrl, template.id]))
    const sourcedProducts = data.products.filter((product) => product.barcode)
    const existingBarcodeOwners = await prisma.variant.findMany({
      where: { barcode: { in: sourcedProducts.map((product) => product.barcode!) } },
      select: { barcode: true, productId: true },
    })
    for (const owner of existingBarcodeOwners) {
      const source = sourcedProducts.find((product) => product.barcode === owner.barcode)!
      if (owner.productId !== importedByUrl.get(source.url)) {
        throw new Error(`Barcode ${owner.barcode} already belongs to another template`)
      }
    }
    const existingImages = await prisma.productImage.findMany({
      where: { url: { in: data.products.flatMap((product) => product.image ? [product.image] : []) } },
      select: { url: true, product_template_id: true },
    })
    const imageOwnerByUrl = new Map(existingImages.map((image) => [image.url, image.product_template_id]))
    for (const product of data.products) {
      const imageOwner = product.image ? imageOwnerByUrl.get(product.image) : undefined
      if (imageOwner !== undefined && imageOwner !== importedByUrl.get(product.url)) {
        throw new Error(`Image already belongs to another template: ${product.image}`)
      }
    }

    const niche = niches[0] ?? await prisma.niche.create({
      data: {
        ...NICHE,
        image: data.categories.find((item) => item.key === 'snacks')?.image ?? '',
      },
    })

    const existingCategories = await prisma.category.findMany({ where: { niche_id: niche.id } })
    const existingBrands = await prisma.brand.findMany({ where: { niche_id: niche.id } })
    const categoryIds = new Map<string, number>()
    const brandIds = new Map<string, number>()

    for (const item of data.categories.filter((category) => category.key !== 'promo')) {
      const matches = existingCategories.filter((category) => category.name === item.name)
      if (matches.length > 1) throw new Error(`Multiple categories named ${item.name} in ${NICHE.name}`)
      const category = matches[0] ?? await prisma.category.create({
        data: { name: item.name, name_ar: item.name_ar, image: item.image, niche_id: niche.id },
      })
      categoryIds.set(item.key, category.id)
    }

    for (const item of [...data.brands, { key: '__other__', ...OTHER_BRAND }]) {
      const matches = existingBrands.filter((brand) => brand.name === item.name)
      if (matches.length > 1) throw new Error(`Multiple brands named ${item.name} in ${NICHE.name}`)
      const brand = matches[0] ?? await prisma.brand.create({
        data: { name: item.name, name_ar: item.name_ar, image: '', niche_id: niche.id },
      })
      brandIds.set(item.key, brand.id)
    }

    let created = 0
    let skipped = 0
    let barcodesUpdated = 0
    for (const product of data.products) {
      if (importedByUrl.has(product.url)) {
        if (product.barcode) {
          const variants = await prisma.variant.findMany({
            where: { productId: importedByUrl.get(product.url)! },
            select: { id: true, name: true, barcode: true },
          })
          const variant = variants.length === 1 && variants[0].name === 'Standard' ? variants[0] : null
          if (!variant) throw new Error(`Cannot identify Standard variant for ${product.url}`)
          if (variant.barcode && variant.barcode !== product.barcode) {
            throw new Error(`Conflicting barcode on ${product.url}: ${variant.barcode}`)
          }
          if (!variant.barcode) {
            await prisma.variant.update({
              where: { id: variant.id },
              data: { barcode: product.barcode, barcodeSource: product.barcodeSource, barcodeVerifiedAt: new Date() },
            })
            barcodesUpdated += 1
          }
        }
        skipped += 1
        continue
      }

      await prisma.productTemplate.create({
        data: {
          importSourceUrl: product.url,
          name: product.name,
          name_ar: product.name_ar,
          description: product.description,
          category_id: categoryIds.get(categoryKey(product.category_id))!,
          brand_id: brandIds.get(product.brand_id ?? '__other__')!,
          variants: {
            create: {
              name: 'Standard',
              sku: skuFor(product),
              ...(product.barcode ? {
                barcode: product.barcode,
                barcodeSource: product.barcodeSource,
                barcodeVerifiedAt: new Date(),
              } : {}),
              tags: { create: tagsFor(product.tags).map((value) => ({ value })) },
            },
          },
          ...(product.image ? {
            images: { create: { url: product.image, altText: product.name } },
          } : {}),
        },
      })
      created += 1
    }
    console.log(JSON.stringify({ mode: 'apply', ...summary, created, skipped, barcodesUpdated }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
