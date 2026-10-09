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
import { Cpu } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SiNvidia } from 'react-icons/si'

import { NavigationMenuLink } from '@/components/ui/navigation-menu'
import { Separator } from '@/components/ui/separator'
import { gpuCatalog } from '@/features/gpu/data'

import { CatalogNavMenu } from './catalog-nav-menu'

type GpuNavMenuProps = {
  mobile?: boolean
  active?: boolean
  onNavigate?: () => void
}

type GpuMenuLinkProps = {
  gpu?: (typeof gpuCatalog)[number]
  mobile: boolean
  onNavigate: () => void
}

function GpuMenuLink(props: GpuMenuLinkProps) {
  const { t } = useTranslation()
  const destination = { to: '/gpu' as const, search: { gpu: props.gpu?.id } }
  const content = (
    <>
      <span
        aria-hidden='true'
        className='flex size-8 shrink-0 items-center justify-center'
      >
        {props.gpu ? (
          <SiNvidia className='size-5 text-[#76b900]' />
        ) : (
          <Cpu className='size-5 text-[#76b900]' />
        )}
      </span>
      <span className='min-w-0'>
        <span className='text-foreground block truncate font-medium'>
          {props.gpu?.name ?? t('All GPUs')}
        </span>
        {props.gpu && (
          <span className='text-muted-foreground block truncate text-xs'>
            {props.gpu.vendor} · {props.gpu.vramGb} GB
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
      className={className}
      onClick={props.onNavigate}
    >
      {content}
    </NavigationMenuLink>
  )
}

export function GpuNavMenu(props: GpuNavMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const mobile = props.mobile ?? false
  const handleNavigate = () => {
    setOpen(false)
    props.onNavigate?.()
  }

  return (
    <CatalogNavMenu
      id='gpu'
      label={t('GPU')}
      mobile={mobile}
      active={props.active}
      open={open}
      onOpenChange={setOpen}
    >
      <GpuMenuLink mobile={mobile} onNavigate={handleNavigate} />
      <Separator className='my-1' />
      <div className='max-h-[min(24rem,calc(100dvh-10rem))] overflow-y-auto overscroll-contain'>
        {gpuCatalog.map((gpu) => (
          <GpuMenuLink
            key={gpu.id}
            gpu={gpu}
            mobile={mobile}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </CatalogNavMenu>
  )
}
