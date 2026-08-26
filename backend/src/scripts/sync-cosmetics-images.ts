import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

type BrandSeed = {
  name: string
  image?: string
}

type ProductSeed = {
  name: string
  brand: string
  productType?: string
  images?: Array<{
    url?: string
    altText?: string
  }>
  variants?: Array<{
    name?: string
    image?: string
  }>
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to sync cosmetics images.')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const dataDir = path.resolve(process.cwd(), 'prisma', 'data')
const brandsPath = path.join(dataDir, 'cosmetics-brands.json')
const productsPath = path.join(dataDir, 'cosmetics-products.json')
const nicheName = process.env.COSMETICS_NICHE_NAME ?? 'Cosmetics'

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

function clean(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

function isLocalUploadPath(value?: string | null): value is string {
  return typeof value === 'string' && value.startsWith('/uploads/')
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)))
}

async function syncBrandImages(brands: BrandSeed[], nicheId: number) {
  let updated = 0
  let skipped = 0

  for (const brandSeed of brands) {
    const name = clean(brandSeed.name)
    const image = clean(brandSeed.image)

    if (!name || !isLocalUploadPath(image)) {
      skipped += 1
      continue
    }

    const brand = await prisma.brand.findFirst({
      where: {
        name,
        niche_id: nicheId,
      },
      select: {
        id: true,
        image: true,
      },
    })

    if (!brand) {
      skipped += 1
      continue
    }

    if (brand.image !== image) {
      await prisma.brand.update({
        where: { id: brand.id },
        data: { image },
      })
      updated += 1
    }
  }

  return { updated, skipped }
}

async function syncTemplateImages(productTemplateId: number, images: NonNullable<ProductSeed['images']>) {
  const desiredImages = images
    .map((image) => ({
      url: clean(image.url),
      altText: clean(image.altText) || null,
    }))
    .filter((image) => isLocalUploadPath(image.url))

  const desiredUrls = unique(desiredImages.map((image) => image.url))
  if (!desiredUrls.length) return { linked: 0, unlinked: 0 }

  for (const image of desiredImages) {
    await prisma.productImage.upsert({
      where: { url: image.url },
      create: {
        url: image.url,
        altText: image.altText,
        product_template_id: productTemplateId,
      },
      update: {
        altText: image.altText,
        product_template_id: productTemplateId,
      },
    })
  }

  const unlinkResult = await prisma.productImage.updateMany({
    where: {
      product_template_id: productTemplateId,
      url: {
        notIn: desiredUrls,
      },
    },
    data: {
      product_template_id: null,
    },
  })

  return {
    linked: desiredUrls.length,
    unlinked: unlinkResult.count,
  }
}

async function syncVariantImage(productTemplateId: number, variantName: string, imageUrl?: string | null) {
  const image = clean(imageUrl)
  if (!variantName || !isLocalUploadPath(image)) return { linked: 0, unlinked: 0, skipped: 1 }

  const variant = await prisma.variant.findFirst({
    where: {
      productId: productTemplateId,
      name: variantName,
    },
    select: { id: true },
  })

  if (!variant) return { linked: 0, unlinked: 0, skipped: 1 }

  await prisma.productImage.upsert({
    where: { url: image },
    create: {
      url: image,
      variantId: variant.id,
    },
    update: {
      variantId: variant.id,
    },
  })

  const unlinkResult = await prisma.productImage.updateMany({
    where: {
      variantId: variant.id,
      url: {
        not: image,
      },
    },
    data: {
      variantId: null,
    },
  })

  return { linked: 1, unlinked: unlinkResult.count, skipped: 0 }
}

async function main() {
  const brands = readJson<BrandSeed[]>(brandsPath)
  const products = readJson<ProductSeed[]>(productsPath)

  const niche = await prisma.niche.findFirst({
    where: { name: nicheName },
    select: { id: true, name: true },
  })

  if (!niche) {
    throw new Error(`Niche "${nicheName}" was not found. Run the cosmetics seed first.`)
  }

  const brandResult = await syncBrandImages(brands, niche.id)
  let templatesMatched = 0
  let templatesSkipped = 0
  let templateImagesLinked = 0
  let templateImagesUnlinked = 0
  let variantImagesLinked = 0
  let variantImagesUnlinked = 0
  let variantsSkipped = 0

  for (const productSeed of products) {
    const productName = clean(productSeed.name)
    const brandName = clean(productSeed.brand)
    const productTypeName = clean(productSeed.productType)

    if (!productName || !brandName) {
      templatesSkipped += 1
      continue
    }

    const productTemplate = await prisma.productTemplate.findFirst({
      where: {
        name: productName,
        Brand: {
          name: brandName,
          niche_id: niche.id,
        },
        ...(productTypeName
          ? {
              productType: {
                name: productTypeName,
              },
            }
          : {}),
      },
      select: { id: true },
    })

    if (!productTemplate) {
      templatesSkipped += 1
      continue
    }

    templatesMatched += 1

    const templateResult = await syncTemplateImages(productTemplate.id, productSeed.images ?? [])
    templateImagesLinked += templateResult.linked
    templateImagesUnlinked += templateResult.unlinked

    for (const variantSeed of productSeed.variants ?? []) {
      const variantName = clean(variantSeed.name) || 'Default'
      const variantResult = await syncVariantImage(productTemplate.id, variantName, variantSeed.image)
      variantImagesLinked += variantResult.linked
      variantImagesUnlinked += variantResult.unlinked
      variantsSkipped += variantResult.skipped
    }
  }

  console.log(
    JSON.stringify(
      {
        niche: niche.name,
        brands: brandResult,
        templates: {
          matched: templatesMatched,
          skipped: templatesSkipped,
        },
        productTemplateImages: {
          linked: templateImagesLinked,
          unlinkedOldPaths: templateImagesUnlinked,
        },
        variantImages: {
          linked: variantImagesLinked,
          unlinkedOldPaths: variantImagesUnlinked,
          skipped: variantsSkipped,
        },
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
