import fs from 'fs'
import path from 'path'

type Product = {
  url: string
  name: string
  description: string
  tags: string | null
  brand_id: string | null
  barcode?: string
}

type Brand = { key: string; name: string }

type StockRow = {
  line: number
  barcode: string
  name: string
  tokens: Set<string>
  size: string | null
  packCount: number | null
}

type Candidate = { row: StockRow; score: number; coverage: number; evidence: string[] }

const dataPath = path.join(process.cwd(), 'prisma', 'data', 'sweets-catalog.json')
const reportPath = path.join(process.cwd(), 'prisma', 'reports', 'sweets-barcode-review.csv')
const stockPath = process.argv[2]
if (!stockPath) throw new Error('Usage: yarn ts-node prisma/audit-sweets-barcodes.ts /path/to/Stock.csv')

function normalize(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/M\s*&\s*M'?S/g, 'MMS')
    .replace(/(\d+)\s*(KGS?|GRS?|G|MLS?|CL|L)\b/g, '$1$2')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function sizeOf(value: string) {
  const match = value.toUpperCase().replace(/,/g, '.').match(
    /(?:^|[^A-Z0-9])(\d+(?:\.\d+)?)\s*(KG|GRS?|G|MLS?|CL|L)(?=$|[^A-Z0-9])/,
  )
  if (!match) return null
  const amount = Number(match[1])
  const unit = match[2]
  if (unit === 'KG') return `${amount * 1000}G`
  if (unit === 'L') return `${amount * 1000}ML`
  if (unit === 'CL') return `${amount * 10}ML`
  return `${amount}${unit.startsWith('ML') ? 'ML' : 'G'}`
}

function urlSizeOf(url: string) {
  const slug = url.split('/product/')[1] ?? ''
  const fixed = slug
    .replace(/(\d+)-(\d)(?=(?:kg|g|ml|cl|l)(?:-|$))/gi, '$1.$2')
    .replace(/(\d+)-(?=(?:kg|g|ml|cl|l)(?:-|$))/gi, '$1')
  return sizeOf(fixed)
}

function packCountOf(value: string) {
  const normalized = normalize(value)
  const match = normalized.match(/(?:^| )(?:T\s*(\d+)|(?:X\s*)?(\d+)\s*(?:U|PCS?|BARRES?|BATONS?))(?: |$)/)
  return match ? Number(match[1] ?? match[2]) : null
}

const weakTokens = new Set([
  'CHOC', 'CHOCO', 'CHOCOLAT', 'CHOCOLATE', 'CANDY', 'SWEET', 'SNACK', 'BAR',
  'BAG', 'BOX', 'PACK', 'THE', 'AND', 'WITH', 'LAIT', 'MILK', 'GM', 'GR', 'G',
])

function distinctiveTokens(value: string) {
  return normalize(value).split(' ').filter((token) =>
    token.length >= 3 && !weakTokens.has(token) && !sizeOf(token) && !/^T\d+$/.test(token),
  )
}

function validGtin(value: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false
  const digits = [...value].map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - sum % 10) % 10 === check
}

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const lines = fs.readFileSync(stockPath, 'latin1').trimEnd().split(/\r?\n/)
if (!lines[0].startsWith('Code Barre;')) throw new Error('Expected the semicolon-delimited Stock.csv export')

