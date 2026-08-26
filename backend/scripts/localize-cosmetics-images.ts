import axios from 'axios'
import * as cheerio from 'cheerio'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

type BrandSeed = {
  name: string
  slug?: string
  image?: string
  [key: string]: unknown
}

type ProductSeed = {
  name: string
  slug?: string
  images?: Array<{
    url: string
    altText?: string
    [key: string]: unknown
  }>
  variants?: Array<{
    image?: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}

type ImageKind = 'brands' | 'products'

type DownloadResult = {
  ok: boolean
  sourceUrl: string
  resolvedUrl?: string
  publicPath?: string
  filePath?: string
  error?: string
}

const DATA_DIR = path.resolve(process.cwd(), 'prisma', 'data')
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')
const NICHE_SLUG = process.env.COSMETICS_IMAGE_NICHE_SLUG ?? 'cosmetics'
const NICHE_UPLOADS_DIR = path.join(UPLOADS_DIR, NICHE_SLUG)
const PRODUCTS_DIR = path.join(NICHE_UPLOADS_DIR, 'products')
const BRANDS_DIR = path.join(NICHE_UPLOADS_DIR, 'brands')
const REPORTS_DIR = path.resolve(process.cwd(), 'prisma', 'reports')
const BRANDS_PATH = path.join(DATA_DIR, 'cosmetics-brands.json')
const PRODUCTS_PATH = path.join(DATA_DIR, 'cosmetics-products.json')
const BRAND_SOURCE_URL = process.env.COSMETICS_BRAND_SOURCE_URL ?? 'https://cosmeticstoredz.com/marque/'
const PRODUCT_SOURCE_URL = process.env.COSMETICS_PRODUCT_SOURCE_URL ?? 'https://cosmeticstoredz.com/boutique/'
const CONCURRENCY = Number(process.env.COSMETICS_IMAGE_CONCURRENCY ?? 8)
const REQUEST_TIMEOUT_MS = Number(process.env.COSMETICS_IMAGE_TIMEOUT_MS ?? 20_000)
const MAX_ATTEMPTS = Number(process.env.COSMETICS_IMAGE_ATTEMPTS ?? 2)
const MAX_PRODUCT_INDEX_PAGES = Number(process.env.COSMETICS_PRODUCT_INDEX_PAGES ?? 40)
const FORCE_REFRESH = process.env.COSMETICS_IMAGE_FORCE === '1' || process.env.COSMETICS_IMAGE_FORCE === 'true'

const extensionByContentType: Record<string, string> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

function ensureDirectories() {
  for (const directory of [PRODUCTS_DIR, BRANDS_DIR, REPORTS_DIR]) {
    fs.mkdirSync(directory, { recursive: true })
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function createBackup(filePath: string, now: string) {
  const backupPath = `${filePath}.${now}.backup`
  fs.copyFileSync(filePath, backupPath)
  return backupPath
}

function isRemoteUrl(value?: string | null): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function isLocalizedPath(value?: string | null): value is string {
  return typeof value === 'string' && value.startsWith('/uploads/')
}

function isNicheLocalizedPath(value?: string | null): value is string {
  return typeof value === 'string' && value.startsWith(`/uploads/${NICHE_SLUG}/`)
}

function localUploadFilePath(value: string) {
  const relativePath = value.replace(/^\/uploads\//, '')
  return path.join(UPLOADS_DIR, relativePath)
}

function nicheLocalizedPath(kind: ImageKind, fileName: string) {
  return `/uploads/${NICHE_SLUG}/${kind}/${fileName}`
}

function migrateExistingLocalizedPath(value: string | undefined, kind: ImageKind) {
  if (!isLocalizedPath(value) || isNicheLocalizedPath(value)) {
    return { value, migrated: false }
  }

  const currentFilePath = localUploadFilePath(value)
  if (!fs.existsSync(currentFilePath)) {
    return { value, migrated: false }
  }

  const fileName = path.basename(currentFilePath)
  const nextValue = nicheLocalizedPath(kind, fileName)
  const nextFilePath = localUploadFilePath(nextValue)
  fs.mkdirSync(path.dirname(nextFilePath), { recursive: true })

  if (!fs.existsSync(nextFilePath)) {
    fs.copyFileSync(currentFilePath, nextFilePath)
  }

  return {
    value: nextValue,
    migrated: nextValue !== value,
  }
}

function hasLocalUploadFile(value?: string | null) {
  return isLocalizedPath(value) && fs.existsSync(localUploadFilePath(value))
}

function shouldLocalizeImage(value?: string | null) {
  if (isRemoteUrl(value)) return true
  if (FORCE_REFRESH && isLocalizedPath(value)) return true
  return isLocalizedPath(value) && !hasLocalUploadFile(value)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function tokenSet(value: string) {
  return new Set(slugify(value).split('-').filter((token) => token.length > 1))
}

function tokenSimilarity(left: string, right: string) {
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  if (!leftTokens.size || !rightTokens.size) return 0

  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  return intersection / union
}

function extensionFromUrl(sourceUrl: string) {
  try {
    const pathname = new URL(sourceUrl).pathname
    const extension = path.extname(pathname).toLowerCase()
    if (['.avif', '.gif', '.jpg', '.jpeg', '.png', '.svg', '.webp'].includes(extension)) {
      return extension === '.jpeg' ? '.jpg' : extension
    }
  } catch {
    return ''
  }

  return ''
}

function extensionFromContentType(contentType?: string) {
  if (!contentType) return ''
  const normalized = contentType.split(';')[0]?.trim().toLowerCase()
  return normalized ? extensionByContentType[normalized] ?? '' : ''
}

function createFileName(label: string, sourceUrl: string, extension: string) {
  const readablePart = slugify(label) || 'image'
  const sourceHash = crypto.createHash('sha1').update(sourceUrl).digest('hex').slice(0, 10)
  const randomPart = crypto.randomBytes(5).toString('hex')
  return `${readablePart}-${sourceHash}-${randomPart}${extension}`
}

async function downloadWithRetry(sourceUrl: string) {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await axios.get<ArrayBuffer>(sourceUrl, {
        responseType: 'arraybuffer',
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
          'User-Agent': 'SheaImageLocalizer/1.0',
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 300,
      })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

async function scrapeProductImageUrl(sourcePageUrl: string) {
  const response = await axios.get<string>(sourcePageUrl, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 SheaImageLocalizer/1.0',
    },
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 300,
  })
  const $ = cheerio.load(response.data)
  const imageCandidates = [
    $('.woocommerce-product-gallery__image img').first().attr('data-large_image'),
    $('.woocommerce-product-gallery__image img').first().attr('data-src'),
    $('.woocommerce-product-gallery__image img').first().attr('src'),
    $('meta[property="og:image"]').attr('content'),
  ]

  for (const candidate of imageCandidates) {
    if (isRemoteUrl(candidate)) return candidate
    if (candidate) {
      const url = absoluteUrl(candidate, sourcePageUrl)
      if (isRemoteUrl(url)) return url
    }
  }

  const srcset = $('.woocommerce-product-gallery__image img').first().attr('srcset')
  const srcsetUrl = srcset
    ?.split(',')
    .map((item) => item.trim().split(/\s+/)[0])
    .map((item) => absoluteUrl(item, sourcePageUrl))
    .find(isRemoteUrl)

  return srcsetUrl || ''
}

async function scrapeProductSearchImageUrl(query: string) {
  const searchUrl = `${new URL(PRODUCT_SOURCE_URL).origin}/?s=${encodeURIComponent(query)}&post_type=product`
  const html = await fetchHtml(searchUrl)
  const $ = cheerio.load(html)
  let bestScore = 0
  let bestImageUrl = ''

  $('.product, .product-grid-item, .wd-product').each((_, element) => {
    const title = (
      $(element).find('.woocommerce-loop-product__title, .wd-entities-title, h2, h3').first().text()
      || $(element).find('a[title]').first().attr('title')
      || $(element).find('a[href*="/produit/"]').first().text()
      || ''
    ).trim()
    const imageUrl = firstRemoteImageFromElement($, element, searchUrl)
    const score = tokenSimilarity(query, title)

    if (imageUrl && score > bestScore) {
      bestScore = score
      bestImageUrl = imageUrl
    }
  })

  return bestScore >= 0.55 ? bestImageUrl : ''
}

async function fetchHtml(url: string) {
  const response = await axios.get<string>(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 SheaImageLocalizer/1.0',
    },
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 300,
  })

  return response.data
}

function absoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).href
  } catch {
    return ''
  }
}

