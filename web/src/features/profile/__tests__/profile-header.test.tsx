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
import { act, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { afterEach, describe, expect, it } from 'vitest'

import { ProfileHeader } from '../components/profile-header'
import type { UserProfile } from '../types'

const profile: UserProfile = {
  id: 1,
  username: 'alice',
  display_name: 'Alice',
  role: 1,
  group: 'default',
  quota: 1000000,
  used_quota: 0,
  request_count: 12000,
  status: 1,
  aff_count: 0,
  aff_quota: 0,
  aff_history_quota: 0,
  created_time: 0,
}

afterEach(async () => {
  await act(async () => {
    await i18next.changeLanguage('en')
  })
  i18next.removeResourceBundle('zhCN', 'translation')
})

describe('profile request count', () => {
  it('updates compact request units immediately when the interface language changes', async () => {
    i18next.addResourceBundle('zhCN', 'translation', {
      'API Requests': 'API 请求',
    })
    await i18next.changeLanguage('en')
    render(<ProfileHeader profile={profile} loading={false} />)

    expect(screen.getByText('12K')).toBeInTheDocument()

    await act(async () => {
      await i18next.changeLanguage('zhCN')
    })

    expect(screen.getByText('API 请求')).toBeInTheDocument()
    expect(screen.getByText('1.2万')).toBeInTheDocument()
    expect(screen.queryByText('12K')).not.toBeInTheDocument()

    await act(async () => {
      await i18next.changeLanguage('en')
    })

    expect(screen.getByText('12K')).toBeInTheDocument()
    expect(screen.queryByText('1.2万')).not.toBeInTheDocument()
  })
})
