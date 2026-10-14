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
import { DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface FluxionWordmarkProps {
  name?: string
  className?: string
}

export function FluxionWordmark(props: FluxionWordmarkProps) {
  const name = props.name || DEFAULT_SYSTEM_NAME

  if (name.toLowerCase() !== 'fluxion') {
    return <span className={props.className}>{name}</span>
  }

  return (
    <span
      className={cn(
        'font-fluxion inline-flex items-center gap-2 text-[19px] leading-none font-medium tracking-[-0.02em]',
        props.className
      )}
    >
      fluxion
      <span className='border-border text-muted-foreground rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-[0.08em]'>
        AI
      </span>
    </span>
  )
}
