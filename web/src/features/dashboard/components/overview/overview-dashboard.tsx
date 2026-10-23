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
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CreditCard,
  FileText,
  KeyRound,
  ListChecks,
  RadioTower,
  ShieldCheck,
  TerminalSquare,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { fetchTokenKey, getApiKeys } from '@/features/keys/api'
import type { ApiKey } from '@/features/keys/types'
import { useLlmCatalog } from '@/features/pricing/hooks/use-llm-catalog'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getUserModels } from '@/lib/api'
import { FLUXION_API_BASE_URL } from '@/lib/public-api-address'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import {
  useApiInfo,
  useDashboardContentVisibility,
} from '../../hooks/use-status-data'
import { AnnouncementsPanel } from './announcements-panel'
import { ApiInfoPanel } from './api-info-panel'
import { FAQPanel } from './faq-panel'
import { PerformanceHealthPanel } from './performance-health-panel'
import { SummaryCards } from './summary-cards'
import { UptimePanel } from './uptime-panel'

const SETUP_GUIDE_VISIBILITY_STORAGE_KEY =
  'dashboard_overview_setup_guide_expanded'

type DashboardActionPath =
  | '/keys'
  | '/wallet'
  | '/playground'
  | '/channels'
  | '/usage-logs'
  | '/pricing'

interface StartStep {
  title: string
  description: string
  to: DashboardActionPath
  icon: LucideIcon
  completed: boolean
}

interface QuickAction {
  title: string
  description: string
  to: DashboardActionPath
  icon: LucideIcon
  adminOnly?: boolean
}

interface RequestExample {
  endpoint: string
  model: string
  modelStatus: string
  keyName: string
  keyId?: number
  displayKey: string
  ready: boolean
}

interface HeroSignal {
  label: string
  value: string
  icon: LucideIcon
}

function getSavedSetupGuideExpanded(): boolean | null {
  if (typeof window === 'undefined') return null
  const saved = window.localStorage.getItem(SETUP_GUIDE_VISIBILITY_STORAGE_KEY)
  if (saved === 'expanded') return true
  if (saved === 'collapsed') return false
  return null
}

function saveSetupGuideExpanded(expanded: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    SETUP_GUIDE_VISIBILITY_STORAGE_KEY,
    expanded ? 'expanded' : 'collapsed'
  )
}

function getPreferredKey(keys: ApiKey[]): ApiKey | null {
  return keys.find((item) => item.status === 1) ?? keys[0] ?? null
}

