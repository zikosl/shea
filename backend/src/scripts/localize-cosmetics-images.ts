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
const PRODUCTS_DIR = path.join(UPLOADS_DIR, 'products')
const BRANDS_DIR = path.join(UPLOADS_DIR, 'brands')
const REPORTS_DIR = path.resolve(process.cwd(), 'prisma', 'reports')
const BRANDS_PATH = path.join(DATA_DIR, 'cosmetics-brands.json')
const PRODUCTS_PATH = path.join(DATA_DIR, 'cosmetics-products.json')
const CONCURRENCY = Number(process.env.COSMETICS_IMAGE_CONCURRENCY ?? 8)
const REQUEST_TIMEOUT_MS = Number(process.env.COSMETICS_IMAGE_TIMEOUT_MS ?? 20_000)
const MAX_ATTEMPTS = Number(process.env.COSMETICS_IMAGE_ATTEMPTS ?? 2)

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
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
  }

  const srcset = $('.woocommerce-product-gallery__image img').first().attr('srcset')
  const srcsetUrl = srcset
    ?.split(',')
    .map((item) => item.trim().split(/\s+/)[0])
    .find(isRemoteUrl)

  return srcsetUrl || ''
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

async function localizeImages(entries: Array<{ sourceUrl: string; kind: ImageKind; label: string; sourcePageUrl?: string }>) {
  const cache = new Map<string, DownloadResult>()

  await mapWithConcurrency(entries, Math.max(1, CONCURRENCY), async (entry, index) => {
    const cacheKey = `${entry.kind}:${entry.sourceUrl}`
    if (cache.has(cacheKey)) return

    const targetDirectory = entry.kind === 'brands' ? BRANDS_DIR : PRODUCTS_DIR
    const publicPrefix = `/uploads/${entry.kind}`

    try {
      let response
      let resolvedUrl = entry.sourceUrl

      try {
        response = await downloadWithRetry(resolvedUrl)
      } catch (directError) {
        if (!entry.sourcePageUrl) throw directError

        const scrapedUrl = await scrapeProductImageUrl(entry.sourcePageUrl)
        if (!scrapedUrl) throw directError

        resolvedUrl = scrapedUrl
        response = await downloadWithRetry(resolvedUrl)
      }

      const contentTypeHeader = response.headers['content-type']
      const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : undefined
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

function collectEntries(brands: BrandSeed[], products: ProductSeed[]) {
  const seen = new Set<string>()
  const entries: Array<{ sourceUrl: string; kind: ImageKind; label: string; sourcePageUrl?: string }> = []

  for (const brand of brands) {
    const sourceUrl = brand.image
    if (!isRemoteUrl(sourceUrl)) continue

    const cacheKey = `brands:${sourceUrl}`
    if (seen.has(cacheKey)) continue

    seen.add(cacheKey)
    entries.push({
      sourceUrl,
      kind: 'brands',
      label: brand.slug || brand.name,
    })
  }

  for (const product of products) {
    const label = product.slug || product.name

    for (const image of product.images ?? []) {
      if (!isRemoteUrl(image.url)) continue

      const cacheKey = `products:${image.url}`
      if (seen.has(cacheKey)) continue

      seen.add(cacheKey)
      entries.push({
        sourceUrl: image.url,
        kind: 'products',
        label,
        sourcePageUrl: typeof image.sourceProductUrl === 'string' ? image.sourceProductUrl : undefined,
      })
    }

    for (const variant of product.variants ?? []) {
      const sourceUrl = variant.image
      if (!isRemoteUrl(sourceUrl)) continue

      const cacheKey = `products:${sourceUrl}`
      if (seen.has(cacheKey)) continue

      seen.add(cacheKey)
      entries.push({
        sourceUrl,
        kind: 'products',
        label,
        sourcePageUrl: typeof variant.sourceProductUrl === 'string' ? variant.sourceProductUrl : undefined,
      })
    }
  }

  return entries
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
    brand.image = `/uploads/brands/${fileName}`
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
    if (!isRemoteUrl(brand.image) && !isLocalizedPath(brand.image)) continue

    const result = results.get(`brands:${brand.image}`)
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

async function main() {
  ensureDirectories()

  const now = timestamp()
  const brands = readJson<BrandSeed[]>(BRANDS_PATH)
  const products = readJson<ProductSeed[]>(PRODUCTS_PATH)
  const brandBackupPath = createBackup(BRANDS_PATH, now)
  const productBackupPath = createBackup(PRODUCTS_PATH, now)
  const reusedExistingBrandImages = applyExistingBrandImages(brands)
  const entries = collectEntries(brands, products)

  console.log(
    JSON.stringify(
      {
        brands: brands.length,
        products: products.length,
        uniqueRemoteImages: entries.length,
        concurrency: CONCURRENCY,
        reusedExistingBrandImages,
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
