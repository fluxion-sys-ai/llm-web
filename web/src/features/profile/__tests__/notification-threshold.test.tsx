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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { NotificationTab } from '../components/tabs/notification-tab'
import type { UserProfile } from '../types'

const profile: UserProfile = {
  id: 1,
  username: 'alice',
  display_name: 'Alice',
  role: 1,
  group: 'default',
  quota: 1000000,
  used_quota: 0,
  request_count: 0,
  status: 1,
  aff_count: 0,
  aff_quota: 0,
  aff_history_quota: 0,
  created_time: 0,
}
const settings = {
  notify_type: 'webhook',
  quota_warning_threshold: 1200,
  notification_email: '',
  webhook_url: 'https://example.com/notify',
  webhook_secret: 'webhook-secret',
  bark_url: '',
  gotify_url: '',
  gotify_token: '',
  gotify_priority: 5,
  accept_unset_model_ratio_model: true,
  record_ip_log: true,
  upstream_model_update_notify_enabled: true,
}

beforeEach(() => {
  useSystemConfigStore.getState().setConfig({
    currency: { ...DEFAULT_CURRENCY_CONFIG },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  useSystemConfigStore.getState().setConfig({
    currency: { ...DEFAULT_CURRENCY_CONFIG },
  })
})

describe('notification threshold in USD', () => {
  it('displays the existing one-dollar form default when no threshold was saved', () => {
    render(<NotificationTab profile={profile} onUpdate={vi.fn()} />)

    expect(
      screen.getByRole('spinbutton', { name: /^Quota Warning Threshold/ })
    ).toHaveValue(1)
  })

  it('shows 5000 quota as 0.01 USD and preserves it when another setting is saved', async () => {
    const savedSettings = { ...settings, quota_warning_threshold: 5000 }
    const onUpdate = vi.fn()
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...profile, setting: JSON.stringify(savedSettings) },
      },
    })
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    render(
      <NotificationTab
        profile={{ ...profile, setting: JSON.stringify(savedSettings) }}
        onUpdate={onUpdate}
      />
    )

    const threshold = screen.getByRole('spinbutton', {
      name: /^Quota Warning Threshold/,
    })
    expect(threshold).toHaveValue(0.01)
    expect(threshold).toHaveAccessibleName('Quota Warning Threshold (USD)')
    fireEvent.change(screen.getByLabelText('Webhook URL'), {
      target: { value: 'https://example.com/new-webhook' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith('/api/user/setting', {
      ...savedSettings,
      webhook_url: 'https://example.com/new-webhook',
    })
  })

  it.each([
    ['0.25', 125000],
    ['5000', 2500000000],
  ])(
    'converts an entered %s USD to %i raw quota on save',
    async (amount, quota) => {
      const onUpdate = vi.fn()
      vi.spyOn(api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: { ...profile, setting: JSON.stringify(settings) },
        },
      })
      const put = vi
        .spyOn(api, 'put')
        .mockResolvedValue({ data: { success: true } })
      render(
        <NotificationTab
          profile={{ ...profile, setting: JSON.stringify(settings) }}
          onUpdate={onUpdate}
        />
      )

      fireEvent.change(
        screen.getByRole('spinbutton', { name: /^Quota Warning Threshold/ }),
        { target: { value: amount } }
      )
      fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }))

      await waitFor(() => expect(onUpdate).toHaveBeenCalled())
      expect(put).toHaveBeenCalledWith('/api/user/setting', {
        ...settings,
        quota_warning_threshold: quota,
      })
    }
  )

  it('uses the configured quota units per USD without applying the CNY display exchange rate', async () => {
    useSystemConfigStore.getState().setConfig({
      currency: {
        ...DEFAULT_CURRENCY_CONFIG,
        quotaPerUnit: 1000000,
        quotaDisplayType: 'CNY',
        usdExchangeRate: 7,
      },
    })
    const savedSettings = { ...settings, quota_warning_threshold: 5000 }
    const onUpdate = vi.fn()
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...profile, setting: JSON.stringify(savedSettings) },
      },
    })
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    render(
      <NotificationTab
        profile={{ ...profile, setting: JSON.stringify(savedSettings) }}
        onUpdate={onUpdate}
      />
    )

    const threshold = screen.getByRole('spinbutton', {
      name: /^Quota Warning Threshold/,
    })
    expect(threshold).toHaveValue(0.005)
    fireEvent.change(threshold, { target: { value: '0.02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith('/api/user/setting', {
      ...savedSettings,
      quota_warning_threshold: 20000,
    })
  })

  it('preserves a one-quota threshold without rounding its USD display to zero', async () => {
    const savedSettings = { ...settings, quota_warning_threshold: 1 }
    const onUpdate = vi.fn()
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...profile, setting: JSON.stringify(savedSettings) },
      },
    })
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    render(
      <NotificationTab
        profile={{ ...profile, setting: JSON.stringify(savedSettings) }}
        onUpdate={onUpdate}
      />
    )

    expect(
      screen.getByRole('spinbutton', { name: /^Quota Warning Threshold/ })
    ).toHaveValue(0.000002)
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith('/api/user/setting', savedSettings)
  })

  it.each(['', '0', '-1', '0.000001', '99999999999999999'])(
    'prevents saving an invalid USD threshold of "%s"',
    (amount) => {
      const put = vi.spyOn(api, 'put')
      render(
        <NotificationTab
          profile={{ ...profile, setting: JSON.stringify(settings) }}
          onUpdate={vi.fn()}
        />
      )

      const threshold = screen.getByRole('spinbutton', {
        name: /^Quota Warning Threshold/,
      })
      fireEvent.change(threshold, { target: { value: amount } })
      fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }))

      expect(threshold).toHaveAttribute('aria-invalid', 'true')
      expect(
        screen.getByRole('button', { name: 'Save Settings' })
      ).toBeDisabled()
      expect(put).not.toHaveBeenCalled()
    }
  )
})
