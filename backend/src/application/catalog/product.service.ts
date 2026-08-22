import { PrismaClient } from '@prisma/client'
import { createBadRequestError, createForbiddenError, createNotFoundError } from '../../core/errors/app-error'
import { LogSatus } from '../../types'

export async function createProduct(
  prisma: PrismaClient,
  userId: number,
  input: {
    variantId: number
    price?: number | null
    costPrice?: number | null
    discount?: number | null
    available?: boolean | null
    stock?: number | null
    reorderThreshold?: number | null
    isVisibleInPos?: boolean | null
    onlineVisible?: boolean | null
    isActive?: boolean | null
    customName?: string | null
    customDescription?: string | null
    customImages?: string[] | null
    vendorSku?: string | null
    vendorBarcode?: string | null
    notes?: string | null
  },
) {
  const product = await prisma.product.create({
    data: {
      partnerId: userId,
      variantId: input.variantId,
      price: input.price ?? undefined,
      costPrice: input.costPrice ?? undefined,
      discount: input.discount ?? undefined,
      available: input.available ?? undefined,
      stock: input.stock ?? undefined,
      reorderThreshold: input.reorderThreshold ?? undefined,
      isVisibleInPos: input.isVisibleInPos ?? undefined,
      onlineVisible: input.onlineVisible ?? undefined,
      isActive: input.isActive ?? undefined,
      customName: input.customName ?? undefined,
      customDescription: input.customDescription ?? undefined,
      customImages: input.customImages ?? undefined,
      vendorSku: input.vendorSku ?? undefined,
      vendorBarcode: input.vendorBarcode ?? undefined,
      notes: input.notes ?? undefined,
    },
  })

  if ((input.stock ?? 0) !== 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        partnerId: userId,
        userId,
        type: 'RECEIPT',
        quantityDelta: input.stock ?? 0,
        stockBefore: 0,
        stockAfter: input.stock ?? 0,
        reason: 'Initial stock',
      },
    })
  }

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
  products: Array<{
    price: number
    variantId: number
    stock?: number | null
    available?: boolean | null
    discount?: number | null
    reorderThreshold?: number | null
    isVisibleInPos?: boolean | null
    onlineVisible?: boolean | null
    isActive?: boolean | null
  }>,
) {
  if (!products || products.length === 0) {
    throw createBadRequestError('At least one product is required')
  }

  await prisma.product.createMany({
    data: products.map((product) => ({
      price: product.price,
      variantId: product.variantId,
      partnerId: userId,
      stock: product.stock ?? 0,
      available: product.available ?? true,
      discount: product.discount ?? 0,
      reorderThreshold: product.reorderThreshold ?? 0,
      isVisibleInPos: product.isVisibleInPos ?? true,
      onlineVisible: product.onlineVisible ?? false,
      isActive: product.isActive ?? true,
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
  userId: number,
  input: {
    id: number
    price?: number | null
    costPrice?: number | null
    discount?: number | null
    available?: boolean | null
    stock?: number | null
    reorderThreshold?: number | null
    isVisibleInPos?: boolean | null
    onlineVisible?: boolean | null
    isActive?: boolean | null
    customName?: string | null
    customDescription?: string | null
    customImages?: string[] | null
    vendorSku?: string | null
    vendorBarcode?: string | null
    notes?: string | null
  },
) {
  const product = await prisma.product.findUnique({
    where: { id: input.id },
    select: { partnerId: true, stock: true },
  })

  if (!product) {
    throw createNotFoundError('Product not found')
  }

  if (product.partnerId !== userId) {
    throw createForbiddenError('You can only update your own products')
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: input.id },
      data: {
        price: input.price ?? undefined,
        costPrice: input.costPrice ?? undefined,
        discount: input.discount ?? undefined,
        available: input.available ?? undefined,
        stock: input.stock ?? undefined,
        reorderThreshold: input.reorderThreshold ?? undefined,
        isVisibleInPos: input.isVisibleInPos ?? undefined,
        onlineVisible: input.onlineVisible ?? undefined,
        isActive: input.isActive ?? undefined,
        customName: input.customName ?? undefined,
        customDescription: input.customDescription ?? undefined,
        customImages: input.customImages ?? undefined,
        vendorSku: input.vendorSku ?? undefined,
        vendorBarcode: input.vendorBarcode ?? undefined,
        notes: input.notes ?? undefined,
      },
    })

    if (input.stock !== undefined && input.stock !== null && input.stock !== product.stock) {
      await tx.stockMovement.create({
        data: {
          productId: input.id,
          partnerId: userId,
          userId,
          type: input.stock > product.stock ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantityDelta: input.stock - product.stock,
          stockBefore: product.stock,
          stockAfter: input.stock,
          reason: 'Manual stock update',
        },
      })
    }
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
