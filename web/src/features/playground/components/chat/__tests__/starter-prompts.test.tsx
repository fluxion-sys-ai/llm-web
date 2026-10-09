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

import { PlaygroundEmptyState } from '../playground-empty-state'

describe('Playground starter prompts', () => {
  test('selecting an example sends a complete request rather than its category label', async () => {
    const user = userEvent.setup()
    const onSelectPrompt = vi.fn()

    render(<PlaygroundEmptyState onSelectPrompt={onSelectPrompt} />)
    await user.click(screen.getByRole('button', { name: 'Write code' }))

    expect(onSelectPrompt).toHaveBeenCalledWith(
      'Write a Python function that removes duplicates from a list while preserving order. Include an example.'
    )
  })

  test('keyboard users can select a starter prompt', async () => {
    const user = userEvent.setup()
    const onSelectPrompt = vi.fn()

    render(<PlaygroundEmptyState onSelectPrompt={onSelectPrompt} />)
    await user.tab()
    expect(
      screen.getByRole('button', { name: 'Explain a concept' })
    ).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onSelectPrompt).toHaveBeenCalledWith(
      'Explain the difference between an API and an SDK with a simple example.'
    )
  })
})
