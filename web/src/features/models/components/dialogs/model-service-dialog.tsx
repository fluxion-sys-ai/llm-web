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
import { isAxiosError } from 'axios'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { getModelServiceStatus, updateModelServiceStatus } from '../../api'
import {
  modelServicePauseSchema,
  type ModelServicePauseValues,
} from '../../lib/model-form'
import type { Model } from '../../types'

export function ModelServiceDialog(props: {
  model: Pick<Model, 'model_name' | 'name_rule'>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const reasonId = useId()
  const client = useQueryClient()
  const canManage = useAuthStore(
    (state) => (state.auth.user?.role ?? ROLE.GUEST) >= ROLE.ADMIN
  )
  const exactModel = props.model.name_rule === 0
  const status = useQuery({
    queryKey: ['model-service-status', props.model.model_name],
    queryFn: () => getModelServiceStatus(props.model.model_name),
    enabled: canManage && exactModel,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false,
  })
  const form = useForm<ModelServicePauseValues>({
    resolver: zodResolver(modelServicePauseSchema),
    defaultValues: { reason: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: ModelServicePauseValues) => {
      if (
        !status.data ||
        status.isFetching ||
        status.isError ||
        !canManage ||
        !exactModel
      ) {
        throw new Error(t('Failed to load model service status'))
      }
      return updateModelServiceStatus({
        model_name: props.model.model_name,
        paused: !status.data.paused,
        ...(status.data.paused ? {} : { reason: values.reason }),
      })
    },
    onSuccess: async (result) => {
      client.setQueryData(
        ['model-service-status', props.model.model_name],
        result
      )
      await Promise.all([
        client.invalidateQueries({ queryKey: ['models'] }),
        client.invalidateQueries({ queryKey: ['model-service-status'] }),
        client.invalidateQueries({ queryKey: ['pricing'] }),
      ])
      toast.success(
        result.paused ? t('Model service paused') : t('Model service resumed')
      )
      props.onClose()
    },
  })
  if (!canManage || !exactModel) return null

  let description = t('Load the current service state before making a change.')
  let confirmText = t('Continue')
  if (status.data && !status.isError && !status.isFetching) {
    if (status.data.paused) {
      description = t(
        'Resume requests to {{model}}? Resuming does not verify that the model is healthy.',
        { model: props.model.model_name }
      )
      confirmText = t('Resume service')
    } else {
      description = t(
        'Pause {{model}}? New requests will be rejected. Requests already in progress can finish.',
        { model: props.model.model_name }
      )
      confirmText = t('Pause service')
    }
  }
  let errorMessage = mutation.error?.message
  if (isAxiosError<{ message?: string }>(mutation.error)) {
    errorMessage = mutation.error.response?.data.message || errorMessage
  }
  const canSubmit =
    Boolean(status.data) && !status.isFetching && !status.isError
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) props.onClose()
      }}
      title={t('Service controls')}
      desc={description}
      confirmText={confirmText}
      disabled={!canSubmit}
      isLoading={mutation.isPending}
      destructive={canSubmit && !status.data?.paused}
      handleConfirm={() =>
        void form.handleSubmit((values) => mutation.mutate(values))()
      }
    >
      {status.isFetching && <LoadingState className='min-h-20' />}
      {status.isError && (
        <ErrorState
          className='min-h-24'
          title={t('Failed to load model service status')}
          onRetry={() => void status.refetch()}
        />
      )}
      {canSubmit && status.data?.paused && status.data.reason && (
        <p className='text-muted-foreground text-sm break-words'>
          {t('Pause reason')}: {status.data.reason}
        </p>
      )}
      {canSubmit && !status.data?.paused && (
        <FieldGroup>
          <Field
            data-disabled={mutation.isPending}
            data-invalid={Boolean(form.formState.errors.reason)}
          >
            <FieldLabel htmlFor={reasonId}>
              {t('Pause reason (optional)')}
            </FieldLabel>
            <Textarea
              {...form.register('reason')}
              id={reasonId}
              maxLength={500}
              disabled={mutation.isPending}
              aria-invalid={Boolean(form.formState.errors.reason)}
              aria-describedby={
                form.formState.errors.reason ? `${reasonId}-error` : undefined
              }
            />
            {form.formState.errors.reason && (
              <FieldError id={`${reasonId}-error`}>
                {t('Reason must be 500 characters or fewer')}
              </FieldError>
            )}
          </Field>
        </FieldGroup>
      )}
      {mutation.isError && (
        <p role='alert' className='text-destructive text-sm'>
          {errorMessage || t('Failed to update model service status')}
        </p>
      )}
    </ConfirmDialog>
  )
}
