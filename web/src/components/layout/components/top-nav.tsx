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
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { isTopNavActive } from '../lib/url-utils'
import type { TopNavLink } from '../types'
import { GpuNavMenu } from './gpu-nav-menu'
import { ModelsNavMenu } from './models-nav-menu'
import { ResourcesNavMenu } from './resources-nav-menu'

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
  links: TopNavLink[]
}

/**
 * 顶部导航栏组件
 * 在大屏幕显示水平导航，在小屏幕显示下拉菜单
 */
export function TopNav({ className, links, ...props }: TopNavProps) {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  // 规范化链接，确保所有可选属性都有默认值
  const normalizedLinks = useMemo(
    () =>
      links.map((link) => ({
        disabled: false,
        external: false,
        ...link,
        isActive:
          link.isActive ??
          (!link.external && isTopNavActive(pathname, link.href)),
      })),
    [links, pathname]
  )

  return (
    <>
      {/* 移动端下拉菜单 */}
      <div className='lg:hidden'>
        <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
          <PopoverTrigger
            render={
              <Button
                size='icon'
                variant='outline'
                className='size-8'
                aria-label={t('Toggle navigation menu')}
              />
            }
          >
            <Menu />
          </PopoverTrigger>
          <PopoverContent
            align='start'
            className='max-h-[calc(100dvh-6rem)] w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto'
          >
            <nav aria-label={t('Navigation')}>
              {normalizedLinks.map(
                ({
                  title,
                  href,
                  isActive,
                  disabled,
                  external,
                  requiresAuth,
                }) => {
                  const closeMenu = () => setMobileOpen(false)
                  if (
                    href === '/pricing' &&
                    !external &&
                    !disabled &&
                    !requiresAuth
                  ) {
                    return (
                      <ModelsNavMenu
                        key={`${title}-${href}`}
                        mobile
                        active={isActive}
                        onNavigate={closeMenu}
                      />
                    )
                  }
                  if (
                    href === '/gpu' &&
                    !external &&
                    !disabled &&
                    !requiresAuth
                  ) {
                    return (
                      <GpuNavMenu
                        key={`${title}-${href}`}
                        mobile
                        active={isActive}
                        onNavigate={closeMenu}
                      />
                    )
                  }
                  if (
                    href === '/blog' &&
                    !external &&
                    !disabled &&
                    !requiresAuth
                  ) {
                    return (
                      <ResourcesNavMenu
                        key={`${title}-${href}`}
                        mobile
                        active={isActive}
                        onNavigate={closeMenu}
                      />
                    )
                  }
                  const linkClassName = cn(
                    'flex rounded-lg py-3 text-base font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                    disabled && 'pointer-events-none opacity-50'
                  )
                  return external ? (
                    <a
                      key={`${title}-${href}`}
                      href={href}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-disabled={disabled}
                      tabIndex={disabled ? -1 : undefined}
                      className={linkClassName}
                      onClick={(event) => {
                        if (disabled) {
                          event.preventDefault()
                          return
                        }
                        closeMenu()
                      }}
                    >
                      {title}
                    </a>
                  ) : (
                    <Link
                      key={`${title}-${href}`}
                      to={href}
                      aria-current={isActive ? 'page' : undefined}
                      activeOptions={{ exact: true }}
                      className={linkClassName}
                      disabled={disabled}
                      onClick={closeMenu}
                    >
                      {title}
                    </Link>
                  )
                }
              )}
            </nav>
          </PopoverContent>
        </Popover>
      </div>

      {/* 桌面端水平导航 */}
      <nav
        className={cn('hidden items-center gap-5 lg:flex xl:gap-6', className)}
        {...props}
      >
        {normalizedLinks.map(
          ({ title, href, isActive, disabled, external, requiresAuth }) => {
            if (
              href === '/pricing' &&
              !external &&
              !disabled &&
              !requiresAuth
            ) {
              return (
                <ModelsNavMenu key={`${title}-${href}`} active={isActive} />
              )
            }

            if (href === '/gpu' && !external && !disabled && !requiresAuth) {
              return <GpuNavMenu key={`${title}-${href}`} active={isActive} />
            }

            if (href === '/blog' && !external && !disabled && !requiresAuth) {
              return (
                <ResourcesNavMenu key={`${title}-${href}`} active={isActive} />
              )
            }

            return external ? (
              <a
                key={`${title}-${href}`}
                href={href}
                target='_blank'
                rel='noopener noreferrer'
                className={`hover:text-foreground text-sm font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {title}
              </a>
            ) : (
              <Link
                key={`${title}-${href}`}
                to={href}
                aria-current={isActive ? 'page' : undefined}
                activeOptions={{ exact: true }}
                disabled={disabled}
                className={`hover:text-foreground text-sm font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {title}
              </Link>
            )
          }
        )}
      </nav>
    </>
  )
}
