import { PrismaClient } from '@prisma/client'
import { createBadRequestError } from '../../core/errors/app-error'
import { LogSatus } from '../../types'

export async function createProduct(
  prisma: PrismaClient,
  userId: number,
  input: {
    variantId: number
    price?: number | null
    available?: boolean | null
    stock?: number | null
  },
) {
  const product = await prisma.product.create({
    data: {
      partnerId: userId,
      variantId: input.variantId,
      price: input.price ?? undefined,
      available: input.available ?? undefined,
      stock: input.stock ?? undefined,
    },
  })

  await prisma.log.create({
    data: {
      title: 'Product Created',
      body: `A new product variant "${input.variantId}" has been added to partner ${userId}.`,
      title_ar: 'تم إنشاء منتج جديد',
      body_ar: `تمت إضافة متغير منتج جديد "${input.variantId}" إلى الشريك ${userId}.`,
      type: LogSatus.NEW_PRODUCT,
      userId,
    },
  })

  return product
}

export async function createManyProducts(
  prisma: PrismaClient,
  userId: number,
  products: Array<{ price: number; variantId: number }>,
) {
  if (!products || products.length === 0) {
    throw createBadRequestError('At least one product is required')
  }

  await prisma.product.createMany({
    data: products.map((product) => ({
      price: product.price,
      variantId: product.variantId,
      partnerId: userId,
    })),
    skipDuplicates: true,
  })

  await prisma.log.create({
    data: {
      title: 'Products Created',
      body: `A batch of products has been added to partner ${userId}.`,
      title_ar: 'تم إنشاء منتجات جديدة',
      body_ar: `تمت إضافة منتجات جديدة إلى الشريك ${userId}.`,
      type: LogSatus.NEW_PRODUCT,
      userId,
    },
  })

  return true
}

export async function updateProduct(
  prisma: PrismaClient,
  input: { id: number; price?: number | null; available?: boolean | null; stock?: number | null },
) {
  await prisma.product.update({
    where: { id: input.id },
    data: {
      price: input.price ?? undefined,
      available: input.available ?? undefined,
      stock: input.stock ?? undefined,
    },
  })

  return prisma.productView.findUnique({
    where: { id: input.id },
  })
}

export async function createProductTemplate(
  prisma: PrismaClient,
  input: {
    name: string
    description?: string | null
    images?: string[] | null
    product_type_id: number
    brand_id: number
  },
) {
  const images = input.images ?? []

  const productTemplate = await prisma.productTemplate.create({
    data: {
      name: input.name,
      product_type_id: input.product_type_id,
      brand_id: input.brand_id,
      description: input.description ?? '',
      images: {
        create: images.map((url) => ({ url })),
      },
    },
  })

  await prisma.log.create({
    data: {
      title: 'Product Template Created',
      body: `A new product template named "${input.name}" has been added to the catalog.`,
      title_ar: 'تم إنشاء قالب منتج جديد',
      body_ar: `تمت إضافة قالب منتج جديد باسم "${input.name}" إلى الكتالوج.`,
      type: LogSatus.NEW_PRODUCT,
    },
  })

  return productTemplate
}

export async function updateProductTemplate(
  prisma: PrismaClient,
  input: { id: number; name?: string | null; description?: string | null },
) {
  return prisma.productTemplate.update({
    where: { id: input.id },
    data: {
      name: input.name ?? undefined,
      description: input.description ?? undefined,
    },
  })
}

export async function updateProductTemplateImages(
  prisma: PrismaClient,
  productTemplateId: number,
  images: string[],
) {
  await prisma.productImage.deleteMany({
    where: { product_template_id: productTemplateId },
  })

  await prisma.productImage.createMany({
    data: images.map((url) => ({
      url,
      product_template_id: productTemplateId,
    })),
    skipDuplicates: true,
  })

  return prisma.productImage.findMany({
    where: { product_template_id: productTemplateId },
  })
}
