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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { PlaygroundInput } from '../playground-input'

const models = [{ label: 'DeepSeek Flash', value: 'DeepSeek-V4.1-Flash' }]
const groups = [{ label: 'Default', value: 'default', ratio: 1 }]

describe('Playground composer', () => {
  test('an empty draft disables Send without fading the editable composer', () => {
    render(
      <PlaygroundInput groups={groups} models={models} onSubmit={vi.fn()} />
    )
    const input = screen.getByRole('textbox', { name: 'Ask anything' })
    const group = input.closest('[data-slot="input-group"]')

    expect(input).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(group).toHaveClass(
      'has-disabled:opacity-100',
      'has-disabled:bg-background'
    )
    expect(group).not.toHaveClass('has-disabled:opacity-50')
  })

  test.each(['button', 'keyboard'])(
    '%s sends one message and clears the draft',
    async (method) => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <PlaygroundInput groups={groups} models={models} onSubmit={onSubmit} />
      )
      const input = screen.getByRole('textbox')
      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
      await user.type(input, 'Explain streaming')

      if (method === 'button') {
        await user.click(screen.getByRole('button', { name: 'Send' }))
      } else {
        await user.keyboard('{Enter}')
      }

      expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Explain streaming')
      await waitFor(() => expect(input).toHaveValue(''))
    }
  )

  test('the displayed keyboard shortcut adds a line break without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <PlaygroundInput groups={groups} models={models} onSubmit={onSubmit} />
    )
    const input = screen.getByRole('textbox', { name: 'Ask anything' })

    expect(input).toHaveAccessibleDescription(
      'Enter to send, Shift + Enter for a new line'
    )
    await user.type(input, 'First line')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(input, 'Second line')

    expect(input).toHaveValue('First line\nSecond line')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('while a response streams the single Stop control cancels without resubmitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onStop = vi.fn()
    render(
      <PlaygroundInput
        disabled
        isGenerating
        groups={groups}
        models={models}
        onSubmit={onSubmit}
        onStop={onStop}
      />
    )

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('textbox')).toHaveClass('disabled:opacity-50')
    expect(
      screen.queryByRole('button', { name: 'Send' })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onStop).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('without a callable model Send remains unavailable for a nonempty draft', async () => {
    const user = userEvent.setup()
    render(<PlaygroundInput groups={groups} models={[]} onSubmit={vi.fn()} />)
    await user.type(screen.getByRole('textbox'), 'Hello')
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })
})
