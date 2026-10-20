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
import { useEffect, useMemo, useState } from 'react'

import type { Promotion } from '../types'

export function usePromotionClock(
  promotions: Promotion[],
  refreshedAt = 0
): number {
  const [lastTick, setLastTick] = useState(() => Date.now() / 1000)
  // Only resample on a timer tick or new benefits. A fresh timestamp on every
  // render invalidates catalog memoization and can cycle stateful consumers.
  const snapshot = useMemo(
    () => ({ promotions, lastTick, refreshedAt, now: Date.now() / 1000 }),
    [promotions, lastTick, refreshedAt]
  )
  useEffect(() => {
    const current = Date.now() / 1000
    const next = promotions
      .flatMap((p) => [p.starts_at, p.expires_at, p.redeem_before])
      .filter((time) => time > current)
      .sort((a, b) => a - b)[0]
    const timeout = window.setTimeout(
      () => setLastTick(Date.now() / 1000),
      Math.min(next ? (next - current) * 1000 + 25 : 60_000, 60_000)
    )
    return () => window.clearTimeout(timeout)
  }, [lastTick, promotions])
  return snapshot.now
}
