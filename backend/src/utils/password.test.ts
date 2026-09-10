import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAccessCodeEmail } from './mailer'
import { generateAccessCode } from './password'

test('generated access codes are strong and safe to copy from HTML email', () => {
  const codes = Array.from({ length: 1_000 }, () => generateAccessCode())

  assert.equal(new Set(codes).size, codes.length)
  for (const code of codes) {
    assert.equal(code.length, 12)
    assert.match(code, /[A-Z]/)
    assert.match(code, /[a-z]/)
    assert.match(code, /[2-9]/)
    assert.doesNotMatch(code, /[&<>"'\s]/)
  }
})

test('access-code email escapes dynamic HTML without changing plain text credentials', () => {
  const content = buildAccessCodeEmail({
    email: 'owner+test@example.com',
    name: '<Store & Co>',
    password: 'SafeCode-2Aa',
    purpose: 'reset',
  })

  assert.match(content.text, /Access code: SafeCode-2Aa/)
  assert.match(content.html, /SafeCode-2Aa/)
  assert.match(content.html, /&lt;Store &amp; Co&gt;/)
  assert.doesNotMatch(content.html, /<Store & Co>/)
})

test('access codes reject lengths below the production minimum', () => {
  assert.throws(() => generateAccessCode(11), /at least 12 characters/)
})
