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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { mapStatusDataToConfig } from '../use-system-config'

function resetSystemConfig() {
  const initialState = useSystemConfigStore.getInitialState()
  useSystemConfigStore.setState(
    {
      ...initialState,
      config: {
        ...initialState.config,
        currency: { ...DEFAULT_CURRENCY_CONFIG },
      },
    },
    true
  )
  localStorage.clear()
}

beforeEach(resetSystemConfig)
afterEach(resetSystemConfig)

describe('Fluxion frontend branding', () => {
  it('an old gateway brand keeps Fluxion identity while applying the gateway currency and display settings', () => {
    const config = mapStatusDataToConfig({
      system_name: 'New API',
      logo: 'https://old-gateway.example/logo.png',
      quota_display_type: 'CUSTOM',
      quota_per_unit: 1000000,
      usd_exchange_rate: 7.2,
      custom_currency_symbol: ' credits ',
      custom_currency_exchange_rate: 10,
      display_in_currency: false,
      display_token_stat_enabled: true,
    })

    expect(config).toMatchObject({
      systemName: 'Fluxion',
      logo: '/fluxion-logo.svg',
      displayTokenStatEnabled: true,
      currency: {
        displayInCurrency: false,
        quotaDisplayType: 'CUSTOM',
        quotaPerUnit: 1000000,
        usdExchangeRate: 7.2,
        customCurrencySymbol: 'credits',
        customCurrencyExchangeRate: 10,
      },
    })
  })

  it('a later configuration update cannot replace Fluxion or discard the existing currency settings', () => {
    useSystemConfigStore.getState().setConfig({
      currency: {
        ...DEFAULT_CURRENCY_CONFIG,
        quotaDisplayType: 'CNY',
        usdExchangeRate: 7.2,
      },
    })

    useSystemConfigStore.getState().setConfig({
      systemName: 'New API',
      logo: '/old-logo.png',
      displayTokenStatEnabled: false,
    })

    expect(useSystemConfigStore.getState().config).toMatchObject({
      systemName: 'Fluxion',
      logo: '/fluxion-logo.svg',
      displayTokenStatEnabled: false,
      currency: {
        quotaDisplayType: 'CNY',
        usdExchangeRate: 7.2,
        quotaPerUnit: 500000,
      },
    })
  })

  it('rehydrating an old browser configuration replaces its brand and loaded logo while retaining operational currency settings', async () => {
    const savedCurrency = {
      displayInCurrency: true,
      quotaDisplayType: 'CUSTOM',
      quotaPerUnit: 250000,
      usdExchangeRate: 1.5,
      customCurrencySymbol: 'credits',
      customCurrencyExchangeRate: 25,
    }
    localStorage.setItem(
      'system-config-storage',
      JSON.stringify({
        version: 0,
        state: {
          config: {
            systemName: 'New API',
            logo: '/old-logo.png',
            currency: savedCurrency,
            displayTokenStatEnabled: true,
          },
          loadedLogoUrl: '/old-logo.png',
        },
      })
    )

    await useSystemConfigStore.persist.rehydrate()

    const restored = useSystemConfigStore.getState()
    expect(restored.config).toMatchObject({
      systemName: 'Fluxion',
      logo: '/fluxion-logo.svg',
      displayTokenStatEnabled: true,
      currency: savedCurrency,
    })
    expect(restored.loadedLogoUrl).toBe('/fluxion-logo.svg')
  })
})
