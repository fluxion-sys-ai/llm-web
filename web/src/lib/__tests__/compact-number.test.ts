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
import i18next from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatCompactNumber } from '../format'

const NativeNumberFormat = Intl.NumberFormat

beforeEach(async () => {
  i18next.addResourceBundle('zhCN', 'translation', {
    'API Requests': 'API 请求',
  })
  await i18next.changeLanguage('en')
})

afterEach(async () => {
  await i18next.changeLanguage('en')
  i18next.removeResourceBundle('zhCN', 'translation')
  vi.restoreAllMocks()
})

describe('compact number locale', () => {
  it('uses English compact units for an English interface on a Chinese browser', () => {
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(
      function (locales, options) {
        return new NativeNumberFormat(locales ?? 'zh-CN', options)
      }
    )

    expect(formatCompactNumber(12000)).toBe('12K')
    expect(formatCompactNumber(1200000)).toBe('1.2M')
  })

  it('uses Chinese compact units after the interface language changes to zhCN', async () => {
    await i18next.changeLanguage('zhCN')

    expect(formatCompactNumber(12000)).toBe('1.2万')
  })

  it('preserves an explicit locale when it differs from the interface language', async () => {
    await i18next.changeLanguage('zhCN')

    expect(formatCompactNumber(12000, 'en-US')).toBe('12K')
  })
})