function firstRemoteImageFromElement(
  $: cheerio.CheerioAPI,
  element: Parameters<cheerio.CheerioAPI>[0],
  baseUrl: string,
) {
  const image = $(element).find('img').first()
  const candidates = [
    image.attr('data-large_image'),
    image.attr('data-src'),
    image.attr('data-lazy-src'),
    image.attr('src'),
  ]

  for (const candidate of candidates) {
    if (isRemoteUrl(candidate)) return candidate
    if (candidate) {
      const url = absoluteUrl(candidate, baseUrl)
      if (isRemoteUrl(url)) return url
    }
  }

  const srcset = image.attr('srcset')
  const srcsetUrl = srcset
    ?.split(',')
    .map((item) => item.trim().split(/\s+/)[0])
    .map((item) => absoluteUrl(item, baseUrl))
    .find(isRemoteUrl)

  return srcsetUrl || ''
}

async function scrapeBrandIndexImages() {
  const brandImagesBySlug = new Map<string, string>()

  try {
    const html = await fetchHtml(BRAND_SOURCE_URL)
    const $ = cheerio.load(html)

    $('.wd-brand-item, .brand-item').each((_, element) => {
      const link = $(element).find('a[href]').first()
      const href = link.attr('href')
      const title = link.attr('title') || link.text()
      const imageUrl = firstRemoteImageFromElement($, element, BRAND_SOURCE_URL)
      const slug = href ? slugify(new URL(absoluteUrl(href, BRAND_SOURCE_URL)).pathname.split('/').filter(Boolean).pop() ?? '') : slugify(title)

      if (slug && imageUrl) brandImagesBySlug.set(slug, imageUrl)
    })

    $('a[href*="/marque/"], a[href*="/brand/"]').each((_, element) => {
      const href = $(element).attr('href')
      const imageUrl = firstRemoteImageFromElement($, element, BRAND_SOURCE_URL)
      const slug = href ? slugify(new URL(absoluteUrl(href, BRAND_SOURCE_URL)).pathname.split('/').filter(Boolean).pop() ?? '') : ''

      if (slug && imageUrl && !brandImagesBySlug.has(slug)) brandImagesBySlug.set(slug, imageUrl)
    })
  } catch (error) {
    console.warn(`Could not scrape brand source index: ${errorMessage(error)}`)
  }

  return brandImagesBySlug
}

