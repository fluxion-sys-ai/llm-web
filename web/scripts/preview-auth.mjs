// Local demo authentication only. These shared demo credentials are not real accounts.
import { randomBytes, randomUUID } from 'node:crypto'

import { previewAuthBundle } from './preview-data.mjs'

const SESSION_COOKIE = 'fluxion_preview_session'
const SESSION_SECONDS = 3600
const clearedCookies = [
  `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  'new_api_has_session=; SameSite=Lax; Path=/; Max-Age=0',
]

export function createPreviewAuth(now = Date.now, customerPricing = false) {
  const sessions = new Map()

  return async function handlePreviewAuth(request, response, path) {
    if (
      request.method !== 'POST' ||
      ![
        '/api/user/login',
        '/api/user/auth/refresh',
        '/api/user/auth/logout',
      ].includes(path)
    ) {
      return false
    }

    response.setHeader('Content-Type', 'application/json')
    const timestamp = Math.floor(now() / 1000)
    for (const [token, session] of sessions) {
      if (session.expires_at <= timestamp) sessions.delete(token)
    }
    const cookie = (request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    const token = cookie?.slice(SESSION_COOKIE.length + 1)

    if (path === '/api/user/auth/logout') {
      sessions.delete(token)
      response.setHeader('Set-Cookie', clearedCookies)
      response.end(JSON.stringify({ success: true, message: '' }))
      return true
    }

    if (path === '/api/user/login') {
      let body
      try {
        let raw = ''
        let size = 0
        for await (const part of request) {
          size += part.length
          if (size > 4096) {
            response.writeHead(413).end(
              JSON.stringify({
                success: false,
                message: 'Preview login request is too large.',
              })
            )
            return true
          }
          raw += part
        }
        body = JSON.parse(raw)
      } catch {
        response.writeHead(400).end(
          JSON.stringify({
            success: false,
            message: 'Invalid preview login request.',
          })
        )
        return true
      }
      if (body?.username !== 'preview' || body?.password !== 'preview123') {
        response.writeHead(401).end(
          JSON.stringify({
            success: false,
            message: 'Invalid preview username or password.',
          })
        )
        return true
      }
      sessions.delete(token)
      const nextToken = randomBytes(32).toString('hex')
      const session = {
        sid: randomUUID(),
        created_at: timestamp,
        expires_at: timestamp + SESSION_SECONDS,
      }
      sessions.set(nextToken, session)
      response.setHeader('Set-Cookie', [
        `${SESSION_COOKIE}=${nextToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`,
        `new_api_has_session=1; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`,
      ])
      response.end(
        JSON.stringify({
          success: true,
          message: '',
          data: previewAuthBundle(timestamp, session, customerPricing),
        })
      )
      return true
    }

    const session = sessions.get(token)
    if (!session) {
      response.setHeader('Set-Cookie', clearedCookies)
      response.writeHead(401).end(
        JSON.stringify({
          success: false,
          message: 'Sign in to the local preview.',
        })
      )
      return true
    }
    response.end(
      JSON.stringify({
        success: true,
        message: '',
        data: previewAuthBundle(timestamp, session, customerPricing),
      })
    )
    return true
  }
}
