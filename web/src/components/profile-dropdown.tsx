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
import { useNavigate } from '@tanstack/react-router'
import { User, Wallet, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useDialogState from '@/hooks/use-dialog'
import { useIsSidebarModuleVisible } from '@/hooks/use-sidebar-config'
import { useUserDisplay } from '@/hooks/use-user-display'
import { getUserAvatarFallback } from '@/lib/avatar'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

const avatarFallbackClassName = 'bg-primary text-primary-foreground font-medium'
const menuIconClassName =
  'bg-brand/8 text-brand flex size-8 shrink-0 items-center justify-center rounded-md'
const menuItemClassName = 'gap-3 rounded-lg px-2 py-2'

export function ProfileDropdown() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useDialogState()
  const user = useAuthStore((state) => state.auth.user)
  const { displayName, roleLabel } = useUserDisplay(user)
  const isSuperAdmin = user?.role === ROLE.SUPER_ADMIN
  const isWalletVisible = useIsSidebarModuleVisible('/wallet')
  const isSecurityVisible = useIsSidebarModuleVisible('/security')
  const avatarName = user?.username || displayName
  const avatarFallback = getUserAvatarFallback(avatarName)

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={t('Profile')}
          openOnHover
          closeDelay={150}
          render={
            <Button
              variant='ghost'
              className='h-10 gap-2 rounded-full p-1 sm:h-11 sm:pl-3'
            />
          }
        >
          <span className='hidden max-w-40 truncate text-sm font-medium sm:block md:hidden lg:block'>
            {displayName}
          </span>
          <Avatar className='size-8 sm:size-9'>
            <AvatarFallback className={`${avatarFallbackClassName} text-xs`}>
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          sideOffset={8}
          className='w-64 max-w-[calc(100vw-2rem)] p-1.5'
        >
          <div className='flex items-center gap-3 px-2 py-2.5'>
            <Avatar className='size-9'>
              <AvatarFallback className={`${avatarFallbackClassName} text-xs`}>
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-col gap-0.5 overflow-hidden'>
              <p className='text-foreground truncate text-sm font-medium'>
                {displayName}
              </p>
              <div className='flex items-center gap-1.5'>
                <span className='text-muted-foreground text-xs'>
                  {roleLabel}
                </span>
                {user?.group && (
                  <>
                    <span className='text-muted-foreground text-xs'>·</span>
                    <span className='text-muted-foreground truncate text-xs'>
                      {String(user.group)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              className={menuItemClassName}
              onClick={() => navigate({ to: '/profile' })}
            >
              <span aria-hidden='true' className={menuIconClassName}>
                <User />
              </span>
              {t('Profile')}
            </DropdownMenuItem>

            {isSecurityVisible && (
              <DropdownMenuItem
                className={menuItemClassName}
                onClick={() => navigate({ to: '/security' })}
              >
                <span aria-hidden='true' className={menuIconClassName}>
                  <ShieldCheck />
                </span>
                {t('Security & Access')}
              </DropdownMenuItem>
            )}

            {isWalletVisible && (
              <DropdownMenuItem
                className={menuItemClassName}
                onClick={() => navigate({ to: '/wallet' })}
              >
                <span aria-hidden='true' className={menuIconClassName}>
                  <Wallet />
                </span>
                {t('Wallet')}
              </DropdownMenuItem>
            )}

            {isSuperAdmin && (
              <DropdownMenuItem
                className={menuItemClassName}
                onClick={() =>
                  navigate({
                    to: '/system-settings/site/$section',
                    params: { section: 'system-info' },
                  })
                }
              >
                <span aria-hidden='true' className={menuIconClassName}>
                  <Settings />
                </span>
                {t('System Settings')}
              </DropdownMenuItem>
            )}

            <LanguageSwitcher variant='submenu' />
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              className={menuItemClassName}
              variant='destructive'
              onClick={() => setOpen(true)}
            >
              <span
                aria-hidden='true'
                className='bg-destructive/10 flex size-8 shrink-0 items-center justify-center rounded-md'
              >
                <LogOut />
              </span>
              {t('Sign out')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
