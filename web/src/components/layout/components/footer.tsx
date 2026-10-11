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
import { Link } from '@tanstack/react-router'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { FluxionWordmark } from '@/components/fluxion-wordmark'
import { useSystemConfig } from '@/hooks/use-system-config'
import { DEFAULT_LOGO, DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface FooterLink {
  text: string
  href: string
}

interface FooterColumnProps {
  title: string
  links: FooterLink[]
  twoColumns?: boolean
}

interface FooterProps {
  logo?: string
  name?: string
  columns?: FooterColumnProps[]
  copyright?: string
  className?: string
}

const NEW_API_FOOTER_ATTRIBUTION_KEY = [
  'footer',
  'new' + 'api',
  'projectAttributionSuffix',
].join('.')

function FooterLinkItem(props: { link: FooterLink }) {
  const { t } = useTranslation()
  const isExternal = props.link.href.startsWith('http')
  const label = t(props.link.text)

  if (isExternal) {
    return (
      <a
        href={props.link.href}
        target='_blank'
        rel='noopener noreferrer'
        className='text-muted-foreground hover:text-foreground text-sm transition-colors duration-200'
      >
        {label}
      </a>
    )
  }

  return (
    <Link
      to={props.link.href}
      className='text-muted-foreground hover:text-foreground text-sm transition-colors duration-200'
    >
      {label}
    </Link>
  )
}

const policyLinks: FooterLink[] = [
  { text: 'Terms of Service', href: '/terms' },
  { text: 'Privacy Policy', href: '/privacy' },
  { text: 'Data Policy', href: '/data-policy' },
  { text: 'DPA', href: '/dpa' },
  { text: 'Refund Policy', href: '/refunds' },
]

// Keep the LLM policies reachable when an administrator supplies a custom footer.
function LegalLinks(props: { leadingSeparator?: boolean }) {
  const { t } = useTranslation()
  return (
    <>
      {policyLinks.map((item, index) => (
        <Fragment key={item.href}>
          {(props.leadingSeparator || index > 0) && (
            <span aria-hidden='true' className='text-muted-foreground/30'>
              ·
            </span>
          )}
          <Link
            to={item.href}
            className='hover:text-foreground transition-colors duration-200'
          >
            {t(item.text)}
          </Link>
        </Fragment>
      ))}
    </>
  )
}

// inline=true returns just the inner span for composition in a parent flex
// row. inline=false wraps in a centered/right-aligned div (default).
function ProjectAttribution(props: { currentYear: number; inline?: boolean }) {
  const { t } = useTranslation()
  const content = (
    <span className='text-muted-foreground'>
      &copy; {props.currentYear}{' '}
      <a
        href='https://github.com/QuantumNous/new-api'
        target='_blank'
        rel='noopener noreferrer'
        className='text-foreground/70 hover:text-foreground font-medium transition-colors'
      >
        {t('New API')}
      </a>
      . {t(NEW_API_FOOTER_ATTRIBUTION_KEY)}
    </span>
  )
  if (props.inline) {
    return content
  }
  return (
    <div className='text-muted-foreground text-center text-xs sm:text-right'>
      {content}
    </div>
  )
}

export function Footer(props: FooterProps) {
  const { t } = useTranslation()
  const { systemName, logo: systemLogo, footerHtml } = useSystemConfig()

  const displayLogo = systemLogo || props.logo || DEFAULT_LOGO
  const displayName = systemName || props.name || DEFAULT_SYSTEM_NAME
  const currentYear = new Date().getFullYear()

  const fallbackColumns = useMemo<FooterColumnProps[]>(
    () => [
      {
        title: t('Product'),
        links: [
          { text: t('Models'), href: '/pricing' },
          { text: t('GPU'), href: '/gpu' },
          { text: t('Playground'), href: '/playground' },
        ],
      },
      {
        title: t('Account'),
        links: [
          { text: t('Dashboard'), href: '/dashboard' },
          { text: t('API Keys'), href: '/keys' },
          { text: t('Usage'), href: '/usage-logs/common' },
        ],
      },
      {
        title: t('Company'),
        links: policyLinks,
        twoColumns: true,
      },
    ],
    [t]
  )

  const displayColumns = props.columns ?? fallbackColumns

  if (footerHtml) {
    return (
      <footer
        className={cn(
          'border-border/40 relative z-10 border-t',
          props.className
        )}
      >
        <div className='mx-auto w-full max-w-(--page-max) px-6 py-5'>
          <div className='bg-muted border-border flex flex-col items-center justify-between gap-4 rounded-xl border px-4 py-4 sm:flex-row sm:px-5'>
            <div
              className='custom-footer text-muted-foreground min-w-0 text-center text-sm sm:text-left'
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
            <div className='border-border/60 text-muted-foreground flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t pt-4 text-xs sm:w-auto sm:justify-end sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5'>
              <LegalLinks />
              <ProjectAttribution currentYear={currentYear} inline />
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer
      className={cn('border-border relative z-10 border-t', props.className)}
    >
      <div className='mx-auto grid w-full max-w-(--page-max) grid-cols-2 gap-x-8 gap-y-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_2fr]'>
        {/* Brand column */}
        <div className='col-span-full min-w-0 md:col-span-1'>
          <Link to='/' className='group flex items-center gap-2.5'>
            <img
              src={displayLogo}
              alt={displayName}
              className='size-7 rounded-lg object-contain'
            />
            <FluxionWordmark name={displayName} className='text-lg' />
          </Link>
          <p className='text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed'>
            {t('Specialized inference engines for every model–GPU pair.')}
          </p>
        </div>

        {/* Links columns */}
        {displayColumns.map((column) => (
          <div
            key={column.title}
            className={cn(
              'min-w-0',
              column.twoColumns && 'col-span-full md:col-span-1'
            )}
          >
            <p className='text-foreground mb-3 text-sm font-medium'>
              {t(column.title)}
            </p>
            <ul
              className={
                column.twoColumns
                  ? 'grid grid-flow-col grid-cols-2 grid-rows-3 gap-x-6 gap-y-2'
                  : 'space-y-2'
              }
            >
              {column.links.map((link) => (
                <li key={link.href}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Copyright + optional legal links inline on the left, project
          attribution on the right; wraps on narrow screens. */}
      <div className='border-border border-t'>
        <div className='mx-auto flex w-full max-w-(--page-max) flex-col items-center justify-between gap-x-3 gap-y-2 px-6 py-5 sm:flex-row'>
          <div className='text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:justify-start'>
            <span>
              &copy; {currentYear} {displayName}.{' '}
              {props.copyright ?? t('footer.defaultCopyright')}
            </span>
            {props.columns && <LegalLinks leadingSeparator />}
          </div>
          <div className='flex flex-col items-center gap-2 sm:items-end'>
            <a
              href='https://fluxion-sys.ai'
              target='_blank'
              rel='noopener noreferrer'
              className='text-muted-foreground hover:text-foreground text-xs transition-colors'
            >
              fluxion-sys.ai
            </a>
            <ProjectAttribution currentYear={currentYear} />
          </div>
        </div>
      </div>
    </footer>
  )
}
