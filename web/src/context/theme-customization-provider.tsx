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
import { createContext, useContext, useLayoutEffect } from 'react'

import { removeCookie } from '@/lib/cookies'
import {
  DEFAULT_THEME_CUSTOMIZATION,
  THEME_COOKIE_KEYS,
  type ThemeCustomization,
} from '@/lib/theme-customization'

const fixedCustomization: { customization: ThemeCustomization } = {
  customization: DEFAULT_THEME_CUSTOMIZATION,
}

const ThemeCustomizationContext = createContext(fixedCustomization)

export function ThemeCustomizationProvider(props: {
  children: React.ReactNode
}) {
  useLayoutEffect(() => {
    // Older New API preferences must not override Fluxion's fixed visual style.
    for (const key of Object.values(THEME_COOKIE_KEYS)) {
      removeCookie(key)
    }
    const body = document.body
    body.removeAttribute('data-theme-preset')
    body.removeAttribute('data-theme-radius')
    body.removeAttribute('data-theme-scale')
    body.setAttribute('data-theme-font', 'sans')
    body.setAttribute('data-theme-content-layout', 'full')
  }, [])

  return (
    <ThemeCustomizationContext value={fixedCustomization}>
      {props.children}
    </ThemeCustomizationContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useThemeCustomization = () => useContext(ThemeCustomizationContext)
