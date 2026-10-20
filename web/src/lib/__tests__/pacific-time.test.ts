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
import { describe, expect, it } from 'vitest'

import { formatTimestampToDate } from '../format'
import { computeTimeRange, getEndOfDay, getStartOfDay } from '../time'
import { parsePacificDateTime } from '../timezone'

describe('Pacific timestamps', () => {
  it('shows summer timestamps in PDT regardless of browser timezone', () => {
    const timestamp = Date.parse('2026-10-19T02:03:04Z') / 1000
    expect(formatTimestampToDate(timestamp)).toBe('2026-10-18 19:03:04 PDT')
  })

  it('shows winter timestamps in PST and preserves milliseconds input', () => {
    expect(
      formatTimestampToDate(Date.parse('2026-12-19T02:03:04Z'), 'milliseconds')
    ).toBe('2026-12-18 18:03:04 PST')
  })

  it('keeps missing and never timestamps as placeholders', () => {
    expect(formatTimestampToDate()).toBe('-')
    expect(formatTimestampToDate(-1)).toBe('-')
  })
})

describe('Pacific calendar bounds', () => {
  it('selects the full 23-hour spring-forward day', () => {
    const date = new Date('2026-03-08T18:00:00Z')
    expect(getStartOfDay(date).toISOString()).toBe('2026-03-08T08:00:00.000Z')
    expect(getEndOfDay(date).toISOString()).toBe('2026-03-09T06:59:59.999Z')
  })

  it('selects the full 25-hour fall-back day', () => {
    const date = new Date('2026-11-01T18:00:00Z')
    expect(getStartOfDay(date).toISOString()).toBe('2026-11-01T07:00:00.000Z')
    expect(getEndOfDay(date).toISOString()).toBe('2026-11-02T07:59:59.999Z')
  })

  it('normalizes API filter days without assuming 24 hours at DST transitions', () => {
    const date = new Date('2026-03-08T18:00:00Z')
    expect(computeTimeRange(1, date, date, true)).toEqual({
      start_timestamp: Date.parse('2026-03-08T08:00:00Z') / 1000,
      end_timestamp: Date.parse('2026-03-09T06:59:59Z') / 1000,
    })
  })
})

describe('Pacific wall time parsing', () => {
  it('resolves new repeated fall-back input to the first occurrence consistently', () => {
    expect(parsePacificDateTime('2026-11-01T01:30')?.toISOString()).toBe(
      '2026-11-01T08:30:00.000Z'
    )
  })

  it.each(['2026-03-08T02:30', '2026-02-30T12:00', '2026-10-18T25:00'])(
    'rejects invalid Pacific wall time %s',
    (value) => {
      expect(parsePacificDateTime(value)).toBeUndefined()
    }
  )
})
