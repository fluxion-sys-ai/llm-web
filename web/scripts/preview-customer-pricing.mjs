// Opt-in, loopback-only demonstration state. Never contacts a production API.
import { previewAuthBundle } from './preview-data.mjs'

export function createPricingPreview(now = Date.now) {
  const timestamp = () => Math.floor(now() / 1000)
  const users = [
    {
      id: 30,
      username: 'sample-customer-a',
      display_name: 'Sample customer A',
      role: 1,
      status: 1,
    },
    {
      id: 31,
      username: 'sample-customer-b',
      display_name: 'Sample customer B',
      role: 1,
      status: 1,
    },
  ]
  const models = ['GLM-5.3', 'kimi-k3'].map((model_name) => ({
    model_name,
    billing_model_name: model_name,
  }))
  const pricing = new Map(
    users.map((user) => [
      user.id,
      { user_id: user.id, promotion_codes_enabled: true, model_prices: [] },
    ])
  )
  const codes = [
    {
      id: 1,
      user_id: 0,
      audience: 'all_users',
      name: 'Sample launch offer',
      multiplier: 0.8,
      duration_seconds: 86400,
      redeem_before: timestamp() + 604800,
      starts_at: 0,
      expires_at: 0,
      created_at: timestamp(),
      code_mask: '****DEMO',
      status: 'available',
      redemption_count: 2,
    },
  ]
  const reply = (response, data, status = 200) => {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(
      JSON.stringify(
        status === 200
          ? { success: true, data, message: '' }
          : { success: false, message: data }
      )
    )
  }

  return async function handlePricingPreview(request, response, path) {
    const url = new URL(request.url, 'http://127.0.0.1')
    if (request.method === 'GET') {
      if (path === '/api/user/self') {
        reply(response, previewAuthBundle(timestamp(), {}, true).user)
        return true
      }
      if (path === '/api/customer-pricing/models') {
        reply(response, models)
        return true
      }
      if (['/api/user/', '/api/user/search'].includes(path)) {
        const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase()
        const items = users.filter((user) =>
          `${user.id} ${user.username} ${user.display_name}`
            .toLowerCase()
            .includes(keyword)
        )
        reply(response, { items, total: items.length, page: 1, page_size: 20 })
        return true
      }
      const user = path.match(/^\/api\/user\/(\d+)$/)
      if (user) {
        const found = users.find((item) => item.id === Number(user[1]))
        reply(response, found ?? 'Sample user not found', found ? 200 : 404)
        return true
      }
      if (path === '/api/customer-pricing/codes') {
        const userID = Number(url.searchParams.get('user_id'))
        const items = codes.filter((code) => !userID || code.user_id === userID)
        const page = Number(url.searchParams.get('p') ?? 1)
        const size = Number(url.searchParams.get('page_size') ?? 10)
        reply(response, {
          items: items.slice((page - 1) * size, page * size),
          total: items.length,
          page,
          page_size: size,
        })
        return true
      }
    }
    const customer = path.match(
      /^\/api\/customer-pricing\/users\/(\d+)(?:\/(models|promotion))?$/
    )
    if (customer) {
      const record = pricing.get(Number(customer[1]))
      if (!record) {
        reply(response, 'Sample user not found', 404)
        return true
      }
      if (request.method === 'GET' && !customer[2]) {
        reply(response, record)
        return true
      }
      if (request.method === 'DELETE' && customer[2] === 'models') {
        record.model_prices = record.model_prices.filter(
          (item) => item.model_name !== url.searchParams.get('model_name')
        )
        reply(response, record)
        return true
      }
    }
    if (!path.startsWith('/api/customer-pricing/')) return false
    let body = {}
    try {
      let raw = ''
      for await (const part of request) {
        raw += part
        if (raw.length > 16384) throw new Error('Request too large')
      }
      if (raw) body = JSON.parse(raw)
    } catch {
      reply(response, 'Invalid sample request', 400)
      return true
    }
    if (customer) {
      const record = pricing.get(Number(customer[1]))
      if (request.method === 'PUT' && customer[2] === 'models') {
        if (!models.some((model) => model.model_name === body.model_name)) {
          reply(response, 'Select an existing model', 400)
          return true
        }
        record.model_prices = [
          ...record.model_prices.filter(
            (item) => item.model_name !== body.model_name
          ),
          body,
        ]
        record.promotion_codes_enabled = false
        reply(response, record)
        return true
      }
      if (request.method === 'PATCH' && customer[2] === 'promotion') {
        record.promotion_codes_enabled = body.enabled === true
        reply(response, record)
        return true
      }
    }
    if (request.method === 'POST' && path === '/api/customer-pricing/codes') {
      const id = codes.length + 1
      const promotion = {
        ...body,
        id,
        user_id: body.audience === 'all_users' ? 0 : body.user_id,
        audience: body.audience ?? 'specific_user',
        redemption_count: 0,
        starts_at: 0,
        expires_at: 0,
        created_at: timestamp(),
        redeem_before: body.redeem_before ?? 0,
        code_mask: '****DEMO',
        status: 'available',
      }
      codes.unshift(promotion)
      reply(response, {
        promotion,
        code: `preview-only-promotion-${id}-not-redeemable`,
      })
      return true
    }
    const action = path.match(
      /^\/api\/customer-pricing\/codes\/(\d+)\/(disable|revoke)$/
    )
    if (action && request.method === 'POST') {
      const code = codes.find((item) => item.id === Number(action[1]))
      if (!code) reply(response, 'Sample code not found', 404)
      else {
        code.status = action[2] === 'disable' ? 'disabled' : 'revoked'
        reply(response, code)
      }
      return true
    }
    return false
  }
}
