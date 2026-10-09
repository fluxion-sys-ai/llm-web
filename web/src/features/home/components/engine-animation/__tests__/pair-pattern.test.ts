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
import { expect, test } from 'vitest'

import { getEnginePattern, type EnginePair } from '../timeline'

test.each<{ input: string; first: EnginePair; second: EnginePair }>([
  { input: 'GPU', first: [0, 0], second: [2, 0] },
  { input: 'LLM', first: [2, 0], second: [2, 2] },
])(
  'changing only the $input gives the personalized engine a distinct pattern',
  ({ first, second }) => {
    expect(getEnginePattern(first)).not.toEqual(getEnginePattern(second))
  }
)
