import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Keep the existing frontend-only preview on 3210. Real accounts and usage
// belong to this explicit, loopback-only development mode on a separate origin.
const child = spawn(process.execPath, ['run', 'dev'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  stdio: 'inherit',
  env: {
    ...process.env,
    LLM_BACKEND_DEV: '1',
    LLM_BACKEND_URL:
      process.env.LLM_BACKEND_URL ||
      `http://127.0.0.1:${process.env.LLM_LOCAL_API_PORT || '3310'}`,
    LLM_FRONTEND_PORT: process.env.LLM_FRONTEND_PORT || '3211',
    VITE_LLM_PREVIEW: '',
    CHOKIDAR_USEPOLLING: 'true',
    WATCHPACK_POLLING: '1000',
  },
})
console.log(
  'Live backend development: use a test account. Changes and model usage are real. Start api-gateway/deploy/llm-tunnel.sh first.'
)
process.once('SIGINT', () => child.kill('SIGINT'))
process.once('SIGTERM', () => child.kill('SIGTERM'))
child.once('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.once('exit', (code) => {
  process.exitCode = code ?? 1
})
