import fs from 'fs'
import path from 'path'

type Variant = {
  name: string
  sku: string
  sourceName: string
  sourceProductUrl: string
  barcode: string | null
  barcodeStatus: string
}
type Product = { name: string; brand: string; variants: Variant[] }
type StockRow = { line: number; barcode: string; name: string; tokens: Set<string>; size: string | null }

const stockPath = process.argv[2]
if (!stockPath) throw new Error('Usage: yarn ts-node prisma/audit-cosmetics-barcodes.ts /path/to/Stock.csv')

const dataPath = path.join(process.cwd(), 'prisma/data/cosmetics-products.json')
const reportPath = path.join(process.cwd(), 'prisma/reports/cosmetics-barcode-review.csv')

function normalize(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/(\d+)\s*(ML|CL|L|GRS?|G|KG)\b/g, '$1$2')
    .replace(/[^A-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function tokens(value: string) { return normalize(value).split(' ').filter(Boolean) }

function sizeOf(value: string) {
  const match = normalize(value).match(/(?:^| )(\d+(?:\.\d+)?)(KG|GRS?|G|MLS?|CL|L)(?: |$)/)
  if (!match) return null
  const amount = Number(match[1])
  if (match[2] === 'KG') return `${amount * 1000}G`
  if (match[2] === 'L') return `${amount * 1000}ML`
  if (match[2] === 'CL') return `${amount * 10}ML`
  return `${amount}${match[2].startsWith('M') ? 'ML' : 'G'}`
}

function validGtin(value: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false
  const digits = [...value].map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 ? 1 : 3), 0)
  return (10 - sum % 10) % 10 === check
}

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const lines = fs.readFileSync(stockPath, 'latin1').trimEnd().split(/\r?\n/)
if (!lines[0].startsWith('Code Barre;')) throw new Error('Expected the semicolon-delimited Stock.csv export')
const stock: StockRow[] = []
const byToken = new Map<string, StockRow[]>()
let invalidStockCodes = 0
for (const [index, line] of lines.slice(1).entries()) {
  const fields = line.split(';')
  if (fields.length < 10) throw new Error(`Malformed stock CSV at line ${index + 2}`)
  const barcode = fields[0].trim()
  if (!validGtin(barcode)) { invalidStockCodes++; continue }
  // The stock export has one unescaped semicolon in a designation.
  const name = fields.slice(3, fields.length - 6).join(';').replace(/^"|"$/g, '').trim()
  const row: StockRow = { line: index + 2, barcode, name, tokens: new Set(tokens(name)), size: sizeOf(name) }
  stock.push(row)
  for (const token of row.tokens) {
    if (token.length < 3) continue
    const bucket = byToken.get(token) ?? []
    bucket.push(row)
    byToken.set(token, bucket)
  }
}

const generic = new Set(['DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'AU', 'AUX', 'ET', 'THE', 'WITH',
  'POUR', 'FOR', 'NEW', 'PAR', 'ML', 'GR', 'G', 'DEFAULT', 'AUTRE', 'OTHER'])
function significant(value: string) {
  return [...new Set(tokens(value).filter((token) => (token.length >= 3 || /^\d+(?:\.\d+)?$/.test(token)) &&
    !generic.has(token) && !sizeOf(token)))]
}

const products = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as Product[]
const output: (string | number)[][] = [[
  'sku', 'product', 'brand', 'variant', 'source_name', 'source_url', 'size', 'current_barcode',
  'status', 'candidate_count', 'candidate_1', 'candidate_2', 'candidate_3', 'reason',
]]
const counts: Record<string, number> = {}
for (const product of products) for (const variant of product.variants) {
  const brandTokens = tokens(product.brand).filter((token) => token.length >= 2 && !generic.has(token))
  const nameTokens = significant(variant.sourceName)
  const variantTokens = significant(variant.name)
  const size = sizeOf(variant.sourceName) ?? sizeOf(variant.name)
  const anchors = [...new Set([...brandTokens, ...nameTokens])].filter((token) => byToken.has(token))
  const anchor = anchors.sort((a, b) => (byToken.get(a)?.length ?? 0) - (byToken.get(b)?.length ?? 0))[0]
  const pool = anchor ? byToken.get(anchor) ?? [] : []
  const candidates = pool.flatMap((row) => {
    if (brandTokens.length && !brandTokens.every((token) => row.tokens.has(token))) return []
    if (size && row.size && size !== row.size) return []
    const matchedName = nameTokens.filter((token) => row.tokens.has(token))
    const coverage = nameTokens.length ? matchedName.length / nameTokens.length : 0
    const matchedVariant = variantTokens.filter((token) => row.tokens.has(token))
    const variantCoverage = variantTokens.length ? matchedVariant.length / variantTokens.length : 1
    if (coverage < 0.67 || variantCoverage < 1) return []
    const score = Math.round(coverage * 70 + variantCoverage * 20 + (size && row.size === size ? 10 : 0))
    return [{ row, score, coverage, variantCoverage }]
  }).sort((a, b) => b.score - a.score || a.row.line - b.row.line)
  let status: string
  let reason: string
  if (variant.barcode) {
    status = 'SOURCED'
    reason = 'Existing source-verified code; preserve it and confirm against the physical pack'
  } else if (!anchor || !candidates.length) {
    status = 'NO_MATCH'
    reason = 'No stock row matches enough brand/product/variant detail'
  } else if (candidates[0].coverage === 1 && candidates[0].variantCoverage === 1 && size &&
    candidates[0].row.size === size && candidates.length === 1) {
    status = 'REVIEW_EXACT'
    reason = 'One full token and size match; confirm packaging, shade, market, and printed barcode before import'
  } else if (candidates.length > 1) {
    status = 'REVIEW_MULTIPLE'
    reason = 'Multiple plausible stock codes; physical pack or authoritative source required'
  } else if (!size || !candidates[0].row.size) {
    status = 'REVIEW_NO_SIZE'
    reason = 'Catalog or stock designation lacks a matching size; physical pack required'
  } else {
    status = 'REVIEW_PARTIAL'
    reason = 'Only part of product or variant name matches; do not import without stronger evidence'
  }
  counts[status] = (counts[status] ?? 0) + 1
  const shown = candidates.slice(0, 3).map(({ row, score, coverage, variantCoverage }) =>
    `${row.barcode} | CSV line ${row.line} | ${row.name} | score ${score} | name ${coverage.toFixed(2)} variant ${variantCoverage.toFixed(2)}`)
  output.push([variant.sku, product.name, product.brand, variant.name, variant.sourceName,
    variant.sourceProductUrl, size ?? '', variant.barcode ?? '', status, candidates.length,
    shown[0] ?? '', shown[1] ?? '', shown[2] ?? '', reason])
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, output.map((row) => row.map(csvCell).join(',')).join('\n') + '\n')
console.log(JSON.stringify({ variants: output.length - 1, stockRows: lines.length - 1,
  invalidStockCodes, counts, reportPath }, null, 2))
