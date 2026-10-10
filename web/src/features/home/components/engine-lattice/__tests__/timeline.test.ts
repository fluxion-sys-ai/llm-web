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
import { expect, test } from 'vitest'

import {
  cellStart,
  getEnginePattern,
  getLatticeFrame,
  LATTICE_BUILD_SECONDS,
  LATTICE_CHIPS,
  LATTICE_CYCLE_SECONDS,
  LATTICE_MODELS,
  LATTICE_STATIC_SECONDS,
} from '../timeline'

const CELL_COUNT = LATTICE_MODELS.length * LATTICE_CHIPS.length

test('a cell starts building only after the cells above and to its left', () => {
  for (let row = 1; row < LATTICE_MODELS.length; row++) {
    for (let col = 1; col < LATTICE_CHIPS.length; col++) {
      expect(cellStart(row, col)).toBeGreaterThan(cellStart(row - 1, col))
      expect(cellStart(row, col)).toBeGreaterThan(cellStart(row, col - 1))
    }
  }
})

test('a cycle opens with the first pair building and every other cell idle', () => {
  const frame = getLatticeFrame(0)

  expect(frame.stage).toBe('building')
  expect(frame.active).toEqual({ row: 0, col: 0, state: 'building' })
  expect(frame.cells.filter((cell) => cell.state === 'idle')).toHaveLength(
    CELL_COUNT - 1
  )
})

test('the active pair is the most recently started cell while the wave crosses the grid', () => {
  const frame = getLatticeFrame(cellStart(2, 3) + 0.02)

  expect(frame.active).toEqual({ row: 2, col: 3, state: 'building' })
  expect(frame.cells[0].state).toBe('ready')
  expect(frame.cells[CELL_COUNT - 1].state).toBe('idle')
})

test('once the last cell finishes, every engine is ready and the stage settles', () => {
  const frame = getLatticeFrame(LATTICE_BUILD_SECONDS + 0.01)

  expect(frame.stage).toBe('ready')
  expect(frame.active).toBeNull()
  expect(frame.cells.every((cell) => cell.state === 'ready')).toBe(true)
})

test('the reduced-motion frame shows the finished lattice', () => {
  const frame = getLatticeFrame(LATTICE_STATIC_SECONDS)

  expect(frame.stage).toBe('ready')
  expect(frame.cells.every((cell) => cell.state === 'ready')).toBe(true)
})

test('the lattice clears before the next cycle and restarts from the first pair', () => {
  const clearing = getLatticeFrame(LATTICE_CYCLE_SECONDS - 0.3)
  expect(clearing.stage).toBe('ready')
  expect(clearing.cells.every((cell) => cell.state === 'idle')).toBe(true)

  const restarted = getLatticeFrame(LATTICE_CYCLE_SECONDS + 0.05)
  expect(restarted.stage).toBe('building')
  expect(restarted.active).toEqual({ row: 0, col: 0, state: 'building' })
})

test('every model–chip pair gets a distinct, stable engine pattern', () => {
  const seen = new Set<string>()
  for (let row = 0; row < LATTICE_MODELS.length; row++) {
    for (let col = 0; col < LATTICE_CHIPS.length; col++) {
      const pattern = getEnginePattern(row, col)
      const signature = pattern.map((tile) => Number(tile.on)).join('')
      expect(pattern).toHaveLength(9)
      expect(pattern).toEqual(getEnginePattern(row, col))
      expect(pattern.some((tile) => tile.on)).toBe(true)
      expect(pattern.every((tile) => tile.on || !tile.accent)).toBe(true)
      seen.add(signature)
    }
  }
  expect(seen.size).toBe(CELL_COUNT)
})
