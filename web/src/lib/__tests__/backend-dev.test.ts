import {
  createServer,
  request as httpRequest,
  type OutgoingHttpHeaders,
  type Server,
} from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  backendDevServer,
  backendRequestGuard,
} from '../../../scripts/backend-dev'

const origin = 'http://localhost:3211'
let server: Server
let reachedBackend: number

beforeEach(async () => {
  reachedBackend = 0
  const guard = backendRequestGuard(origin)
  server = createServer((request, response) => {
    guard(request, response, () => {
      reachedBackend++
      response.setHeader(
        'Set-Cookie',
        'fixture=unused; Path=/api/user/auth; Secure; HttpOnly; SameSite=Strict'
      )
      response.end(JSON.stringify(request.headers))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
})

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
})

function send(headers: OutgoingHttpHeaders | string[], method = 'POST') {
  return new Promise<{
    status: number
    body: Record<string, string>
    cookies: string[]
  }>((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: '127.0.0.1',
        port: (server.address() as AddressInfo).port,
        path: '/api/user/auth/refresh',
        method,
        headers,
      },
      (response) => {
        let raw = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          raw += chunk
        })
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: JSON.parse(raw),
            cookies: response.headers['set-cookie'] ?? [],
          })
        )
      }
    )
    request.on('error', reject)
    request.end()
  })
}

describe('private backend development', () => {
  it('preserves same-origin identity and secure cookies while removing spoofed proxy identity', async () => {
    const result = await send({
      host: 'localhost:3211',
      origin,
      cookie: 'fixture=unused',
      forwarded: 'host=evil.example',
      'x-forwarded-for': '1.2.3.4',
      'x-forwarded-proto': 'https',
      'x-real-ip': '1.2.3.4',
    })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      host: 'localhost:3211',
      origin,
      cookie: 'fixture=unused',
    })
    expect(result.body).not.toHaveProperty('forwarded')
    expect(result.body).not.toHaveProperty('x-forwarded-for')
    expect(result.body).not.toHaveProperty('x-forwarded-proto')
    expect(result.body).not.toHaveProperty('x-real-ip')
    expect(result.cookies).toEqual([
      'fixture=unused; Path=/api/user/auth; Secure; HttpOnly; SameSite=Strict',
    ])
  })

  it('accepts an exact same-origin Referer when Origin is absent', async () => {
    expect(
      (await send({ host: 'localhost:3211', referer: `${origin}/sign-in` }))
        .status
    ).toBe(200)
  })

  it.each([
    { host: 'evil.example', origin },
    { host: 'localhost:3211', origin: 'http://127.0.0.1:3210' },
    { host: 'localhost:3211', origin: 'null' },
    { host: 'localhost:3211' },
    { host: 'localhost:3211', referer: `${origin}.evil.example/sign-in` },
    { host: 'localhost:3211', origin, 'sec-fetch-site': 'cross-site' },
  ])(
    'rejects untrusted browser identity before forwarding: %j',
    async (headers) => {
      expect((await send(headers)).status).toBe(403)
      expect(reachedBackend).toBe(0)
    }
  )

  it('rejects duplicate Origin headers before forwarding', async () => {
    expect(
      (
        await send([
          'Host',
          'localhost:3211',
          'Origin',
          origin,
          'Origin',
          origin,
        ])
      ).status
    ).toBe(403)
    expect(reachedBackend).toBe(0)
  })

  it('allows public reads on the exact local host without a browser Origin', async () => {
    expect((await send({ host: 'localhost:3211' }, 'GET')).status).toBe(200)
  })

  it.each([
    'https://example.com',
    'http://0.0.0.0:3310',
    'http://127.0.0.1:3310/api',
    'http://user:pass@127.0.0.1:3310',
  ])('rejects a target outside the fixed local tunnel: %s', (target) => {
    expect(() => backendDevServer(target, 3211)).toThrow('LLM_BACKEND_URL')
  })

  it('rejects a non-integer listener port', () => {
    expect(() => backendDevServer('http://127.0.0.1:3310', 3211.5)).toThrow(
      'LLM_FRONTEND_PORT'
    )
  })
})
