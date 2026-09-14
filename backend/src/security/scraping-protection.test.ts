import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSchema, parse, type ValidationRule } from 'graphql'
import { createYoga } from 'graphql-yoga'
import { boundedCatalogArgs } from './catalog-guard'
import { queryBudgetError, queryBudgetRule } from './query-budget'
import { createRequestBudget, rateLimitMiddleware } from './request-budget'

test('guest full-list requests are bounded and deep pagination is rejected', () => {
  assert.deepEqual(boundedCatalogArgs({ page: 1, limit: 10000, isFull: true }), { page: 1, limit: 100, isFull: false })
  assert.throws(() => boundedCatalogArgs({ page: 101, limit: 20 }), /CATALOG_PAGE_LIMIT/)
  assert.throws(() => boundedCatalogArgs({ page: 0, limit: 20 }), /CATALOG_PAGE_LIMIT/)
  assert.throws(() => boundedCatalogArgs({ search: 'x'.repeat(121) }), /SEARCH_TOO_LONG/)
})

test('query budget accepts normal browsing and rejects alias batching and depth', () => {
  assert.equal(queryBudgetError(parse('{ findManyNiches(page:1,limit:10) { niches { id name } } }')), undefined)
  assert.ok(queryBudgetError(parse(`{ ${Array.from({ length: 31 }, (_, index) => `q${index}: products { id }`).join(' ')} }`)))
  assert.ok(queryBudgetError(parse('{ a { b { c { d { e { f { g { h { i { j { k { l { m } } } } } } } } } } } } }')))
  assert.ok(queryBudgetError(parse('query A { a } query B { b }')))
})

test('repeated and cyclic fragments cannot bypass the budget', () => {
  const repeated = `{ ${Array(100).fill('...Fields').join(' ')} } fragment Fields on Query { a b c d e f }`
  assert.ok(queryBudgetError(parse(repeated)))
  assert.ok(queryBudgetError(parse('{ ...A } fragment A on Query { ...A }')))
})

test('local fallback limits requests per IP and recovers after the window', async () => {
  let time = 0
  const consume = createRequestBudget({ status: 'end', eval: async () => 0 }, { minute: 2, hour: 10 }, () => time)
  assert.equal(await consume('client-a'), 0)
  assert.equal(await consume('client-a'), 0)
  assert.equal(await consume('client-a'), 60)
  assert.equal(await consume('client-b'), 0)
  time = 60000
  assert.equal(await consume('client-a'), 0)
})

test('Redis counter enforces limits without storing plaintext IPs', async () => {
  let key = ''
  const consume = createRequestBudget({ status: 'ready', eval: async (...args) => { key = args[2]; return 181 } })
  assert.ok(await consume('192.0.2.5'))
  assert.ok(!key.includes('192.0.2.5'))
})

test('middleware does not read attacker-supplied forwarding headers', async () => {
  let ip = ''
  let nextCalled = false
  const middleware = rateLimitMiddleware(async value => { ip = value; return 0 })
  await middleware({ method: 'POST', ip: '192.0.2.5', headers: { 'x-forwarded-for': 'spoofed' } } as any, {} as any, () => { nextCalled = true })
  assert.equal(ip, '192.0.2.5')
  assert.equal(nextCalled, true)
})

test('Yoga rejects batched requests and applies query limits before execution', async () => {
  const schema = buildSchema('type Query { hello: String }')
  let executions = 0
  schema.getQueryType()!.getFields().hello.resolve = () => { executions++; return 'hello' }
  const yoga = createYoga({ schema, batching: false, logging: false, plugins: [{
    onValidate({ addValidationRule }: { addValidationRule: (rule: ValidationRule) => void }) { addValidationRule(queryBudgetRule) },
  }] })
  const send = (body: unknown) => yoga.fetch('http://localhost/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  assert.equal((await send({ query: '{ hello }' })).status, 200)
  assert.equal(executions, 1)
  assert.ok((await send([{ query: '{ hello }' }, { query: '{ hello }' }])).status >= 400)
  const aliases = `{ ${Array.from({ length: 31 }, (_, index) => `q${index}: hello`).join(' ')} }`
  const response = await send({ query: aliases })
  assert.ok((await response.json() as any).errors?.length)
  assert.equal(executions, 1)
})
