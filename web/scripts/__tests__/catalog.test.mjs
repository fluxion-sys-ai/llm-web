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
import assert from 'node:assert/strict'
import test from 'node:test'

import { previewResponse } from '../preview-data.mjs'

test('pricing features the requested LLMs first and resolves every vendor', () => {
  const catalog = previewResponse('GET', '/api/pricing')

  assert.deepEqual(
    catalog.data.map((model) => model.display_name),
    [
      'GLM 5.3',
      'GLM 5.3 Flash',
      'DeepSeek V4.1 Flash',
      'Qwen3.8 Flash',
      'Kimi K3',
      'Qwen3.8 27B',
    ]
  )
  assert.deepEqual(
    catalog.data
      .filter((model) => model.featured)
      .map((model) => model.model_name),
    ['glm-5.3', 'glm-5.3-flash', 'deepseek-v4.1-flash']
  )
  for (const model of catalog.data) {
    assert.ok(catalog.vendors.some((vendor) => vendor.id === model.vendor_id))
  }
})

test('catalog metadata cites its reference without publishing Fluxion prices', () => {
  const catalog = previewResponse('GET', '/api/pricing')

  for (const model of catalog.data) {
    assert.equal(model.pricing_status, 'pending')
    assert.equal(model.model_ratio, 0)
    assert.equal(model.completion_ratio, 0)
    assert.equal(model.model_price, undefined)
    assert.equal(model.catalog_source.name, 'OpenRouter')
    assert.equal(model.catalog_source.checked_at, '2026-10-08')
    const source = new URL(model.catalog_source.url)
    assert.equal(source.origin, 'https://openrouter.ai')
    assert.equal(source.pathname.split('/').at(-1), model.model_name)
    assert.ok(model.context_length > 0)
    assert.ok(model.max_output_tokens > 0)
    assert.deepEqual(model.output_modalities, ['text'])
    assert.ok(model.capabilities.includes('tools'))
    assert.ok(model.capabilities.includes('structured_output'))
  }
  assert.deepEqual(catalog.data[0].input_modalities, ['text'])
  assert.deepEqual(catalog.data[2].input_modalities, ['text', 'image'])
  assert.deepEqual(catalog.data[1].input_modalities, ['text', 'image', 'video'])
})

test('playground and sample usage use the complete catalog without measured performance', () => {
  const catalogNames = previewResponse('GET', '/api/pricing').data.map(
    (model) => model.model_name
  )
  const selectableNames = previewResponse('GET', '/api/user/models').data
  const usage = previewResponse('GET', '/api/data/self').data

  assert.deepEqual(selectableNames, catalogNames)
  assert.deepEqual(
    [...new Set(usage.map((row) => row.model_name))],
    catalogNames
  )
  assert.deepEqual(
    previewResponse('GET', '/api/perf-metrics/summary').data.models,
    []
  )
  assert.deepEqual(previewResponse('GET', '/api/perf-metrics').data.groups, [])
})
