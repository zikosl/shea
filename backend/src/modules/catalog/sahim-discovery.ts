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
type Match = { templateId: number; name: string; description: string; brand: string; categoryId: number; nicheId: number | null; productTypeId: number | null; brandId: number | null; score: number; reason: string; variants: { id: number; name: string | null; barcode: string | null }[] }
const cache = new Map<string, { expires: number; value: ExternalResult }>()
const lookupTimes: number[] = []
let providerCooldownUntil = 0
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'de', 'des', 'du', 'la', 'le', 'les', 'un', 'une', 'et', 'pour', 'من', 'في', 'مع'])
const SIZE_UNITS = new Set(['g', 'kg', 'mg', 'ml', 'cl', 'l', 'oz'])

export function searchWords(value: string): string[] {
  return [...new Set(value.normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [])]
    .filter(word => (word.length >= 3 || /\d/.test(word) || SIZE_UNITS.has(word)) && !STOP_WORDS.has(word))
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
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

export function rankTemplate(source: ExternalSuggestion, candidate: { name: string; name_ar?: string; description: string; Brand: { name: string } | null; variants: { name: string | null; name_ar?: string | null }[] }): { score: number; reason: string } {
  const sourceWords = searchWords(`${source.name} ${source.nameAr} ${source.quantity}`)
  const productWords = new Set(searchWords(`${candidate.name} ${candidate.name_ar ?? ''} ${candidate.description} ${candidate.variants.map(v => `${v.name ?? ''} ${v.name_ar ?? ''}`).join(' ')}`))
  const common = sourceWords.filter(word => productWords.has(word))
  const sizeTerms = sourceWords.filter(word => /\d/.test(word) || SIZE_UNITS.has(word))
  const missingSizeTerms = sizeTerms.filter(word => !productWords.has(word))
  const brandWords = searchWords(source.brand)
  const candidateBrand = new Set(searchWords(candidate.Brand?.name ?? ''))
  const brandMatched = brandWords.length > 0 && brandWords.every(word => candidateBrand.has(word))
  const brandMismatch = brandWords.length > 0 && candidate.Brand && !brandMatched
  if (!common.length && !brandMatched) return { score: 0, reason: '' }
  const score = Math.max(0, Math.min(100, Math.round(15 + 55 * common.length / Math.max(sourceWords.length, 1) + (brandMatched ? 25 : 0) - (brandMismatch ? 25 : 0) - 20 * missingSizeTerms.length)))
  return { score, reason: [brandMatched ? 'Brand matches' : '', common.length ? `${common.length} name/size terms match` : '', missingSizeTerms.length ? 'Size may differ' : ''].filter(Boolean).join(' · ') }
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
  const words = searchWords(`${external.suggestion.name} ${external.suggestion.nameAr} ${external.suggestion.brand}`).slice(0, 8)
  if (!words.length) return { status: 'FOUND', retryAfterSeconds: 0, existing: null, external: external.suggestion, matches: [] }
  const candidates = await prisma.productTemplate.findMany({
    where: { OR: words.map(word => ({ OR: [
      { name: { contains: word, mode: 'insensitive' } },
      { name_ar: { contains: word, mode: 'insensitive' } },
      { description: { contains: word, mode: 'insensitive' } },
      { Brand: { is: { name: { contains: word, mode: 'insensitive' } } } },
      { variants: { some: { name: { contains: word, mode: 'insensitive' } } } },
    ] })) },
    include: { Brand: { select: { name: true } }, category: { select: { niche_id: true } }, variants: { select: { id: true, name: true, name_ar: true, barcode: true } } },
    take: 150,
  })
  const matches = candidates.map(candidate => ({ candidate, ...rankTemplate(external.suggestion!, candidate) }))
    .filter(item => item.score >= 15).sort((a, b) => b.score - a.score || a.candidate.id - b.candidate.id).slice(0, 6)
    .map(({ candidate, score, reason }) => ({ templateId: candidate.id, name: candidate.name, description: candidate.description ?? '', brand: candidate.Brand?.name ?? '', categoryId: candidate.category_id, nicheId: candidate.category.niche_id, productTypeId: candidate.product_type_id, brandId: candidate.brand_id, score, reason, variants: candidate.variants }))
  return { status: 'FOUND', retryAfterSeconds: 0, existing: null, external: external.suggestion, matches }
}
