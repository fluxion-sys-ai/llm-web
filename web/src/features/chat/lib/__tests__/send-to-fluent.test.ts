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

import { sendToFluent } from '../send-to-fluent'

afterEach(() => {
  document.querySelector('#fluent-new-api-container')?.remove()
})

test('the Fluent import sends the Fluxion domain instead of the current page origin', () => {
  const container = document.createElement('div')
  container.id = 'fluent-new-api-container'
  document.body.appendChild(container)
  const listener = vi.fn()
  container.addEventListener('fluent:prefill', listener)

  expect(sendToFluent('demo-key')).toBe(true)

  expect(listener).toHaveBeenCalledOnce()
  const event = listener.mock.calls[0][0] as CustomEvent
  expect(event.detail.baseUrl).toBe('https://api.fluxion-sys.ai')
})
