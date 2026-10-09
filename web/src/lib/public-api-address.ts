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
import { isHttpUrl } from './content-format'

/**
 * Resolve the public gateway root used by examples and client imports.
 * The build setting accepts a gateway root or an OpenAI base ending in /v1.
 * Existing callers append their protocol-specific path; management APIs remain
 * same-origin and must not use this display-only configuration.
 */
export function getPublicApiServerAddress(
  fallback: string,
  configuredBase: unknown = import.meta.env.VITE_LLM_API_BASE_URL
): string {
  if (typeof configuredBase !== 'string') return fallback
  const value = configuredBase.trim()
  if (!value || !isHttpUrl(value)) return fallback

  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash) return fallback
  const path = url.pathname.replace(/\/+$/, '')
  if (path && !path.endsWith('/v1')) return fallback

  return `${url.origin}${path.replace(/\/v1$/, '')}`
}
