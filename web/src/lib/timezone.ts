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
import type { ConfigType, Dayjs } from 'dayjs'

import dayjs from '@/lib/dayjs'

export const PACIFIC_TIME_ZONE = 'America/Los_Angeles'

/** Convert an instant to Pacific time, using its historical PDT/PST offset. */
export function toPacificTime(value?: ConfigType): Dayjs {
  return dayjs(value).tz(PACIFIC_TIME_ZONE)
}

export function formatPacificTime(
  value: ConfigType,
  format = 'YYYY-MM-DD HH:mm:ss'
): string {
  return toPacificTime(value).format(format)
}

export function getPacificTimeZoneAbbreviation(value?: ConfigType): string {
  return toPacificTime(value).offsetName('short') ?? PACIFIC_TIME_ZONE
}

export function formatPacificTimeWithZone(
  value: ConfigType,
  format = 'YYYY-MM-DD HH:mm:ss'
): string {
  return `${formatPacificTime(value, format)} ${getPacificTimeZoneAbbreviation(value)}`
}

/**
 * Parse a datetime-local value as Pacific wall time, never browser-local time.
 * Invalid dates and the missing spring-forward hour are rejected. For the
 * repeated fall-back hour, preserve an unchanged input's existing instant;
 * otherwise use the first occurrence, consistently across seasons and clients.
 */
export function parsePacificDateTime(
  value: string,
  existingDate?: Date
): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined
  const wallTime = dayjs.utc(value)
  if (!wallTime.isValid() || wallTime.format('YYYY-MM-DDTHH:mm') !== value) {
    return undefined
  }
  if (
    existingDate &&
    formatPacificTime(existingDate, 'YYYY-MM-DDTHH:mm') === value
  ) {
    return new Date(existingDate)
  }

  // Adjacent dates provide the two real zone offsets around a DST transition.
  const offsets = new Set([
    toPacificTime(wallTime.subtract(1, 'day')).utcOffset(),
    toPacificTime(wallTime.add(1, 'day')).utcOffset(),
  ])
  const candidates = [...offsets]
    .map((offset) => new Date(wallTime.valueOf() - offset * 60_000))
    .filter((date) => formatPacificTime(date, 'YYYY-MM-DDTHH:mm') === value)
    .sort((left, right) => left.getTime() - right.getTime())
  return candidates[0]
}
