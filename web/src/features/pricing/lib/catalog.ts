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
import { ENDPOINT_TYPES } from '../constants'
import modelMetadata from '../data/model-metadata.json'
import type { PricingData, PricingModel, PricingVendor } from '../types'

type DisplayMetadata = Pick<
  PricingModel,
  | 'display_name'
  | 'description'
  | 'icon'
  | 'vendor_name'
  | 'vendor_icon'
  | 'featured'
  | 'tags'
  | 'context_length'
  | 'max_output_tokens'
  | 'input_modalities'
  | 'output_modalities'
>

// Shared presentation data for the website and local preview. Live backend
// metadata takes precedence; serving availability is never inferred from specs.
const displayMetadata = modelMetadata as Record<string, DisplayMetadata>

// Website reference prices in USD per 1M tokens. Public pricing uses these with
// OFFICIAL_PRICE_DISCOUNT_PERCENT regardless of backend serving availability.
export const officialPrices: Record<string, PricingModel['official_price']> = {
  'glm-5.3': { input: 1.4, output: 4.4 },
  'deepseek-v4.1-flash': { input: 0.3, output: 1.2 },
  'kimi-k3': { input: 3, output: 15 },
  'qwen3.8-flash': { input: 0.15, output: 0.47 },
  'qwen3.8-27b': { input: 0.425, output: 2.55 },
}

export const featuredModelNames = ['GLM-5.3', 'Kimi-K3', 'DeepSeek-V4.1-Flash']

const chatEndpoints = new Set<string>([
  ENDPOINT_TYPES.OPENAI,
  ENDPOINT_TYPES.OPENAI_RESPONSE,
  ENDPOINT_TYPES.ANTHROPIC,
  ENDPOINT_TYPES.GEMINI,
])

export function isLlmCatalogModel(model: PricingModel): boolean {
  // A chat-compatible transport alone does not make a video generator an LLM.
  if (
    model.output_modalities?.length &&
    !model.output_modalities.includes('text')
  ) {
    return false
  }
  const endpoints = model.supported_endpoint_types ?? []
  if (
    endpoints.length > 0 &&
    !endpoints.some((endpoint) => chatEndpoints.has(endpoint))
  ) {
    return false
  }
  // Legacy responses also label video generators as OpenAI token models. An
  // absent output modality requires a verified LLM identity, not a price or path.
  return (
    model.output_modalities?.includes('text') === true ||
    Object.hasOwn(displayMetadata, model.model_name.toLowerCase())
  )
}

export function buildLlmCatalog(data?: PricingData): {
  models: PricingModel[]
  vendors: PricingVendor[]
} {
  if (!data?.success || !Array.isArray(data.data)) {
    return { models: [], vendors: [] }
  }
  const backendVendors = new Map(
    (data.vendors ?? []).map((vendor) => [vendor.id, vendor])
  )
  const seenModelNames = new Set<string>()
  const models: PricingModel[] = []
  for (const model of data.data) {
    const normalizedName = model.model_name.toLowerCase()
    if (!isLlmCatalogModel(model) || seenModelNames.has(normalizedName)) {
      continue
    }
    seenModelNames.add(normalizedName)
    const metadata = displayMetadata[model.model_name.toLowerCase()]
    const vendor = model.vendor_id
      ? backendVendors.get(model.vendor_id)
      : undefined
    models.push({
      ...model,
      key: model.model_name,
      display_name: model.display_name || metadata?.display_name,
      description: model.description || metadata?.description,
      icon: model.icon || metadata?.icon,
      featured: model.featured ?? metadata?.featured,
      tags: model.tags ?? metadata?.tags,
      context_length: model.context_length ?? metadata?.context_length,
      max_output_tokens: model.max_output_tokens ?? metadata?.max_output_tokens,
      input_modalities: model.input_modalities ?? metadata?.input_modalities,
      output_modalities: model.output_modalities ?? metadata?.output_modalities,
      official_price: officialPrices[normalizedName] ?? model.official_price,
      vendor_name: model.vendor_name || vendor?.name || metadata?.vendor_name,
      vendor_icon: model.vendor_icon || vendor?.icon || metadata?.vendor_icon,
      vendor_description: model.vendor_description || vendor?.description,
      group_ratio: data.group_ratio,
    })
  }
  for (const [index, modelName] of featuredModelNames.entries()) {
    const normalizedName = modelName.toLowerCase()
    if (seenModelNames.has(normalizedName)) continue
    models.push({
      ...displayMetadata[normalizedName],
      official_price: officialPrices[normalizedName],
      id: -(index + 1),
      key: modelName,
      model_name: modelName,
      availability: 'coming_soon',
      pricing_status: 'pending',
      enable_groups: [],
      // Required legacy fields are placeholders, never published prices.
      quota_type: 0,
      model_ratio: 0,
      completion_ratio: 0,
    })
  }
  const vendors = new Map<string, PricingVendor>()
  for (const model of models) {
    if (!model.vendor_name || vendors.has(model.vendor_name)) continue
    vendors.set(model.vendor_name, {
      id: model.vendor_id ?? -(vendors.size + 1),
      name: model.vendor_name,
      icon: model.vendor_icon,
      description: model.vendor_description,
    })
  }
  return { models, vendors: [...vendors.values()] }
}
