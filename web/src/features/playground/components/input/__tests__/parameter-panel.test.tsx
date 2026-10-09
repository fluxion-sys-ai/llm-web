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
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import { PlaygroundParameterPanel } from '../playground-parameter-panel'

function ParameterSettings() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [parameterEnabled, setParameterEnabled] = useState(
    DEFAULT_PARAMETER_ENABLED
  )

  return (
    <PlaygroundParameterPanel
      config={config}
      onConfigChange={(key, value) =>
        setConfig((current) => ({ ...current, [key]: value }))
      }
      onParameterEnabledChange={(key, value) =>
        setParameterEnabled((current) => ({ ...current, [key]: value }))
      }
      parameterEnabled={parameterEnabled}
    />
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('Playground parameter settings', () => {
  test.each([1024, 390])(
    'at %ipx the named settings panel preserves editable parameters and Escape returns focus',
    async (width) => {
      vi.stubGlobal('innerWidth', width)
      const user = userEvent.setup()
      render(<ParameterSettings />)
      const trigger = screen.getByRole('button', { name: 'Parameters' })

      await user.click(trigger)
      const panel = await screen.findByRole('dialog', {
        name: 'Parameter settings',
      })
      const input = within(panel).getByRole('spinbutton', {
        name: 'Max Tokens',
      })
      expect(input).toBeDisabled()
      await user.click(
        within(panel).getByRole('switch', { name: 'Enable Max Tokens' })
      )
      expect(input).toBeEnabled()
      await user.clear(input)
      await user.type(input, '2048')
      expect(input).toHaveValue(2048)

      await user.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      await waitFor(() => expect(trigger).toHaveFocus())
    }
  )
})
