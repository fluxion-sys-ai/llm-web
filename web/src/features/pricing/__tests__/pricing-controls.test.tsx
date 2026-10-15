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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PricingSidebar } from '../components/pricing-sidebar'
import {
  PricingToolbar,
  type PricingToolbarProps,
} from '../components/pricing-toolbar'
import type { PricingModel } from '../types'

function pricingModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'example-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 3,
    enable_groups: ['default'],
    supported_endpoint_types: ['openai'],
    ...overrides,
  }
}

function toolbarProps(): PricingToolbarProps {
  return {
    filteredCount: 2,
    totalCount: 2,
    sortBy: 'name',
    tokenUnit: 'M',
    showRechargePrice: false,
    viewMode: 'card',
    quotaTypeFilter: 'all',
    endpointTypeFilter: 'all',
    vendorFilter: 'all',
    groupFilter: 'all',
    tagFilter: 'all',
    onSortChange: vi.fn(),
    onTokenUnitChange: vi.fn(),
    onRechargePriceChange: vi.fn(),
    onViewModeChange: vi.fn(),
    onQuotaTypeChange: vi.fn(),
    onEndpointTypeChange: vi.fn(),
    onVendorChange: vi.fn(),
    onGroupChange: vi.fn(),
    onTagChange: vi.fn(),
    vendors: [],
    groups: ['default', 'premium'],
    groupRatios: { default: 1, premium: 3 },
    tags: [],
    models: [
      pricingModel(),
      pricingModel({
        id: 2,
        model_name: 'premium-model',
        enable_groups: ['premium'],
      }),
    ],
    hasActiveFilters: false,
    activeFilterCount: 0,
    onClearFilters: vi.fn(),
  }
}

