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
import { Grid2X2, Layers } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NavigationMenuLink } from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

import { CatalogNavMenu } from './catalog-nav-menu'

type ModelsNavMenuProps = {
  mobile?: boolean
  active?: boolean
  onNavigate?: () => void
}

type ModelCategoryLinkProps = {
  mobile: boolean
  category: 'llm' | 'multimodal'
  onNavigate: () => void
}

function ModelCategoryLink(props: ModelCategoryLinkProps) {
  const { t } = useTranslation()
  const multimodal = props.category === 'multimodal'
  const multimodalUrl = 'https://multimodal.fluxion-sys.ai/'
  const label = multimodal ? t('Multimodal') : 'LLM'
  const Icon = multimodal ? Layers : Grid2X2
  const content = (
    <>
      <span
        aria-hidden='true'
        className='flex size-8 shrink-0 items-center justify-center'
      >
        <Icon className='text-brand size-5' />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
          <span className='text-foreground min-w-0 truncate font-medium'>
            {label}
          </span>
        </span>
        <span className='text-muted-foreground block truncate text-xs'>
          {t('Models & Pricing')}
        </span>
      </span>
    </>
  )
  const className =
    'hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring/50 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none focus-visible:ring-2'

  if (props.mobile) {
    if (multimodal) {
      return (
        <a
          href={multimodalUrl}
          className={className}
          onClick={props.onNavigate}
        >
          {content}
        </a>
      )
    }
    return (
      <Link to='/pricing' className={className} onClick={props.onNavigate}>
        {content}
      </Link>
    )
  }

  return (
    <NavigationMenuLink
      closeOnClick
      render={multimodal ? <a href={multimodalUrl} /> : <Link to='/pricing' />}
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
  const mobile = props.mobile ?? false

  const handleNavigate = () => {
    setOpen(false)
    props.onNavigate?.()
  }

  return (
    <CatalogNavMenu
      id='models'
      label={t('Models')}
      mobile={mobile}
      active={props.active}
      open={open}
      onOpenChange={setOpen}
    >
      <ModelCategoryLink
        category='llm'
        mobile={mobile}
        onNavigate={handleNavigate}
      />
      <ModelCategoryLink
        category='multimodal'
        mobile={mobile}
        onNavigate={handleNavigate}
      />
    </CatalogNavMenu>
  )
}
