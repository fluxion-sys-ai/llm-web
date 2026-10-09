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
import { RotateCcw, Search } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { gpuCatalog } from '../data'

const generations = [...new Set(gpuCatalog.map((gpu) => gpu.generation))]
const memoryOptions = [...new Set(gpuCatalog.map((gpu) => gpu.vramGb))].sort(
  (a, b) => a - b
)

type GpuFiltersProps = {
  query: string
  generation: string
  memory: string
  hasFilters: boolean
  onQueryChange: (value: string) => void
  onGenerationChange: (value: string) => void
  onMemoryChange: (value: string) => void
  onClear: () => void
}

export function GpuFilters(props: GpuFiltersProps) {
  const { t } = useTranslation()
  const id = useId()
  const generationItems = [
    { value: 'all', label: t('All generations') },
    ...generations.map((generation) => ({
      value: generation,
      label: generation,
    })),
  ]
  const memoryItems = [
    { value: 'all', label: t('Any VRAM') },
    ...memoryOptions.map((memory) => ({
      value: String(memory),
      label: t('{{value}} GB', { value: memory }),
    })),
  ]

  return (
    <div className='border-border bg-card grid items-end gap-4 rounded-xl border p-4 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'>
      <div className='space-y-2'>
        <Label htmlFor={`${id}-search`}>{t('Search GPUs')}</Label>
        <div className='relative'>
          <Search
            aria-hidden='true'
            className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2'
          />
          <Input
            id={`${id}-search`}
            type='search'
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t('Search GPU models...')}
            className='pl-9'
          />
        </div>
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`${id}-generation`}>{t('GPU generation')}</Label>
        <Select
          value={props.generation}
          items={generationItems}
          onValueChange={(value) => {
            if (value !== null) props.onGenerationChange(value)
          }}
        >
          <SelectTrigger
            id={`${id}-generation`}
            aria-label={t('GPU generation')}
            className='w-full'
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {generationItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`${id}-memory`}>{t('GPU memory')}</Label>
        <Select
          value={props.memory}
          items={memoryItems}
          onValueChange={(value) => {
            if (value !== null) props.onMemoryChange(value)
          }}
        >
          <SelectTrigger
            id={`${id}-memory`}
            aria-label={t('GPU memory')}
            className='w-full'
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {memoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button
        variant='ghost'
        onClick={props.onClear}
        disabled={!props.hasFilters}
      >
        <RotateCcw aria-hidden='true' className='size-4' />
        {t('Reset')}
      </Button>
    </div>
  )
}
