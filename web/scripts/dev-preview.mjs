// Frontend-only sandbox: all API traffic terminates at this loopback fixture server.
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createPreviewAuth } from './preview-auth.mjs'
import { createPricingPreview } from './preview-customer-pricing.mjs'
import { previewAnswer, previewResponse } from './preview-data.mjs'

export function createPreviewServer(options = {}) {
  const handleAuth = createPreviewAuth(options.now, options.customerPricing)
  const handlePricing = options.customerPricing
    ? createPricingPreview(options.now)
    : null
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    const path = new URL(request.url, 'http://127.0.0.1').pathname
    if (await handleAuth(request, response, path)) return
    if (handlePricing && (await handlePricing(request, response, path))) return
    if (request.method === 'POST' && path === '/pg/chat/completions') {
      let raw = ''
      for await (const part of request) {
        raw += part
        if (raw.length > 1048576) {
          response.writeHead(413).end()
          return
        }
      }
      let body
      try {
        body = JSON.parse(raw)
      } catch {
        response.writeHead(400).end()
        return
      }
      const answer = previewAnswer()
      if (!body.stream) {
        response.setHeader('Content-Type', 'application/json')
        response.end(
          JSON.stringify({
            id: 'preview',
            object: 'chat.completion',
            model: body.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: answer },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          })
        )
        return
      }
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
      })
      const parts = answer.match(/.{1,12}/gs) ?? []
      const timer = setInterval(() => {
        const content = parts.shift()
        if (content === undefined) {
          clearInterval(timer)
          response.end('data: [DONE]\n\n')
          return
        }
        response.write(
          `data: ${JSON.stringify({ id: 'preview', object: 'chat.completion.chunk', model: body.model, choices: [{ index: 0, delta: { content }, finish_reason: null }] })}\n\n`
        )
      }, 50)
      response.on('close', () => clearInterval(timer))
      return
    }
    const data = previewResponse(request.method, path)
    response.setHeader('Content-Type', 'application/json')
    if (data === null) {
      response.writeHead(400).end(
        JSON.stringify({
          success: false,
          message:
            'This action is unavailable in the local frontend preview. No changes were made.',
        })
      )
      return
    }
    response.end(JSON.stringify(data))
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = createPreviewServer({
    customerPricing: process.env.LLM_PREVIEW_CUSTOMER_PRICING === '1',
  })
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    const child = spawn(
      process.execPath,
      ['run', 'dev', '--host', '127.0.0.1', '--port', '3210'],
      {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        stdio: 'inherit',
        env: {
          ...process.env,
          CHOKIDAR_USEPOLLING: 'true',
          WATCHPACK_POLLING: '1000',
          VITE_LLM_PREVIEW: '1',
          VITE_REACT_APP_SERVER_URL: `http://127.0.0.1:${address.port}`,
        },
      }
    )
    console.log(
      'Local frontend preview: sample data, simulated replies, no production connection.'
    )
    const stop = () => {
      child.kill('SIGTERM')
      server.closeAllConnections()
      server.close()
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    child.once('error', (error) => {
      console.error(error)
      stop()
      process.exitCode = 1
    })
    child.once('exit', (code) => {
      server.closeAllConnections()
      server.close()
      process.exitCode = code ?? 0
    })
  })
}
