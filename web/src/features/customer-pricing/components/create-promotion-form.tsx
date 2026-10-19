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
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import {
  SideDrawerSection,
  SideDrawerSectionHeader,
} from '@/components/drawer-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { createPromotionCode, getCustomerPricing } from '../api'
import {
  promotionSchema,
  toPromotionPayload,
  type PromotionForm,
} from '../lib/forms'
import { PricingUserSelect, type PricingUser } from './pricing-user-select'

export function CreatePromotionForm(props: {
  userId?: number
  enabled?: boolean
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const root = useAuthStore(
    (state) => state.auth.user?.role === ROLE.SUPER_ADMIN
  )
  const [audience, setAudience] = useState<'all_users' | 'specific_user'>(
    root && !props.userId ? 'all_users' : 'specific_user'
  )
  const [user, setUser] = useState<PricingUser | null>(null)
  const targetUserId = props.userId ?? (audience === 'all_users' ? 0 : user?.id)
  const targetPricing = useQuery({
    queryKey: ['customer-pricing', targetUserId],
    queryFn: targetUserId ? () => getCustomerPricing(targetUserId) : skipToken,
    enabled:
      !props.userId &&
      audience === 'specific_user' &&
      targetUserId !== undefined,
  })
  const promotionsEnabled =
    props.enabled ?? targetPricing.data?.promotion_codes_enabled
  const [code, setCode] = useState<string | null>(null)
  const form = useForm<PromotionForm>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: '',
      discount_percent: 30,
      duration_seconds: 86400,
      redeem_before: '',
    },
  })
  const create = useMutation({
    mutationFn: (values: PromotionForm) =>
      createPromotionCode(toPromotionPayload(targetUserId ?? 0, values)),
    onSuccess: (result) => {
      setCode(result.code)
      void client.invalidateQueries({
        queryKey: ['promotion-codes'],
      })
    },
  })
  return (
    <SideDrawerSection>
      <SideDrawerSectionHeader
        title={t('Create promotion code')}
        description={t(
          'Discounts apply to all models. Each user can redeem a code once, and their discount starts when they redeem it. No wallet credit is added.'
        )}
      />
      {props.userId && (
        <p className='text-sm'>
          {t('Target user ID')}:{' '}
          <span className='font-mono'>{props.userId}</span>
        </p>
      )}
      {promotionsEnabled === false && (
        <Alert>
          <AlertDescription>
            {t(
              'Promotion code discounts are disabled for this user. Enable them before redemption.'
            )}
          </AlertDescription>
        </Alert>
      )}
      {code ? (
        <div className='space-y-3 rounded-xl border p-4'>
          <p className='text-sm font-medium'>
            {t('Copy this code now. It will not be shown again.')}
          </p>
          <div className='flex items-center gap-2'>
            <code className='min-w-0 flex-1 font-mono text-sm break-all'>
              {code}
            </code>
            <CopyButton value={code} aria-label={t('Copy promotion code')} />
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setCode(null)
              create.reset()
            }}
          >
            {t('Create another code')}
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            className='space-y-4'
            onSubmit={form.handleSubmit((values) => {
              if (targetUserId !== undefined) create.mutate(values)
            })}
          >
            {!props.userId && (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='promotion-audience'>{t('Audience')}</Label>
                  <NativeSelect
                    id='promotion-audience'
                    value={audience}
                    onChange={(event) =>
                      setAudience(event.target.value as typeof audience)
                    }
                    disabled={create.isPending}
                    className='w-full'
                  >
                    {root && (
                      <NativeSelectOption value='all_users'>
                        {t('All users')}
                      </NativeSelectOption>
                    )}
                    <NativeSelectOption value='specific_user'>
                      {t('Specific user')}
                    </NativeSelectOption>
                  </NativeSelect>
                </div>
                {audience === 'specific_user' && (
                  <PricingUserSelect
                    value={user}
                    onChange={setUser}
                    disabled={create.isPending}
                  />
                )}
              </div>
            )}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Name (optional)')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={create.isPending}
                      maxLength={128}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='discount_percent'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Discount (% off)')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='number'
                        min='0.01'
                        max='99.99'
                        step='any'
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                        disabled={create.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='duration_seconds'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Duration after redemption')}</FormLabel>
                    <FormControl>
                      <NativeSelect
                        {...field}
                        className='w-full'
                        onChange={(event) =>
                          field.onChange(Number(event.target.value))
                        }
                        disabled={create.isPending}
                      >
                        <NativeSelectOption value={14400}>
                          {t('4 hours')}
                        </NativeSelectOption>
                        <NativeSelectOption value={86400}>
                          {t('24 hours')}
                        </NativeSelectOption>
                        <NativeSelectOption value={604800}>
                          {t('7 days')}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='redeem_before'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Redemption deadline (optional)')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='datetime-local'
                      disabled={create.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {create.error && (
              <p role='alert' className='text-destructive text-sm'>
                {t(create.error.message)}
              </p>
            )}
            <Button
              type='submit'
              disabled={create.isPending || targetUserId === undefined}
            >
              {t('Create code')}
            </Button>
          </form>
        </Form>
      )}
    </SideDrawerSection>
  )
}