async function scrapeProductIndexImages() {
  const productImagesByUrl = new Map<string, string>()
  const productImagesBySlug = new Map<string, string>()
  let nextUrl = PRODUCT_SOURCE_URL

  for (let page = 1; page <= MAX_PRODUCT_INDEX_PAGES && nextUrl; page += 1) {
    try {
      const html = await fetchHtml(nextUrl)
      const $ = cheerio.load(html)

      $('.product, .product-grid-item, .wd-product').each((_, element) => {
        const link = $(element).find('a[href*="/produit/"]').first().attr('href')
        const productUrl = link ? absoluteUrl(link, nextUrl) : ''
        const imageUrl = firstRemoteImageFromElement($, element, nextUrl)
        const productSlug = productUrl
          ? slugify(new URL(productUrl).pathname.split('/').filter(Boolean).pop() ?? '')
          : ''
        const productTitle = (
          $(element).find('.woocommerce-loop-product__title, .wd-entities-title, h2, h3').first().text()
          || $(element).find('a[title]').first().attr('title')
          || $(element).find('a[href*="/produit/"]').first().text()
          || ''
        ).trim()
        const titleSlug = slugify(productTitle)

        if (productUrl && imageUrl) productImagesByUrl.set(productUrl.replace(/\/$/, ''), imageUrl)
        if (productSlug && imageUrl) productImagesBySlug.set(productSlug, imageUrl)
        if (titleSlug && imageUrl) productImagesBySlug.set(titleSlug, imageUrl)
      })

      const nextPage = $('link[rel="next"]').attr('href') || $('.woocommerce-pagination a.next, a.next.page-numbers').first().attr('href')
      nextUrl = nextPage ? absoluteUrl(nextPage, nextUrl) : ''
    } catch (error) {
      console.warn(`Could not scrape product source index page ${page}: ${errorMessage(error)}`)
      break
    }
  }

  return {
    productImagesByUrl,
    productImagesBySlug,
  }
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status
      ? `HTTP ${error.response.status}`
      : error.message
  }

  return error instanceof Error ? error.message : String(error)
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
) {
  const results: R[] = []
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker))
  return results
}

