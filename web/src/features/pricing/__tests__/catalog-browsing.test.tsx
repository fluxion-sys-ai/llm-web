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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { describe, expect, it, vi } from 'vitest'

import { ModelCard } from '../components/model-card'
import { PricingTable } from '../components/pricing-table'
import { FILTER_ALL, SORT_OPTIONS } from '../constants'
import { filterAndSortModels, filterBySearch, sortModels } from '../lib/filters'
import type { PricingModel } from '../types'

const glm: PricingModel = {
  id: 1,
  model_name: 'glm-5.3',
  display_name: 'GLM 5.3',
  vendor_name: 'Z.ai',
  description: 'A reasoning model for complex coding tasks.',
  quota_type: 0,
  model_ratio: 0,
  completion_ratio: 0,
  pricing_status: 'pending',
  featured: true,
  tags: 'Reasoning,Coding',
  enable_groups: ['default'],
  context_length: 1048576,
  max_output_tokens: 131072,
  input_modalities: ['text'],
  output_modalities: ['text'],
}
const flash: PricingModel = {
  ...glm,
  id: 2,
  model_name: 'glm-5.3-flash',
  display_name: 'GLM 5.3 Flash',
  tags: 'Reasoning,Vision',
  input_modalities: ['text', 'image', 'video'],
}
const qwen: PricingModel = {
  ...glm,
  id: 3,
  model_name: 'qwen3.8-flash',
  display_name: 'Qwen3.8 Flash',
  vendor_name: 'Alibaba Qwen',
  featured: false,
  context_length: 1000000,
}

describe('catalog browsing', () => {
  it('finds both GLM models from the compact user spelling GLM5.3', () => {
    expect(filterBySearch([glm, flash, qwen], ' GLM5.3 ')).toEqual([glm, flash])
    expect(filterBySearch([glm, flash, qwen], 'GLM 5.3 Flash')).toEqual([flash])
  })

  it('combines developer and capability filters and allows clearing an empty search result', () => {
    const filters = {
      search: '',
      vendor: 'Z.ai',
      group: FILTER_ALL,
      quotaType: FILTER_ALL,
      endpointType: FILTER_ALL,
      tag: 'vision',
      sortBy: SORT_OPTIONS.FEATURED,
    }
    expect(filterAndSortModels([glm, flash, qwen], filters)).toEqual([flash])
    expect(filterBySearch([glm, flash], 'not-a-real-model')).toEqual([])
    expect(filterBySearch([glm, flash], '')).toEqual([glm, flash])
  })

  it('places featured models first and orders context lengths without changing the input', () => {
    const models = [qwen, glm, flash]
    expect(sortModels(models, SORT_OPTIONS.FEATURED)).toEqual([
      glm,
      flash,
      qwen,
    ])
    expect(sortModels(models, SORT_OPTIONS.CONTEXT)).toEqual([glm, flash, qwen])
    expect(models).toEqual([qwen, glm, flash])
  })

  it('keeps pending prices last in either price sort, including against a genuinely free model', () => {
    const free = { ...qwen, pricing_status: undefined, model_ratio: 0 }
    const paid = { ...qwen, id: 4, pricing_status: undefined, model_ratio: 1 }
    expect(sortModels([glm, paid, free], SORT_OPTIONS.PRICE_LOW)).toEqual([
      free,
      paid,
      glm,
    ])
    expect(sortModels([glm, free, paid], SORT_OPTIONS.PRICE_HIGH)).toEqual([
      paid,
      free,
      glm,
    ])
  })

  it('shows catalog specifications and unpublished prices without implying free usage or live performance', () => {
    render(<ModelCard model={flash} onClick={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'GLM 5.3 Flash' })).toBeVisible()
    const specs = screen.getByLabelText('Model specifications')
    expect(within(specs).getByText('1.05M')).toHaveAttribute(
      'title',
      '1,048,576 tokens'
    )
    expect(within(specs).getByText('Text · Image · Video')).toBeVisible()
    const pricing = screen.getByRole('group', { name: 'Pricing' })
    expect(within(pricing).getAllByText('To be configured')).toHaveLength(2)
    expect(within(pricing).queryByText(/\$/)).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Performance metrics for the last 24 hours')
    ).not.toBeInTheDocument()
  })

  it.each(['zhCN', 'zhTW'])(
    'renders token counts using the project locale %s without crashing',
    async (language) => {
      const previousLanguage = i18next.language
      await i18next.changeLanguage(language)
      try {
        render(<ModelCard model={glm} onClick={vi.fn()} />)
        expect(
          within(screen.getByLabelText('Model specifications')).getByText(
            '1.05M'
          )
        ).toHaveAttribute('title', '1,048,576 tokens')
      } finally {
        await i18next.changeLanguage(previousLanguage)
      }
    }
  )

  it('copies the API identifier while displaying a friendly name and opens details from the keyboard', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ModelCard model={glm} onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Copy model name' }))
    expect(await navigator.clipboard.readText()).toBe('glm-5.3')
    expect(onClick).not.toHaveBeenCalled()
    screen.getByRole('button', { name: 'Details' }).focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('keeps specifications and pending pricing when switching to the catalog table', () => {
    render(<PricingTable models={[glm, flash]} />)
    expect(
      screen.getByRole('columnheader', { name: 'Context window' })
    ).toBeVisible()
    expect(
      screen.getByRole('columnheader', { name: 'Max output' })
    ).toBeVisible()
    expect(screen.getAllByText('To be configured')).toHaveLength(4)
    expect(
      screen.queryByRole('columnheader', { name: 'Groups' })
    ).not.toBeInTheDocument()
  })
})
