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

import { EngineAnimation } from '..'

let reducedMotion = false
let tabHidden = false
let timestamp = 0
let nextFrameId = 0
let onIntersection: IntersectionObserverCallback
let motionEvents: EventTarget
let media: MediaQueryList
const frames = new Map<number, FrameRequestCallback>()
const intersectionDisconnect = vi.fn()
const resizeDisconnect = vi.fn()

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
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect = resizeDisconnect
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

test('autoplay locks GPU then LLM, merges, holds the result, and starts the next pair', () => {
  render(<EngineAnimation />)
  enterViewport()
  expect(screen.getByText('Matching GPU')).toBeInTheDocument()

  advanceAnimation(2320)
  expect(screen.getByText('Matching LLM')).toBeInTheDocument()
  expect(screen.getAllByText('Locked')).toHaveLength(1)
  advanceAnimation(1520)
  expect(screen.getByText('Pair locked')).toBeInTheDocument()
  expect(screen.getAllByText('Locked')).toHaveLength(2)
  advanceAnimation(480)
  expect(screen.getByText('Creating personalized engine')).toBeInTheDocument()
  advanceAnimation(1520)
  expect(screen.getByText('Personalized engine')).toBeInTheDocument()
  expect(screen.getByText('× NVIDIA H200')).toBeInTheDocument()
  advanceAnimation(4000)
  expect(screen.getByText('× NVIDIA H200')).toBeInTheDocument()
  advanceAnimation(600)
  expect(screen.getByText('Matching GPU')).toBeInTheDocument()
  expect(screen.queryByText('× NVIDIA H200')).not.toBeInTheDocument()
})

test('keyboard pause freezes the current stage and play resumes without a time jump', async () => {
  const user = userEvent.setup()
  render(<EngineAnimation />)
  enterViewport()
  advanceAnimation(1000)

  await user.tab()
  expect(screen.getByRole('button', { name: 'Pause animation' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('button', { name: 'Play animation' })).toHaveFocus()
  expect(frames.size).toBe(0)
  advanceAnimation(12000)
  expect(screen.getByText('Matching GPU')).toBeInTheDocument()

  await user.keyboard('{Enter}')
  advanceAnimation(1600)
  expect(screen.getByText('Matching LLM')).toBeInTheDocument()
})

test('reduced motion starts settled and paused, but allows an explicit play choice', async () => {
  reducedMotion = true
  const user = userEvent.setup()
  render(<EngineAnimation />)
  enterViewport()

  expect(screen.getByText('× NVIDIA H200')).toBeInTheDocument()
  expect(frames.size).toBe(0)
  await user.click(screen.getByRole('button', { name: 'Play animation' }))
  advanceAnimation(4200)
  expect(screen.getByText('Matching GPU')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Pause animation' })
  ).toBeInTheDocument()
})

test('enabling reduced motion during playback settles and pauses the illustration', () => {
  render(<EngineAnimation />)
  enterViewport()
  advanceAnimation(1000)

  changeMotionPreference(true)

  expect(screen.getByText('× NVIDIA H200')).toBeInTheDocument()
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
    render(<EngineAnimation />)
    enterViewport()
    advanceAnimation(1000)
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
    expect(screen.getByText('Matching GPU')).toBeInTheDocument()
    setSuspended(false)
    advanceAnimation(1600)
    expect(screen.getByText('Matching LLM')).toBeInTheDocument()
  }
)

test('unmount removes the observers, preference listeners, and pending animation frame', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 780, 261)
  )
  const removeVisibilityListener = vi.spyOn(document, 'removeEventListener')
  const view = render(<EngineAnimation />)
  enterViewport()
  expect(frames.size).toBe(1)

  view.unmount()

  expect(frames.size).toBe(0)
  expect(intersectionDisconnect).toHaveBeenCalledOnce()
  expect(resizeDisconnect).toHaveBeenCalledOnce()
  expect(media.removeEventListener).toHaveBeenCalledWith(
    'change',
    expect.any(Function)
  )
  expect(removeVisibilityListener).toHaveBeenCalledWith(
    'visibilitychange',
    expect.any(Function)
  )
})

test('the illustration exposes a stable description without announcing decorative reel changes', () => {
  const view = render(<EngineAnimation />)
  const figure = screen.getByRole('figure', {
    name: /GPU and LLM options lock into a pair/,
  })
  expect(
    screen.getByRole('heading', { name: 'Personalized Engine' })
  ).toBeInTheDocument()
  expect(figure.querySelectorAll('.ea-input[aria-hidden="true"]')).toHaveLength(
    2
  )
  expect(view.container.querySelector('[aria-live]')).toBeNull()
  enterViewport()
  advanceAnimation(5800)
  expect(figure).toHaveAccessibleName(/GPU and LLM options lock into a pair/)
})
