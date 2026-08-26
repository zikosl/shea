import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

type CosmeticsBrandSeed = {
  name: string
  image?: string
}

type CosmeticsProductSeed = {
  name: string
  brand: string
  category: string
  category_ar?: string
  productType: string
  productType_ar?: string
  description?: string
  images?: Array<{
    url: string
    altText?: string
  }>
  variants: Array<{
    name?: string
    sku?: string | null
    tags?: string[]
    image?: string
  }>
}

type CosmeticsTaxonomySeed = {
  categories: Array<{
    category: string
    icon?: string
  }>
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the cosmetics seed script.')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const dataDir = path.resolve(process.cwd(), 'prisma', 'data')
const brandsPath = path.join(dataDir, 'cosmetics-brands.json')
const productsPath = path.join(dataDir, 'cosmetics-products.json')
const taxonomyPath = path.join(dataDir, 'cosmetics-taxonomy.json')

const COSMETICS_NICHE = {
  name: 'Cosmetics',
  name_ar: 'مستحضرات التجميل',
  image: '/uploads/cosmetics/icons/niche-cosmetics.svg',
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

function clean(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)))
}

async function upsertProductImages(productTemplateId: number, images: CosmeticsProductSeed['images']) {
  const validImages = images?.filter((image) => clean(image.url)) ?? []
  if (validImages.length === 0) return

  await prisma.productImage.createMany({
    data: validImages.map((image) => ({
      url: clean(image.url),
      altText: clean(image.altText) || null,
      product_template_id: productTemplateId,
    })),
    skipDuplicates: true,
  })

  await prisma.productImage.updateMany({
    where: {
      url: {
        in: validImages.map((image) => clean(image.url)),
      },
    },
    data: {
      product_template_id: productTemplateId,
    },
  })
}

async function upsertVariantImage(variantId: number, imageUrl?: string | null) {
  const url = clean(imageUrl)
  if (!url) return

  await prisma.productImage.upsert({
    where: { url },
    create: {
      url,
      variantId,
    },
    update: {
      variantId,
    },
  })
}

async function upsertVariantTags(variantId: number, tags?: string[]) {
  for (const value of unique(tags ?? [])) {
    const existing = await prisma.tag.findFirst({
      where: {
        variantId,
        value,
      },
    })

    if (!existing) {
      await prisma.tag.create({
        data: {
          variantId,
          value,
        },
      })
    }
  }
}

