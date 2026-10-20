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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { useCustomerBenefits } from '../hooks/use-customer-benefits'
import type { CustomerBenefits } from '../types'

let client: QueryClient

type BenefitsResponse = { data: { success: boolean; data: CustomerBenefits } }

function pendingBenefits(): {
  promise: Promise<BenefitsResponse>
  resolve: (response: BenefitsResponse) => void
} {
  let resolve!: (response: BenefitsResponse) => void
  const promise = new Promise<BenefitsResponse>((resolveResponse) => {
    resolve = resolveResponse
  })
  return { promise, resolve }
}

function benefits(userId: number): CustomerBenefits {
  return {
    user_id: userId,
    promotion_codes_enabled: true,
    model_prices: [{ model_name: 'test-model', multiplier: 0.7 }],
    promotions: [],
  }
}

function signIn(userId: number): void {
  useAuthStore.getState().auth.setUser({
    id: userId,
    username: `customer-${userId}`,
    role: 1,
  })
}

function Wrapper(props: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
  )
}

beforeEach(() => {
  client = new QueryClient()
  useAuthStore.getState().auth.reset()
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().auth.reset()
  vi.useRealTimers()
})

test('guest browsing does not request private benefits and signing in loads that account', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: benefits(42) },
  })
  const { result } = renderHook(() => useCustomerBenefits(), {
    wrapper: Wrapper,
  })
  expect(result.current.data).toBeUndefined()
  expect(result.current.fetchStatus).toBe('idle')
  expect(get).not.toHaveBeenCalled()

  act(() => signIn(42))

  await waitFor(() => expect(result.current.data?.user_id).toBe(42))
  expect(get).toHaveBeenCalledWith('/api/user/self/promotions')
})

test('disabled consumers defer private benefits until personalization is enabled', async () => {
  signIn(42)
  const get = vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: benefits(42) },
  })
  const { result, rerender } = renderHook(
    (props: { enabled: boolean }) => useCustomerBenefits(props.enabled),
    { wrapper: Wrapper, initialProps: { enabled: false } }
  )
  expect(result.current.data).toBeUndefined()
  expect(get).not.toHaveBeenCalled()

  rerender({ enabled: true })

  await waitFor(() =>
    expect(result.current.data?.model_prices).toEqual(benefits(42).model_prices)
  )
})

test('a late response for the previous account never becomes the current account benefits', async () => {
  signIn(42)
  const first = pendingBenefits()
  const second = pendingBenefits()
  const get = vi
    .spyOn(api, 'get')
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const { result } = renderHook(() => useCustomerBenefits(), {
    wrapper: Wrapper,
  })
  await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

  act(() => signIn(43))
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  await act(async () => {
    first.resolve({ data: { success: true, data: benefits(42) } })
    await first.promise
  })
  expect(result.current.data).toBeUndefined()

  await act(async () => {
    second.resolve({ data: { success: true, data: benefits(43) } })
    await second.promise
  })
  await waitFor(() => expect(result.current.data?.user_id).toBe(43))
})

test('a mismatched response is withheld even when the request succeeds', async () => {
  signIn(42)
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: benefits(43) },
  })
  const { result } = renderHook(() => useCustomerBenefits(), {
    wrapper: Wrapper,
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))

  expect(result.current.data).toBeUndefined()
})

test('logging out immediately removes cached personal benefits and stops fetching', async () => {
  signIn(42)
  const get = vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: benefits(42) },
  })
  const { result } = renderHook(() => useCustomerBenefits(), {
    wrapper: Wrapper,
  })
  await waitFor(() => expect(result.current.data?.user_id).toBe(42))

  act(() => useAuthStore.getState().auth.reset())

  expect(result.current.data).toBeUndefined()
  expect(result.current.fetchStatus).toBe('idle')
  expect(get).toHaveBeenCalledTimes(1)
})

test('a failed benefits request exposes an error without automatic retries or invented benefits', async () => {
  vi.useFakeTimers()
  signIn(42)
  const get = vi
    .spyOn(api, 'get')
    .mockRejectedValue(new Error('Benefits unavailable'))
  const { result } = renderHook(() => useCustomerBenefits(), {
    wrapper: Wrapper,
  })

  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000)
  })

  expect(result.current.isError).toBe(true)
  expect(result.current.error?.message).toBe('Benefits unavailable')
  expect(result.current.data).toBeUndefined()
  expect(get).toHaveBeenCalledTimes(1)
})

test('an open view refreshes benefits after thirty seconds', async () => {
  vi.useFakeTimers()
  signIn(42)
  client.setQueryData(['customer-benefits', 42], benefits(42))
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: { ...benefits(42), model_prices: [] },
    },
  })
  const { result } = renderHook(() => useCustomerBenefits(), {
    wrapper: Wrapper,
  })
  expect(result.current.data?.model_prices).toHaveLength(1)

  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_001)
  })

  expect(result.current.data?.model_prices).toEqual([])
  expect(result.current.now).toBeCloseTo(Date.now() / 1000, 1)
})
