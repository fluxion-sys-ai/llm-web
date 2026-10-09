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
import { ArrowRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function BlogPage() {
  const { t } = useTranslation()

  return (
    <PublicLayout showMainContainer={false}>
      <main className='mx-auto w-full max-w-[1440px] px-6 pt-28 pb-20'>
        <header className='mx-auto mb-12 max-w-3xl text-center'>
          <h1 className='text-4xl leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[40px]'>
            {t('Blog')}
          </h1>
          <p className='text-muted-foreground mt-4 text-base leading-relaxed'>
            {t(
              'Notes on AI-generated kernels, GPU infrastructure, and fast LLM inference.'
            )}
          </p>
          <div className='mt-6 flex flex-wrap justify-center gap-2'>
            <Badge variant='outline'>{t('AI kernels')}</Badge>
            <Badge variant='outline'>{t('GPU infrastructure')}</Badge>
            <Badge variant='outline'>{t('LLM serving')}</Badge>
          </div>
        </header>

        <Card className='mx-auto max-w-3xl'>
          <CardContent className='flex flex-col items-center px-6 py-12 text-center sm:py-16'>
            <span className='bg-muted mb-6 flex size-14 items-center justify-center rounded-xl'>
              <BookOpen aria-hidden='true' className='size-6' />
            </span>
            <h2 className='text-2xl font-semibold tracking-tight'>
              {t('Stories from the Fluxion team are coming soon.')}
            </h2>
            <p className='text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed'>
              {t(
                'We will share engineering notes, research, and product updates here.'
              )}
            </p>
            <Button role='link' className='mt-8' render={<Link to='/docs' />}>
              {t('Read the docs')}
              <ArrowRight aria-hidden='true' className='size-4' />
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </PublicLayout>
  )
}