async function main() {
  const brands = readJson<CosmeticsBrandSeed[]>(brandsPath)
  const products = readJson<CosmeticsProductSeed[]>(productsPath)
  const taxonomy = readJson<CosmeticsTaxonomySeed>(taxonomyPath)
  const categoryIconByName = new Map(taxonomy.categories.map((category) => [clean(category.category), clean(category.icon)]))

  const existingNiche = await prisma.niche.findFirst({
    where: { name: COSMETICS_NICHE.name },
  })
  const niche = existingNiche
    ? await prisma.niche.update({
        where: { id: existingNiche.id },
        data: {
          name_ar: COSMETICS_NICHE.name_ar,
          image: COSMETICS_NICHE.image,
        },
      })
    : await prisma.niche.create({
        data: COSMETICS_NICHE,
      })

  const brandByName = new Map<string, number>()
  const categoryByName = new Map<string, number>()
  const productTypeByKey = new Map<string, number>()

  for (const brandSeed of brands) {
    const name = clean(brandSeed.name)
    if (!name) continue

    const existing = await prisma.brand.findFirst({
      where: {
        name,
        niche_id: niche.id,
      },
    })

    const brand = existing
      ? await prisma.brand.update({
          where: { id: existing.id },
          data: {
            image: clean(brandSeed.image) || existing.image,
            niche_id: niche.id,
          },
        })
      : await prisma.brand.create({
          data: {
            name,
            image: clean(brandSeed.image),
            niche_id: niche.id,
          },
        })

    brandByName.set(name, brand.id)
  }

  let createdOrUpdatedTemplates = 0
  let createdOrUpdatedVariants = 0

  for (const productSeed of products) {
    const categoryName = clean(productSeed.category)
    const categoryNameAr = clean(productSeed.category_ar) || categoryName
    const productTypeName = clean(productSeed.productType)
    const productTypeNameAr = clean(productSeed.productType_ar) || productTypeName
    const brandName = clean(productSeed.brand)
    const productName = clean(productSeed.name)

    if (!categoryName || !productTypeName || !brandName || !productName) {
      continue
    }

    let brandId = brandByName.get(brandName)
    if (!brandId) {
      const brand = await prisma.brand.create({
        data: {
          name: brandName,
          image: '',
          niche_id: niche.id,
        },
      })
      brandId = brand.id
      brandByName.set(brandName, brand.id)
    }

    let categoryId = categoryByName.get(categoryName)
    if (!categoryId) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: categoryName,
          niche_id: niche.id,
        },
      })

      const category = existingCategory
        ? await prisma.category.update({
            where: { id: existingCategory.id },
            data: {
              name_ar: categoryNameAr,
              image: categoryIconByName.get(categoryName) || existingCategory.image,
              niche_id: niche.id,
            },
          })
        : await prisma.category.create({
            data: {
              name: categoryName,
              name_ar: categoryNameAr,
              image: categoryIconByName.get(categoryName) || '',
              niche_id: niche.id,
            },
          })

      categoryId = category.id
      categoryByName.set(categoryName, category.id)
    }

    const productTypeKey = `${categoryId}:${productTypeName}`
    let productTypeId = productTypeByKey.get(productTypeKey)
    if (!productTypeId) {
      const existingProductType = await prisma.productType.findFirst({
        where: {
          name: productTypeName,
          category_id: categoryId,
        },
      })

      const productType = existingProductType
        ? await prisma.productType.update({
            where: { id: existingProductType.id },
            data: {
              name_ar: productTypeNameAr,
            },
          })
        : await prisma.productType.create({
            data: {
              name: productTypeName,
              name_ar: productTypeNameAr,
              category_id: categoryId,
            },
          })

      productTypeId = productType.id
      productTypeByKey.set(productTypeKey, productType.id)
    }

    const existingTemplate = await prisma.productTemplate.findFirst({
      where: {
        name: productName,
        product_type_id: productTypeId,
        brand_id: brandId,
      },
    })

    const productTemplate = existingTemplate
      ? await prisma.productTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            description: clean(productSeed.description),
            product_type_id: productTypeId,
            brand_id: brandId,
          },
        })
      : await prisma.productTemplate.create({
          data: {
            name: productName,
            name_ar: '',
            description: clean(productSeed.description),
            product_type_id: productTypeId,
            brand_id: brandId,
          },
        })

    createdOrUpdatedTemplates += 1
    await upsertProductImages(productTemplate.id, productSeed.images)

    for (const variantSeed of productSeed.variants ?? []) {
      const variantName = clean(variantSeed.name) || 'Default'
      const existingVariant = await prisma.variant.findFirst({
        where: {
          productId: productTemplate.id,
          name: variantName,
        },
      })

      const sku = clean(variantSeed.sku)
      const variant = existingVariant
        ? await prisma.variant.update({
            where: { id: existingVariant.id },
            data: {
              sku: sku || existingVariant.sku,
            },
          })
        : await prisma.variant.create({
            data: {
              name: variantName,
              sku: sku || null,
              productId: productTemplate.id,
            },
          })

      createdOrUpdatedVariants += 1
      await upsertVariantImage(variant.id, variantSeed.image)
      await upsertVariantTags(variant.id, variantSeed.tags)
    }
  }

  console.log(
    JSON.stringify(
      {
        niche: niche.name,
        brands: brands.length,
        products: createdOrUpdatedTemplates,
        variants: createdOrUpdatedVariants,
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
