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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import zhTW from '@/i18n/locales/zh-TW.json'
import zhCN from '@/i18n/locales/zh.json'
import { api } from '@/lib/api'

import {
  SettingsPageFormActions,
  SettingsPageProvider,
} from '../../components/settings-page-context'
import { getSecuritySectionContent } from '../../security/section-registry'
import type { SecuritySettings } from '../../types'
import {
  createLLMUsageLimitSchema,
  defaultLLMUsageLimitPolicy,
  defaultLLMUsageRules,
} from '../lib/llm-usage-limit-policy'
import { LLMUsageLimitSection } from '../llm-usage-limit-section'

const clients: QueryClient[] = []
const containers: HTMLDivElement[] = []

function renderSettings(content: ReactNode) {
  const actions = document.createElement('div')
  document.body.append(actions)
  containers.push(actions)
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  clients.push(client)
  const rendered = render(
    <QueryClientProvider client={client}>
      <SettingsPageProvider actionsContainer={actions}>
        {content}
      </SettingsPageProvider>
    </QueryClientProvider>
  )
  return { ...rendered, actions }
}

function renderPolicy(value = JSON.stringify(defaultLLMUsageLimitPolicy)) {
  return renderSettings(<LLMUsageLimitSection defaultValue={value} />)
}

beforeEach(async () => {
  i18next.addResourceBundle('zhCN', 'translation', zhCN.translation)
  i18next.addResourceBundle('zhTW', 'translation', zhTW.translation)
  await act(() => i18next.changeLanguage('en'))
})
afterEach(async () => {
  await act(() => i18next.changeLanguage('en'))
  i18next.removeResourceBundle('zhCN', 'translation')
  i18next.removeResourceBundle('zhTW', 'translation')
  for (const client of clients.splice(0)) client.clear()
  for (const container of containers.splice(0)) container.remove()
})

