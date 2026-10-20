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
/**
 * Column definitions factory
 */
import type { VisibilityState } from '@tanstack/react-table'

// Keep diagnostics available in the column picker without filling the default
// activity list with empty cells for top-ups, adjustments, and audit entries.
export const COMMON_LOG_COLUMN_VISIBILITY: VisibilityState = {
  channel: false,
  token_name: false,
  is_stream: false,
  use_time: false,
  content: false,
}
