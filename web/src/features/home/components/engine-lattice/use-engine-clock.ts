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
import { useEffect, useRef, useState, type RefObject } from 'react'

import { LATTICE_STATIC_SECONDS } from './timeline'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function useEngineClock(target: RefObject<HTMLElement | null>) {
  const [playing, setPlaying] = useState(
    () => !window.matchMedia(REDUCED_MOTION_QUERY).matches
  )
  const [elapsed, setElapsed] = useState(() =>
    window.matchMedia(REDUCED_MOTION_QUERY).matches ? LATTICE_STATIC_SECONDS : 0
  )
  const elapsedRef = useRef(elapsed)
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === 'undefined'
  )
  const [tabVisible, setTabVisible] = useState(() => !document.hidden)

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    const onMotionPreference = (event: MediaQueryListEvent) => {
      if (!event.matches) return
      elapsedRef.current = LATTICE_STATIC_SECONDS
      setElapsed(LATTICE_STATIC_SECONDS)
      setPlaying(false)
    }
    const onVisibility = () => setTabVisible(!document.hidden)
    media.addEventListener('change', onMotionPreference)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      media.removeEventListener('change', onMotionPreference)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (!target.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observer.observe(target.current)
    return () => observer.disconnect()
  }, [target])

  useEffect(() => {
    if (!playing || !inView || !tabVisible) return
    let frameId = 0
    let previous: number | null = null
    let lastRender = 0
    const frame = (now: number) => {
      const delta =
        previous === null ? 0 : Math.min((now - previous) / 1000, 0.08)
      previous = now
      elapsedRef.current += delta
      if (now - lastRender >= 25) {
        setElapsed(elapsedRef.current)
        lastRender = now
      }
      frameId = window.requestAnimationFrame(frame)
    }
    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
  }, [playing, inView, tabVisible])

  return {
    elapsed,
    playing,
    togglePlayback: () => setPlaying((value) => !value),
  }
}
