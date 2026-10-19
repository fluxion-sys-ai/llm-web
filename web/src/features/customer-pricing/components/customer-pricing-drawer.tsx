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
import { useTranslation } from 'react-i18next'

import {
  sideDrawerContentClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ADMIN_PERMISSION_ACTIONS,
  ADMIN_PERMISSION_RESOURCES,
  hasPermission,
} from '@/lib/admin-permissions'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { getCustomerPricing } from '../api'
import { CreatePromotionForm } from './create-promotion-form'
import { ModelPricesEditor } from './model-prices-editor'
import { PromotionCodesList } from './promotion-codes-list'

export function CustomerPricingDrawer(props: {
  user: { id: number; username: string; role: number }
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const currentUser = useAuthStore((state) => state.auth.user)
  const isAdmin =
    (currentUser?.role ?? 0) >= ROLE.ADMIN &&
    (currentUser?.role === ROLE.SUPER_ADMIN ||
      (currentUser?.role ?? 0) > props.user.role)
  const canRead =
    isAdmin &&
    hasPermission(
      currentUser,
      ADMIN_PERMISSION_RESOURCES.CUSTOMER_PRICING,
      ADMIN_PERMISSION_ACTIONS.READ
    )
  const canWrite =
    isAdmin &&
    hasPermission(
      currentUser,
      ADMIN_PERMISSION_RESOURCES.CUSTOMER_PRICING,
      ADMIN_PERMISSION_ACTIONS.WRITE
    )
  const pricing = useQuery({
    queryKey: ['customer-pricing', props.user.id],
    queryFn: () => getCustomerPricing(props.user.id),
    enabled: props.open && canRead,
  })
  if (!canRead) return null
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className={sideDrawerContentClassName('sm:max-w-2xl')}>
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>{t('Pricing & promotions')}</SheetTitle>
          <SheetDescription>
            {props.user.username} · {t('User ID')}: {props.user.id}
          </SheetDescription>
        </SheetHeader>
        <div className={sideDrawerFormClassName()}>
          {pricing.isPending && <LoadingState />}
          {pricing.isError && (
            <ErrorState onRetry={() => void pricing.refetch()} />
          )}
          {pricing.data && (
            <>
              <ModelPricesEditor pricing={pricing.data} canWrite={canWrite} />
              {canWrite && (
                <CreatePromotionForm
                  userId={props.user.id}
                  enabled={pricing.data.promotion_codes_enabled}
                />
              )}
              <PromotionCodesList
                userId={props.user.id}
                enabled={pricing.data.promotion_codes_enabled}
                canWrite={canWrite}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
