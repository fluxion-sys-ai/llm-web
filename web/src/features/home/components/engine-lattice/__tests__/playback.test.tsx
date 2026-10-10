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
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { EngineLattice } from '..'

const FIRST_PAIR = 'Building GLM 5.3 × A100 PCIe'
const SECOND_PAIR = 'Building GLM 5.3 × A100'
const SETTLED = 'Every pair has its own engine'

let reducedMotion = false
let tabHidden = false
let timestamp = 0
let nextFrameId = 0
let onIntersection: IntersectionObserverCallback
let motionEvents: EventTarget
let media: MediaQueryList
const frames = new Map<number, FrameRequestCallback>()
const intersectionDisconnect = vi.fn()

beforeEach(() => {
  reducedMotion = false
  tabHidden = false
  timestamp = 0
  frames.clear()
  motionEvents = new EventTarget()
  media = {
    get matches() {
      return reducedMotion
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: motionEvents.addEventListener.bind(motionEvents),
    removeEventListener: vi.fn(
      motionEvents.removeEventListener.bind(motionEvents)
    ),
    dispatchEvent: motionEvents.dispatchEvent.bind(motionEvents),
  }
  vi.spyOn(window, 'matchMedia').mockReturnValue(media)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => tabHidden)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++nextFrameId, callback)
    return nextFrameId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        onIntersection = callback
      }
      observe() {}
      disconnect = intersectionDisconnect
    }
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function enterViewport(visible = true): void {
  act(() =>
    onIntersection(
      [{ isIntersecting: visible } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
  )
}

function advanceAnimation(milliseconds: number): void {
  for (let step = 0; step < milliseconds; step += 40) {
    timestamp += 40
    const pending = [...frames.values()]
    frames.clear()
    act(() => {
      for (const callback of pending) callback(timestamp)
    })
  }
}

function changeMotionPreference(reduced: boolean): void {
  reducedMotion = reduced
  act(() =>
    media.dispatchEvent(
      Object.assign(new Event('change'), { matches: reduced })
    )
  )
}

test('autoplay builds pair by pair, settles with every engine ready, then starts over', () => {
  render(<EngineLattice />)
  enterViewport()
  expect(screen.getByText(FIRST_PAIR)).toBeInTheDocument()
  expect(screen.getByRole('figure')).toContainElement(
    document.querySelector('[data-stage="building"]')
  )

  advanceAnimation(400)
  expect(screen.getByText(SECOND_PAIR)).toBeInTheDocument()
  advanceAnimation(2800)
  expect(screen.getByText(SETTLED)).toBeInTheDocument()
  expect(document.querySelector('[data-stage="ready"]')).not.toBeNull()
  expect(document.querySelectorAll('.el-cell.el-ready')).toHaveLength(30)
  advanceAnimation(4600)
  expect(screen.getByText(SETTLED)).toBeInTheDocument()
  expect(document.querySelectorAll('.el-cell.el-idle')).toHaveLength(30)
  advanceAnimation(800)
  expect(screen.getByText(FIRST_PAIR)).toBeInTheDocument()
})

test('keyboard pause freezes the current pair and play resumes without a time jump', async () => {
  const user = userEvent.setup()
  render(<EngineLattice />)
  enterViewport()
  advanceAnimation(120)

  await user.tab()
  expect(screen.getByRole('button', { name: 'Pause animation' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('button', { name: 'Play animation' })).toHaveFocus()
  expect(frames.size).toBe(0)
  advanceAnimation(12000)
  expect(screen.getByText(FIRST_PAIR)).toBeInTheDocument()

  await user.keyboard('{Enter}')
  advanceAnimation(320)
  expect(screen.getByText(SECOND_PAIR)).toBeInTheDocument()
})

test('reduced motion starts with the finished lattice and paused, but allows an explicit play choice', async () => {
  reducedMotion = true
  const user = userEvent.setup()
  render(<EngineLattice />)
  enterViewport()

  expect(screen.getByText(SETTLED)).toBeInTheDocument()
  expect(document.querySelectorAll('.el-cell.el-ready')).toHaveLength(30)
  expect(frames.size).toBe(0)
  await user.click(screen.getByRole('button', { name: 'Play animation' }))
  advanceAnimation(3600)
  expect(screen.getByText(FIRST_PAIR)).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Pause animation' })
  ).toBeInTheDocument()
})

test('enabling reduced motion during playback settles and pauses the illustration', () => {
  render(<EngineLattice />)
  enterViewport()
  advanceAnimation(400)

  changeMotionPreference(true)

  expect(screen.getByText(SETTLED)).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Play animation' })
  ).toBeInTheDocument()
  expect(frames.size).toBe(0)
  changeMotionPreference(false)
  expect(
    screen.getByRole('button', { name: 'Play animation' })
  ).toBeInTheDocument()
})

test.each(['outside the viewport', 'in a hidden tab'])(
  'animation %s stops scheduling frames and resumes at its previous position',
  (reason) => {
    render(<EngineLattice />)
    enterViewport()
    advanceAnimation(120)
    const setSuspended = (suspended: boolean) => {
      if (reason === 'outside the viewport') enterViewport(!suspended)
      else {
        tabHidden = suspended
        act(() => document.dispatchEvent(new Event('visibilitychange')))
      }
    }

    setSuspended(true)
    expect(frames.size).toBe(0)
    advanceAnimation(12000)
    expect(screen.getByText(FIRST_PAIR)).toBeInTheDocument()
    setSuspended(false)
    advanceAnimation(320)
    expect(screen.getByText(SECOND_PAIR)).toBeInTheDocument()
  }
)

test('unmount removes the observer, preference listeners, and pending animation frame', () => {
  const removeVisibilityListener = vi.spyOn(document, 'removeEventListener')
  const view = render(<EngineLattice />)
  enterViewport()
  expect(frames.size).toBe(1)

  view.unmount()

  expect(frames.size).toBe(0)
  expect(intersectionDisconnect).toHaveBeenCalledOnce()
  expect(media.removeEventListener).toHaveBeenCalledWith(
    'change',
    expect.any(Function)
  )
  expect(removeVisibilityListener).toHaveBeenCalledWith(
    'visibilitychange',
    expect.any(Function)
  )
})

test('the illustration exposes a stable description without announcing decorative cell changes', () => {
  const view = render(<EngineLattice />)
  const figure = screen.getByRole('figure', {
    name: /An inference engine is built for every model and chip pairing/,
  })
  expect(figure.querySelector('.el-matrix')).toHaveAttribute(
    'aria-hidden',
    'true'
  )
  expect(view.container.querySelector('[aria-live]')).toBeNull()
  expect(screen.queryByRole('heading')).toBeNull()
  enterViewport()
  advanceAnimation(3400)
  expect(figure).toHaveAccessibleName(
    /An inference engine is built for every model and chip pairing/
  )
})
