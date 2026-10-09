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

import { PublicLayout } from '@/components/layout'
import { RichContent } from '@/components/rich-content'

import '@/styles/legal-policy.css'

import { LLM_LEGAL_DOCUMENTS, type LlmLegalSlug } from './llm-documents'

export function LlmPolicy({ slug }: { slug: LlmLegalSlug }) {
  const { t } = useTranslation()
  const document = LLM_LEGAL_DOCUMENTS[slug]

  return (
    <PublicLayout showFooter>
      <article className='mx-auto max-w-4xl py-10 sm:py-12'>
        <h1 className='text-3xl font-semibold tracking-tight'>
          {t(document.title)}
        </h1>
        <RichContent
          mode={document.format}
          htmlVariant='inline'
          content={document.content}
          className='llm-policy-content mt-3'
        />
      </article>
    </PublicLayout>
  )
}

export function DataPolicy() {
  return <LlmPolicy slug='data-policy' />
}

export function DataProcessingAddendum() {
  return <LlmPolicy slug='dpa' />
}

export function RefundPolicy() {
  return <LlmPolicy slug='refunds' />
}
