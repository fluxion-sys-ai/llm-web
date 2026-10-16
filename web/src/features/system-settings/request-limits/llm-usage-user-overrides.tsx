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
import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { StaticDataTable } from '@/components/data-table/static/static-data-table'
import { StaticRowActions } from '@/components/data-table/static/static-row-actions'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

import {
  llmUsageBucketFields,
  llmUsageUserIdSchema,
  type LLMUsageLimitPolicy,
  type LLMUsageRules,
} from './lib/llm-usage-limit-policy'
import { LLMUsagePolicyFields } from './llm-usage-policy-fields'

type SavedUserPolicy = {
  user_id: number
  username: string
  source: 'default' | 'override'
  policy: LLMUsageRules & { counter_epoch: number }
}

export function LLMUsageUserOverrides(props: {
  form: UseFormReturn<LLMUsageLimitPolicy>
  disabled: boolean
}) {
  const { t } = useTranslation()
  const inputId = useId()
  const [userId, setUserId] = useState('')
  const [requestedId, setRequestedId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [removingId, setRemovingId] = useState('')
  const overrides = props.form.watch('user_overrides')
  const validId = llmUsageUserIdSchema.safeParse(userId).success
  const lookup = useQuery({
    queryKey: ['model-usage-policy', requestedId],
    enabled: requestedId !== '',
    retry: false,
    queryFn: async () => {
      const response = await api.get<{
        success: boolean
        message?: string
        data?: SavedUserPolicy
      }>(`/api/option/model_usage/${requestedId}/policy`)
      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.message || t('Failed to load user policy')
        )
      }
      return response.data.data
    },
  })
  const verified =
    requestedId === userId && !lookup.isError ? lookup.data : undefined

  function verifyUser() {
    if (!validId) return
    if (requestedId === userId) void lookup.refetch()
    else setRequestedId(userId)
  }

  function addOverride() {
    if (!verified || verified.user_id !== Number(userId) || overrides[userId]) {
      return
    }
    const { counter_epoch: _revision, ...rules } = verified.policy
    props.form.setValue(
      'user_overrides',
      { ...overrides, [userId]: rules },
      { shouldDirty: true, shouldValidate: true }
    )
    setEditingId(userId)
  }

  function removeOverride() {
    const next = { ...overrides }
    delete next[removingId]
    props.form.setValue('user_overrides', next, {
      shouldDirty: true,
      shouldValidate: true,
    })
    if (editingId === removingId) setEditingId('')
    setRemovingId('')
  }

  return (
    <section className='space-y-4' aria-label={t('User overrides')}>
      <h4 className='text-sm font-semibold'>{t('User overrides')}</h4>
      <p className='text-muted-foreground text-sm'>
        {t(
          'An override replaces the default policy for one user ID across all API keys and clients. Save model usage limits to apply your changes.'
        )}
      </p>
      <StaticDataTable
        data={Object.entries(overrides).sort(
          ([a], [b]) => Number(a) - Number(b)
        )}
        getRowKey={([id]) => id}
        emptyContent={t(
          'No user overrides. All users inherit the default policy.'
        )}
        columns={[
          { id: 'user', header: t('User ID'), cell: ([id]) => id },
          {
            id: 'status',
            header: t('Status'),
            cell: ([, policy]) =>
              policy.enabled
                ? t('Enabled')
                : t('Exempt from model usage limits'),
          },
          {
            id: 'concurrency',
            header: t('Maximum concurrent model operations per user'),
            cell: ([, policy]) =>
              policy.enabled ? policy.max_concurrent : '—',
          },
          {
            id: 'actions',
            header: t('Actions'),
            cell: ([id]) => (
              <StaticRowActions
                editLabel={t('Edit user override {{id}}', { id })}
                deleteLabel={t('Remove user override')}
                menuLabel={t('Actions for user {{id}}', { id })}
                editDisabled={props.disabled}
                deleteDisabled={props.disabled}
                onEdit={() => setEditingId(id)}
                onDelete={() => setRemovingId(id)}
              />
            ),
          },
        ]}
      />
      {editingId && overrides[editingId] && (
        <section
          className='space-y-4 rounded-lg border p-4'
          aria-label={t('Edit user override {{id}}', { id: editingId })}
        >
          <div className='flex items-center justify-between gap-2'>
            <h5 className='font-medium'>
              {t('Edit user override {{id}}', { id: editingId })}
            </h5>
            <Button
              type='button'
              variant='outline'
              onClick={() => setEditingId('')}
            >
              {t('Close')}
            </Button>
          </div>
          <LLMUsagePolicyFields
            form={props.form}
            userId={editingId}
            disabled={props.disabled}
          />
        </section>
      )}
      <section className='space-y-3' aria-label={t('Verify saved user policy')}>
        <Label htmlFor={inputId}>{t('User ID')}</Label>
        <div className='flex flex-wrap gap-2'>
          <Input
            id={inputId}
            inputMode='numeric'
            className='w-48'
            value={userId}
            disabled={props.disabled}
            aria-invalid={userId !== '' && !validId}
            onChange={(event) => setUserId(event.target.value)}
          />
          <Button
            type='button'
            variant='outline'
            disabled={props.disabled || !validId || lookup.isFetching}
            onClick={verifyUser}
          >
            {t('Verify saved user policy')}
          </Button>
          <Button
            type='button'
            disabled={
              props.disabled ||
              !verified ||
              lookup.isFetching ||
              !!overrides[userId] ||
              Object.keys(overrides).length >= 1000
            }
            onClick={addOverride}
          >
            {t('Add user override')}
          </Button>
        </div>
        {userId !== '' && !validId && (
          <p className='text-destructive text-sm'>
            {t('Enter a user ID between 1 and 2147483647.')}
          </p>
        )}
        <p className='text-muted-foreground text-sm'>
          {t(
            'Verification reads the saved policy for an existing user. It does not send a model request or show live balances. Other gateways apply changes after configuration sync (60 seconds by default).'
          )}
        </p>
        {requestedId === userId && lookup.isFetching && (
          <LoadingState inline message={t('Loading...')} />
        )}
        {requestedId === userId && lookup.isError && (
          <ErrorState
            className='min-h-0'
            title={t('Failed to load user policy')}
            description={lookup.error.message}
            onRetry={() => void lookup.refetch()}
          />
        )}
        {verified && !lookup.isFetching && !lookup.isError && (
          <div className='space-y-3 rounded-lg border p-4' aria-live='polite'>
            <p className='font-medium break-words'>
              {verified.username} · {t('User ID')}: {verified.user_id}
            </p>
            <p>
              {t('Saved policy source')}:{' '}
              {verified.source === 'override'
                ? t('User override')
                : t('Default policy')}
            </p>
            <p>
              {t('Status')}:{' '}
              {verified.policy.enabled ? t('Enabled') : t('Disabled')}
            </p>
            <p>
              {t('Refill period (seconds)')}:{' '}
              {verified.policy.refill_period_seconds}
            </p>
            <p>
              {t('Maximum concurrent model operations per user')}:{' '}
              {verified.policy.max_concurrent}
            </p>
            <StaticDataTable
              data={[...llmUsageBucketFields]}
              getRowKey={(bucket) => bucket.name}
              columns={[
                {
                  id: 'bucket',
                  header: t('Usage token buckets'),
                  cell: (bucket) => t(bucket.label),
                },
                {
                  id: 'capacity',
                  header: t('Burst capacity'),
                  cell: (bucket) => verified.policy[bucket.name].capacity,
                },
                {
                  id: 'refill',
                  header: t('Refill per period'),
                  cell: (bucket) => verified.policy[bucket.name].refill,
                },
              ]}
            />
            {props.form.formState.isDirty && (
              <Alert>
                <AlertDescription>
                  {t('Unsaved changes are not included in this verification.')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </section>
      <ConfirmDialog
        open={removingId !== ''}
        onOpenChange={(open) => {
          if (!open) setRemovingId('')
        }}
        title={t('Remove user override')}
        desc={t('User {{id}} will inherit the default policy after saving.', {
          id: removingId,
        })}
        confirmText={t('Remove')}
        handleConfirm={removeOverride}
        disabled={props.disabled}
      />
    </section>
  )
}
