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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import { PlaygroundInputTools } from '../playground-input-tools'

function renderTools(
  options: { disabled?: boolean; hasMessages?: boolean } = {}
) {
  const onClearMessages = vi.fn()

  render(
    <PlaygroundInputTools
      config={DEFAULT_CONFIG}
      disabled={options.disabled}
      hasMessages={options.hasMessages}
      onClearMessages={onClearMessages}
      onConfigChange={() => undefined}
      onParameterEnabledChange={() => undefined}
      parameterEnabled={DEFAULT_PARAMETER_ENABLED}
    />
  )

  return { onClearMessages }
}

describe('Playground input tools', () => {
  test('the toolbar offers working parameters and history actions without unfinished tools', () => {
    renderTools({ hasMessages: true })

    expect(screen.getByRole('button', { name: 'Parameters' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'Clear chat history' })
    ).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'Attach' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Search' })
    ).not.toBeInTheDocument()
  })

  test('clearing an existing conversation still requires explicit confirmation', async () => {
    const user = userEvent.setup()
    const { onClearMessages } = renderTools({ hasMessages: true })

    await user.click(screen.getByRole('button', { name: 'Clear chat history' }))
    expect(onClearMessages).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onClearMessages).toHaveBeenCalledOnce()
  })

  test('an empty conversation cannot be cleared', () => {
    renderTools()

    expect(
      screen.getByRole('button', { name: 'Clear chat history' })
    ).toBeDisabled()
  })
})
