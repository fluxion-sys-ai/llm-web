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

type ResolvedTheme = 'dark' | 'light'

const THEME_COOKIE_NAME = 'vite-ui-theme'

type ThemeProviderState = {
  resolvedTheme: ResolvedTheme
}

// Keep the context contract for existing charts and shared components.
// Fluxion uses light mode regardless of a saved or system theme preference.
const lightTheme: ThemeProviderState = {
  resolvedTheme: 'light',
}

const ThemeContext = createContext<ThemeProviderState>(lightTheme)

export function ThemeProvider(props: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    root.classList.add('light')
    const legacyFontClasses = [...root.classList].filter((className) =>
      className.startsWith('font-')
    )
    root.classList.remove(...legacyFontClasses)
    removeCookie('font')
    removeCookie(THEME_COOKIE_NAME)
  }, [])

  return <ThemeContext value={lightTheme}>{props.children}</ThemeContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
