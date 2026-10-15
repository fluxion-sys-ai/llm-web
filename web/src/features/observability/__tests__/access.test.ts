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
import { isRedirect } from '@tanstack/react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { requireObservabilityAdmin } from '../access'
import { getProtectedDashboardUrl } from '../api'

afterEach(() => useAuthStore.getState().auth.reset())

describe('Observability access', () => {
  it.each([undefined, 1])(
    'redirects a non-administrator with role %s to forbidden',
    (role) => {
      useAuthStore
        .getState()
        .auth.setUser(role ? { id: 1, username: 'customer', role } : null)
      try {
        requireObservabilityAdmin()
        expect.fail('The route must reject non-administrators')
      } catch (error) {
        expect(isRedirect(error)).toBe(true)
        if (isRedirect(error)) expect(error.options.to).toBe('/403')
      }
    }
  )

  it.each([10, 100])('allows administrator role %s', (role) => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'admin', role })
    expect(requireObservabilityAdmin).not.toThrow()
  })

  it('accepts the protected dashboard path', () => {
    expect(
      getProtectedDashboardUrl('/api/observability/grafana/d/fluxion-overview')
    ).toBe('/api/observability/grafana/d/fluxion-overview')
  })

  it.each([
    'https://example.com/api/observability/grafana/d/fluxion-overview',
    '//example.com/api/observability/grafana/d/fluxion-overview',
    '/api/observability/grafana/d/../../user/self',
    '/api/observability/grafana/d/%2e%2e',
    '/api/observability/grafana/d/fluxion-overview?token=secret',
    '/api/observability/grafana/d/fluxion-overview#token',
    '/api/observability/grafana/login',
    '/api/observability/grafana/d/fluxion-overview\\evil',
    undefined,
  ])('rejects an untrusted iframe destination %s', (url) => {
    expect(getProtectedDashboardUrl(url)).toBeNull()
  })
})
