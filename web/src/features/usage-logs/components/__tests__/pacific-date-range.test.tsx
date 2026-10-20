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
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { CompactDateTimeRangePicker } from '../compact-date-time-range-picker'

afterEach(() => vi.useRealTimers())

it('shows PDT and PST on range endpoints and parses changed inputs in Pacific time', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(
    <CompactDateTimeRangePicker
      start={new Date('2026-10-19T02:00:00Z')}
      end={new Date('2026-11-02T02:00:00Z')}
      onChange={onChange}
    />
  )
  await user.click(
    screen.getByRole('button', {
      name: '2026-10-18 19:00 PDT ~ 2026-11-01 18:00 PST',
    })
  )
  expect(screen.getByLabelText('Start Time')).toHaveValue('2026-10-18T19:00')
  fireEvent.change(screen.getByLabelText('Start Time'), {
    target: { value: '2026-10-18T20:00' },
  })
  await user.click(screen.getByRole('button', { name: 'Confirm' }))
  expect(onChange).toHaveBeenCalledWith({
    start: new Date('2026-10-19T03:00:00Z'),
    end: new Date('2026-11-02T02:00:00Z'),
  })
})

it('rejects the missing spring-forward hour instead of querying the wrong time', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<CompactDateTimeRangePicker onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: 'Date Range' }))
  fireEvent.change(screen.getByLabelText('Start Time'), {
    target: { value: '2026-03-08T02:30' },
  })
  await user.click(screen.getByRole('button', { name: 'Confirm' }))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Enter a valid Pacific date and time.'
  )
  expect(onChange).not.toHaveBeenCalled()
})

it('preserves an unchanged repeated-hour timestamp and second precision', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  const start = new Date('2026-11-01T09:30:12Z')
  render(<CompactDateTimeRangePicker start={start} onChange={onChange} />)
  await user.click(
    screen.getByRole('button', { name: '2026-11-01 01:30 PST ~ -' })
  )
  await user.click(screen.getByRole('button', { name: 'Confirm' }))
  expect(onChange).toHaveBeenCalledWith({ start, end: undefined })
})

it('selects today as the complete 25-hour Pacific fall-back day', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-01T18:00:00Z'))
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<CompactDateTimeRangePicker onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: 'Date Range' }))
  await user.click(screen.getByRole('button', { name: 'Today' }))
  expect(onChange).toHaveBeenCalledWith({
    start: new Date('2026-11-01T07:00:00Z'),
    end: new Date('2026-11-02T07:59:59.999Z'),
  })
})
