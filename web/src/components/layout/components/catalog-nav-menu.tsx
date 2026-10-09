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
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

import { desktopTopNavItemClassName } from '../config/top-nav.config'

type CatalogNavMenuProps = {
  id: string
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  mobile?: boolean
  active?: boolean
  children: ReactNode
}

export function CatalogNavMenu(props: CatalogNavMenuProps) {
  if (props.mobile) {
    return (
      <Collapsible open={props.open} onOpenChange={props.onOpenChange}>
        <CollapsibleTrigger
          aria-current={props.active ? 'page' : undefined}
          render={
            <Button
              variant='ghost'
              className={cn(
                'group h-auto w-full justify-between px-0 py-3 text-base font-medium',
                props.active ? 'text-foreground' : 'text-muted-foreground'
              )}
            />
          }
        >
          {props.label}
          <ChevronDown
            aria-hidden='true'
            className='size-4 transition-transform group-data-panel-open:rotate-180'
          />
        </CollapsibleTrigger>
        <CollapsibleContent className='pb-2 pl-2'>
          {props.children}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <NavigationMenu
      value={props.open ? props.id : null}
      onValueChange={(value) => props.onOpenChange(value === props.id)}
      className='flex-none'
    >
      <NavigationMenuList>
        <NavigationMenuItem value={props.id}>
          <NavigationMenuTrigger
            aria-current={props.active ? 'page' : undefined}
            className={cn(
              desktopTopNavItemClassName,
              'hover:text-foreground focus-visible:text-foreground relative [&>svg]:absolute [&>svg]:top-auto [&>svg]:right-1 [&>svg]:ml-0',
              props.active ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {props.label}
          </NavigationMenuTrigger>
          <NavigationMenuContent className='w-80 max-w-[calc(100vw-3rem)]'>
            {props.children}
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
