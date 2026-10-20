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
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { getCurrencyLabel } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

import {
  DEFAULT_TOKEN_UNIT,
  OFFICIAL_PRICE_DISCOUNT_PERCENT,
} from '../constants'
import {
  CATALOG_PRICE_TYPES,
  getCatalogTokenPrices,
  getPublicCatalogTokenPrices,
  hasCatalogDiscount,
  usesBackendCatalogPricing,
} from '../lib/catalog-price'
import {
  getDynamicDisplayGroupRatio,
  getDynamicPriceUnitLabelKey,
  getDynamicPricingSummary,
  isUnconfiguredTaskUsageModel,
} from '../lib/dynamic-price'
import { isTokenBasedModel } from '../lib/model-helpers'
import {
  formatCatalogTokenPrice,
  formatOfficialPrice,
  formatPrice,
  formatRequestPrice,
} from '../lib/price'
import type { PricingModel, TokenUnit } from '../types'
import {
  CustomerPriceBadges,
  CustomerPricePanel,
} from './customer-price-display'

export type ModelPriceCellOptions = {
  tokenUnit?: TokenUnit
  priceRate?: number
  usdExchangeRate?: number
  showRechargePrice?: boolean
  selectedGroup?: string
}

export function ModelPriceCell(props: {
  model: PricingModel
  options?: ModelPriceCellOptions
  showExpression?: boolean
}) {
  const { t } = useTranslation()
  const currency = useSystemConfigStore((state) => state.config.currency)
  const comingSoon = props.model.availability === 'coming_soon'
  if (comingSoon && !props.model.official_price) {
    return (
      <span className='text-muted-foreground text-sm whitespace-normal'>
        {t('Pricing will be announced')}
      </span>
    )
  }

  const currencyLabel =
    currency.quotaDisplayType === 'TOKENS' ? 'USD' : getCurrencyLabel()
  const options = props.options ?? {}
  const tokenUnit = options.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const tokenUnitLabel = tokenUnit === 'K' ? '1K' : '1M'
  const dynamic = getDynamicPricingSummary(props.model, {
    ...options,
    tokenUnit,
    showCurrencySymbol: false,
    groupRatioMultiplier: getDynamicDisplayGroupRatio(
      props.model,
      options.selectedGroup
    ),
  })
  let metrics: Array<{ label: string; value: string; official?: string }>
  let caption = t('{{currency}} / {{unit}} tokens', {
    currency: currencyLabel,
    unit: tokenUnitLabel,
  })
  const pendingWithoutPrice =
    props.model.pricing_status === 'pending' && !props.model.official_price
  let discount: string | undefined

  if (
    props.model.official_price ||
    (usesBackendCatalogPricing(props.model) &&
      props.model.pricing_status !== 'pending')
  ) {
    const prices = getCatalogTokenPrices(props.model, options.selectedGroup)
    if (!prices) {
      return (
        <span className='text-muted-foreground text-sm'>
          {props.model.billing_expr && props.model.pricing_status !== 'pending'
            ? t('Special billing expression')
            : t('To be configured')}
        </span>
      )
    }
    const labels = {
      input: t('Input'),
      output: t('Output'),
      cache: t('Cache Read'),
    }
    metrics = CATALOG_PRICE_TYPES.flatMap((type) => {
      const price = prices[type]
      if (price === undefined) return []
      const reference = props.model.official_price?.[type]
      return [
        {
          label: labels[type],
          value: formatCatalogTokenPrice(
            price,
            tokenUnit,
            options.showRechargePrice,
            options.priceRate,
            options.usdExchangeRate
          ),
          official:
            reference !== undefined && price < reference - 1e-9
              ? (formatOfficialPrice(
                  props.model,
                  type,
                  tokenUnit,
                  false,
                  options.showRechargePrice,
                  options.priceRate,
                  options.usdExchangeRate
                ) ?? undefined)
              : undefined,
        },
      ]
    })
    if (
      hasCatalogDiscount(
        props.model,
        getPublicCatalogTokenPrices(props.model, options.selectedGroup) ?? {}
      )
    ) {
      discount = t('{{percent}}% off', {
        percent: OFFICIAL_PRICE_DISCOUNT_PERCENT,
      })
    }
  } else if (props.model.pricing_status === 'pending') {
    metrics = [
      { label: t('Input'), value: t('To be configured') },
      { label: t('Output'), value: t('To be configured') },
    ]
    caption = t('Per 1M tokens')
  } else if (dynamic) {
    if (dynamic.isSpecialExpression) {
      return (
        <span className='block max-w-full min-w-0'>
          <span className='text-muted-foreground block truncate text-sm'>
            {t('Special billing expression')}
          </span>
          {props.showExpression !== false && (
            <code className='text-muted-foreground mt-1 line-clamp-2 block text-xs break-all whitespace-normal'>
              {dynamic.rawExpression}
            </code>
          )}
        </span>
      )
    }
    metrics = dynamic.primaryEntries.slice(0, 2).map((entry) => {
      const unit = getDynamicPriceUnitLabelKey(entry)
      return {
        label:
          entry.labelKind === 'schema' ? entry.shortLabel : t(entry.shortLabel),
        value: `${entry.formattedRange ?? entry.formatted}${unit ? `/${t(unit)}` : ''}`,
      }
    })
    if (metrics.length === 0) {
      return (
        <span className='text-muted-foreground text-sm'>
          {t('Dynamic Pricing')}
        </span>
      )
    }
    if (dynamic.isTaskUsage) caption = currencyLabel
    if (dynamic.tierCount > 1) {
      caption += ` · ${t('{{count}} tiers', { count: dynamic.tierCount })}`
    }
  } else {
    if (isUnconfiguredTaskUsageModel(props.model)) {
      return (
        <span className='text-muted-foreground text-sm'>
          {t('Not configured')}
        </span>
      )
    }
    const tokenBased = isTokenBasedModel(props.model)
    if (
      !Number.isFinite(
        tokenBased ? props.model.model_ratio : props.model.model_price
      )
    ) {
      return (
        <span className='text-muted-foreground text-sm'>
          {t('Unset price')}
        </span>
      )
    }
    if (tokenBased) {
      metrics = [
        {
          label: t('Input'),
          value: formatPrice(
            props.model,
            'input',
            tokenUnit,
            options.showRechargePrice,
            options.priceRate,
            options.usdExchangeRate,
            options.selectedGroup,
            false
          ),
        },
        {
          label: t('Output'),
          value: formatPrice(
            props.model,
            'output',
            tokenUnit,
            options.showRechargePrice,
            options.priceRate,
            options.usdExchangeRate,
            options.selectedGroup,
            false
          ),
        },
      ]
    } else {
      metrics = [
        {
          label: t('Per-request'),
          value: formatRequestPrice(
            props.model,
            options.showRechargePrice,
            options.priceRate,
            options.usdExchangeRate,
            options.selectedGroup,
            false
          ),
        },
      ]
      caption = `${currencyLabel} / ${t('request')}`
    }
  }
  return (
    <CustomerPricePanel model={props.model}>
      <span className='block w-full max-w-full min-w-0 space-y-1.5'>
        <span
          className={
            metrics.length > 1 ? 'grid grid-cols-2 gap-x-4 gap-y-2' : 'grid'
          }
        >
          {metrics.map((metric, index) => (
            <span
              key={metric.label}
              className={cn(
                'flex min-w-0 flex-col items-start gap-y-0.5',
                metrics.length === 3 && index === 2 && 'col-span-2',
                !pendingWithoutPrice &&
                  'sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-1.5'
              )}
            >
              <span
                className='text-muted-foreground min-w-0 truncate text-xs font-normal'
                title={metric.label}
              >
                {metric.label}
              </span>
              <span
                className={cn(
                  'min-w-0 text-sm break-words whitespace-normal',
                  pendingWithoutPrice
                    ? 'font-sans font-medium'
                    : 'font-mono tabular-nums'
                )}
                title={metric.value}
              >
                {metric.value}
              </span>
              {metric.official && (
                <span className='text-muted-foreground font-sans text-sm tabular-nums'>
                  <span className='sr-only'>{t('Official price')} </span>
                  <s className='decoration-muted-foreground/60'>
                    {metric.official}
                  </s>
                </span>
              )}
            </span>
          ))}
        </span>
        <span className='flex min-w-0 flex-wrap items-center gap-1.5'>
          <span
            className='text-muted-foreground block min-w-0 text-xs font-normal break-words whitespace-normal sm:truncate'
            title={caption}
          >
            {caption}
          </span>
          {discount && <Badge variant='secondary'>{discount}</Badge>}
          <CustomerPriceBadges model={props.model} />
        </span>
      </span>
    </CustomerPricePanel>
  )
}
