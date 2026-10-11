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
import { expect, test } from 'vitest'

import { EngineIllustration } from '..'

test('the illustration is a described figure whose drawing stays decorative', () => {
  const view = render(<EngineIllustration />)
  const figure = screen.getByRole('figure', {
    name: /An AI optimizer builds, benchmarks and optimizes an inference engine/,
  })

  const svg = figure.querySelector('svg')
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(view.container.querySelector('[aria-live]')).toBeNull()
  expect(screen.queryByRole('img')).toBeNull()
})

test('the rendered illustration preserves all five original translated labels', () => {
  const view = render(<EngineIllustration />)

  expect(
    Array.from(
      view.container.querySelectorAll('svg text'),
      (label) => label.textContent
    )
  ).toEqual([
    'AI optimizer',
    'Inference engine',
    'Build',
    'Benchmark',
    'Optimize',
  ])
})