const stock: StockRow[] = []
let invalidStockCodes = 0
for (const [index, line] of lines.slice(1).entries()) {
  const fields = line.split(';')
  if (fields.length < 10) throw new Error(`Malformed stock CSV at line ${index + 2}`)
  const barcode = fields[0].trim()
  if (!validGtin(barcode)) {
    invalidStockCodes += 1
    continue
  }
  // One source designation contains an unescaped semicolon; the six trailing columns are fixed.
  const name = fields.slice(3, fields.length - 6).join(';').replace(/^"|"$/g, '').trim()
  const normalized = normalize(name)
  stock.push({
    line: index + 2,
    barcode,
    name,
    tokens: new Set(normalized.split(' ')),
    size: sizeOf(name),
    packCount: packCountOf(name),
  })
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as { products: Product[]; brands: Brand[] }
const products = data.products
const brands = new Map(data.brands.map((brand) => [brand.key, brand.name]))
const bySize = new Map<string, StockRow[]>()
const byToken = new Map<string, StockRow[]>()
for (const row of stock) {
  if (row.size) {
    const bucket = bySize.get(row.size) ?? []
    bucket.push(row)
    bySize.set(row.size, bucket)
  }
  for (const token of row.tokens) {
    if (token.length >= 3) {
      const bucket = byToken.get(token) ?? []
      bucket.push(row)
      byToken.set(token, bucket)
    }
  }
}

const output: string[][] = [[
  'product_url', 'product_name', 'description', 'tags', 'brand', 'pack_size', 'url_pack_size', 'pack_count',
  'current_barcode', 'status', 'candidate_count', 'candidate_1', 'candidate_2',
  'candidate_3', 'reason',
]]
const counts: Record<string, number> = {}
for (const product of products) {
  const name = normalize(product.name)
  const size = sizeOf(product.tags ?? '') ?? sizeOf(product.name) ?? sizeOf(product.description)
  const urlSize = urlSizeOf(product.url)
  const packCount = packCountOf(product.tags ?? '') ?? packCountOf(product.description)
  const tokens = [...new Set(distinctiveTokens(product.name))]
  const brand = product.brand_id ? brands.get(product.brand_id) ?? '' : ''
  const brandTokens = distinctiveTokens(brand)
  const descriptionTokens = distinctiveTokens(product.description).filter((token) =>
    !tokens.includes(token) && !brandTokens.includes(token) && !weakTokens.has(token),
  )
  const anchors = [...new Set([...tokens, ...brandTokens])].filter((token) => byToken.has(token))
  const anchor = anchors.sort((a, b) => (byToken.get(a)?.length ?? 0) - (byToken.get(b)?.length ?? 0))[0]
  const pool = size ? bySize.get(size) ?? [] : anchor ? byToken.get(anchor) ?? [] : []
  const candidates: Candidate[] = pool.flatMap((row) => {
    if (packCount && row.packCount !== packCount) return []
    const matchingName = tokens.filter((token) => row.tokens.has(token))
    const nameCoverage = tokens.length ? matchingName.length / tokens.length : 0
    if (nameCoverage < 0.6) return []
    const matchingBrand = brandTokens.length > 0 && brandTokens.some((token) => row.tokens.has(token))
    if (brandTokens.length && !matchingBrand && nameCoverage < 1) return []
    const matchingDescription = descriptionTokens.filter((token) => row.tokens.has(token))
    const evidence = [
      `${matchingName.length}/${tokens.length} name tokens`,
      ...(size ? [`same ${size} pack`] : []),
      ...(packCount ? [`same ${packCount}-unit pack`] : []),
      ...(matchingBrand ? ['brand'] : []),
      ...(matchingDescription.length ? [`${matchingDescription.length} description tokens`] : []),
    ]
    const score = Math.round(nameCoverage * 60 + (size ? 25 : 0) + (packCount ? 20 : 0) +
      (matchingBrand ? 10 : 0) + Math.min(matchingDescription.length, 2) * 2)
    return [{ row, score, coverage: nameCoverage, evidence }]
  }).sort((a, b) => b.score - a.score || a.row.line - b.row.line)
  let status: string
  let reason: string
  if (product.barcode) {
    status = 'SOURCED'
    reason = 'Barcode already present in catalog; see source and research report'
  } else if (size && urlSize && size !== urlSize) {
    status = 'CONFLICTING_SIZE'
    reason = `Catalog pack size ${size} disagrees with product URL size ${urlSize}; resolve before matching`
  } else if (tokens.length === 0) {
    status = 'NEEDS_DETAILS'
    reason = 'Product name is too generic to match safely'
  } else if (candidates.length === 0) {
    status = size ? 'NO_MATCH' : 'NEEDS_PACK_SIZE'
    reason = size ? 'No plausible stock row has the same name and pack size' :
      'No pack size or plausible stock row; supplier identification required'
  } else if (!size) {
    status = packCount ? 'REVIEW_COUNT_ONLY' : 'REVIEW_NO_SIZE'
    reason = packCount ? 'Name and unit count match; confirm the exact retail pack' :
      'Possible name/brand matches, but pack size is missing; do not import'
  } else if (candidates[0].coverage < 1) {
    status = 'REVIEW_PARTIAL'
    reason = 'Only part of the product name matches; likely flavor or variant mismatch'
  } else if (candidates.length === 1) {
    status = 'REVIEW_SINGLE'
    reason = 'One plausible name-and-size candidate; verify flavor, wrapper, and unit code'
  } else {
    status = 'REVIEW_MULTIPLE'
    reason = 'Multiple plausible codes; inspect the physical pack'
  }
  counts[status] = (counts[status] ?? 0) + 1
  const shown = candidates.slice(0, 3).map(({ row, score, evidence }) =>
    `${row.barcode} | CSV line ${row.line} | ${row.name} | score ${score} (${evidence.join('; ')})`,
  )
  output.push([
    product.url, product.name, product.description, product.tags ?? '', brand, size ?? '',
    urlSize ?? '', packCount ? String(packCount) : '',
    product.barcode ?? '', status,
    String(candidates.length), shown[0] ?? '', shown[1] ?? '', shown[2] ?? '', reason,
  ])
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, output.map((row) => row.map(csvCell).join(',')).join('\n') + '\n')
console.log(JSON.stringify({ products: products.length, stockRows: lines.length - 1, invalidStockCodes, counts, reportPath }, null, 2))
