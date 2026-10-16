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
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form } from '@/components/ui/form'

import { SettingsForm } from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import {
  createLLMUsageLimitSchema,
  defaultLLMUsageLimitPolicy,
  defaultLLMUsageRules,
  llmUsageBucketFields,
  type LLMUsageLimitPolicy,
} from './lib/llm-usage-limit-policy'
import { LLMUsagePolicyFields } from './llm-usage-policy-fields'
import { LLMUsageUserOverrides } from './llm-usage-user-overrides'

export function LLMUsageLimitSection(props: { defaultValue: string }) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const queryClient = useQueryClient()
  const schema = useMemo(() => createLLMUsageLimitSchema(t), [t])
  const saved = useMemo(() => {
    try {
      const raw: unknown = JSON.parse(props.defaultValue)
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
      const values: Record<string, unknown> = {
        ...defaultLLMUsageLimitPolicy,
        ...raw,
      }
      for (const bucket of llmUsageBucketFields) {
        const value = values[bucket.name]
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          values[bucket.name] = {
            ...defaultLLMUsageLimitPolicy[bucket.name],
            ...value,
          }
        }
      }
      if (
        values.user_overrides &&
        typeof values.user_overrides === 'object' &&
        !Array.isArray(values.user_overrides)
      ) {
        values.user_overrides = Object.fromEntries(
          Object.entries(values.user_overrides).map(([id, policy]) => {
            if (
              !policy ||
              typeof policy !== 'object' ||
              Array.isArray(policy)
            ) {
              return [id, policy]
            }
            return [id, { ...defaultLLMUsageRules, ...policy }]
          })
        )
      }
      return schema.parse(values)
    } catch {
      return null
    }
  }, [props.defaultValue, schema])
  const form = useForm<LLMUsageLimitPolicy>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: saved ?? defaultLLMUsageLimitPolicy,
  })
  useEffect(() => {
    if (saved) form.reset(saved)
  }, [saved, form])

  async function onSubmit(values: LLMUsageLimitPolicy) {
    if (!saved) return
    form.clearErrors('root')
    try {
      const response = await updateOption.mutateAsync({
        key: 'LLMUsageLimitPolicy',
        value: JSON.stringify({
          ...values,
          // Older backends reject this field, even when it is empty.
          user_overrides: Object.keys(values.user_overrides).length
            ? values.user_overrides
            : undefined,
        }),
      })
      if (!response.success) {
        form.setError('root', {
          message: response.message || t('Failed to update setting'),
        })
        return
      }
      form.reset(values)
      await queryClient.invalidateQueries({ queryKey: ['model-usage-policy'] })
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof Error
            ? error.message
            : t('Failed to update setting'),
      })
    }
  }

  return (
    <SettingsSection title={t('Model usage limits')}>
      <Form {...form}>
        <SettingsForm
          aria-label={t('Model usage limits')}
          onSubmit={form.handleSubmit(onSubmit, () =>
            form.setError('root', {
              message: t('Correct invalid policy fields before saving.'),
            })
          )}
        >
          <div>
            <h4 className='text-sm font-semibold'>
              {t('Usage token buckets')}
            </h4>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t(
                'Per-user limits cover every model and client, including API keys, Playground, streaming and asynchronous tasks. Existing request limits still apply.'
              )}
            </p>
          </div>
          {!saved && (
            <Alert variant='destructive'>
              <AlertDescription>
                {t(
                  'The saved model usage policy is invalid. Correct it through the settings API before editing here.'
                )}
              </AlertDescription>
            </Alert>
          )}
          <LLMUsagePolicyFields
            form={form}
            disabled={!saved || updateOption.isPending}
          />
          <LLMUsageUserOverrides
            form={form}
            disabled={!saved || updateOption.isPending}
          />
          <Alert>
            <AlertDescription>
              {t(
                'Token buckets use measured upstream tokens when applicable. The cost bucket uses the final user charge for every model. Charges are recorded after completion; concurrent calls can create debt.'
              )}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              {t(
                'Missing usage or an abandoned operation blocks that user until its actual usage is reconciled. Configuration changes preserve existing debt and unresolved operations.'
              )}
            </AlertDescription>
          </Alert>
          {form.formState.errors.root && (
            <Alert variant='destructive'>
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}
          <SettingsPageFormActions
            placement='inline'
            onSave={form.handleSubmit(onSubmit, () =>
              form.setError('root', {
                message: t('Correct invalid policy fields before saving.'),
              })
            )}
            isSaving={updateOption.isPending}
            isSaveDisabled={!saved}
            saveLabel='Save model usage limits'
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
