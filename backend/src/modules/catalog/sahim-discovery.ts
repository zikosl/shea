import { PrismaClient } from '@prisma/client'
import { requireGtin } from './barcodes'

export type ExternalSuggestion = {
  name: string
  nameAr: string
  description: string
  brand: string
  quantity: string
  imageUrl: string | null
  sourceUrl: string
  sourceName: string
}

type ExternalResult = { status: 'FOUND' | 'NOT_FOUND' | 'UNAVAILABLE' | 'RATE_LIMITED'; suggestion: ExternalSuggestion | null; retryAfterSeconds: number }
type Match = { templateId: number; name: string; description: string; brand: string; categoryId: number; nicheId: number | null; productTypeId: number | null; brandId: number | null; score: number; reason: string; variants: { id: number; name: string | null; barcode: string | null; sizeHint: 'MATCH' | 'DIFFERENT' | 'UNKNOWN' }[] }
const cache = new Map<string, { expires: number; value: ExternalResult }>()
const lookupTimes: number[] = []
let providerCooldownUntil = 0
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'de', 'des', 'du', 'la', 'le', 'les', 'un', 'une', 'et', 'pour', 'من', 'في', 'مع'])
const SIZE_UNITS = new Set(['g', 'kg', 'mg', 'ml', 'cl', 'l', 'oz'])
const GENERIC_WORDS = new Set(['cream', 'creme', 'lotion', 'gel', 'soap', 'savon', 'shampoo', 'shampoing', 'perfume', 'parfum', 'body', 'corps', 'face', 'visage', 'chocolate', 'chocolat', 'biscuit', 'biscuits', 'شامبو', 'كريم', 'عطر', 'صابون', 'شوكولاتة'])

export function searchWords(value: string): string[] {
  return [...new Set(value.normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [])]
    .filter(word => (word.length >= 3 || /\d/.test(word) || SIZE_UNITS.has(word)) && !STOP_WORDS.has(word))
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function candidateTerms(source: ExternalSuggestion): string[][] {
  const tokens = (value: string) => value.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  const brand = tokens(source.brand)
  const name = tokens(`${source.name} ${source.nameAr}`).sort((a, b) => Number(GENERIC_WORDS.has(searchWords(a)[0])) - Number(GENERIC_WORDS.has(searchWords(b)[0])) || b.length - a.length)
  const seen = new Set<string>()
  return [...brand, ...name].flatMap(word => {
    const folded = searchWords(word)[0]
    if (!folded || seen.has(folded)) return []
    seen.add(folded)
    return [[...new Set([word, folded])]]
  }).slice(0, 6)
}

function trustedFactsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && /^world\.open(?:food|beauty|products|petfood)facts\.org$/.test(url.hostname)
  } catch { return false }
}

function retryDelay(value: string | null): number {
  const seconds = value && /^\d+$/.test(value.trim()) ? Number(value) : NaN
  const dateSeconds = value ? Math.ceil((Date.parse(value) - Date.now()) / 1000) : NaN
  return Math.max(1, Math.min(3600, Number.isFinite(seconds) ? seconds : Number.isFinite(dateSeconds) ? dateSeconds : 60))
}

async function fetchFacts(url: string, fetcher: typeof fetch): Promise<{ response: Response; finalUrl: string }> {
  let current = url
  for (let redirect = 0; redirect < 3; redirect += 1) {
    if (!trustedFactsUrl(current)) throw new Error('UNTRUSTED_LOOKUP_REDIRECT')
    const response = await fetcher(current, {
      redirect: 'manual', signal: AbortSignal.timeout(6500),
      headers: { 'User-Agent': process.env.SAHIM_LOOKUP_USER_AGENT || 'SheaSahim/1.0 (https://shea.openzey.com)', Accept: 'application/json' },
    })
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, finalUrl: current }
    const location = response.headers.get('location')
    if (!location) throw new Error('LOOKUP_REDIRECT_MISSING')
    current = new URL(location, current).toString()
  }
  throw new Error('LOOKUP_TOO_MANY_REDIRECTS')
}

