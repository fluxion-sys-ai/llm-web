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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useCallback, useState, type ReactNode } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import type { PricingData } from '@/features/pricing/types'
import { api } from '@/lib/api'

import { DEFAULT_CONFIG } from '../../constants'
import { getInputControlState } from '../../lib'
import type { GroupOption, ModelOption, PlaygroundConfig } from '../../types'
import { usePlaygroundOptions } from '../use-playground-options'

const pricing: PricingData = {
  success: true,
  data: ['GLM-5.3', 'DeepSeek-V4.1-Flash', 'catalog-only'].map(
    (model_name, index) => ({
      id: index + 1,
      model_name,
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['default'],
      supported_endpoint_types: ['openai'],
      output_modalities: ['text'],
    })
  ),
  vendors: [],
  group_ratio: { default: 1 },
  usable_group: {},
  supported_endpoint: {},
  auto_groups: [],
}
const groupOptions: GroupOption[] = ['default', 'vip', 'empty'].map(
  (value) => ({
    label: value,
    value,
    ratio: 1,
    desc: '',
  })
)
let client: QueryClient
let modelsByGroup: Record<string, string[]>

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  })
  client.setQueryData(['status'], {})
  client.setQueryData(['pricing'], pricing)
  client.setQueryData(['playground-groups'], groupOptions)
  modelsByGroup = {
    default: [
      'Wan-3.0',
      'GLM-5.3',
      'DeepSeek-V4.1-Flash',
      'glm-5.3',
      'Kimi-K3',
    ],
    vip: ['DeepSeek-V4.1-Flash'],
    empty: ['Wan-3.0'],
  }
  vi.spyOn(api, 'get').mockImplementation(async (path, options) => {
    if (path === '/api/user/models') {
      const group = String(options?.params?.group)
      return { data: { success: true, data: modelsByGroup[group] ?? [] } }
    }
    if (path === '/api/pricing') return { data: pricing }
    throw new Error(`Unexpected request: ${path}`)
  })
})

afterEach(() => {
  cleanup()
  client.clear()
})

function renderOptions(model = 'GLM-5.3') {
  return renderHook(
    () => {
      const [models, setModels] = useState<ModelOption[]>([])
      const [groups, setGroups] = useState<GroupOption[]>([])
      const [config, setConfig] = useState({
        ...DEFAULT_CONFIG,
        group: 'default',
        model,
      })
      const updateConfig = useCallback(
        <K extends keyof PlaygroundConfig>(
          key: K,
          value: PlaygroundConfig[K]
        ) => {
          setConfig((current) => ({ ...current, [key]: value }))
        },
        []
      )
      const { isLoadingModels } = usePlaygroundOptions({
        currentGroup: config.group,
        currentModel: config.model,
        setModels,
        setGroups,
        updateConfig,
      })
      const controls = getInputControlState({
        groups,
        models,
        isModelLoading: isLoadingModels,
        hasStopHandler: false,
        text: 'Hello',
      })
      return {
        models,
        config,
        updateConfig,
        isLoadingModels,
        canSubmit: controls.canSubmit,
      }
    },
    {
      wrapper: (props: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          {props.children}
        </QueryClientProvider>
      ),
    }
  )
}

test('real user-model responses are intersected by exact ID with the LLM catalog', async () => {
  const { result } = renderOptions('Wan-3.0')
  await waitFor(() => expect(result.current.isLoadingModels).toBe(false))

  expect(api.get).toHaveBeenCalledWith('/api/user/models', {
    params: { group: 'default' },
  })
  expect(result.current.models.map((model) => model.value)).toEqual([
    'GLM-5.3',
    'DeepSeek-V4.1-Flash',
  ])
  expect(result.current.config.model).toBe('GLM-5.3')
  expect(result.current.canSubmit).toBe(true)
})

test('switching group falls back only to an allowed LLM and clears a group with no LLMs', async () => {
  const { result } = renderOptions()
  await waitFor(() => expect(result.current.canSubmit).toBe(true))
  act(() => result.current.updateConfig('group', 'vip'))
  await waitFor(() =>
    expect(result.current.config.model).toBe('DeepSeek-V4.1-Flash')
  )
  expect(result.current.models.map((model) => model.value)).toEqual([
    'DeepSeek-V4.1-Flash',
  ])

  act(() => result.current.updateConfig('group', 'empty'))
  await waitFor(() => expect(result.current.config.model).toBe(''))
  expect(result.current.models).toEqual([])
  expect(result.current.canSubmit).toBe(false)
})

