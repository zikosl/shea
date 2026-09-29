import 'dotenv/config'
import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { isValidGtin, normalizeGtin } from '../modules/catalog/barcodes'

type VariantSeed = { sku?: string | null; sourceName?: string; sourceProductUrl?: string; barcode?: string | null }
type ProductSeed = { name: string; brand: string; variants: VariantSeed[] }
type Candidate = { barcode: string; sourceUrl: string; sourceName: string; matchScore: number }

const DATA_PATH = path.join(process.cwd(), 'prisma', 'data', 'cosmetics-products.json')
const USER_AGENT = 'SheaBarcodeResearch/1.0 (https://shea.openzey.com)'

function option(name: string, fallback: number) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  const value = Number(process.argv[index + 1])
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${name}`)
  return value
}

function normalizeName(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

function addCode(value: unknown, target: Set<string>) {
  if (typeof value !== 'string' && typeof value !== 'number') return
  const code = normalizeGtin(String(value))
  if (isValidGtin(code)) target.add(code)
}

function productJsonCodes(value: unknown, codes: Set<string>) {
  if (Array.isArray(value)) return value.forEach((entry) => productJsonCodes(entry, codes))
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  const type = record['@type']
  const types = Array.isArray(type) ? type : [type]
  if (types.some((item) => typeof item === 'string' && item.toLowerCase() === 'product')) {
    for (const [key, field] of Object.entries(record)) {
      if (/^(?:gtin(?:8|12|13|14)?|ean|upc|barcode)$/i.test(key)) addCode(field, codes)
    }
  }
  if (record['@graph']) productJsonCodes(record['@graph'], codes)
}

function sourcePageCodes(html: string) {
  const $ = cheerio.load(html)
  const codes = new Set<string>()
  $('script[type="application/ld+json"]').each((_, element) => {
    try { productJsonCodes(JSON.parse($(element).text()), codes) } catch { /* malformed source JSON */ }
  })
  $('[itemprop^="gtin"], [data-ean], [data-gtin], [data-barcode]').each((_, element) => {
    const node = $(element)
    addCode(node.attr('content') ?? node.attr('data-ean') ?? node.attr('data-gtin') ?? node.attr('data-barcode') ?? node.text(), codes)
  })
  return [...codes]
}

function matchScore(expected: string, actual: string, brand: string) {
  const target = normalizeName(expected)
  const found = normalizeName(actual)
  const brandWords = normalizeName(brand).split(' ').filter(Boolean)
  if (!target || !found || brandWords.some((word) => !found.split(' ').includes(word))) return 0
  const expectedWords = target.split(' ').filter((word) => word.length > 1 && !brandWords.includes(word))
  const foundWords = new Set(found.split(' '))
  const importantNumbers = expectedWords.filter((word) => /\d/.test(word))
  if (importantNumbers.some((word) => !foundWords.has(word))) return 0
  const overlap = expectedWords.length ? expectedWords.filter((word) => foundWords.has(word)).length / expectedWords.length : 0
  return Math.round(overlap * 90)
}

async function lookup(product: ProductSeed, variant: VariantSeed, includeCommunity: boolean): Promise<Candidate[]> {
  const found: Candidate[] = []
  const sourceUrl = variant.sourceProductUrl
  if (sourceUrl?.startsWith('https://')) {
    try {
      const response = await axios.get<string>(sourceUrl, {
        timeout: 12000, responseType: 'text', headers: { 'User-Agent': USER_AGENT },
      })
      const codes = sourcePageCodes(response.data)
      if (codes.length === 1) found.push({ barcode: codes[0], sourceUrl, sourceName: variant.sourceName ?? product.name, matchScore: 95 })
    } catch (error) {
      console.error(`Source lookup failed: ${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (includeCommunity) {
    try {
      const search = [product.brand, variant.sourceName ?? product.name].filter(Boolean).join(' ')
      const response = await axios.get('https://world.openbeautyfacts.org/cgi/search.pl', {
        params: { search_terms: search, search_simple: 1, action: 'process', json: 1, page_size: 10 },
        timeout: 12000, headers: { 'User-Agent': USER_AGENT },
      })
      for (const item of response.data?.products ?? []) {
        const code = normalizeGtin(String(item.code ?? ''))
        const sourceName = String(item.product_name ?? '')
        const score = matchScore(variant.sourceName ?? product.name, `${item.brands ?? ''} ${sourceName}`, product.brand)
        if (isValidGtin(code) && score >= 65) {
          found.push({
            barcode: code,
            sourceUrl: `https://world.openbeautyfacts.org/product/${code}`,
            sourceName,
            matchScore: Math.min(score, 85),
          })
        }
      }
    } catch (error) {
      console.error(`Open Beauty Facts lookup failed: ${variant.sourceName}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return found.filter((candidate, index) => found.findIndex((other) => other.barcode === candidate.barcode && other.sourceUrl === candidate.sourceUrl) === index)
}

async function main() {
  const allowed = new Set(['--apply', '--open-beauty-facts', '--limit', '--offset'])
  for (let index = 0; index < process.argv.slice(2).length; index += 1) {
    const argument = process.argv.slice(2)[index]
    if (!allowed.has(argument)) throw new Error(`Unknown option: ${argument}`)
    if (argument === '--limit' || argument === '--offset') index += 1
  }
  const apply = process.argv.includes('--apply')
  const includeCommunity = process.argv.includes('--open-beauty-facts')
  const limit = option('--limit', 25)
  const offset = option('--offset', 0)
  if (limit < 1 || limit > 100) throw new Error('--limit must be between 1 and 100')
  const products = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as ProductSeed[]
  const rows = products.flatMap((product) => product.variants.map((variant) => ({ product, variant })))
  const selected = rows.slice(offset, offset + limit)
  if (apply && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for --apply')
  const prisma = apply ? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) }) : null
  const results: Array<{ sku: string | null; candidates: Candidate[] }> = []
  let queued = 0
  let missingVariants = 0
  try {
    for (const { product, variant } of selected) {
      if (variant.barcode) continue
      const record = prisma && variant.sku ? await prisma.variant.findUnique({ where: { sku: variant.sku }, select: { id: true, barcode: true } }) : null
      if (prisma && (!record || record.barcode)) {
        if (!record) missingVariants += 1
        continue
      }
      const candidates = await lookup(product, variant, includeCommunity)
      results.push({ sku: variant.sku ?? null, candidates })
      if (prisma && record) {
        for (const candidate of candidates) {
          const existing = await prisma.barcodeCandidate.findFirst({
            where: { variantId: record.id, barcode: candidate.barcode, sourceUrl: candidate.sourceUrl },
            select: { id: true },
          })
          if (!existing) {
            await prisma.barcodeCandidate.create({ data: { variantId: record.id, ...candidate } })
            queued += 1
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
  } finally {
    await prisma?.$disconnect()
  }
  console.log(JSON.stringify({ mode: apply ? 'queued' : 'dry-run', offset, checked: selected.length, found: results.filter((result) => result.candidates.length).length, queued, missingVariants, results: results.filter((result) => result.candidates.length) }, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