describe('Model usage policy configuration', () => {
  test('shared form actions still appear in the page header by default', () => {
    const save = vi.fn()
    const { actions } = renderSettings(
      <SettingsPageFormActions onSave={save} />
    )

    fireEvent.click(
      within(actions).getByRole('button', { name: 'Save Changes' })
    )

    expect(save).toHaveBeenCalledOnce()
  })

  test.each([
    {
      language: 'zhCN',
      enableLabel: '启用默认模型用量限制',
      saveLabel: '保存模型用量限制',
      refillLabel: '补充周期（秒）',
    },
    {
      language: 'zhTW',
      enableLabel: '啟用預設模型用量限制',
      saveLabel: '儲存模型用量限制',
      refillLabel: '補充週期（秒）',
    },
  ])('updates policy labels when switching to $language', async (labels) => {
    renderPolicy()
    expect(
      screen.getByRole('switch', { name: 'Enable default model usage limits' })
    ).toBeVisible()

    await act(() => i18next.changeLanguage(labels.language))

    expect(
      screen.getByRole('switch', { name: labels.enableLabel })
    ).toBeVisible()
    expect(screen.getByRole('button', { name: labels.saveLabel })).toBeVisible()
    expect(
      screen.getByRole('spinbutton', { name: labels.refillLabel })
    ).toBeVisible()
  })

  test('saves only the LLM policy with actual bucket quantities and leaves the feature disabled', async () => {
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true, message: '' } })
    renderPolicy()
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: /Burst capacity.*Output tokens/,
      }),
      { target: { value: '6000' } }
    )
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: /Refill per period.*Output tokens/,
      }),
      { target: { value: '1000' } }
    )
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Refill period (seconds)' }),
      { target: { value: '300' } }
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    await waitFor(() => expect(put).toHaveBeenCalledOnce())
    expect(put).toHaveBeenCalledWith('/api/option/', {
      key: 'LLMUsageLimitPolicy',
      value: JSON.stringify({
        ...defaultLLMUsageRules,
        counter_epoch: 0,
        refill_period_seconds: 300,
        output: { capacity: 6000, refill: 1000 },
      }),
    })
    expect(
      screen.getByRole('switch', { name: 'Enable default model usage limits' })
    ).not.toBeChecked()
  })

  test('blocks an enabled policy without a bucket and a cleared number instead of treating it as zero', async () => {
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true, message: '' } })
    renderPolicy()
    fireEvent.click(
      screen.getByRole('switch', { name: 'Enable default model usage limits' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    expect(
      await screen.findByText(
        'Configure at least one bucket before enabling model usage limits.'
      )
    ).toBeVisible()
    const capacity = screen.getByRole('spinbutton', {
      name: /Burst capacity.*Output tokens/,
    })
    fireEvent.change(capacity, { target: { value: '' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    await waitFor(() =>
      expect(capacity).toHaveAttribute('aria-invalid', 'true')
    )
    expect(put).not.toHaveBeenCalled()
  })

  test('preserves the policy revision without exposing a counter reset', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true, message: '' },
    })
    const saved = { ...defaultLLMUsageLimitPolicy, counter_epoch: 7 }
    renderPolicy(JSON.stringify(saved))
    expect(
      screen.queryByRole('spinbutton', { name: 'Counter generation' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Advanced: reset usage counters')
    ).not.toBeInTheDocument()
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Refill period (seconds)' }),
      { target: { value: '300' } }
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    await waitFor(() => expect(put).toHaveBeenCalledOnce())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(put).toHaveBeenCalledWith('/api/option/', {
      key: 'LLMUsageLimitPolicy',
      value: JSON.stringify({
        ...defaultLLMUsageRules,
        counter_epoch: 7,
        refill_period_seconds: 300,
      }),
    })
  })

  test.each([false, true])(
    'saves a default policy toggle against an older hub when initially enabled=%s',
    async (enabled) => {
      const legacyPolicy = {
        ...defaultLLMUsageRules,
        enabled,
        output: { capacity: 100, refill: 20 },
        counter_epoch: 7,
      }
      const put = vi.spyOn(api, 'put').mockImplementation(async (_, body) => {
        const policy = JSON.parse((body as { value: string }).value)
        if ('user_overrides' in policy) {
          return {
            data: {
              success: false,
              message: 'unknown LLM usage limit field user_overrides',
            },
          }
        }
        return { data: { success: true } }
      })
      renderPolicy(JSON.stringify(legacyPolicy))

      fireEvent.click(
        screen.getByRole('switch', {
          name: 'Enable default model usage limits',
        })
      )
      fireEvent.click(
        screen.getByRole('button', { name: 'Save model usage limits' })
      )

      await waitFor(() => expect(put).toHaveBeenCalledOnce())
      expect(
        JSON.parse((put.mock.calls[0][1] as { value: string }).value)
      ).toEqual({
        ...legacyPolicy,
        enabled: !enabled,
      })
      expect(
        screen.queryByText('unknown LLM usage limit field user_overrides')
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('switch', {
          name: 'Enable default model usage limits',
        })
      ).toHaveAttribute('aria-checked', String(!enabled))
    }
  )

  test('the combined rate-limit page keeps each save in its labelled form and preserves the other form edits', async () => {
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    const settings: SecuritySettings = {
      LLMUsageLimitPolicy: JSON.stringify(defaultLLMUsageLimitPolicy),
      ModelRequestRateLimitEnabled: false,
      ModelRequestRateLimitCount: 0,
      ModelRequestRateLimitSuccessCount: 1000,
      ModelRequestRateLimitDurationMinutes: 1,
      ModelRequestRateLimitGroup: '',
      CheckSensitiveEnabled: false,
      CheckSensitiveOnPromptEnabled: false,
      SensitiveWords: '',
      'fetch_setting.enable_ssrf_protection': true,
      'fetch_setting.allow_private_ip': false,
      'fetch_setting.domain_filter_mode': false,
      'fetch_setting.ip_filter_mode': false,
      'fetch_setting.domain_list': [],
      'fetch_setting.ip_list': [],
      'fetch_setting.allowed_ports': [],
      'fetch_setting.apply_ip_filter_for_domain': false,
      'token_setting.max_user_tokens': 1000,
    }
    const { actions } = renderSettings(
      getSecuritySectionContent('rate-limit', settings)
    )
    const rateForm = within(screen.getByRole('form', { name: 'Rate Limiting' }))
    const usageForm = within(
      screen.getByRole('form', { name: 'Model usage limits' })
    )
    expect(screen.getByRole('heading', { name: 'Rate Limiting' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Model usage limits' })
    ).toBeVisible()
    expect(within(actions).queryByRole('button')).not.toBeInTheDocument()
    const rateSave = rateForm.getByRole('button', { name: 'Save rate limits' })
    const usageSave = usageForm.getByRole('button', {
      name: 'Save model usage limits',
    })
    const rateCount = rateForm.getByDisplayValue('0')
    const usageConcurrency = usageForm.getByRole('spinbutton', {
      name: 'Maximum concurrent model operations per user',
    })
    fireEvent.change(rateCount, { target: { value: '25' } })
    fireEvent.change(usageConcurrency, { target: { value: '2' } })

    fireEvent.click(rateSave)
    await waitFor(() => expect(put).toHaveBeenCalledOnce())
    expect(put).toHaveBeenNthCalledWith(1, '/api/option/', {
      key: 'ModelRequestRateLimitCount',
      value: 25,
    })
    expect(usageConcurrency).toHaveValue(2)
    fireEvent.change(rateCount, { target: { value: '30' } })

    fireEvent.click(usageSave)
    await waitFor(() => expect(put).toHaveBeenCalledTimes(2))
    expect(put).toHaveBeenNthCalledWith(2, '/api/option/', {
      key: 'LLMUsageLimitPolicy',
      value: JSON.stringify({
        ...defaultLLMUsageRules,
        max_concurrent: 2,
        counter_epoch: 0,
      }),
    })
    expect(rateCount).toHaveValue(30)
  })

  test('retains input on a server rejection', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: false, message: 'Unable to save policy' },
    })
    renderPolicy()
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Refill period (seconds)' }),
      { target: { value: '300' } }
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    await waitFor(() => expect(put).toHaveBeenCalledOnce())
    expect(await screen.findByText('Unable to save policy')).toBeInTheDocument()
    expect(
      screen.getByRole('spinbutton', { name: 'Refill period (seconds)' })
    ).toHaveValue(300)
  })

  test('retains unsaved values and shows a transport failure', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(new Error('Network unavailable'))
    renderPolicy()
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Maximum concurrent model operations per user',
      }),
      { target: { value: '2' } }
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    expect(await screen.findByText('Network unavailable')).toBeVisible()
    expect(
      screen.getByRole('spinbutton', {
        name: 'Maximum concurrent model operations per user',
      })
    ).toHaveValue(2)
  })

  test('disables editing when a saved policy contains invalid fields', () => {
    renderPolicy('{"output":null}')
    expect(
      screen.getByRole('button', { name: 'Save model usage limits' })
    ).toBeDisabled()
    expect(
      screen.getByRole('spinbutton', { name: 'Refill period (seconds)' })
    ).toBeDisabled()
    expect(
      screen.getByText(
        'The saved model usage policy is invalid. Correct it through the settings API before editing here.'
      )
    ).toBeVisible()
  })

  test('validates bucket pairs, monetary precision, and configurable bounds', () => {
    const schema = createLLMUsageLimitSchema((key) => key)
    for (const patch of [
      { output: { capacity: 5, refill: 0 } },
      { output: { capacity: 1.5, refill: 1 } },
      { cost_usd: { capacity: 0.0000001, refill: 1 } },
      { refill_period_seconds: 86401 },
      { max_concurrent: 0 },
      { counter_epoch: 2 ** 52 + 1 },
    ]) {
      expect(
        schema.safeParse({ ...defaultLLMUsageLimitPolicy, ...patch }).success
      ).toBe(false)
    }
    expect(
      schema.safeParse({
        ...defaultLLMUsageLimitPolicy,
        enabled: true,
        refill_period_seconds: 3600,
        cost_usd: { capacity: 0.1, refill: 0.000001 },
      }).success
    ).toBe(true)
  })
})