type ImageEntry = {
  sourceUrl: string
  kind: ImageKind
  label: string
  preferredSourceUrl?: string
  sourcePageUrl?: string
  searchQuery?: string
}

async function localizeImages(entries: ImageEntry[]) {
  const cache = new Map<string, DownloadResult>()

  await mapWithConcurrency(entries, Math.max(1, CONCURRENCY), async (entry, index) => {
    const cacheKey = `${entry.kind}:${entry.sourceUrl}`
    if (cache.has(cacheKey)) return

    const targetDirectory = entry.kind === 'brands' ? BRANDS_DIR : PRODUCTS_DIR
    const publicPrefix = `/uploads/${NICHE_SLUG}/${entry.kind}`

    try {
      let response
      let resolvedUrl = isRemoteUrl(entry.preferredSourceUrl)
        ? entry.preferredSourceUrl
        : isRemoteUrl(entry.sourceUrl)
          ? entry.sourceUrl
          : ''

      try {
        if (!resolvedUrl) throw new Error('No remote image URL available')
        response = await downloadWithRetry(resolvedUrl)
      } catch (directError) {
        if (!entry.sourcePageUrl && !entry.searchQuery) throw directError

        const scrapedUrl = entry.sourcePageUrl
          ? await scrapeProductImageUrl(entry.sourcePageUrl).catch(() => '')
          : ''
        const searchedUrl = !scrapedUrl && entry.searchQuery
          ? await scrapeProductSearchImageUrl(entry.searchQuery).catch(() => '')
          : ''
        const fallbackUrl = scrapedUrl || searchedUrl
        if (!fallbackUrl) throw directError

        resolvedUrl = fallbackUrl
        response = await downloadWithRetry(resolvedUrl)
      }

      const contentTypeHeader = response.headers['content-type']
      const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : undefined
      if (contentType && !contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`Downloaded URL is not an image (${contentType})`)
      }

      const extension = extensionFromContentType(contentType) || extensionFromUrl(resolvedUrl) || '.jpg'
      const fileName = createFileName(entry.label, resolvedUrl, extension)
      const filePath = path.join(targetDirectory, fileName)
      const publicPath = `${publicPrefix}/${fileName}`

      fs.writeFileSync(filePath, Buffer.from(response.data))
      cache.set(cacheKey, {
        ok: true,
        sourceUrl: entry.sourceUrl,
        resolvedUrl,
        publicPath,
        filePath,
      })
    } catch (error) {
      cache.set(cacheKey, {
        ok: false,
        sourceUrl: entry.sourceUrl,
        error: errorMessage(error),
      })
    }

    if ((index + 1) % 100 === 0 || index + 1 === entries.length) {
      console.log(`Processed ${index + 1}/${entries.length} unique image URLs`)
    }
  })

  return cache
}

