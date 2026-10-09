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
import { Link } from '@tanstack/react-router'
import { Grid2X2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Badge } from '@/components/ui/badge'
import { NavigationMenuLink } from '@/components/ui/navigation-menu'
import { Separator } from '@/components/ui/separator'
import { useLlmCatalog } from '@/features/pricing/hooks/use-llm-catalog'
import type { PricingModel } from '@/features/pricing/types'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { CatalogNavMenu } from './catalog-nav-menu'

type ModelsNavMenuProps = {
  mobile?: boolean
  active?: boolean
  onNavigate?: () => void
}

type ModelMenuLinkProps = {
  mobile: boolean
  model?: PricingModel
  onNavigate: () => void
}

function ModelMenuLink(props: ModelMenuLinkProps) {
  const { t } = useTranslation()
  const destination = props.model
    ? {
        to: '/pricing/$modelId' as const,
        params: { modelId: props.model.model_name },
      }
    : { to: '/pricing' as const }
  const label = props.model
    ? props.model.display_name || props.model.model_name
    : t('All Models')
  const subtitle = props.model ? props.model.vendor_name : t('Models & Pricing')
  const content = (
    <>
      <span
        aria-hidden='true'
        className='flex size-8 shrink-0 items-center justify-center'
      >
        {props.model ? (
          getLobeIcon(props.model.icon || props.model.vendor_icon, 22)
        ) : (
          <Grid2X2 className='text-brand size-5' />
        )}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
          <span className='text-foreground min-w-0 truncate font-medium'>
            {label}
          </span>
          {props.model?.availability === 'coming_soon' && (
            <Badge variant='outline'>{t('Coming soon')}</Badge>
          )}
        </span>
        {subtitle && (
          <span className='text-muted-foreground block truncate text-xs'>
            {subtitle}
          </span>
        )}
      </span>
    </>
  )
  const className =
    'hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring/50 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none focus-visible:ring-2'

  if (props.mobile) {
    return (
      <Link {...destination} className={className} onClick={props.onNavigate}>
        {content}
      </Link>
    )
  }

  return (
    <NavigationMenuLink
      closeOnClick
      render={<Link {...destination} />}
      className={cn(className, "[&_svg:not([class*='size-'])]:size-[22px]")}
      onClick={props.onNavigate}
    >
      {content}
    </NavigationMenuLink>
  )
}

export function ModelsNavMenu(props: ModelsNavMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { models, isLoading, error, refetch } = useLlmCatalog(open)
  const orderedModels = useMemo(
    () =>
      [...models].sort(
        (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      ),
    [models]
  )
  const mobile = props.mobile ?? false

  const handleNavigate = () => {
    setOpen(false)
    props.onNavigate?.()
  }

  let modelItems: ReactNode
  if (isLoading) {
    modelItems = <LoadingState size='sm' className='min-h-24 py-4' />
  } else if (error) {
    modelItems = (
      <ErrorState
        title={t('Failed to load models')}
        className='min-h-0 gap-3 p-4'
        onRetry={() => {
          void refetch()
        }}
      />
    )
  } else if (orderedModels.length === 0) {
    modelItems = (
      <EmptyState title={t('No models found')} className='min-h-0 gap-3 p-4' />
    )
  } else {
    modelItems = orderedModels.map((model) => (
      <ModelMenuLink
        key={model.model_name}
        model={model}
        mobile={mobile}
        onNavigate={handleNavigate}
      />
    ))
  }

  const menuContent = (
    <>
      <ModelMenuLink mobile={mobile} onNavigate={handleNavigate} />
      <Separator className='my-1' />
      <div className='max-h-[min(24rem,calc(100dvh-10rem))] overflow-y-auto overscroll-contain'>
        {modelItems}
      </div>
    </>
  )

  return (
    <CatalogNavMenu
      id='models'
      label={t('Models')}
      mobile={mobile}
      active={props.active}
      open={open}
      onOpenChange={setOpen}
    >
      {menuContent}
    </CatalogNavMenu>
  )
}
