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
export const ENGINE_GPUS = [
  'NVIDIA H200',
  'NVIDIA H100',
  'NVIDIA B200',
  'NVIDIA B300',
  'A100 80GB',
  'A100 PCIe 80GB',
] as const
export const ENGINE_MODELS = [
  'GLM 5.3',
  'GLM 5.3 Flash',
  'DeepSeek V4.1 Flash',
  'Qwen 3.8 Flash',
  'Kimi K3',
] as const

// These are illustrative pairings from the approved animation, not live availability.
const PAIRS = [
  [0, 0],
  [2, 0],
  [2, 2],
  [1, 3],
  [3, 4],
  [4, 1],
  [5, 2],
] as const
export type EnginePair = (typeof PAIRS)[number]
export type EngineStage = 'gpu' | 'llm' | 'locked' | 'merging' | 'ready'
export const ENGINE_CYCLE_SECONDS = 10.2
export const ENGINE_STATIC_SECONDS = 6.3
const GPU_END = 2.2
const LLM_START = 0.3
const LLM_END = 3.7
const MERGE_START = 4.15
const MERGE_DURATION = 1.55

export function wrapIndex(value: number, length: number): number {
  return ((value % length) + length) % length
}

function reelPosition(
  start: number,
  target: number,
  length: number,
  progress: number
): number {
  const advance = length + wrapIndex(target - start, length)
  const bounded = Math.max(0, Math.min(progress, 1))
  return start + advance * (1 - (1 - bounded) ** 2)
}

export function getEngineFrame(elapsed: number) {
  const cycle = Math.floor(elapsed / ENGINE_CYCLE_SECONDS)
  const time = elapsed % ENGINE_CYCLE_SECONDS
  const index = cycle % PAIRS.length
  const pair = PAIRS[index]
  const previous = PAIRS[wrapIndex(index - 1, PAIRS.length)]
  let stage: EngineStage = 'ready'
  if (time < GPU_END) stage = 'gpu'
  else if (time < LLM_END) stage = 'llm'
  else if (time < MERGE_START) stage = 'locked'
  else if (time < MERGE_START + MERGE_DURATION) stage = 'merging'

  const progress = (time - MERGE_START) / MERGE_DURATION
  let inputsProgress: number | null = null
  let outputProgress: number | null = null
  let glow = 0
  let pulse = 0
  if (progress >= 0 && progress < 0.53) {
    inputsProgress = progress / 0.53
  } else if (progress >= 0.53 && progress < 0.84) {
    outputProgress = (progress - 0.53) / 0.31
    glow = Math.max(0, 0.3 * (1 - outputProgress))
  } else if (progress >= 0.84 && progress < 1) {
    pulse = Math.sin(((progress - 0.84) / 0.16) * Math.PI)
  }

  return {
    pair,
    stage,
    gpuPosition: reelPosition(
      previous[0],
      pair[0],
      ENGINE_GPUS.length,
      time / GPU_END
    ),
    llmPosition: reelPosition(
      previous[1],
      pair[1],
      ENGINE_MODELS.length,
      (time - LLM_START) / (LLM_END - LLM_START)
    ),
    gpuLocked: time >= GPU_END,
    llmLocked: time >= LLM_END,
    ready: progress >= 0.84,
    inputsProgress,
    outputProgress,
    glow,
    flash: pulse * 0.85,
    scale: 1 + pulse * 0.045,
  }
}

export type EngineFrame = ReturnType<typeof getEngineFrame>

export function getEnginePattern(pair: EnginePair) {
  const id = pair[0] * ENGINE_MODELS.length + pair[1]
  return Array.from({ length: 16 }, (_, index) => {
    const on =
      index < 5
        ? Boolean(((id + 1) >> index) & 1)
        : ((id + 11) * (index * 13 + 7) + index * index) % 11 < 6
    return {
      id: `tile-${index}`,
      on,
      dark: on && (index + id) % 4 === 0,
      offset: on ? -1 - ((id + index) % 2) : 0,
    }
  })
}
