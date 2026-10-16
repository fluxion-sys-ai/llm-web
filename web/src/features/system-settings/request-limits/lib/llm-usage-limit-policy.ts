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
import * as z from 'zod'

export const defaultLLMUsageRules = {
  enabled: false,
  refill_period_seconds: 60,
  max_concurrent: 4,
  uncached_input: { capacity: 0, refill: 0 },
  cached_input: { capacity: 0, refill: 0 },
  output: { capacity: 0, refill: 0 },
  cost_usd: { capacity: 0, refill: 0 },
}

export const defaultLLMUsageLimitPolicy = {
  ...defaultLLMUsageRules,
  counter_epoch: 0,
  user_overrides: {} as Record<string, LLMUsageRules>,
}

export const llmUsageUserIdSchema = z
  .string()
  .regex(/^[1-9][0-9]*$/)
  .refine(
    (value) => Number(value) <= 2147483647,
    'Enter a user ID between 1 and 2147483647.'
  )

export const llmUsageBucketFields = [
  {
    name: 'uncached_input',
    label: 'Uncached input tokens',
    max: 1_000_000_000,
    step: 1,
  },
  {
    name: 'cached_input',
    label: 'Cached input tokens',
    max: 1_000_000_000,
    step: 1,
  },
  { name: 'output', label: 'Output tokens', max: 1_000_000_000, step: 1 },
  {
    name: 'cost_usd',
    label: 'User charges (USD)',
    max: 1_000_000,
    step: 0.000001,
  },
] as const

export function createLLMUsageRulesSchema(t: (key: string) => string) {
  const tokenAmount = z.number().int().min(0).max(1_000_000_000)
  const usdAmount = z
    .number()
    .min(0)
    .max(1_000_000)
    .refine(
      (amount) =>
        Math.abs(amount * 1_000_000 - Math.round(amount * 1_000_000)) <=
        Math.max(1e-8, Number.EPSILON * Math.abs(amount * 1_000_000)),
      t('USD amounts support up to six decimal places.')
    )
  const tokenBucket = z.strictObject({
    capacity: tokenAmount,
    refill: tokenAmount,
  })
  const costBucket = z.strictObject({ capacity: usdAmount, refill: usdAmount })
  return z
    .strictObject({
      enabled: z.boolean(),
      refill_period_seconds: z.number().int().min(1).max(86400),
      max_concurrent: z.number().int().min(1).max(1000),
      uncached_input: tokenBucket,
      cached_input: tokenBucket,
      output: tokenBucket,
      cost_usd: costBucket,
    })
    .superRefine((policy, context) => {
      for (const bucket of llmUsageBucketFields) {
        const amount = policy[bucket.name]
        if ((amount.capacity === 0) !== (amount.refill === 0)) {
          context.addIssue({
            code: 'custom',
            path: [bucket.name, amount.capacity === 0 ? 'capacity' : 'refill'],
            message: t(
              'Capacity and refill must both be positive, or both zero to disable this bucket.'
            ),
          })
        }
      }
      if (
        policy.enabled &&
        llmUsageBucketFields.every(
          (bucket) => policy[bucket.name].capacity === 0
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['enabled'],
          message: t(
            'Configure at least one bucket before enabling model usage limits.'
          ),
        })
      }
    })
}

export type LLMUsageRules = z.infer<
  ReturnType<typeof createLLMUsageRulesSchema>
>

export function createLLMUsageLimitSchema(t: (key: string) => string) {
  const rules = createLLMUsageRulesSchema(t)
  return rules.safeExtend({
    counter_epoch: z
      .number()
      .int()
      .min(0)
      .max(2 ** 52),
    user_overrides: z
      .record(llmUsageUserIdSchema, rules)
      .refine(
        (overrides) => Object.keys(overrides).length <= 1000,
        t('Configure at most 1000 user overrides.')
      ),
  })
}

export type LLMUsageLimitPolicy = z.infer<
  ReturnType<typeof createLLMUsageLimitSchema>
>