function collectEntries(
  brands: BrandSeed[],
  products: ProductSeed[],
  sourceIndexes: {
    brandImagesBySlug: Map<string, string>
    productImagesByUrl: Map<string, string>
    productImagesBySlug: Map<string, string>
  },
) {
  const seen = new Set<string>()
  const entries: ImageEntry[] = []
  let skippedExistingLocal = 0
  let missingRemoteSource = 0

  for (const brand of brands) {
    const brandKey = brand.slug || slugify(brand.name)
    const preferredSourceUrl = sourceIndexes.brandImagesBySlug.get(brandKey)
    const sourceUrl = brand.image || `brand:${brandKey}`

    if (!brand.image && !isRemoteUrl(preferredSourceUrl)) {
      missingRemoteSource += 1
      continue
    }

    if (brand.image && !shouldLocalizeImage(brand.image)) {
      if (hasLocalUploadFile(sourceUrl)) skippedExistingLocal += 1
      continue
    }

    if (!isRemoteUrl(sourceUrl) && !isRemoteUrl(preferredSourceUrl)) {
      missingRemoteSource += 1
      continue
    }

    const cacheKey = `brands:${sourceUrl}`
    if (seen.has(cacheKey)) continue

    seen.add(cacheKey)
    entries.push({
      sourceUrl,
      kind: 'brands',
      label: brandKey || brand.name,
      preferredSourceUrl,
    })
  }

  for (const product of products) {
    const label = product.slug || product.name

    for (const image of product.images ?? []) {
      const sourcePageUrl = typeof image.sourceProductUrl === 'string' ? image.sourceProductUrl : undefined
      const sourcePageSlug = sourcePageUrl
        ? slugify(new URL(sourcePageUrl).pathname.split('/').filter(Boolean).pop() ?? '')
        : ''
      const titleSlug = slugify(image.altText || product.name)
      const preferredSourceUrl = sourcePageUrl
        ? sourceIndexes.productImagesByUrl.get(sourcePageUrl.replace(/\/$/, ''))
          || sourceIndexes.productImagesBySlug.get(sourcePageSlug)
          || sourceIndexes.productImagesBySlug.get(titleSlug)
          || image.url
        : image.url
      const sourceUrl = image.url

      if (!shouldLocalizeImage(sourceUrl)) {
        if (hasLocalUploadFile(sourceUrl)) skippedExistingLocal += 1
        continue
      }

      if (!isRemoteUrl(sourceUrl) && !isRemoteUrl(preferredSourceUrl) && !sourcePageUrl) {
        missingRemoteSource += 1
        continue
      }

      const cacheKey = `products:${sourceUrl}`
      if (seen.has(cacheKey)) continue

      seen.add(cacheKey)
      entries.push({
        sourceUrl,
        kind: 'products',
        label,
        preferredSourceUrl,
        sourcePageUrl,
        searchQuery: image.altText || product.name,
      })
    }

    for (const variant of product.variants ?? []) {
      const sourcePageUrl = typeof variant.sourceProductUrl === 'string' ? variant.sourceProductUrl : undefined
      const sourcePageSlug = sourcePageUrl
        ? slugify(new URL(sourcePageUrl).pathname.split('/').filter(Boolean).pop() ?? '')
        : ''
      const sourceName = typeof variant.sourceName === 'string' ? variant.sourceName : product.name
      const titleSlug = slugify(sourceName)
      const preferredSourceUrl = sourcePageUrl
        ? sourceIndexes.productImagesByUrl.get(sourcePageUrl.replace(/\/$/, ''))
          || sourceIndexes.productImagesBySlug.get(sourcePageSlug)
          || sourceIndexes.productImagesBySlug.get(titleSlug)
          || variant.image
        : variant.image
      const sourceUrl = variant.image
      if (!sourceUrl) continue

      if (!shouldLocalizeImage(sourceUrl)) {
        if (hasLocalUploadFile(sourceUrl)) skippedExistingLocal += 1
        continue
      }

      if (!isRemoteUrl(sourceUrl) && !isRemoteUrl(preferredSourceUrl) && !sourcePageUrl) {
        missingRemoteSource += 1
        continue
      }

      const cacheKey = `products:${sourceUrl}`
      if (seen.has(cacheKey)) continue

      seen.add(cacheKey)
      entries.push({
        sourceUrl,
        kind: 'products',
        label,
        preferredSourceUrl,
        sourcePageUrl,
        searchQuery: sourceName,
      })
    }
  }

  return {
    entries,
    skippedExistingLocal,
    missingRemoteSource,
  }
}

