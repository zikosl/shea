import { Prisma } from '@prisma/client'
import { GraphQLError } from 'graphql'

const previewFields = [
  'name', 'name_ar', 'description', 'description_ar', 'variant_name', 'variant_name_ar',
  'variant_sku', 'customName', 'customDescription', 'vendorSku', 'vendorBarcode',
] as const
const productFields = [
  'name', 'name_ar', 'description', 'description_ar', 'variantName', 'variantNameAr',
  'sku', 'customName', 'customDescription', 'vendorSku', 'vendorBarcode',
] as const
const templateFields = ['name', 'name_ar', 'description', 'description_ar'] as const

export function catalogSearchTerms(value?: string | null): string[] {
  if (!value?.trim()) return []
  if (value.length > 120) throw new GraphQLError('SEARCH_TOO_LONG', { extensions: { code: 'BAD_USER_INPUT' } })
  const terms = [...new Set(value.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])]
  if (!terms.length) throw new GraphQLError('SEARCH_INVALID', { extensions: { code: 'BAD_USER_INPUT' } })
  if (terms.length > 10) throw new GraphQLError('SEARCH_TOO_MANY_TERMS', { extensions: { code: 'BAD_USER_INPUT' } })
  return terms
}

function allTermsAcrossFields(terms: string[], fields: readonly string[]) {
  return {
    AND: terms.map(term => ({
      OR: fields.map(field => ({ [field]: { contains: term, mode: 'insensitive' as const } })),
    })),
  }
}

export function previewSearchWhere(terms: string[]): Prisma.ProductTemplatePartnerPreviewWhereInput {
  return allTermsAcrossFields(terms, previewFields) as Prisma.ProductTemplatePartnerPreviewWhereInput
}

export function productSearchWhere(terms: string[]): Prisma.ProductViewWhereInput {
  return allTermsAcrossFields(terms, productFields) as Prisma.ProductViewWhereInput
}

export function templateSearchWhere(terms: string[]): Prisma.ProductTemplateViewWhereInput {
  return allTermsAcrossFields(terms, templateFields) as Prisma.ProductTemplateViewWhereInput
}