describe('pricing controls', () => {
  it('changes the token unit and keeps the selected unit pressed when clicked again', async () => {
    const props = toolbarProps()
    const user = userEvent.setup()
    const { rerender } = render(<PricingToolbar {...props} />)
    await user.click(screen.getByRole('button', { name: '/1K' }))
    expect(props.onTokenUnitChange).toHaveBeenCalledWith('K')
    rerender(<PricingToolbar {...props} tokenUnit='K' />)
    const selected = screen.getByRole('button', { name: '/1K' })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    await user.click(selected)
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    expect(props.onTokenUnitChange).toHaveBeenCalledTimes(1)
  })

  it('changes the recharge display mode with an accessible selected state', async () => {
    const props = toolbarProps()
    const user = userEvent.setup()
    const { rerender } = render(<PricingToolbar {...props} />)
    await user.click(screen.getByRole('button', { name: 'Recharge' }))
    expect(props.onRechargePriceChange).toHaveBeenCalledWith(true)
    rerender(<PricingToolbar {...props} showRechargePrice />)
    expect(screen.getByRole('button', { name: 'Recharge' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('switches to table view with the keyboard and exposes the selected view', async () => {
    const props = toolbarProps()
    const user = userEvent.setup()
    const { rerender } = render(<PricingToolbar {...props} />)
    const tableButton = screen.getByRole('button', { name: 'Table view' })
    tableButton.focus()
    await user.keyboard('{Enter}')
    expect(props.onViewModeChange).toHaveBeenCalledWith('table')
    rerender(<PricingToolbar {...props} viewMode='table' />)
    expect(tableButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Card view' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('selects price sorting from the shared dropdown', async () => {
    const props = toolbarProps()
    const user = userEvent.setup()
    render(<PricingToolbar {...props} />)
    await user.click(screen.getByRole('button', { name: 'Name' }))
    await user.click(
      screen.getByRole('menuitem', { name: 'Price: Low to High' })
    )
    expect(props.onSortChange).toHaveBeenCalledWith('price-low')
  })

  it('opens mobile filters from the left, selects a capability, and restores focus on close', async () => {
    const props = toolbarProps()
    props.tags = ['Coding']
    props.models = [pricingModel({ tags: 'Coding' })]
    const user = userEvent.setup()
    const { rerender } = render(<PricingToolbar {...props} />)
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filter' })
    expect(dialog).toHaveAttribute('data-side', 'left')
    expect(within(dialog).getByRole('button', { name: 'Reset' })).toBeDisabled()
    expect(within(dialog).queryByText('Groups')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Endpoint Type')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Coding/ }))
    expect(props.onTagChange).toHaveBeenCalledWith('Coding')
    rerender(
      <PricingToolbar
        {...props}
        tagFilter='Coding'
        hasActiveFilters
        activeFilterCount={1}
      />
    )
    expect(
      within(dialog).getByRole('button', { name: /Coding/ })
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(dialog).getByRole('button', { name: 'Reset' }))
    expect(props.onClearFilters).toHaveBeenCalledOnce()
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('button', { name: /Filter/ })).toHaveFocus()
  })

  it('hides single-value technical filters in both desktop and mobile catalogs', async () => {
    const props = {
      ...toolbarProps(),
      models: [pricingModel()],
      groups: ['default'],
    }
    const user = userEvent.setup()
    const sidebar = render(<PricingSidebar {...props} />)

    expect(
      screen.getByRole('button', { name: 'Developers' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Capabilities & use cases' })
    ).toBeInTheDocument()
    for (const name of ['Groups', 'Pricing Type', 'Endpoint Type']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }

    sidebar.unmount()
    render(<PricingToolbar {...props} />)
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filter' })
    for (const name of ['Groups', 'Pricing Type', 'Endpoint Type']) {
      expect(
        within(dialog).queryByRole('button', { name })
      ).not.toBeInTheDocument()
    }
    expect(
      within(dialog).getByRole('button', { name: 'Developers' })
    ).toBeInTheDocument()
  })

  it('hides groups and endpoints even when models offer multiple values while retaining billing filters', () => {
    const props = toolbarProps()
    props.models = [
      pricingModel(),
      pricingModel({
        id: 2,
        model_name: 'request-model',
        enable_groups: ['premium'],
        quota_type: 1,
        supported_endpoint_types: ['anthropic'],
      }),
    ]
    render(<PricingSidebar {...props} />)

    for (const name of ['Groups', 'Endpoint Type']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Pricing Type' })).toBeVisible()
    expect(screen.queryByText('premium')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Task billing/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Video/ })
    ).not.toBeInTheDocument()
  })

  it('keeps the billing filter usable and lets reset clear hidden legacy filters', async () => {
    const props = toolbarProps()
    const user = userEvent.setup()
    render(
      <PricingSidebar
        {...props}
        models={[pricingModel()]}
        groupFilter='premium'
        quotaTypeFilter='request'
        endpointTypeFilter='embeddings'
        hasActiveFilters
      />
    )

    for (const name of [/premium/, /^Embeddings/]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(
      screen.getByRole('button', { name: /^Per Request/ })
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /^All Models/ }))
    expect(props.onQuotaTypeChange).toHaveBeenCalledWith('all')
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(props.onClearFilters).toHaveBeenCalledOnce()
  })

  it('offers catalog sorting without price controls when all prices are pending', async () => {
    const props = toolbarProps()
    const user = userEvent.setup()
    render(
      <PricingToolbar
        {...props}
        models={[pricingModel({ pricing_status: 'pending' })]}
        sortBy='featured'
      />
    )

    for (const name of ['Standard', 'Recharge', '/1M', '/1K']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(
      screen.getByRole('button', { name: 'Card view' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Table view' })
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Featured' }))
    expect(
      screen.queryByRole('menuitem', { name: 'Price: Low to High' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: 'Price: High to Low' })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Context: Longest' }))
    expect(props.onSortChange).toHaveBeenCalledWith('context')
  })

  it('retains price controls when the catalog includes a published price', () => {
    render(
      <PricingToolbar
        {...toolbarProps()}
        models={[
          pricingModel({ pricing_status: 'pending' }),
          pricingModel({ id: 2 }),
        ]}
      />
    )

    expect(screen.getByRole('button', { name: 'Standard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '/1M' })).toBeInTheDocument()
  })
})