export async function externalBarcodeLookup(code: string, fetcher: typeof fetch = fetch, sharedBudget?: () => Promise<boolean>): Promise<ExternalResult> {
  const barcode = requireGtin(code)
  const cached = cache.get(barcode)
  if (cached && cached.expires > Date.now()) return cached.value
  const now = Date.now()
  if (providerCooldownUntil > now) return { status: 'RATE_LIMITED', suggestion: null, retryAfterSeconds: Math.ceil((providerCooldownUntil - now) / 1000) }
  while (lookupTimes.length && lookupTimes[0] < now - 60_000) lookupTimes.shift()
  if (lookupTimes.length >= 10) return { status: 'RATE_LIMITED', suggestion: null, retryAfterSeconds: Math.ceil((lookupTimes[0] + 60_000 - now) / 1000) }
  if (sharedBudget && !(await sharedBudget())) return { status: 'RATE_LIMITED', suggestion: null, retryAfterSeconds: 60 }
  lookupTimes.push(now)
  const url = `https://world.openfoodfacts.org/api/v3/product/${barcode}?product_type=all&fields=code,product_name,product_name_ar,generic_name,brands,quantity,selected_images,image_front_url,product_type`
  let result: ExternalResult
  try {
    const { response, finalUrl } = await fetchFacts(url, fetcher)
    if (response.status === 404) result = { status: 'NOT_FOUND', suggestion: null, retryAfterSeconds: 0 }
    else if (response.status === 429) {
      const retryAfterSeconds = retryDelay(response.headers.get('retry-after'))
      providerCooldownUntil = Date.now() + retryAfterSeconds * 1000
      result = { status: 'RATE_LIMITED', suggestion: null, retryAfterSeconds }
    }
    else if (!response.ok || Number(response.headers.get('content-length') ?? 0) > 500_000) result = { status: 'UNAVAILABLE', suggestion: null, retryAfterSeconds: 0 }
    else {
      const body = await response.json() as Record<string, any>
      const item = body.product
      const name = clean(item?.product_name, 160)
      if (!['success', 'success_with_errors', 'known'].includes(body.status) || !name) result = { status: 'NOT_FOUND', suggestion: null, retryAfterSeconds: 0 }
      else {
        const displayImages = item.selected_images?.front?.display as Record<string, unknown> | undefined
        const image = clean(displayImages?.en ?? displayImages?.fr ?? Object.values(displayImages ?? {})[0] ?? item.image_front_url, 600)
        const imageUrl = /^https:\/\/images\.open(?:food|beauty|products|petfood)facts\.org\//i.test(image) ? image : null
        const sourceDomain = new URL(finalUrl).hostname
        const sourceUrl = /^world\.open(?:food|beauty|products|petfood)facts\.org$/.test(sourceDomain)
          ? `https://${sourceDomain}/product/${barcode}` : `https://world.openfoodfacts.org/product/${barcode}`
        result = { status: 'FOUND', retryAfterSeconds: 0, suggestion: {
          name, nameAr: clean(item.product_name_ar, 160), description: clean(item.generic_name, 1000),
          brand: clean(item.brands, 120).split(',')[0].trim(), quantity: clean(item.quantity, 80), imageUrl,
          sourceUrl, sourceName: 'Open Facts',
        } }
      }
    }
  } catch { result = { status: 'UNAVAILABLE', suggestion: null, retryAfterSeconds: 0 } }
  if (result.status === 'FOUND' || result.status === 'NOT_FOUND') {
    if (cache.size >= 3000) cache.delete(cache.keys().next().value!)
    cache.set(barcode, { expires: Date.now() + (result.status === 'FOUND' ? 24 : 1) * 60 * 60 * 1000, value: result })
  }
  return result
}

function brandKey(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '')
}