function formatDisplayKey(key?: string): string {
  if (!key) return 'sk-...'
  if (key.length <= 14) return key
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

function buildCurlCommand(args: {
  endpoint: string
  apiKey: string
  model: string
}): string {
  return [
    `curl ${args.endpoint} \\`,
    '  -H "Content-Type: application/json" \\',
    `  -H "Authorization: Bearer ${args.apiKey}" \\`,
    `  -d '{"model":"${args.model}","messages":[{"role":"user","content":"Say hello in one sentence."}]}'`,
  ].join('\n')
}

function StartStepItem(props: { step: StartStep; index: number }) {
  const Icon = props.step.completed ? Check : props.step.icon

  return (
    <li>
      <Link
        to={props.step.to}
        className='group hover:bg-muted/50 focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-lg px-3 py-4 text-left transition-colors outline-none focus-visible:ring-2'
      >
        <IconBadge
          tone={props.step.completed ? 'success' : 'neutral'}
          size='lg'
        >
          <Icon />
        </IconBadge>
        <span className='flex min-w-0 flex-1 flex-col gap-1'>
          <span className='text-sm font-medium'>{props.step.title}</span>
          <span className='text-muted-foreground text-xs leading-relaxed'>
            {props.step.description}
          </span>
        </span>
        <span
          className='text-muted-foreground/60 text-xs tabular-nums'
          aria-hidden='true'
        >
          {String(props.index + 1).padStart(2, '0')}
        </span>
        <ArrowRight
          className='text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5'
          aria-hidden='true'
        />
      </Link>
    </li>
  )
}

function RequestPreview(props: {
  example: RequestExample
  signals: HeroSignal[]
}) {
  const { t } = useTranslation()
  const [isCopying, setIsCopying] = useState(false)
  const { copyToClipboard } = useCopyToClipboard({ notify: false })
  const previewLines = props.example.model
    ? buildCurlCommand({
        endpoint: props.example.endpoint,
        apiKey: props.example.displayKey,
        model: props.example.model,
      }).split('\n')
    : []
  const handleCopyRequest = async () => {
    if (!props.example.ready || !props.example.keyId || isCopying) return

    setIsCopying(true)
    try {
      const result = await fetchTokenKey(props.example.keyId)
      const key = result.success && result.data?.key ? result.data.key : ''
      if (!key) {
        toast.error(result.message || t('Failed to copy to clipboard'))
        return
      }

      const realCurl = buildCurlCommand({
        endpoint: props.example.endpoint,
        apiKey: `sk-${key}`,
        model: props.example.model,
      })
      const copied = await copyToClipboard(realCurl)
      if (copied) {
        toast.success(t('Copied to clipboard'))
      } else {
        toast.error(t('Failed to copy to clipboard'))
      }
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <Card className='h-full min-w-0 gap-0 p-5 sm:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <IconBadge tone='neutral'>
            <TerminalSquare />
          </IconBadge>
          <div className='min-w-0'>
            <div className='truncate text-sm font-medium'>
              {t('First API request')}
            </div>
            <div className='text-muted-foreground truncate text-xs'>
              {props.example.keyId
                ? props.example.keyName
                : t('Create an API key to unlock the real request')}
            </div>
          </div>
        </div>
        {props.example.keyId ? (
          <Button
            variant='outline'
            size='sm'
            className='h-7 gap-1.5 px-2 text-xs'
            disabled={!props.example.ready || isCopying}
            onClick={handleCopyRequest}
            aria-label={t('Copy ready-to-run curl')}
          >
            <Copy data-icon='inline-start' />
            {isCopying ? t('Loading') : t('Copy')}
          </Button>
        ) : (
          <Button size='sm' variant='outline' render={<Link to='/keys' />}>
            {t('Create API Key')}
          </Button>
        )}
      </div>

      <div className='bg-muted/45 my-5 flex min-h-28 items-center rounded-lg p-4 font-mono text-xs leading-relaxed'>
        <div className='flex flex-col gap-1 overflow-hidden'>
          {!props.example.model && (
            <p className='text-muted-foreground font-sans'>
              {props.example.modelStatus}
            </p>
          )}
          {previewLines.map((line) => (
            <code
              key={line}
              className='text-muted-foreground truncate'
              title={line}
            >
              {line}
            </code>
          ))}
        </div>
      </div>

      <div className='mt-auto grid gap-1'>
        {props.signals.map((signal) => {
          const Icon = signal.icon

          return (
            <div
              key={signal.label}
              className='flex min-w-0 flex-wrap items-center justify-between gap-2 py-1.5'
            >
              <span className='flex min-w-0 items-center gap-2'>
                <IconBadge tone='neutral' size='xs'>
                  <Icon />
                </IconBadge>
                <span className='truncate text-xs font-medium'>
                  {signal.label}
                </span>
              </span>
              <span className='text-muted-foreground max-w-full text-xs break-words'>
                {signal.value}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function QuickActionItem(props: { action: QuickAction }) {
  const Icon = props.action.icon

  return (
    <Button
      variant='ghost'
      className='h-auto justify-start gap-3 rounded-lg px-3 py-4 text-left whitespace-normal'
      render={<Link to={props.action.to} />}
    >
      <span className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg'>
        <Icon className='size-4' aria-hidden='true' />
      </span>
      <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='truncate text-sm font-medium'>
          {props.action.title}
        </span>
        <span className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
          {props.action.description}
        </span>
      </span>
      <ArrowRight
        className='text-muted-foreground size-4 shrink-0'
        aria-hidden='true'
      />
    </Button>
  )
}

function CompactQuickAction(props: { action: QuickAction }) {
  const Icon = props.action.icon

  return (
    <Button
      variant='outline'
      size='sm'
      className='bg-background/70 h-8 min-w-24 gap-1.5 px-2.5'
      render={<Link to={props.action.to} />}
    >
      <Icon data-icon='inline-start' />
      <span>{props.action.title}</span>
    </Button>
  )
}

export function OverviewDashboard() {
  const { t } = useTranslation()
  const setupGuideId = useId()
  const setupGuideToggleRef = useRef<HTMLButtonElement>(null)
  const user = useAuthStore((state) => state.auth.user)
  const { items: apiInfoItems } = useApiInfo()
  const llmCatalog = useLlmCatalog()
  const {
    apiInfo: showApiInfoPanel,
    announcements: showAnnouncementsPanel,
    faq: showFAQPanel,
    uptimeKuma: showUptimePanel,
  } = useDashboardContentVisibility()
  const [manualSetupGuideExpanded, setManualSetupGuideExpanded] = useState<
    boolean | null
  >(() => getSavedSetupGuideExpanded())

  const requestCount = Number(user?.request_count ?? 0)
  const remainQuota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const isAdmin = Boolean(user?.role && user.role >= ROLE.ADMIN)

  const apiKeysQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'api-keys'],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: 10 })
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const modelsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'user-models'],
    queryFn: async () => {
      const result = await getUserModels()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const selectedModel = useMemo(() => {
    if (modelsQuery.error || llmCatalog.error) return undefined
    const catalogIds = new Set(
      llmCatalog.models
        .filter((model) => model.availability === undefined)
        .map((model) => model.model_name)
    )
    return modelsQuery.data?.find((model) => catalogIds.has(model))
  }, [llmCatalog.error, llmCatalog.models, modelsQuery.data, modelsQuery.error])
  let modelStatus = t('No available models')
  if (modelsQuery.error || llmCatalog.error) {
    modelStatus = t('Unable to load models')
  } else if (modelsQuery.isLoading || llmCatalog.isLoading) {
    modelStatus = t('Loading')
  }

  const preferredKey = useMemo(
    () => getPreferredKey(apiKeysQuery.data ?? []),
    [apiKeysQuery.data]
  )

  const startSteps = useMemo<StartStep[]>(
    () => [
      {
        title: t('Create API Key'),
        description: t('Create a key for your app or service'),
        to: '/keys',
        icon: KeyRound,
        completed: Boolean(preferredKey),
      },
      {
        title: t('Add credits'),
        description: t('Keep enough balance before production traffic'),
        to: '/wallet',
        icon: CreditCard,
        completed: remainQuota > 0 || usedQuota > 0,
      },
      {
        title: t('Send a request'),
        description: t('Verify routing with Playground or your client'),
        to: '/playground',
        icon: TerminalSquare,
        completed: requestCount > 0,
      },
    ],
    [preferredKey, remainQuota, requestCount, t, usedQuota]
  )

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        title: t('API Keys'),
        description: t('Create a key for your app or service'),
        to: '/keys',
        icon: KeyRound,
      },
      {
        title: t('Channels'),
        description: t('Configure upstream providers and routing.'),
        to: '/channels',
        icon: RadioTower,
        adminOnly: true,
      },
      {
        title: t('Usage Logs'),
        description: t('Inspect requests, errors, and billing details'),
        to: '/usage-logs',
        icon: FileText,
      },
      {
        title: t('Pricing'),
        description: t('Review model rates before scaling traffic'),
        to: '/pricing',
        icon: BookOpen,
      },
    ],
    [t]
  )

  const visibleQuickActions = useMemo(
    () => quickActions.filter((action) => !action.adminOnly || isAdmin),
    [isAdmin, quickActions]
  )

  const heroSignals = useMemo<HeroSignal[]>(
    () => [
      {
        label: t('Route active'),
        value: apiInfoItems.length > 0 ? t('Online') : t('Current domain'),
        icon: RadioTower,
      },
      {
        label: t('Auth configured'),
        value: preferredKey ? t('Secured') : t('Needs API key'),
        icon: ShieldCheck,
      },
      {
        label: t('Model selected'),
        value: selectedModel ?? modelStatus,
        icon: Timer,
      },
    ],
    [apiInfoItems.length, modelStatus, preferredKey, selectedModel, t]
  )

  const requestExample = useMemo<RequestExample>(() => {
    const endpoint = `${FLUXION_API_BASE_URL}/chat/completions`
    const model = selectedModel ?? ''
    const keyName = preferredKey?.name ?? t('No API key yet')
    const ready = Boolean(preferredKey?.id && model)

    return {
      endpoint,
      model,
      modelStatus,
      keyName,
      keyId: preferredKey?.id,
      displayKey: preferredKey
        ? formatDisplayKey(`sk-${preferredKey.key}`)
        : 'sk-...',
      ready,
    }
  }, [modelStatus, preferredKey, selectedModel, t])

  const completedStepCount = startSteps.filter((step) => step.completed).length
  const setupComplete = completedStepCount === startSteps.length
  const setupStatusReady = apiKeysQuery.isFetched && Boolean(user)
  const setupGuideExpanded =
    manualSetupGuideExpanded ?? (setupStatusReady && !setupComplete)
  const showLeftContentPanels =
    isAdmin || showApiInfoPanel || showAnnouncementsPanel || showFAQPanel
  const showContentPanels = showLeftContentPanels || showUptimePanel

  const handleSetupGuideToggle = () => {
    const nextExpanded = !setupGuideExpanded
    setManualSetupGuideExpanded(nextExpanded)
    saveSetupGuideExpanded(nextExpanded)
    if (!nextExpanded && setupComplete) {
      setupGuideToggleRef.current?.focus()
    }
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Overview')}</SectionPageLayout.Title>
      <SectionPageLayout.Description>
        {t('Monitor balance, usage, and request volume')}
      </SectionPageLayout.Description>
      <SectionPageLayout.Actions>
        {setupStatusReady && setupComplete && (
          <Button
            ref={setupGuideToggleRef}
            variant='ghost'
            size='sm'
            className='text-muted-foreground hover:text-foreground h-auto min-h-7 max-w-[60vw] whitespace-normal'
            aria-expanded={setupGuideExpanded}
            aria-controls={setupGuideId}
            onClick={handleSetupGuideToggle}
          >
            {t('Setup guide')}
          </Button>
        )}
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-6'>
          <SummaryCards />

          <div id={setupGuideId} hidden={!setupGuideExpanded}>
            {setupGuideExpanded && (
              <CardStaggerContainer className='grid items-stretch gap-5 xl:grid-cols-2'>
                <CardStaggerItem>
                  <Card className='h-full gap-4'>
                    <CardHeader>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='flex min-w-0 flex-1 flex-col gap-2'>
                          <CardTitle>
                            <h3>{t('Get started')}</h3>
                          </CardTitle>
                          <p className='text-muted-foreground max-w-sm text-sm leading-relaxed'>
                            {t(
                              'Create a key, add credits, and send your first request.'
                            )}
                          </p>
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          aria-expanded={setupGuideExpanded}
                          aria-controls={setupGuideId}
                          onClick={handleSetupGuideToggle}
                        >
                          <ChevronUp data-icon='inline-start' />
                          {t('Hide setup guide')}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ol className='flex flex-col divide-y'>
                        {startSteps.map((step, index) => (
                          <StartStepItem
                            key={step.title}
                            step={step}
                            index={index}
                          />
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                </CardStaggerItem>

                <CardStaggerItem>
                  <RequestPreview
                    example={requestExample}
                    signals={heroSignals}
                  />
                </CardStaggerItem>

                <CardStaggerItem className='xl:col-span-2'>
                  <section className='flex flex-col gap-3'>
                    <h3 className='text-muted-foreground text-xs font-medium'>
                      {t('Recommended actions')}
                    </h3>
                    <div
                      className={cn(
                        'grid gap-2 sm:grid-cols-2',
                        isAdmin ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
                      )}
                    >
                      {visibleQuickActions.map((action) => (
                        <QuickActionItem key={action.title} action={action} />
                      ))}
                    </div>
                  </section>
                </CardStaggerItem>
              </CardStaggerContainer>
            )}
          </div>
          {!setupGuideExpanded && !setupComplete && (
            <CardStaggerContainer>
              <CardStaggerItem className='bg-card overflow-hidden rounded-xl border'>
                <div className='relative overflow-hidden px-4 py-3 sm:px-5'>
                  <div className='relative flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <span className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg'>
                        <ListChecks
                          className='text-muted-foreground size-4'
                          aria-hidden='true'
                        />
                      </span>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                          <h3 className='truncate text-sm font-semibold'>
                            {t('Setup guide')}
                          </h3>
                          <Badge variant='secondary'>
                            {t('Setup progress: {{completed}}/{{total}}', {
                              completed: completedStepCount,
                              total: startSteps.length,
                            })}
                          </Badge>
                        </div>
                        <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
                          {t('Setup guide is collapsed. Expand it anytime.')}
                        </p>
                      </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                      {visibleQuickActions.map((action) => (
                        <CompactQuickAction
                          key={action.title}
                          action={action}
                        />
                      ))}
                      <Button
                        variant='outline'
                        size='sm'
                        className='bg-background h-8 min-w-28'
                        aria-expanded={setupGuideExpanded}
                        aria-controls={setupGuideId}
                        onClick={handleSetupGuideToggle}
                      >
                        <ChevronDown data-icon='inline-start' />
                        {t('Show setup guide')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardStaggerItem>
            </CardStaggerContainer>
          )}

          {showContentPanels && (
            <CardStaggerContainer
              className={cn(
                'grid grid-cols-1 gap-4',
                showLeftContentPanels &&
                  showUptimePanel &&
                  'xl:grid-cols-[minmax(0,1fr)_22rem]'
              )}
            >
              {showLeftContentPanels && (
                <div
                  className={cn(
                    'grid min-w-0 grid-cols-1 gap-4',
                    (showApiInfoPanel ||
                      showAnnouncementsPanel ||
                      showFAQPanel) &&
                      'lg:grid-cols-2'
                  )}
                >
                  {isAdmin && (
                    <CardStaggerItem className='lg:col-span-2'>
                      <PerformanceHealthPanel />
                    </CardStaggerItem>
                  )}
                  {showApiInfoPanel && (
                    <CardStaggerItem>
                      <ApiInfoPanel />
                    </CardStaggerItem>
                  )}
                  {showAnnouncementsPanel && (
                    <CardStaggerItem>
                      <AnnouncementsPanel />
                    </CardStaggerItem>
                  )}
                  {showFAQPanel && (
                    <CardStaggerItem>
                      <FAQPanel />
                    </CardStaggerItem>
                  )}
                </div>
              )}
              {showUptimePanel && (
                <CardStaggerItem>
                  <UptimePanel />
                </CardStaggerItem>
              )}
            </CardStaggerContainer>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
