// Sample responses for the frontend preview. Never imports a production client.
// This module is used only by scripts/dev-preview.mjs, outside the web bundle.
import {
  previewCatalog,
  previewModels,
  previewVendors,
} from './preview-catalog.mjs'

export { previewModels } from './preview-catalog.mjs'

const user = {
  id: 1,
  username: 'preview',
  display_name: 'Preview user',
  email: 'preview@example.invalid',
  role: 1,
  status: 1,
  group: 'default',
  quota: 12500000,
  used_quota: 625000,
  request_count: 42,
  setting: '{}',
  sidebar_modules: '',
  permissions: {},
  has_password: true,
}

const groups = { default: { desc: 'Sample models', ratio: 1 } }
const success = (data) => ({ success: true, message: '', data })
const page = (items = []) =>
  success({ items, total: items.length, page: 1, page_size: 20 })

export function previewAuthBundle(
  now = Math.floor(Date.now() / 1000),
  session = {}
) {
  const expiresAt = session.expires_at ?? now + 3600
  return {
    access_token: 'local-preview-only',
    token_type: 'Bearer',
    access_expires_at: expiresAt,
    user,
    session: {
      sid: session.sid ?? 'local-preview',
      current: true,
      login_method: 'preview',
      ip: '127.0.0.1',
      user_agent: 'Frontend preview',
      created_at: session.created_at ?? now,
      last_active_at: now,
      expires_at: expiresAt,
    },
  }
}

export function previewResponse(
  method,
  path,
  now = Math.floor(Date.now() / 1000)
) {
  if (method !== 'GET') return null
  switch (path.replace(/\/$/, '')) {
    case '/api/status':
      return success({
        system_name: 'Fluxion',
        logo: '/fluxion-logo.svg',
        setup: true,
        quota_per_unit: 500000,
        usd_exchange_rate: 1,
        display_in_currency: true,
        quota_display_type: 'USD',
        enable_data_export: true,
        data_export_default_time: 'hour',
        password_login_enabled: true,
        password_login_encryption_enabled: false,
        password_register_enabled: false,
        register_enabled: false,
        email_verification: false,
        checkin_enabled: false,
        api_info_enabled: false,
        announcements_enabled: false,
        faq_enabled: false,
        uptime_kuma_enabled: false,
        docs_link: '/docs',
        HeaderNavModules: JSON.stringify({
          home: true,
          console: true,
          pricing: { enabled: true, requireAuth: false },
          docs: true,
          about: false,
        }),
        SidebarModulesAdmin: '',
      })
    case '/api/setup':
      return success({ status: true })
    case '/api/home_page_content':
    case '/api/about':
    case '/api/notice':
      return success('')
    case '/api/user/self':
      return success(user)
    case '/api/user/models':
      return success(previewModels)
    case '/api/user/self/groups':
      return success(groups)
    case '/api/token/auto-groups':
      return success({ groups: ['default'], max_count: 1 })
    case '/api/pricing':
      return {
        ...success(previewCatalog),
        vendors: previewVendors,
        group_ratio: { default: 1 },
        usable_group: groups,
        supported_endpoint: {
          openai: { path: '/v1/chat/completions', method: 'POST' },
        },
        auto_groups: ['default'],
      }
    case '/api/token':
    case '/api/token/search':
      return page([
        {
          id: 1,
          name: 'Sample development key',
          key: 'preview-not-a-real-key',
          status: 1,
          remain_quota: 5000000,
          used_quota: 625000,
          unlimited_quota: false,
          expired_time: -1,
          created_time: now - 86400,
          accessed_time: now - 300,
          group: 'default',
          auto_groups: [],
          cross_group_retry: false,
          model_limits_enabled: false,
          model_limits: '',
          allow_ips: '',
        },
      ])
    case '/api/data':
    case '/api/data/self':
    case '/api/data/users':
      return success(
        Array.from({ length: 7 }, (_, i) => ({
          user_id: 1,
          username: 'preview',
          model_name: previewModels[i % previewModels.length],
          created_at: now - (6 - i) * 86400,
          count: 3 + i,
          token_used: 1000 * (i + 1),
          quota: 10000 * (i + 1),
        }))
      )
    case '/api/data/flow':
    case '/api/data/flow/self':
      return success([])
    case '/api/log/self':
    case '/api/audit/self':
    case '/api/log':
      return page()
    case '/api/log/self/stat':
    case '/api/log/stat':
      return success({ quota: 625000, token: 28000, rpm: 0, tpm: 0, count: 42 })
    case '/api/perf-metrics/summary':
      return success({ models: [], window_hours: 24 })
    case '/api/perf-metrics':
      return success({ model_name: '', groups: [] })
    case '/api/user/sessions':
      return success([])
    case '/api/user/token/status':
      return success({
        exists: false,
        token_ref: '',
        created_at: null,
        last_used_at: null,
        last_used_ip: '',
      })
    case '/api/user/passkey':
      return success({ enabled: false })
    case '/api/user/2fa/status':
      return success({
        enabled: false,
        locked: false,
        backup_codes_remaining: 0,
      })
    case '/api/uptime/status':
      return success([])
    case '/api/user/topup/info':
      return success({
        enable_online_topup: false,
        enable_stripe_topup: false,
        enable_creem_topup: false,
        enable_waffo_topup: false,
        enable_waffo_pancake_topup: false,
        enable_redemption: false,
        pay_methods: [],
        min_topup: 1,
        stripe_min_topup: 1,
        amount_options: [],
        discount: {},
      })
    case '/api/user/topup/self':
      return page()
    case '/api/user/aff':
      return success('')
    case '/api/subscription/plans':
      return success([])
    case '/api/subscription/self':
      return success({ subscriptions: [], billing_preference: 'wallet_only' })
    default:
      return null
  }
}

export function previewAnswer() {
  return 'This is a **local preview response**, not output from a live model.\n\nYou can try the conversation layout, Markdown rendering, model selector, parameters, stop button and message actions here.\n\n```python\ndef hello(name):\n    return f"Hello, {name}!"\n```\n\nNo model provider is connected and no usage is billed.'
}