describe('Per-user model usage policies', () => {
  const enabledRules = {
    ...defaultLLMUsageRules,
    enabled: true,
    output: { capacity: 100, refill: 20 },
  }
  function lookupResponse(source: 'default' | 'override' = 'default') {
    return {
      data: {
        success: true,
        data: {
          user_id: 42,
          username: 'customer-42',
          source,
          policy: { ...enabledRules, counter_epoch: 9 },
        },
      },
    }
  }

  test('verifies an existing user, adds an enabled override with the default disabled, and saves without copying its revision', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(lookupResponse())
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    renderPolicy()
    fireEvent.change(screen.getByRole('textbox', { name: 'User ID' }), {
      target: { value: '42' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Verify saved user policy' })
    )
    expect(await screen.findByText(/customer-42/)).toBeVisible()
    expect(get).toHaveBeenCalledWith('/api/option/model_usage/42/policy')
    expect(put).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Add user override' }))
    const editor = screen.getByRole('region', { name: 'Edit user override 42' })
    expect(
      within(editor).getByRole('switch', {
        name: 'Enable limits for this user',
      })
    ).toBeChecked()
    fireEvent.change(
      within(editor).getByRole('spinbutton', {
        name: 'Maximum concurrent model operations per user',
      }),
      { target: { value: '2' } }
    )
    expect(
      screen.getByText('Unsaved changes are not included in this verification.')
    ).toBeVisible()
    fireEvent.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    await waitFor(() => expect(put).toHaveBeenCalledOnce())
    expect(
      JSON.parse((put.mock.calls[0][1] as { value: string }).value)
    ).toEqual({
      ...defaultLLMUsageLimitPolicy,
      user_overrides: { '42': { ...enabledRules, max_concurrent: 2 } },
    })
  })

  test('editing can exempt a user and removal returns that user to the default only when saved', async () => {
    const user = userEvent.setup()
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    renderPolicy(
      JSON.stringify({
        ...defaultLLMUsageLimitPolicy,
        ...enabledRules,
        user_overrides: { '42': enabledRules },
      })
    )
    await user.click(
      screen.getByRole('button', { name: 'Edit user override 42' })
    )
    await user.click(
      screen.getByRole('switch', { name: 'Enable limits for this user' })
    )
    await user.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    await waitFor(() => expect(put).toHaveBeenCalledOnce())
    expect(
      JSON.parse((put.mock.calls[0][1] as { value: string }).value)
        .user_overrides['42'].enabled
    ).toBe(false)
    await user.click(
      screen.getByRole('button', { name: 'Actions for user 42' })
    )
    await user.click(
      screen.getByRole('menuitem', { name: 'Remove user override' })
    )
    expect(
      screen.getByText('User 42 will inherit the default policy after saving.')
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(
      screen.queryByRole('button', { name: 'Edit user override 42' })
    ).not.toBeInTheDocument()
    expect(put).toHaveBeenCalledOnce()
    await user.click(
      screen.getByRole('button', { name: 'Save model usage limits' })
    )
    await waitFor(() => expect(put).toHaveBeenCalledTimes(2))
    expect(
      JSON.parse((put.mock.calls[1][1] as { value: string }).value)
    ).toEqual({
      ...enabledRules,
      counter_epoch: 0,
    })
  })

  test('rejects invalid IDs, missing users and failed lookups without allowing an override', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockRejectedValue(new Error('User not found'))
    renderPolicy()
    const input = screen.getByRole('textbox', { name: 'User ID' })
    fireEvent.change(input, { target: { value: '01' } })
    expect(
      screen.getByRole('button', { name: 'Verify saved user policy' })
    ).toBeDisabled()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(input, { target: { value: '42' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Verify saved user policy' })
    )
    expect(await screen.findByText('User not found')).toBeVisible()
    expect(get).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('button', { name: 'Add user override' })
    ).toBeDisabled()
  })

  test('validates override IDs and rules while allowing targeted limits with the default disabled', () => {
    const schema = createLLMUsageLimitSchema((key) => key)
    expect(
      schema.safeParse({
        ...defaultLLMUsageLimitPolicy,
        user_overrides: { '42': enabledRules },
      }).success
    ).toBe(true)
    for (const overrides of [
      { '01': enabledRules },
      { '2147483648': enabledRules },
      { '42': { ...enabledRules, counter_epoch: 1 } },
      { '42': { ...enabledRules, output: { capacity: 1, refill: 0 } } },
      { '42': { ...defaultLLMUsageRules, enabled: true } },
    ]) {
      expect(
        schema.safeParse({
          ...defaultLLMUsageLimitPolicy,
          user_overrides: overrides,
        }).success
      ).toBe(false)
    }
  })
})
