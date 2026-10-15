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
import { HeartPulse, Timer } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getPerfMetrics,
  getPerfMetricsSummary,
} from '@/features/performance-metrics/api'
import {
  formatLatency,
  formatThroughput,
  formatUptimePct,
  getAvailableSuccessRate,
  getSuccessRateTextClass,
} from '@/features/performance-metrics/lib/format'
import type {
  PerformanceGroup,
  SuccessRatePoint,
} from '@/features/performance-metrics/types'
import { cn } from '@/lib/utils'

import type { UptimeDayPoint } from '../lib/mock-stats'
import type { PricingModel } from '../types'
import { LatencyTrendChart, UptimeTrendChart } from './model-details-charts'

function StatCard(props: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  hint?: string
  valueClassName?: string
}) {
  const Icon = props.icon
  return (
    <div className='bg-background flex flex-col gap-1 rounded-lg border p-3'>
      <span className='text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase'>
        <Icon className='size-3' />
        {props.label}
      </span>
      <span
        className={cn(
          'text-foreground font-mono text-lg font-semibold tabular-nums',
          props.valueClassName
        )}
      >
        {props.value}
      </span>
      {props.hint && (
        <span className='text-muted-foreground/70 text-[11px]'>
          {props.hint}
        </span>
      )}
    </div>
  )
}

type PerformanceRow = {
  avg_ttft_ms: number
  avg_latency_ms: number
  avg_tps: number
}

function toUptimePct(value: number): number {
  if (!Number.isFinite(value)) return Number.NaN
  const clamped = Math.min(100, Math.max(0, value))
  return Math.round(clamped * 100) / 100
}

function toLatencySeries(groups: PerformanceGroup[]) {
  const byTs = new Map<number, number[]>()
  for (const group of groups) {
    for (const point of group.series) {
      if (point.avg_ttft_ms <= 0) continue
      const current = byTs.get(point.ts) ?? []
      current.push(point.avg_ttft_ms)
      byTs.set(point.ts, current)
    }
  }

  return [...byTs.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, values]) => ({
      timestamp: new Date(ts * 1000).toISOString(),
      group: 'latency',
      ttft_ms: Math.round(
        values.reduce((sum, value) => sum + value, 0) / values.length
      ),
    }))
}

function toUptimeSeries(series: SuccessRatePoint[]): UptimeDayPoint[] {
  return series.map((point) => ({
    date: new Date(point.ts * 1000).toISOString(),
    uptime_pct: toUptimePct(getAvailableSuccessRate(point)),
    incidents: 0,
    outage_minutes: 0,
  }))
}

function average(
  rows: PerformanceRow[],
  field: 'avg_ttft_ms' | 'avg_latency_ms'
) {
  const values = rows.map((row) => row[field]).filter((value) => value > 0)
  if (values.length === 0) return 0
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length
  )
}

export function ModelDetailsPerformance(props: { model: PricingModel }) {
  const { t } = useTranslation()
  const metricsQuery = useQuery({
    queryKey: ['perf-metrics', props.model.model_name],
    queryFn: () => getPerfMetrics(props.model.model_name, 24),
    staleTime: 60 * 1000,
  })
  const summaryQuery = useQuery({
    queryKey: ['perf-metrics-summary', 24],
    queryFn: () => getPerfMetricsSummary(24),
    staleTime: 60 * 1000,
    retry: false,
  })
  const modelSummary = summaryQuery.data?.data.models?.find(
    (model) => model.model_name === props.model.model_name
  )
  const groups = useMemo(
    () => metricsQuery.data?.data.groups ?? [],
    [metricsQuery.data]
  )
  const performances = useMemo<PerformanceRow[]>(
    () =>
      groups.map((group) => ({
        avg_ttft_ms: group.avg_ttft_ms,
        avg_latency_ms: group.avg_latency_ms,
        avg_tps: group.avg_tps,
      })),
    [groups]
  )
  const latencySeries = useMemo(() => toLatencySeries(groups), [groups])
  const uptimeSeries = useMemo(
    () => toUptimeSeries(modelSummary?.recent_success_series ?? []),
    [modelSummary?.recent_success_series]
  )

  if (metricsQuery.isLoading || performances.length === 0) {
    return (
      <div className='text-muted-foreground rounded-lg border p-6 text-center text-sm'>
        {t('Performance data is not yet available for this model.')}
      </div>
    )
  }

  const tpsValues = performances
    .map((p) => p.avg_tps)
    .filter((value) => value > 0)
  const avgTps =
    tpsValues.length > 0
      ? tpsValues.reduce((sum, value) => sum + value, 0) / tpsValues.length
      : 0
  const avgLatency = average(performances, 'avg_latency_ms')
  const successRate = getAvailableSuccessRate(modelSummary)
  const incidentCount = new Set(
    groups.flatMap((group) =>
      group.series
        .filter((point) => point.service_incident === true)
        .map((point) => point.ts)
    )
  ).size
  const classificationComplete = groups.every(
    (group) =>
      group.series.length > 0 &&
      group.series.every(
        (point) =>
          point.incident_classification_complete === true &&
          typeof point.service_incident === 'boolean'
      )
  )
  let incidentSummary = t('Service-incident history is unavailable.')
  if (incidentCount > 0) {
    incidentSummary = t(
      'Time buckets with confirmed service incidents: {{count}}',
      {
        count: incidentCount,
      }
    )
  } else if (classificationComplete) {
    incidentSummary = t('No service incidents in classified requests.')
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          icon={Timer}
          label='TPS'
          value={formatThroughput(avgTps)}
          hint={t('Sustained tokens per second')}
        />
        <StatCard
          icon={Timer}
          label={t('Average TTFT')}
          value={formatLatency(average(performances, 'avg_ttft_ms'))}
        />
        <StatCard
          icon={Timer}
          label={t('Average latency')}
          value={formatLatency(avgLatency)}
        />
        <StatCard
          icon={HeartPulse}
          label={t('Success rate')}
          value={formatUptimePct(successRate)}
          hint={t('Excludes client errors and client cancellations.')}
          valueClassName={getSuccessRateTextClass(successRate)}
        />
      </div>

      <section>
        <SectionHeader
          icon={Timer}
          title={t('Latency trend (last 24h)')}
          description={t('Average TTFT')}
        />
        <LatencyTrendChart series={latencySeries} />
      </section>

      <section>
        <SectionHeader
          icon={HeartPulse}
          title={t('Success rate (last 24h)')}
          description={t(
            'Successful requests as a share of eligible requests; client errors and cancellations are excluded.'
          )}
        />
        <div className='text-muted-foreground mb-3 space-y-1 text-xs'>
          <p>{incidentSummary}</p>
          {!classificationComplete && (
            <p>
              {t(
                'Historical success rates may include client errors and cancellations where classification is unavailable.'
              )}
            </p>
          )}
          {incidentCount > 0 && <p>{t('Each time bucket is counted once.')}</p>}
          {!classificationComplete && incidentCount > 0 && (
            <p>{t('Incident classification is incomplete for this period.')}</p>
          )}
        </div>
        <UptimeTrendChart series={uptimeSeries} />
      </section>
    </div>
  )
}

function SectionHeader(props: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
}) {
  const Icon = props.icon
  return (
    <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
      <div className='flex min-w-0 items-center gap-2'>
        <Icon className='text-muted-foreground/70 size-3.5 shrink-0' />
        <div className='min-w-0'>
          <div className='text-foreground text-sm font-semibold'>
            {props.title}
          </div>
          {props.description && (
            <p className='text-muted-foreground/80 text-xs'>
              {props.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
