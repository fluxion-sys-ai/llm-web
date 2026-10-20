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
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { usePromotionClock } from '../hooks/use-promotion-clock'
import { getPromotionStatus } from '../lib/promotion-status'
import type { Promotion } from '../types'

const promotion: Promotion = {
  id: 1,
  user_id: 42,
  name: 'Scheduled offer',
  multiplier: 0.7,
  duration_seconds: 3600,
  starts_at: 1,
  expires_at: 4_000_000_000,
  redeem_before: 0,
  created_at: 1,
  code_mask: '',
  status: 'active',
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test('a scheduled promotion advances the clock at its start and then its expiry without a refetch', async () => {
  const scheduled = {
    ...promotion,
    starts_at: Date.now() / 1000 + 2,
    expires_at: Date.now() / 1000 + 4,
  }
  const { result } = renderHook(() => usePromotionClock([scheduled]))
  expect(result.current).toBeLessThan(scheduled.starts_at)

  await act(async () => {
    await vi.advanceTimersByTimeAsync(2025)
  })
  expect(result.current).toBeGreaterThanOrEqual(scheduled.starts_at)
  expect(getPromotionStatus(scheduled, result.current)).toBe('active')

  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
  expect(getPromotionStatus(scheduled, result.current)).toBe('expired')
})

test('newly fetched promotions use the current time before the previous clock heartbeat', async () => {
  const expired = {
    ...promotion,
    expires_at: Date.now() / 1000 + 20,
  }
  const { result, rerender } = renderHook(
    (props: { promotions: Promotion[] }) => usePromotionClock(props.promotions),
    { initialProps: { promotions: [] as Promotion[] } }
  )

  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000)
  })
  rerender({ promotions: [expired] })

  expect(getPromotionStatus(expired, result.current)).toBe('expired')
})

test('an unredeemed promotion expires at its redemption deadline without a refetch', async () => {
  const available = {
    ...promotion,
    status: 'available' as const,
    starts_at: 0,
    expires_at: 0,
    redeem_before: Date.now() / 1000 + 2,
  }
  const { result } = renderHook(() => usePromotionClock([available]))
  expect(getPromotionStatus(available, result.current)).toBe('available')

  await act(async () => {
    await vi.advanceTimersByTimeAsync(2025)
  })

  expect(getPromotionStatus(available, result.current)).toBe('expired')
})
