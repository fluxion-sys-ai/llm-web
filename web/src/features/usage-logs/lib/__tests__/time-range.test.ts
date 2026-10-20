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
import { afterEach, expect, it, vi } from 'vitest'

import { buildApiParams, buildBaseParams, getDefaultTimeRange } from '../utils'

afterEach(() => vi.useRealTimers())

it('defaults to Pacific midnight and preserves the existing one-hour end buffer', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-19T06:37:00Z'))
  expect(getDefaultTimeRange()).toEqual({
    start: new Date('2026-10-18T07:00:00Z'),
    end: new Date('2026-10-19T07:37:00Z'),
  })
})

it('keeps selected instants unchanged when serializing request parameters', () => {
  const startTime = Date.parse('2026-11-01T08:30:00Z')
  const endTime = Date.parse('2026-11-01T09:30:00Z')
  const config = { page: 1, pageSize: 20, searchParams: { startTime, endTime } }
  expect(buildApiParams({ ...config, isAdmin: false })).toMatchObject({
    start_timestamp: startTime / 1000,
    end_timestamp: endTime / 1000,
  })
  expect(buildBaseParams({ ...config, useMilliseconds: true })).toMatchObject({
    start_timestamp: startTime,
    end_timestamp: endTime,
  })
})
