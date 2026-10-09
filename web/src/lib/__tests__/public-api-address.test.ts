/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '../http-client'
import { getPublicApiServerAddress } from '../public-api-address'

afterEach(() => vi.unstubAllEnvs())

const oldAddress = 'https://video.example.com'

test.each([
  ['https://llm.fluxion-sys.ai/v1', 'https://llm.fluxion-sys.ai'],
  [' https://llm.fluxion-sys.ai/v1/ ', 'https://llm.fluxion-sys.ai'],
  ['https://llm.fluxion-sys.ai/', 'https://llm.fluxion-sys.ai'],
  ['https://example.com/gateway/v1/', 'https://example.com/gateway'],
  ['http://localhost:3211/v1', 'http://localhost:3211'],
])(
  'a valid configured base %s takes priority and resolves to gateway root %s',
  (input, expected) => {
    expect(getPublicApiServerAddress(oldAddress, input)).toBe(expected)
  }
)

test.each([
  '',
  '  ',
  null,
  123,
  '/v1',
  '//example.com/v1',
  'not a URL',
  'javascript:alert(1)',
  'ftp://example.com/v1',
  'https://user:secret@example.com/v1',
  'https://example.com/v1?key=secret',
  'https://example.com/v1#fragment',
  'https://example.com/v1/chat/completions',
])(
  'a missing or invalid configured base %s preserves the existing fallback',
  (input) => {
    expect(getPublicApiServerAddress(oldAddress, input)).toBe(oldAddress)
  }
)

test('the build-time setting overrides display addresses without changing the management API client', () => {
  vi.stubEnv('VITE_LLM_API_BASE_URL', 'https://llm.fluxion-sys.ai/v1')
  expect(getPublicApiServerAddress(oldAddress)).toBe(
    'https://llm.fluxion-sys.ai'
  )
  expect(api.defaults.baseURL).toBe('')
  expect(api.defaults.withCredentials).toBe(true)
})

test('an unconfigured build preserves a previously configured full endpoint', () => {
  vi.stubEnv('VITE_LLM_API_BASE_URL', '')
  const endpoint = `${oldAddress}/v1/chat/completions`
  expect(getPublicApiServerAddress(endpoint)).toBe(endpoint)
})
