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
import { BookOpen, Newspaper } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NavigationMenuLink } from '@/components/ui/navigation-menu'
import { useStatus } from '@/hooks/use-status'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'

import { CatalogNavMenu } from './catalog-nav-menu'

type ResourcesNavMenuProps = {
  mobile?: boolean
  active?: boolean
  onNavigate?: () => void
}

export function ResourcesNavMenu(props: ResourcesNavMenuProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [open, setOpen] = useState(false)
  const modules = parseHeaderNavModulesFromStatus(
    status as Record<string, unknown> | null
  )
  const links = [
    { title: t('Blog'), to: '/blog' as const, icon: Newspaper },
    ...(modules.docs
      ? [{ title: t('Docs'), to: '/docs' as const, icon: BookOpen }]
      : []),
  ]
  const handleNavigate = () => {
    setOpen(false)
    props.onNavigate?.()
  }

  return (
    <CatalogNavMenu
      id='resources'
      label={t('Resources')}
      mobile={props.mobile}
      active={props.active}
      open={open}
      onOpenChange={setOpen}
    >
      {links.map(({ title, to, icon: Icon }) => {
        const content = (
          <>
            <span
              aria-hidden='true'
              className='bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg'
            >
              <Icon className='text-muted-foreground size-4' />
            </span>
            <span className='text-foreground font-medium'>{title}</span>
          </>
        )
        const className =
          'hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring/50 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none focus-visible:ring-2'
        if (props.mobile) {
          return (
            <Link
              key={to}
              to={to}
              className={className}
              onClick={handleNavigate}
            >
              {content}
            </Link>
          )
        }
        return (
          <NavigationMenuLink
            key={to}
            closeOnClick
            render={<Link to={to} />}
            className={className}
            onClick={handleNavigate}
          >
            {content}
          </NavigationMenuLink>
        )
      })}
    </CatalogNavMenu>
  )
}
