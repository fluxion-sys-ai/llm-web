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
import { createInstance, type i18n } from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'

import zhCN from '@/i18n/locales/zh.json'

import { FILTER_ALL, SORT_OPTIONS } from '../constants'
import { filterAndSortModels, filterBySearch } from '../lib/filters'
import type { PricingModel } from '../types'

const codingModel: PricingModel = {
  id: 1,
  model_name: 'code-model',
  display_name: 'Code Model',
  vendor_name: 'Example AI',
  tags: 'Reasoning,Coding',
  description: 'A model for coding tasks.',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 1,
  enable_groups: ['default'],
}
const visionModel: PricingModel = {
  ...codingModel,
  id: 2,
  model_name: 'vision-model',
  display_name: 'Vision Model',
  tags: 'Vision',
  description: 'A model for document analysis.',
}
const models = [codingModel, visionModel]
let catalogI18n: i18n

beforeEach(async () => {
  catalogI18n = createInstance()
  await catalogI18n.init({
    lng: 'zh',
    fallbackLng: 'en',
    resources: {
      en: { translation: {} },
      zh: {
        translation: {
          Reasoning: '推理',
          Coding: '编程',
          Vision: '视觉理解',
          'A model for coding tasks.': '适用于编程任务的模型。',
          'A model for document analysis.': '适用于文档分析的模型。',
        },
      },
    },
  })
})

describe('localized catalog search', () => {
  it('finds models using visible Chinese capabilities while preserving English searches', () => {
    expect(filterBySearch(models, '推理', catalogI18n.t)).toEqual([codingModel])
    expect(filterBySearch(models, '视觉理解', catalogI18n.t)).toEqual([
      visionModel,
    ])
    expect(filterBySearch(models, 'coding', catalogI18n.t)).toEqual([
      codingModel,
    ])
    expect(filterBySearch(models, 'CodeModel')).toEqual([codingModel])
  })

  it('searches the description displayed in the current language after a language change', async () => {
    expect(filterBySearch(models, '文档分析', catalogI18n.t)).toEqual([
      visionModel,
    ])
    await catalogI18n.changeLanguage('en')
    expect(filterBySearch(models, 'document analysis', catalogI18n.t)).toEqual([
      visionModel,
    ])
    expect(filterBySearch(models, '文档分析', catalogI18n.t)).toEqual([])
  })

  it('combines localized search with raw tag filters and restores results when search is cleared', () => {
    const filters = {
      search: '编程',
      vendor: 'Example AI',
      group: FILTER_ALL,
      quotaType: FILTER_ALL,
      endpointType: FILTER_ALL,
      tag: 'vision',
      sortBy: SORT_OPTIONS.FEATURED,
    }
    expect(filterAndSortModels(models, filters, catalogI18n.t)).toEqual([])
    expect(
      filterAndSortModels(models, { ...filters, search: '' }, catalogI18n.t)
    ).toEqual([visionModel])
    expect(
      filterAndSortModels(
        models,
        { ...filters, tag: FILTER_ALL },
        catalogI18n.t
      )
    ).toEqual([codingModel])
  })
})

it('uses the shipped Chinese catalog copy for labels and description search', async () => {
  const actualLocale = createInstance()
  await actualLocale.init({ lng: 'zhCN', resources: { zhCN } })
  const model = {
    ...codingModel,
    description:
      'A long-context reasoning model for complex coding and multi-step agent tasks.',
  }
  expect(actualLocale.t('Developers')).toBe('开发商')
  expect(actualLocale.t('To be configured')).toBe('待配置')
  expect(filterBySearch([model], '智能体', actualLocale.t)).toEqual([model])
})
