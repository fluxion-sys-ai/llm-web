import assert from 'node:assert/strict'
import test from 'node:test'

import { createPreviewServer } from '../dev-preview.mjs'
import {
  previewAuthBundle,
  previewResponse,
  previewAnswer,
} from '../preview-data.mjs'

test('playground replies identify themselves as simulated and unbilled', () => {
  assert.match(previewAnswer(), /local preview response/)
  assert.match(
    previewAnswer(),
    /No model provider is connected and no usage is billed/
  )
})

test('preview rejects production mutations and never advertises enabled payments', () => {
  for (const path of [
    '/api/user/stripe/pay',
    '/api/token/',
    '/api/option/',
    '/api/user/self',
  ]) {
    assert.equal(previewResponse('POST', path), null)
    assert.equal(previewResponse('DELETE', path), null)
  }
  const config = previewResponse('GET', '/api/user/topup/info').data
  assert.equal(config.enable_online_topup, false)
  assert.equal(config.enable_stripe_topup, false)
  const status = previewResponse('GET', '/api/status').data
  assert.equal(status.register_enabled, false)
  assert.equal(status.password_register_enabled, false)
})

test('preview session is a sample ordinary user without operator powers', () => {
  const bundle = previewAuthBundle(1000)
  assert.equal(bundle.user.role, 1)
  assert.equal(bundle.access_token, 'local-preview-only')
  assert.equal(bundle.access_expires_at, 4600)
})

test('pricing demo admin mode is explicit and does not affect the ordinary preview', () => {
  assert.equal(previewAuthBundle(1000, {}, true).user.role, 100)
  assert.equal(previewAuthBundle(1000).user.role, 1)
  assert.equal(previewResponse('GET', '/api/customer-pricing/models'), null)
})

test('opt-in pricing demo creates public codes and selects existing model prices without external calls', async (t) => {
  const server = createPreviewServer({
    customerPricing: true,
    now: () => 1000000,
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })
  const base = `http://127.0.0.1:${server.address().port}`
  const login = await fetch(`${base}/api/user/login`, {
    method: 'POST',
    body: JSON.stringify({ username: 'preview', password: 'preview123' }),
  })
  assert.equal((await login.json()).data.user.role, 100)
  const models = await fetch(`${base}/api/customer-pricing/models`)
  assert.deepEqual(
    (await models.json()).data.map((model) => model.model_name),
    ['GLM-5.3', 'kimi-k3']
  )
  const create = await fetch(`${base}/api/customer-pricing/codes`, {
    method: 'POST',
    body: JSON.stringify({
      audience: 'all_users',
      user_id: 0,
      name: 'Demo',
      multiplier: 0.8,
      duration_seconds: 14400,
    }),
  })
  const created = (await create.json()).data
  assert.match(created.code, /not-redeemable/)
  assert.equal(created.promotion.audience, 'all_users')
  const save = await fetch(`${base}/api/customer-pricing/users/30/models`, {
    method: 'PUT',
    body: JSON.stringify({ model_name: 'GLM-5.3', multiplier: 0.7 }),
  })
  const saved = (await save.json()).data
  assert.equal(saved.promotion_codes_enabled, false)
  assert.deepEqual(saved.model_prices, [
    { model_name: 'GLM-5.3', multiplier: 0.7 },
  ])
  const unknown = await fetch(`${base}/api/customer-pricing/users/30/models`, {
    method: 'PUT',
    body: JSON.stringify({ model_name: 'invented', multiplier: 0.7 }),
  })
  assert.equal(unknown.status, 400)
  await unknown.json()
})

test('preview does not authenticate arbitrary refresh requests', () => {
  assert.equal(previewResponse('POST', '/api/user/auth/refresh'), null)
})

async function startPreviewFixture(t, now) {
  const server = createPreviewServer({ now })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })
  const base = `http://127.0.0.1:${server.address().port}`
  return (path, { cookie, body } = {}) =>
    fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
}

test('local HTTP preview requires login, preserves its cookie session, and revokes it at logout', async (t) => {
  const request = await startPreviewFixture(t, () => 1000000)
  const anonymous = await request('/api/user/auth/refresh')
  assert.equal(anonymous.status, 401)
  assert.equal((await anonymous.json()).success, false)

  const login = await request('/api/user/login?turnstile=', {
    body: { username: 'preview', password: 'preview123' },
  })
  assert.equal(login.status, 200)
  const loginData = await login.json()
  assert.equal(loginData.data.user.role, 1)
  const cookies = login.headers.getSetCookie()
  assert.match(
    cookies[0],
    /^fluxion_preview_session=[a-f0-9]{64}; HttpOnly; SameSite=Lax; Path=\/; Max-Age=3600$/
  )
  assert.equal(
    cookies[1],
    'new_api_has_session=1; SameSite=Lax; Path=/; Max-Age=3600'
  )
  const cookie = cookies[0].split(';')[0]
  const refresh = await request('/api/user/auth/refresh', { cookie })
  assert.equal(refresh.status, 200)
  const refreshedData = await refresh.json()
  assert.equal(refreshedData.data.session.sid, loginData.data.session.sid)
  assert.equal(refreshedData.data.session.expires_at, 4600)

  const logout = await request('/api/user/auth/logout', { cookie })
  assert.equal(logout.status, 200)
  assert.equal((await logout.json()).success, true)
  assert.deepEqual(logout.headers.getSetCookie(), [
    'fluxion_preview_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    'new_api_has_session=; SameSite=Lax; Path=/; Max-Age=0',
  ])
  const afterLogout = await request('/api/user/auth/refresh', { cookie })
  assert.equal(afterLogout.status, 401)
  assert.equal((await afterLogout.json()).success, false)
})

test('invalid demo credentials and unknown session cookies cannot authenticate', async (t) => {
  const request = await startPreviewFixture(t)
  for (const body of [
    { username: 'preview', password: 'incorrect' },
    { username: 'unknown', password: 'preview123' },
  ]) {
    const response = await request('/api/user/login', { body })
    assert.equal(response.status, 401)
    assert.equal((await response.json()).success, false)
    assert.equal(response.headers.get('Set-Cookie'), null)
  }
  const unknown = await request('/api/user/auth/refresh', {
    cookie: `fluxion_preview_session=${'0'.repeat(64)}; new_api_has_session=1`,
  })
  assert.equal(unknown.status, 401)
  assert.equal((await unknown.json()).success, false)
})

test('demo sessions expire after one hour and a new login invalidates the previous session', async (t) => {
  let now = 1000000
  const request = await startPreviewFixture(t, () => now)
  const body = { username: 'preview', password: 'preview123' }
  const login = await request('/api/user/login', { body })
  const previousCookie = login.headers.getSetCookie()[0].split(';')[0]
  await login.json()
  const replacement = await request('/api/user/login', {
    body,
    cookie: previousCookie,
  })
  const currentCookie = replacement.headers.getSetCookie()[0].split(';')[0]
  await replacement.json()
  assert.notEqual(currentCookie, previousCookie)
  const oldSession = await request('/api/user/auth/refresh', {
    cookie: previousCookie,
  })
  assert.equal(oldSession.status, 401)
  await oldSession.json()

  now += 3600000
  const expired = await request('/api/user/auth/refresh', {
    cookie: currentCookie,
  })
  assert.equal(expired.status, 401)
  assert.equal((await expired.json()).success, false)
})
