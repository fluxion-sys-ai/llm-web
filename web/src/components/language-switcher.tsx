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
import { Languages, Check } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  INTERFACE_LANGUAGE_OPTIONS,
  normalizeInterfaceLanguage,
} from '@/i18n/languages'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

type LanguageSwitcherProps = {
  variant?: 'button' | 'submenu'
}

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const currentLanguage = normalizeInterfaceLanguage(i18n.language)
  const handleChangeLanguage = useCallback(
    async (code: string) => {
      await i18n.changeLanguage(code)
      if (user) {
        try {
          await api.put('/api/user/self', { language: code })
        } catch {
          // Best-effort persistence; don't block the UI on failure
        }
      }
    },
    [i18n, user]
  )

  const languageOptions = (
    <DropdownMenuGroup>
      {INTERFACE_LANGUAGE_OPTIONS.map((lang) => (
        <DropdownMenuItem
          key={lang.code}
          onClick={() => handleChangeLanguage(lang.code)}
          className='gap-3 px-2 py-2'
        >
          {lang.label}
          <Check
            aria-hidden='true'
            className={cn('ms-auto', currentLanguage !== lang.code && 'hidden')}
          />
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  )

  if (props.variant === 'submenu') {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className='gap-3 rounded-lg px-2 py-2'>
          <span
            aria-hidden='true'
            className='bg-brand/8 text-brand flex size-8 shrink-0 items-center justify-center rounded-md'
          >
            <Languages />
          </span>
          {t('Change language')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className='min-w-44' sideOffset={6}>
          {languageOptions}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={<Button variant='ghost' size='icon' className='h-9 w-9' />}
      >
        <Languages className='size-[1.2rem]' />
        <span className='sr-only'>{t('Change language')}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>{languageOptions}</DropdownMenuContent>
    </DropdownMenu>
  )
}
