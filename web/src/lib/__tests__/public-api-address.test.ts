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

afterEach(() => vi.unstubAllEnvs())

test('public API branding leaves authenticated management requests on the current origin', () => {
  vi.stubEnv('VITE_LLM_API_BASE_URL', 'http://192.0.2.20:3000/v1')
  expect(api.defaults.baseURL).toBe('')
  expect(api.defaults.withCredentials).toBe(true)
})
