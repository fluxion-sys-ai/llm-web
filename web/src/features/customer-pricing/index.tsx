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
import { skipToken, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ADMIN_PERMISSION_ACTIONS,
  ADMIN_PERMISSION_RESOURCES,
  hasPermission,
} from '@/lib/admin-permissions'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { getCustomerPricing } from './api'
import { CreatePromotionForm } from './components/create-promotion-form'
import { ModelPricesEditor } from './components/model-prices-editor'
import {
  PricingUserSelect,
  type PricingUser,
} from './components/pricing-user-select'
import { PromotionCodesList } from './components/promotion-codes-list'

function CustomerPricingTab(props: { canWrite: boolean }) {
  const { t } = useTranslation()
  const [user, setUser] = useState<PricingUser | null>(null)
  const pricing = useQuery({
    queryKey: ['customer-pricing', user?.id],
    queryFn: user ? () => getCustomerPricing(user.id) : skipToken,
    enabled: user !== null,
  })
  return (
    <div className='max-w-3xl space-y-6'>
      <PricingUserSelect value={user} onChange={setUser} />
      {!user && (
        <p className='text-muted-foreground text-sm'>
          {t('Select a user to manage model rates and promotion eligibility.')}
        </p>
      )}
      {user && pricing.isPending && <LoadingState />}
      {user && pricing.isError && (
        <ErrorState onRetry={() => void pricing.refetch()} />
      )}
      {pricing.data && (
        <ModelPricesEditor
          key={user?.id}
          pricing={pricing.data}
          canWrite={props.canWrite}
        />
      )}
    </div>
  )
}

export function CustomerPricingPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const canRead =
    (user?.role ?? 0) >= ROLE.ADMIN &&
    hasPermission(
      user,
      ADMIN_PERMISSION_RESOURCES.CUSTOMER_PRICING,
      ADMIN_PERMISSION_ACTIONS.READ
    )
  const canWrite = hasPermission(
    user,
    ADMIN_PERMISSION_RESOURCES.CUSTOMER_PRICING,
    ADMIN_PERMISSION_ACTIONS.WRITE
  )
  if (!canRead) return null
  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Pricing & promotions')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Description>
        {t('Manage promotion codes and individual customer rates.')}
      </SectionPageLayout.Description>
      <SectionPageLayout.Content>
        <Tabs defaultValue='promotions' className='gap-6'>
          <TabsList aria-label={t('Pricing & promotions')}>
            <TabsTrigger value='promotions'>{t('Promotion codes')}</TabsTrigger>
            <TabsTrigger value='customers'>{t('Customer pricing')}</TabsTrigger>
          </TabsList>
          <TabsContent value='promotions' className='space-y-8'>
            {canWrite && (
              <div className='max-w-2xl rounded-xl border p-5'>
                <CreatePromotionForm />
              </div>
            )}
            <PromotionCodesList enabled canWrite={canWrite} />
          </TabsContent>
          <TabsContent value='customers'>
            <CustomerPricingTab canWrite={canWrite} />
          </TabsContent>
        </Tabs>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
