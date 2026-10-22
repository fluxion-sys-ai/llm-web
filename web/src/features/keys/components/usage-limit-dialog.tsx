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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { api } from '@/lib/api'

import {
  createLLMUsageRulesSchema,
  llmUsageBucketFields,
  type LLMUsageRules,
} from '../lib/usage-policy'
import { LLMUsagePolicyFields } from './usage-policy-fields'
import { UsageSummary, type UsageSummaryData } from './usage-summary'

export function UsageLimitDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyId?: number
}) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['usage-limits', props.keyId ?? 'account'],
    enabled: props.open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<{
        success: boolean
        data: UsageSummaryData
        message?: string
      }>(
        props.keyId === undefined
          ? '/api/user/self/usage-limits'
          : `/api/token/${props.keyId}/usage-limits`
      )
      if (!response.data.success) throw new Error(response.data.message)
      return response.data.data
    },
  })
  return (
    <Dialog
      contentClassName='overflow-clip'
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t(
        props.keyId === undefined
          ? 'Account usage limits'
          : 'API key usage limits'
      )}
    >
      {query.isPending && <LoadingState />}
      {query.isError && (
        <ErrorState
          title={t('Usage limits are temporarily unavailable')}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.isSuccess && (
        <div className='space-y-6'>
          <UsageSummary data={query.data} />
          {props.keyId !== undefined && query.data.key && (
            <KeyUsageForm
              key={props.keyId}
              keyId={props.keyId}
              initial={query.data.key.policy}
            />
          )}
        </div>
      )}
    </Dialog>
  )
}

function KeyUsageForm(props: { keyId: number; initial: LLMUsageRules }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const form = useForm<LLMUsageRules>({
    resolver: zodResolver(createLLMUsageRulesSchema(t)),
    defaultValues: props.initial,
  })
  useEffect(() => {
    if (!form.formState.isDirty) form.reset(props.initial)
  }, [props.initial, form])
  const [adjusted, setAdjusted] = useState<string[]>([])
  const save = useMutation({
    mutationFn: async (policy: LLMUsageRules) => {
      const response = await api.put<{
        success: boolean
        message?: string
        data: { policy: LLMUsageRules; clamped_fields: string[] }
      }>(`/api/token/${props.keyId}/usage-limits`, policy)
      if (!response.data.success) throw new Error(response.data.message)
      return response.data.data
    },
    onSuccess: (result) => {
      form.reset(result.policy)
      setAdjusted(result.clamped_fields)
      void client.invalidateQueries({ queryKey: ['usage-limits'] })
      toast.success(t('Saved successfully'))
    },
  })
  return (
    <Form {...form}>
      <form
        className='space-y-4'
        onSubmit={form.handleSubmit((policy) => save.mutate(policy))}
      >
        <LLMUsagePolicyFields form={form} disabled={save.isPending} />
        {adjusted.length > 0 && (
          <div role='status'>
            {t(
              'Reduced to the account limit. The form shows the saved values.'
            )}
            <ul>
              {adjusted.map((field) => {
                const [dimension, part] = field.split('.')
                let label = t('Maximum concurrent operations for this key')
                if (dimension === 'refill_period_seconds') {
                  label = t('Refill period (seconds)')
                }
                const bucket = llmUsageBucketFields.find(
                  (item) => item.name === dimension
                )
                if (bucket) {
                  label = `${t(bucket.label)}: ${part === 'capacity' ? t('Burst capacity') : t('Refill per period')}`
                }
                return <li key={field}>{label}</li>
              })}
            </ul>
          </div>
        )}
        {save.isError && (
          <p role='alert'>{t('Failed to save usage limits. Please retry.')}</p>
        )}
        <Button
          type='submit'
          disabled={save.isPending || !form.formState.isDirty}
        >
          {t('Save')}
        </Button>
      </form>
    </Form>
  )
}
