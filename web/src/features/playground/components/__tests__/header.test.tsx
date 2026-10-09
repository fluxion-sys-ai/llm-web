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
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../constants'
import { PlaygroundHeader } from '../playground-header'

const models = [
  { label: 'DeepSeek Flash', value: 'DeepSeek-V4.1-Flash' },
  { label: 'GLM 5.3', value: 'GLM-5.3' },
]
const groups = [
  { label: 'Default', value: 'default', ratio: 1 },
  { label: 'Team', value: 'team', ratio: 1 },
]

function Header({ isModelLoading = false }: { isModelLoading?: boolean }) {
  const [config, setConfig] = useState({
    ...DEFAULT_CONFIG,
    model: models[0].value,
  })
  return (
    <PlaygroundHeader
      config={config}
      groups={groups}
      isModelLoading={isModelLoading}
      models={models}
      onConfigChange={(key, value) =>
        setConfig((current) => ({ ...current, [key]: value }))
      }
      onParameterEnabledChange={() => undefined}
      parameterEnabled={DEFAULT_PARAMETER_ENABLED}
    />
  )
}

const pointerCaptureDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'setPointerCapture'
)

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (pointerCaptureDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      'setPointerCapture',
      pointerCaptureDescriptor
    )
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
  }
})

describe('Playground header model selection', () => {
  test.each([1024, 390])(
    'at %ipx choosing a model retains the selected group and closes the picker',
    async (width) => {
      vi.stubGlobal('innerWidth', width)
      const user = userEvent.setup()
      render(<Header />)
      const trigger = screen.getByRole('combobox')

      await user.click(trigger)
      await user.click(screen.getByRole('button', { name: 'Team' }))
      await user.click(screen.getByRole('option', { name: 'GLM 5.3' }))

      await waitFor(() =>
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      )
      expect(trigger).toHaveTextContent('GLM 5.3')
      expect(trigger).toHaveTextContent('Team')
    }
  )

  test('while model permissions load, the picker cannot be opened', () => {
    render(<Header isModelLoading />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
