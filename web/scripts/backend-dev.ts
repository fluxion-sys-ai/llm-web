import type { RequestHandler, ServerConfig } from '@rsbuild/core'

/** A private, opt-in connection to an SSH tunnel, never a public reverse proxy. */
export function backendDevServer(target: string, port: number): ServerConfig {
  const upstream = new URL(target)
  if (
    upstream.protocol !== 'http:' ||
    upstream.hostname !== '127.0.0.1' ||
    !upstream.port ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== '/' ||
    upstream.search ||
    upstream.hash
  ) {
    throw new Error(
      'LLM_BACKEND_URL must be http://127.0.0.1:<SSH tunnel port>'
    )
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(
      'LLM_FRONTEND_PORT must be an integer between 1024 and 65535'
    )
  }

  return {
    // Cookies ignore ports: use a different hostname from the 127.0.0.1 mock
    // preview so its session-hint cookie cannot overwrite the real one.
    host: 'localhost',
    port,
    strictPort: true,
    cors: false,
    proxy: Object.fromEntries(
      ['/api', '/v1', '/pg'].map((path) => [
        path,
        {
          target: upstream.origin,
          // The backend compares the browser's real Origin with Host. Do not
          // replace either with the tunnel address or a trusted production host.
          changeOrigin: false,
          xfwd: false,
          proxyTimeout: 1_800_000,
          timeout: 1_800_000,
        },
      ])
    ),
    setup({ server }) {
      server.middlewares.use(backendRequestGuard(`http://localhost:${port}`))
    },
  }
}

export function backendRequestGuard(origin: string): RequestHandler {
  const host = new URL(origin).host
  return (request, response, next) => {
    const originHeaders = request.rawHeaders.filter(
      (_, index) =>
        index % 2 === 0 && request.rawHeaders[index].toLowerCase() === 'origin'
    )
    const hostHeaders = request.rawHeaders.filter(
      (_, index) =>
        index % 2 === 0 && request.rawHeaders[index].toLowerCase() === 'host'
    )
    let allowed = request.headers.host === host && hostHeaders.length === 1
    const suppliedOrigin = request.headers.origin
    if (suppliedOrigin !== undefined) {
      allowed &&= originHeaders.length === 1 && suppliedOrigin === origin
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method ?? '')) {
      if (suppliedOrigin === undefined) {
        try {
          const referer = new URL(request.headers.referer ?? '')
          allowed &&=
            referer.origin === origin && !referer.username && !referer.password
        } catch {
          allowed = false
        }
      }
    }
    if (request.headers['sec-fetch-site'] === 'cross-site') allowed = false
    if (!allowed) {
      response.writeHead(403, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      })
      response.end(
        JSON.stringify({
          success: false,
          message: 'Open the backend dev site at its exact loopback address.',
        })
      )
      return
    }

    // Never allow browser-supplied proxy identity to reach the shared backend.
    for (const header of Object.keys(request.headers)) {
      if (
        header === 'forwarded' ||
        header.startsWith('x-forwarded-') ||
        header === 'x-real-ip' ||
        header === 'cf-connecting-ip' ||
        header === 'true-client-ip'
      ) {
        delete request.headers[header]
      }
    }
    next()
  }
}