function normalizedName(value: string) {
  return slugify(value).replace(/-/g, '')
}

function applyExistingBrandImages(brands: BrandSeed[]) {
  const files = fs.existsSync(BRANDS_DIR) ? fs.readdirSync(BRANDS_DIR) : []
  const fileByNormalizedName = new Map<string, string>()

  for (const fileName of files) {
    const filePath = path.join(BRANDS_DIR, fileName)
    if (!fs.statSync(filePath).isFile()) continue

    const parsed = path.parse(fileName)
    const normalized = normalizedName(parsed.name)
    if (normalized) fileByNormalizedName.set(normalized, filePath)
  }

  let matched = 0

  for (const brand of brands) {
    if (!isRemoteUrl(brand.image)) continue

    const localFilePath = fileByNormalizedName.get(normalizedName(brand.slug || brand.name))
    if (!localFilePath) continue

    const extension = path.extname(localFilePath).toLowerCase() || '.png'
    const fileName = createFileName(brand.slug || brand.name, localFilePath, extension)
    const targetPath = path.join(BRANDS_DIR, fileName)

    fs.copyFileSync(localFilePath, targetPath)
    brand.image = nicheLocalizedPath('brands', fileName)
    matched += 1
  }

  return matched
}

function applyLocalizedPaths(
  brands: BrandSeed[],
  products: ProductSeed[],
  results: Map<string, DownloadResult>,
) {
  let localizedBrands = 0
  let localizedProductImages = 0
  let localizedVariantImages = 0

  for (const brand of brands) {
    const brandKey = brand.slug || slugify(brand.name)
    const sourceUrl = brand.image || `brand:${brandKey}`
    if (brand.image && !isRemoteUrl(brand.image) && !isLocalizedPath(brand.image)) continue

    const result = results.get(`brands:${sourceUrl}`)
    if (result?.ok && result.publicPath) {
      brand.image = result.publicPath
      localizedBrands += 1
    }
  }

  for (const product of products) {
    for (const image of product.images ?? []) {
      if (!isRemoteUrl(image.url) && !isLocalizedPath(image.url)) continue

      const result = results.get(`products:${image.url}`)
      if (result?.ok && result.publicPath) {
        image.url = result.publicPath
        localizedProductImages += 1
      }
    }

    for (const variant of product.variants ?? []) {
      if (!isRemoteUrl(variant.image) && !isLocalizedPath(variant.image)) continue

      const result = results.get(`products:${variant.image}`)
      if (result?.ok && result.publicPath) {
        variant.image = result.publicPath
        localizedVariantImages += 1
      }
    }
  }

  return {
    localizedBrands,
    localizedProductImages,
    localizedVariantImages,
  }
}

