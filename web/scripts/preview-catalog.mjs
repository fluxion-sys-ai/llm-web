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
// Reference metadata for the local fixture only; no inference providers are connected.
// Limits describe the source catalog, not a deployed Fluxion endpoint.
export const previewVendors = [
  { id: 1, name: 'Z.ai', icon: 'ZAI' },
  { id: 2, name: 'DeepSeek', icon: 'DeepSeek.Color' },
  { id: 3, name: 'Qwen', icon: 'Qwen.Color' },
  { id: 4, name: 'Moonshot AI', icon: 'Moonshot' },
]

export const previewCatalog = [
  {
    model_name: 'glm-5.3',
    display_name: 'GLM 5.3',
    vendor_id: 1,
    featured: true,
    description:
      'A long-context reasoning model for complex coding and multi-step agent tasks.',
    tags: 'Reasoning,Coding,Tools,Long-context',
    context_length: 1048576,
    max_output_tokens: 131072,
    input_modalities: ['text'],
    output_modalities: ['text'],
    capabilities: ['reasoning', 'tools', 'structured_output'],
    catalog_source: {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/z-ai/glm-5.3',
      checked_at: '2026-10-08',
    },
  },
  {
    model_name: 'glm-5.3-flash',
    display_name: 'GLM 5.3 Flash',
    vendor_id: 1,
    featured: true,
    description:
      'A multimodal model for efficient coding, visual understanding, and long-running agent tasks.',
    tags: 'Reasoning,Coding,Tools,Vision,Long-context',
    context_length: 1048576,
    max_output_tokens: 1048576,
    input_modalities: ['text', 'image', 'video'],
    output_modalities: ['text'],
    capabilities: ['reasoning', 'tools', 'structured_output', 'vision'],
    catalog_source: {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/z-ai/glm-5.3-flash',
      checked_at: '2026-10-08',
    },
  },
  {
    model_name: 'deepseek-v4.1-flash',
    display_name: 'DeepSeek V4.1 Flash',
    vendor_id: 2,
    featured: true,
    description:
      'Native image understanding and long-context reasoning for coding and tool-driven workflows.',
    tags: 'Reasoning,Coding,Tools,Vision,Long-context',
    context_length: 1048576,
    max_output_tokens: 1048576,
    input_modalities: ['text', 'image'],
    output_modalities: ['text'],
    capabilities: ['reasoning', 'tools', 'structured_output', 'vision'],
    catalog_source: {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/deepseek/deepseek-v4.1-flash',
      checked_at: '2026-10-08',
    },
  },
  {
    model_name: 'qwen3.8-flash',
    display_name: 'Qwen3.8 Flash',
    vendor_id: 3,
    featured: false,
    description:
      'A multimodal reasoning model for coding assistance, document analysis, and visual tasks.',
    tags: 'Reasoning,Coding,Tools,Vision,Long-context',
    context_length: 1000000,
    max_output_tokens: 131072,
    input_modalities: ['text', 'image', 'video'],
    output_modalities: ['text'],
    capabilities: ['reasoning', 'tools', 'structured_output', 'vision'],
    catalog_source: {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/qwen/qwen3.8-flash',
      checked_at: '2026-10-08',
    },
  },
  {
    model_name: 'kimi-k3',
    display_name: 'Kimi K3',
    vendor_id: 4,
    featured: false,
    description:
      'A multimodal reasoning model for large codebases, knowledge work, and extended tool use.',
    tags: 'Reasoning,Coding,Tools,Vision,Long-context',
    context_length: 1048576,
    max_output_tokens: 1048576,
    input_modalities: ['text', 'image', 'video'],
    output_modalities: ['text'],
    capabilities: ['reasoning', 'tools', 'structured_output', 'vision'],
    catalog_source: {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/moonshotai/kimi-k3',
      checked_at: '2026-10-08',
    },
  },
  {
    model_name: 'qwen3.8-27b',
    display_name: 'Qwen3.8 27B',
    vendor_id: 3,
    featured: false,
    description:
      'An open-weight vision-language model with optional reasoning for coding, research, and agent tasks.',
    tags: 'Reasoning,Coding,Tools,Vision,Long-context',
    context_length: 1000000,
    max_output_tokens: 262144,
    input_modalities: ['text', 'image', 'video'],
    output_modalities: ['text'],
    capabilities: ['reasoning', 'tools', 'structured_output', 'vision'],
    catalog_source: {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/qwen/qwen3.8-27b',
      checked_at: '2026-10-08',
    },
  },
].map((model, index) => ({
  ...model,
  id: index + 1,
  // Required legacy fields are placeholders, not free or published prices.
  pricing_status: 'pending',
  quota_type: 0,
  model_ratio: 0,
  completion_ratio: 0,
  enable_groups: ['default'],
  supported_endpoint_types: ['openai'],
}))

export const previewModels = previewCatalog.map((model) => model.model_name)