function productSizes(value: string): string[] {
  const sizes: string[] = []
  for (const match of value.toLocaleLowerCase().matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|l)\b/gu)) {
    const amount = Number(match[1].replace(',', '.'))
    const unit = match[2]
    const family = ['kg', 'mg', 'g'].includes(unit) ? 'g' : 'ml'
    const factor = unit === 'kg' || unit === 'l' ? 1000 : unit === 'mg' ? 0.001 : unit === 'cl' ? 10 : 1
    if (amount > 0) sizes.push(`${family}:${Math.round(amount * factor * 100) / 100}`)
  }
  return [...new Set(sizes)]
}

function variantSizeHint(sourceSizes: string[], templateName: string, variantName: string): 'MATCH' | 'DIFFERENT' | 'UNKNOWN' {
  const variantSizes = productSizes(variantName)
  const catalogSizes = variantSizes.length ? variantSizes : productSizes(templateName)
  if (!sourceSizes.length || !catalogSizes.length) return 'UNKNOWN'
  return sourceSizes.some(size => catalogSizes.includes(size)) ? 'MATCH' : 'DIFFERENT'
}

export function rankTemplate(source: ExternalSuggestion, candidate: { name: string; name_ar?: string; description: string; Brand: { name: string } | null; variants: { name: string | null; name_ar?: string | null }[] }): { score: number; reason: string } {
  const sourceBrand = brandKey(source.brand)
  const catalogBrand = brandKey(candidate.Brand?.name ?? '')
  const knownCatalogBrand = catalogBrand && !['other', 'otherbrand', 'autre', 'autremarque'].includes(catalogBrand)
  const brandMatched = Boolean(sourceBrand && knownCatalogBrand && sourceBrand.length >= 4 && catalogBrand.length >= 4 && (sourceBrand === catalogBrand || sourceBrand.startsWith(catalogBrand) || catalogBrand.startsWith(sourceBrand)))
  const brandConflict = Boolean(sourceBrand && knownCatalogBrand && !brandMatched)
  const sourceBrandWords = new Set(searchWords(source.brand))
  const nameWords = searchWords(`${source.name} ${source.nameAr}`).filter(word => !sourceBrandWords.has(word) && !/^\d/.test(word) && !SIZE_UNITS.has(word))
  const catalogNameWords = new Set(searchWords(`${candidate.name} ${candidate.name_ar ?? ''}`))
  const shared = nameWords.filter(word => catalogNameWords.has(word))
  const distinctive = shared.filter(word => !GENERIC_WORDS.has(word))
  const generic = shared.length - distinctive.length
  const descriptionWords = new Set(searchWords(candidate.description))
  const descriptionMatches = nameWords.some(word => !GENERIC_WORDS.has(word) && descriptionWords.has(word))
  const sourceSizes = productSizes(`${source.quantity} ${source.name}`)
  const catalogSizes = [...new Set(productSizes(candidate.name).concat(candidate.variants.flatMap(variant => productSizes(`${variant.name ?? ''} ${variant.name_ar ?? ''}`))))]
  const sizeMatched = sourceSizes.length > 0 && sourceSizes.some(size => catalogSizes.includes(size))
  const sizeDifferent = sourceSizes.length > 0 && catalogSizes.length > 0 && !sizeMatched

  // Brand alone, or a generic word alone, must not imply the same product.
  if (!distinctive.length && !(brandMatched && generic) && !(generic && sizeMatched && !brandConflict)) return { score: 0, reason: '' }
  if (brandConflict && !distinctive.length) return { score: 0, reason: '' }
  const score = Math.max(1, Math.min(100,
    22 + Math.min(distinctive.length, 3) * 18 + Math.min(generic, 2) * 6
    + (brandMatched ? 22 : 0) + (sizeMatched ? 10 : 0) + (descriptionMatches ? 4 : 0)
    - (brandConflict ? 28 : 0) - (sizeDifferent ? 12 : 0),
  ))
  return { score, reason: [
    distinctive.length ? `${distinctive.length} distinctive name term${distinctive.length === 1 ? '' : 's'} match` : 'Only generic name terms match',
    brandMatched ? 'Brand matches' : brandConflict ? 'Brand differs' : '',
    sizeMatched ? 'Size matches a variant' : sizeDifferent ? 'Size differs; check variants' : '',
  ].filter(Boolean).join(' · ') }
}