function migrateExistingLocalizedPaths(brands: BrandSeed[], products: ProductSeed[]) {
  let migratedBrandImages = 0
  let migratedProductImages = 0
  let migratedVariantImages = 0

  for (const brand of brands) {
    const result = migrateExistingLocalizedPath(brand.image, 'brands')
    if (result.migrated) {
      brand.image = result.value
      migratedBrandImages += 1
    }
  }

  for (const product of products) {
    for (const image of product.images ?? []) {
      const result = migrateExistingLocalizedPath(image.url, 'products')
      if (result.migrated) {
        image.url = result.value ?? image.url
        migratedProductImages += 1
      }
    }

    for (const variant of product.variants ?? []) {
      const result = migrateExistingLocalizedPath(variant.image, 'products')
      if (result.migrated) {
        variant.image = result.value
        migratedVariantImages += 1
      }
    }
  }

  return {
    migratedBrandImages,
    migratedProductImages,
    migratedVariantImages,
  }
}

async function main() {
  ensureDirectories()

  const now = timestamp()
  const brands = readJson<BrandSeed[]>(BRANDS_PATH)
  const products = readJson<ProductSeed[]>(PRODUCTS_PATH)
  const brandBackupPath = createBackup(BRANDS_PATH, now)
  const productBackupPath = createBackup(PRODUCTS_PATH, now)
  const migratedExistingPaths = migrateExistingLocalizedPaths(brands, products)
  const reusedExistingBrandImages = applyExistingBrandImages(brands)
  const sourceIndexes = {
    brandImagesBySlug: await scrapeBrandIndexImages(),
    ...(await scrapeProductIndexImages()),
  }
  const collected = collectEntries(brands, products, sourceIndexes)
  const entries = collected.entries

  console.log(
    JSON.stringify(
      {
        brands: brands.length,
        products: products.length,
        uniqueRemoteImages: entries.length,
        concurrency: CONCURRENCY,
        forceRefresh: FORCE_REFRESH,
        nicheSlug: NICHE_SLUG,
        migratedExistingPaths,
        reusedExistingBrandImages,
        skippedExistingLocal: collected.skippedExistingLocal,
        missingRemoteSource: collected.missingRemoteSource,
        sourceIndexes: {
          brandImages: sourceIndexes.brandImagesBySlug.size,
          productImagesByUrl: sourceIndexes.productImagesByUrl.size,
          productImagesBySlug: sourceIndexes.productImagesBySlug.size,
        },
        backups: {
          brands: brandBackupPath,
          products: productBackupPath,
        },
      },
      null,
      2,
    ),
  )

  const results = await localizeImages(entries)
  const applied = applyLocalizedPaths(brands, products, results)
  const failures = Array.from(results.values()).filter((result) => !result.ok)
  const successes = Array.from(results.values()).filter((result) => result.ok)
  const reportPath = path.join(REPORTS_DIR, `cosmetics-image-localization-${now}.json`)

  writeJson(BRANDS_PATH, brands)
  writeJson(PRODUCTS_PATH, products)
  writeJson(reportPath, {
    createdAt: new Date().toISOString(),
    backups: {
      brands: brandBackupPath,
      products: productBackupPath,
    },
    totals: {
      requested: entries.length,
      downloaded: successes.length,
      failed: failures.length,
      reusedExistingBrandImages,
      skippedExistingLocal: collected.skippedExistingLocal,
      missingRemoteSource: collected.missingRemoteSource,
      forceRefresh: FORCE_REFRESH,
      nicheSlug: NICHE_SLUG,
      migratedExistingPaths,
      sourceIndexes: {
        brandImages: sourceIndexes.brandImagesBySlug.size,
        productImagesByUrl: sourceIndexes.productImagesByUrl.size,
        productImagesBySlug: sourceIndexes.productImagesBySlug.size,
      },
      ...applied,
    },
    failures,
  })

  console.log(
    JSON.stringify(
      {
        downloaded: successes.length,
        failed: failures.length,
        reportPath,
        ...applied,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
