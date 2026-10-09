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
import { useEffect, useState, type RefObject } from 'react'

import type { EngineFrame } from './timeline'

type Point = { x: number; y: number }
type Curve = readonly [Point, Point, Point, Point]
type Geometry = {
  width: number
  height: number
  gpu: Curve
  llm: Curve
  output: Curve
  junction: Point
}
type EngineConnectorsProps = {
  diagramRef: RefObject<HTMLDivElement | null>
  gpuRef: RefObject<HTMLDivElement | null>
  llmRef: RefObject<HTMLDivElement | null>
  gpuReelRef: RefObject<HTMLDivElement | null>
  llmReelRef: RefObject<HTMLDivElement | null>
  engineRef: RefObject<HTMLDivElement | null>
  frame: EngineFrame
}

function curvePath(curve: Curve): string {
  const [start, first, second, end] = curve
  return `M ${start.x} ${start.y} C ${first.x} ${first.y}, ${second.x} ${second.y}, ${end.x} ${end.y}`
}

function particlePosition(curve: Curve, progress: number): string {
  const t = progress * progress * (3 - 2 * progress)
  const inverse = 1 - t
  const [start, first, second, end] = curve
  const x =
    inverse ** 3 * start.x +
    3 * inverse ** 2 * t * first.x +
    3 * inverse * t ** 2 * second.x +
    t ** 3 * end.x
  const y =
    inverse ** 3 * start.y +
    3 * inverse ** 2 * t * first.y +
    3 * inverse * t ** 2 * second.y +
    t ** 3 * end.y
  return `translate(${x} ${y})`
}

export function EngineConnectors(props: EngineConnectorsProps) {
  const [geometry, setGeometry] = useState<Geometry | null>(null)

  useEffect(() => {
    const diagram = props.diagramRef.current
    const gpu = props.gpuRef.current
    const llm = props.llmRef.current
    const gpuReel = props.gpuReelRef.current
    const llmReel = props.llmReelRef.current
    const engine = props.engineRef.current
    if (!diagram || !gpu || !llm || !gpuReel || !llmReel || !engine) return
    const measure = () => {
      const bounds = diagram.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const a = gpu.getBoundingClientRect()
      const b = llm.getBoundingClientRect()
      const ar = gpuReel.getBoundingClientRect()
      const br = llmReel.getBoundingClientRect()
      const e = engine.getBoundingClientRect()
      const first = {
        x: a.right - bounds.left,
        y: ar.top + ar.height / 2 - bounds.top,
      }
      const second = {
        x: b.right - bounds.left,
        y: br.top + br.height / 2 - bounds.top,
      }
      const end = {
        x: e.left - bounds.left,
        y: e.top + e.height / 2 - bounds.top,
      }
      let junction: Point
      let gpuCurve: Curve
      let llmCurve: Curve
      let outputCurve: Curve
      if (bounds.width < 500) {
        end.x = e.right - bounds.left
        junction = { x: bounds.width - 12, y: b.bottom - bounds.top + 29 }
        gpuCurve = [
          first,
          { x: junction.x, y: first.y },
          { x: junction.x, y: junction.y - 45 },
          junction,
        ]
        llmCurve = [
          second,
          { x: junction.x - 1, y: second.y },
          { x: junction.x, y: junction.y - 20 },
          junction,
        ]
        outputCurve = [
          junction,
          { x: junction.x, y: junction.y + 45 },
          { x: junction.x, y: end.y },
          end,
        ]
      } else {
        junction = { x: first.x + (end.x - first.x) * 0.61, y: end.y }
        gpuCurve = [
          first,
          { x: first.x + 55, y: first.y },
          { x: junction.x - 53, y: junction.y },
          junction,
        ]
        llmCurve = [
          second,
          { x: second.x + 55, y: second.y },
          { x: junction.x - 53, y: junction.y },
          junction,
        ]
        outputCurve = [junction, junction, end, end]
      }
      setGeometry({
        width: bounds.width,
        height: bounds.height,
        gpu: gpuCurve,
        llm: llmCurve,
        output: outputCurve,
        junction,
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const element of [diagram, gpu, llm, gpuReel, llmReel, engine]) {
      observer.observe(element)
    }
    return () => observer.disconnect()
  }, [
    props.diagramRef,
    props.gpuRef,
    props.llmRef,
    props.gpuReelRef,
    props.llmReelRef,
    props.engineRef,
  ])

  if (!geometry) return null
  return (
    <svg
      className='ea-connectors'
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden='true'
    >
      <path
        d={curvePath(geometry.gpu)}
        fill='none'
        stroke={props.frame.gpuLocked ? '#8eafda' : '#c4d2e4'}
        strokeWidth='1.4'
      />
      <path
        d={curvePath(geometry.llm)}
        fill='none'
        stroke={props.frame.llmLocked ? '#8eafda' : '#c4d2e4'}
        strokeWidth='1.4'
      />
      <path
        d={curvePath(geometry.output)}
        fill='none'
        stroke='#9cbbe2'
        strokeWidth='1.6'
      />
      <circle
        cx={geometry.junction.x}
        cy={geometry.junction.y}
        r='4'
        fill='#f9fcff'
        stroke='#95b5e0'
        strokeWidth='1.4'
      />
      <circle
        cx={geometry.junction.x}
        cy={geometry.junction.y}
        r='15'
        fill='#96bbed'
        opacity={props.frame.glow}
      />
      {props.frame.inputsProgress !== null && (
        <>
          <rect
            x='-4'
            y='-4'
            width='8'
            height='8'
            rx='2'
            fill='#84a9dc'
            transform={particlePosition(
              geometry.gpu,
              props.frame.inputsProgress
            )}
          />
          <circle
            r='4.5'
            fill='#8c9fb8'
            transform={particlePosition(
              geometry.llm,
              props.frame.inputsProgress
            )}
          />
        </>
      )}
      {props.frame.outputProgress !== null && (
        <circle
          r='6'
          fill='#719ed7'
          transform={particlePosition(
            geometry.output,
            props.frame.outputProgress
          )}
        />
      )}
    </svg>
  )
}