export async function discoverBarcode(prisma: PrismaClient, rawCode: string, fetcher: typeof fetch = fetch, sharedBudget?: () => Promise<boolean>): Promise<{
  status: 'EXISTING' | 'PENDING' | 'FOUND' | 'NOT_FOUND' | 'UNAVAILABLE' | 'RATE_LIMITED'; retryAfterSeconds: number; existing: { id: number; name: string | null; productName: string } | null; external: ExternalSuggestion | null; matches: Match[]
}> {
  const code = requireGtin(rawCode)
  const existing = await prisma.variant.findUnique({ where: { barcode: code }, include: { product: true } })
  if (existing) return { status: 'EXISTING', retryAfterSeconds: 0, existing: { id: existing.id, name: existing.name, productName: existing.product.name }, external: null, matches: [] }
  const pending = await prisma.catalogContribution.findMany({ where: { status: 'PENDING' }, select: { payload: true } })
  if (pending.some(item => {
    const payload = item.payload as Record<string, any>
    return payload?.barcode === code || (Array.isArray(payload?.variants) && payload.variants.some((variant: { barcode?: string }) => variant.barcode === code))
  })) return { status: 'PENDING', retryAfterSeconds: 0, existing: null, external: null, matches: [] }
  const external = await externalBarcodeLookup(code, fetcher, sharedBudget)
  if (!external.suggestion) return { status: external.status, retryAfterSeconds: external.retryAfterSeconds, existing: null, external: null, matches: [] }
  const terms = candidateTerms(external.suggestion)
  if (!terms.length) return { status: 'FOUND', retryAfterSeconds: 0, existing: null, external: external.suggestion, matches: [] }
  // A small result set per distinctive term prevents a generic word from filling one broad query.
  const batches = await Promise.all(terms.map(variants => prisma.productTemplate.findMany({
    where: { OR: variants.flatMap(word => [
      { name: { contains: word, mode: 'insensitive' as const } },
      { name_ar: { contains: word, mode: 'insensitive' as const } },
      { description: { contains: word, mode: 'insensitive' as const } },
      { description_ar: { contains: word, mode: 'insensitive' as const } },
      { Brand: { is: { name: { contains: word, mode: 'insensitive' as const } } } },
      { variants: { some: { name: { contains: word, mode: 'insensitive' as const } } } },
      { variants: { some: { name_ar: { contains: word, mode: 'insensitive' as const } } } },
    ]) },
    include: { Brand: { select: { name: true } }, category: { select: { niche_id: true } }, variants: { select: { id: true, name: true, name_ar: true, barcode: true } } },
    take: 40,
  })))
  const candidates = [...new Map(batches.flat().map(candidate => [candidate.id, candidate])).values()]
  const matches = candidates.map(candidate => ({ candidate, ...rankTemplate(external.suggestion!, candidate) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.candidate.id - b.candidate.id).slice(0, 6)
    .map(({ candidate, score, reason }) => {
      const sourceSizes = productSizes(`${external.suggestion!.quantity} ${external.suggestion!.name}`)
      const variants = candidate.variants.map(variant => ({
        id: variant.id, name: variant.name, barcode: variant.barcode,
        sizeHint: variantSizeHint(sourceSizes, candidate.name, `${variant.name ?? ''} ${variant.name_ar ?? ''}`),
      })).sort((a, b) => ({ MATCH: 0, UNKNOWN: 1, DIFFERENT: 2 })[a.sizeHint] - ({ MATCH: 0, UNKNOWN: 1, DIFFERENT: 2 })[b.sizeHint])
      return { templateId: candidate.id, name: candidate.name, description: candidate.description ?? '', brand: candidate.Brand?.name ?? '', categoryId: candidate.category_id, nicheId: candidate.category.niche_id, productTypeId: candidate.product_type_id, brandId: candidate.brand_id, score, reason, variants }
    })
  return { status: 'FOUND', retryAfterSeconds: 0, existing: null, external: external.suggestion, matches }
}
