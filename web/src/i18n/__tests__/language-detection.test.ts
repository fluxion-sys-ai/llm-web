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
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

async function loadInterfaceLanguage(): Promise<string> {
  // test-setup initialises the shared i18next instance with `lng: 'en'`, which
  // would override detection when the app config re-initialises it.
  const { default: i18next } = await import('i18next')
  i18next.options.lng = undefined
  const { default: i18n } = await import('../config')
  await vi.waitFor(() => expect(i18n.isInitialized).toBe(true))
  return i18n.language
}

it('a first visit from a Chinese browser shows English', async () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN', 'zh'])
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('zh-CN')

  expect(await loadInterfaceLanguage()).toBe('en')
})

it('a language auto-detected by an earlier build under the old storage key is ignored', async () => {
  localStorage.setItem('i18nextLng', 'zhCN')

  expect(await loadInterfaceLanguage()).toBe('en')
})

it('a visitor who chose Simplified Chinese sees Chinese on the next visit', async () => {
  localStorage.setItem('fluxion-language', 'zhCN')

  expect(await loadInterfaceLanguage()).toBe('zhCN')
})

it('a stored language that is no longer offered falls back to English', async () => {
  localStorage.setItem('fluxion-language', 'fr')

  expect(await loadInterfaceLanguage()).toBe('en')
})
