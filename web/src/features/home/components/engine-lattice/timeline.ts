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
export const LATTICE_MODELS = [
  'GLM 5.3',
  'GLM 5.3 Flash',
  'DeepSeek V4.1 Flash',
  'Qwen 3.8 Flash',
  'Kimi K3',
] as const
export const LATTICE_CHIPS = [
  'A100 PCIe',
  'A100',
  'H100',
  'H200',
  'B200',
  'B300',
] as const

// The wave builds one engine per model–chip pair, holds the finished lattice,
// then clears it before the next pass. Pairings are illustrative, not live
// availability.
export const LATTICE_CYCLE_SECONDS = 8.4
export const LATTICE_STATIC_SECONDS = 5
const BAND_SECONDS = 0.26
const COLUMN_LEAD_SECONDS = 0.05
const BUILD_SECONDS = 0.42
const CLEAR_START = 7.6

export type LatticeCellState = 'idle' | 'building' | 'ready'
type LatticeStage = 'building' | 'ready'

type LatticeCell = {
  row: number
  col: number
  state: LatticeCellState
}

export function cellStart(row: number, col: number): number {
  return (row + col) * BAND_SECONDS + col * COLUMN_LEAD_SECONDS
}

export const LATTICE_BUILD_SECONDS =
  cellStart(LATTICE_MODELS.length - 1, LATTICE_CHIPS.length - 1) +
  BUILD_SECONDS

export function getLatticeFrame(elapsed: number) {
  const time = elapsed % LATTICE_CYCLE_SECONDS
  const clearing = time >= CLEAR_START
  const cells: LatticeCell[] = []
  let active: LatticeCell | null = null
  for (let row = 0; row < LATTICE_MODELS.length; row++) {
    for (let col = 0; col < LATTICE_CHIPS.length; col++) {
      const start = cellStart(row, col)
      let state: LatticeCellState = 'ready'
      if (clearing || time < start) state = 'idle'
      else if (time < start + BUILD_SECONDS) state = 'building'
      const cell = { row, col, state }
      cells.push(cell)
      if (state === 'building' && (!active || start > cellStart(active.row, active.col))) {
        active = cell
      }
    }
  }
  const stage: LatticeStage = time < LATTICE_BUILD_SECONDS ? 'building' : 'ready'
  return { cells, stage, active }
}

export type EngineTile = { id: string; on: boolean; accent: boolean }

// The first five tiles encode the pair index so every engine looks different;
// the rest are hashed to avoid a binary-counter look.
export function getEnginePattern(row: number, col: number): EngineTile[] {
  const id = row * LATTICE_CHIPS.length + col + 1
  return Array.from({ length: 9 }, (_, index) => {
    const on =
      index < 5
        ? Boolean((id >> index) & 1)
        : ((id + 5) * (index * 11 + 3) + index * index) % 7 < 4
    return {
      id: `tile-${index}`,
      on,
      accent: on && (id + index) % 5 === 0,
    }
  })
}
