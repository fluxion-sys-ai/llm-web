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
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  SideDrawerSection,
  SideDrawerSectionHeader,
} from '@/components/drawer-layout'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import {
  deleteModelPrice,
  getPricingModels,
  saveModelPrice,
  setPromotionEnabled,
} from '../api'
import { modelPriceSchema, type ModelPriceForm } from '../lib/forms'
import type { CustomerPricing } from '../types'

export function ModelPricesEditor(props: {
  pricing: CustomerPricing
  canWrite: boolean
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const models = useQuery({
    queryKey: ['customer-pricing-models'],
    queryFn: getPricingModels,
    enabled: props.canWrite,
  })
  const [removing, setRemoving] = useState<string | null>(null)
  const form = useForm<ModelPriceForm>({
    resolver: zodResolver(modelPriceSchema),
    defaultValues: { model_name: '', multiplier: 0.7 },
  })
  const update = (data: CustomerPricing) => {
    client.setQueryData(['customer-pricing', props.pricing.user_id], data)
    void client.invalidateQueries({ queryKey: ['customer-benefits'] })
  }
  const save = useMutation({
    mutationFn: (values: ModelPriceForm) =>
      saveModelPrice(props.pricing.user_id, values),
    onSuccess: (data) => {
      update(data)
      form.reset({ model_name: '', multiplier: 0.7 })
    },
  })
  const remove = useMutation({
    mutationFn: (name: string) => deleteModelPrice(props.pricing.user_id, name),
    onSuccess: (data) => {
      update(data)
      setRemoving(null)
    },
  })
  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      setPromotionEnabled(props.pricing.user_id, enabled),
    onSuccess: update,
  })
  const busy =
    !props.canWrite || save.isPending || remove.isPending || toggle.isPending
  const error = save.error || remove.error || toggle.error
  return (
    <>
      <SideDrawerSection>
        <div className='flex items-start justify-between gap-4 rounded-xl border p-4'>
          <div className='space-y-1'>
            <Label htmlFor={`promotion-enabled-${props.pricing.user_id}`}>
              {t('Allow promotion code discounts')}
            </Label>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              {t(
                'Saving any custom model rate turns this off for the entire user. You can enable it again separately.'
              )}
            </p>
          </div>
          <Switch
            id={`promotion-enabled-${props.pricing.user_id}`}
            checked={props.pricing.promotion_codes_enabled}
            disabled={busy}
            onCheckedChange={(enabled) => toggle.mutate(enabled)}
          />
        </div>
        <SideDrawerSectionHeader
          title={t('Custom model rates')}
          description={t(
            'A multiplier of 0.7 charges 70% of the current normal fee. Other models keep their normal rates.'
          )}
        />
        {props.canWrite && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => save.mutate(values))}
              className='space-y-4'
            >
              <div className='grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]'>
                <FormField
                  control={form.control}
                  name='model_name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Model name')}</FormLabel>
                      <FormControl>
                        <Combobox
                          {...field}
                          options={(models.data ?? []).map((model) => ({
                            value: model.model_name,
                            label: model.model_name,
                          }))}
                          onValueChange={(value) => field.onChange(value ?? '')}
                          disabled={
                            busy ||
                            models.isPending ||
                            models.isError ||
                            models.data?.length === 0
                          }
                          placeholder={
                            models.isPending
                              ? t('Loading...')
                              : t('Select a model')
                          }
                          emptyText={t('No models found')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='multiplier'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Price multiplier')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='number'
                          min='0.000001'
                          max='100'
                          step='any'
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                          disabled={busy}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {models.isError && (
                <ErrorState onRetry={() => void models.refetch()} />
              )}
              {!models.isPending &&
                !models.isError &&
                models.data?.length === 0 && (
                  <p className='text-muted-foreground text-sm'>
                    {t('No models available for pricing')}
                  </p>
                )}
              <Button
                type='submit'
                disabled={
                  busy ||
                  !models.data?.some(
                    (model) => model.model_name === form.watch('model_name')
                  )
                }
              >
                {t('Save model rate')}
              </Button>
            </form>
          </Form>
        )}
        {error && (
          <p role='alert' className='text-destructive text-sm'>
            {t(error.message)}
          </p>
        )}
        {props.pricing.model_prices.length === 0 && (
          <p className='text-muted-foreground text-sm'>
            {t('No custom model rates')}
          </p>
        )}
        <ul className='divide-y'>
          {props.pricing.model_prices.map((price) => (
            <li
              key={price.model_name}
              className='flex flex-wrap items-center justify-between gap-3 py-3'
            >
              <div className='min-w-0'>
                <p className='font-mono text-sm break-all'>
                  {price.model_name}
                </p>
                <p className='text-muted-foreground text-xs'>
                  {t('{{multiplier}}× normal fee', {
                    multiplier: price.multiplier,
                  })}
                </p>
              </div>
              <div className='flex shrink-0 gap-1'>
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={busy}
                  onClick={() => {
                    const selectedModel =
                      models.data?.find(
                        (model) => model.model_name === price.model_name
                      ) ??
                      models.data?.find(
                        (model) => model.billing_model_name === price.model_name
                      )
                    form.reset({
                      ...price,
                      model_name: selectedModel?.model_name ?? price.model_name,
                    })
                  }}
                  aria-label={t('Edit rate for {{model}}', {
                    model: price.model_name,
                  })}
                >
                  {t('Edit')}
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={busy}
                  onClick={() => setRemoving(price.model_name)}
                  aria-label={t('Remove rate for {{model}}', {
                    model: price.model_name,
                  })}
                >
                  {t('Remove')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </SideDrawerSection>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('Remove custom model rate')}
        desc={t(
          'This model will return to its normal fee. Promotion code eligibility will stay unchanged.'
        )}
        confirmText={t('Remove')}
        handleConfirm={() => removing && remove.mutate(removing)}
        isLoading={remove.isPending}
      />
    </>
  )
}
