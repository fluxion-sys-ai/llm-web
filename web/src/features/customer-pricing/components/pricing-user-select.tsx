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
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { searchUsers } from '@/features/users/api'
import type { User } from '@/features/users/types'
import { useDebounce } from '@/hooks/use-debounce'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export type PricingUser = Pick<User, 'id' | 'username' | 'role'>

export function PricingUserSelect(props: {
  value: PricingUser | null
  onChange: (user: PricingUser | null) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  const anchor = useComboboxAnchor()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const keyword = useDebounce(search, 200)
  const role = useAuthStore((state) => state.auth.user?.role ?? 0)
  const query = useQuery({
    queryKey: ['pricing-user-search', keyword, role],
    queryFn: async () => {
      const response = await searchUsers({ keyword, page_size: 20 })
      if (!response.success) {
        throw new Error(response.message || 'Request failed')
      }
      return (response.data?.items ?? []).filter(
        (user) => role === ROLE.SUPER_ADMIN || role > user.role
      )
    },
  })
  const label = (user: PricingUser) => `${user.username} · #${user.id}`
  const selectedLabel = props.value ? label(props.value) : ''
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{t('User')}</Label>
      <Combobox<PricingUser>
        items={query.data ?? []}
        value={props.value}
        onValueChange={props.onChange}
        itemToStringLabel={label}
        isItemEqualToValue={(item, value) => item.id === value.id}
        filter={null}
        disabled={props.disabled}
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          setSearch('')
        }}
        inputValue={open ? search : selectedLabel}
        onInputValueChange={(value, details) => {
          if (details.reason === 'input-change') setSearch(value)
        }}
      >
        <div ref={anchor}>
          <ComboboxInput
            id={id}
            className='w-full'
            disabled={props.disabled}
            placeholder={t('Search by user ID or username')}
            triggerAriaLabel={t('Select user')}
          />
        </div>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>
            {query.isFetching ? t('Loading...') : t('No users found')}
          </ComboboxEmpty>
          <ComboboxList>
            {(user: PricingUser) => (
              <ComboboxItem key={user.id} value={user}>
                {label(user)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {query.isError && <ErrorState onRetry={() => void query.refetch()} />}
    </div>
  )
}
