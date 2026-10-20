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
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { useAccountUsage } from '../use-account-usage'

let client: QueryClient
const initialUser = {
  id: 30,
  username: 'usage-test',
  role: 1,
  quota: 5000000,
  used_quota: 0,
  request_count: 0,
}
const refreshedUser = {
  ...initialUser,
  quota: 4000000,
  used_quota: 1000000,
  request_count: 12,
}

function wrapper(props: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  focusManager.setFocused(true)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  useAuthStore.getState().auth.reset()
  useAuthStore.getState().auth.setUser(initialUser)
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().auth.reset()
  focusManager.setFocused(undefined)
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
  })
}

it('refreshes visible account totals on entering the page and while usage continues', async () => {
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true, data: refreshedUser } })
  renderHook(() => useAccountUsage(), { wrapper })
  await flush()
  expect(useAuthStore.getState().auth.user).toMatchObject(refreshedUser)

  get.mockResolvedValue({
    data: {
      success: true,
      data: { ...refreshedUser, quota: 3500000, request_count: 15 },
    },
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000)
  })
  expect(useAuthStore.getState().auth.user).toMatchObject({
    quota: 3500000,
    request_count: 15,
  })
})

it('refreshes after returning from another tab even when global focus refresh is disabled', async () => {
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true, data: initialUser } })
  renderHook(() => useAccountUsage(), { wrapper })
  await flush()
  act(() => focusManager.setFocused(false))
  get.mockResolvedValue({ data: { success: true, data: refreshedUser } })
  act(() => focusManager.setFocused(true))
  await flush()
  expect(useAuthStore.getState().auth.user?.quota).toBe(refreshedUser.quota)
})

it('keeps the last balance when a refresh fails instead of displaying zero', async () => {
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true, data: refreshedUser } })
  renderHook(() => useAccountUsage(), { wrapper })
  await flush()
  get.mockRejectedValue(new Error('Temporary outage'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000)
  })
  expect(useAuthStore.getState().auth.user?.quota).toBe(refreshedUser.quota)
})

it('does not fetch account usage after signing out', async () => {
  useAuthStore.getState().auth.reset()
  const get = vi.spyOn(api, 'get')
  renderHook(() => useAccountUsage(), { wrapper })
  await flush()
  expect(get).not.toHaveBeenCalled()
})

it('ignores an old response when the user switches accounts', async () => {
  let finish!: (value: unknown) => void
  vi.spyOn(api, 'get').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  renderHook(() => useAccountUsage(), { wrapper })
  const finishPrevious = finish
  const nextUser = {
    ...initialUser,
    id: 31,
    username: 'second-user',
    quota: 2000000,
  }
  act(() => useAuthStore.getState().auth.setUser(nextUser))
  await act(async () => {
    finishPrevious({ data: { success: true, data: refreshedUser } })
  })
  expect(useAuthStore.getState().auth.user).toEqual(nextUser)
})