test('Flash is independently selectable beside GLM and preserves its complete request model ID', async () => {
  client.setQueryData(['pricing'], {
    ...pricing,
    data: [
      ...pricing.data,
      { ...pricing.data[0], id: 53, model_name: 'GLM-5.3-Flash' },
    ],
  })
  modelsByGroup.default.push('GLM-5.3-Flash')
  const { result } = renderOptions('GLM-5.3-Flash')
  await waitFor(() => expect(result.current.canSubmit).toBe(true))

  expect(result.current.models.map((model) => model.value)).toContain('GLM-5.3')
  expect(result.current.models.map((model) => model.value)).toContain(
    'GLM-5.3-Flash'
  )
  expect(result.current.config.model).toBe('GLM-5.3-Flash')
})

test('a visible Flash fallback without a backend route cannot grant Playground access', async () => {
  modelsByGroup.default = ['GLM-5.3-Flash']
  const { result } = renderOptions('GLM-5.3-Flash')
  await waitFor(() => expect(result.current.isLoadingModels).toBe(false))

  expect(result.current.models).toEqual([])
  expect(result.current.config.model).toBe('')
  expect(result.current.canSubmit).toBe(false)
})

test('pending catalog loading hides unverified options and prevents submission until it resolves', async () => {
  client.removeQueries({ queryKey: ['pricing'] })
  let resolvePricing!: (response: { data: PricingData }) => void
  const response = new Promise<{ data: PricingData }>((resolve) => {
    resolvePricing = resolve
  })
  vi.mocked(api.get).mockImplementation((path) => {
    if (path === '/api/pricing') return response
    return Promise.resolve({
      data: { success: true, data: modelsByGroup.default },
    })
  })
  const { result } = renderOptions()
  await waitFor(() =>
    expect(client.getQueryState(['playground-models', 'default'])?.status).toBe(
      'success'
    )
  )

  expect(result.current.isLoadingModels).toBe(true)
  expect(result.current.models).toEqual([])
  expect(result.current.canSubmit).toBe(false)
  expect(result.current.config.model).toBe('GLM-5.3')

  await act(async () => resolvePricing({ data: pricing }))
  await waitFor(() => expect(result.current.canSubmit).toBe(true))
  expect(result.current.config.model).toBe('GLM-5.3')
})

test.each(['catalog', 'group models'])(
  'a failed %s refresh clears previously selectable models instead of using stale permissions',
  async (source) => {
    const { result } = renderOptions()
    await waitFor(() => expect(result.current.canSubmit).toBe(true))
    vi.mocked(api.get).mockRejectedValue(new Error('Options unavailable'))
    const queryKey =
      source === 'catalog' ? ['pricing'] : ['playground-models', 'default']
    await act(async () => {
      await client.invalidateQueries({ queryKey })
    })

    await waitFor(() => expect(result.current.models).toEqual([]))
    expect(result.current.config.model).toBe('')
    expect(result.current.canSubmit).toBe(false)
    expect(result.current.isLoadingModels).toBe(false)
  }
)

test('announcements from an empty catalog do not make group-only models selectable', async () => {
  client.setQueryData(['pricing'], { ...pricing, data: [] })
  const { result } = renderOptions()
  await waitFor(() => expect(result.current.isLoadingModels).toBe(false))

  expect(result.current.models).toEqual([])
  expect(result.current.config.model).toBe('')
  expect(result.current.canSubmit).toBe(false)
})

test('coming-soon catalog models remain unselectable even when user models mistakenly include their IDs', async () => {
  client.setQueryData(['pricing'], {
    ...pricing,
    data: pricing.data.map((model) => ({
      ...model,
      availability: 'coming_soon',
    })),
  })
  const { result } = renderOptions()
  await waitFor(() => expect(result.current.isLoadingModels).toBe(false))

  expect(result.current.models).toEqual([])
  expect(result.current.config.model).toBe('')
  expect(result.current.canSubmit).toBe(false)
})

test('cached model options settle when wall time advances during rendering', () => {
  client.setQueryData(
    ['playground-models', 'default'],
    [
      { label: 'GLM-5.3', value: 'GLM-5.3' },
      { label: 'DeepSeek-V4.1-Flash', value: 'DeepSeek-V4.1-Flash' },
    ]
  )
  const start = Date.now()
  let clockReads = 0
  vi.spyOn(Date, 'now').mockImplementation(() => {
    // Model renders that cross millisecond boundaries. The guard fails fast
    // instead of letting a regressed state/effect cycle hang the CI worker.
    clockReads += 1
    if (clockReads > 1000) {
      throw new Error('Model selection did not settle after 1000 clock reads')
    }
    return start + clockReads
  })

  const { result } = renderOptions()

  expect(result.current.canSubmit).toBe(true)
  expect(result.current.models.map((model) => model.value)).toEqual([
    'GLM-5.3',
    'DeepSeek-V4.1-Flash',
  ])
  expect(api.get).not.toHaveBeenCalled()
})
