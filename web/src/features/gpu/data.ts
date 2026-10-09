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
export type GpuSpec = {
  id: string
  name: string
  vendor: 'NVIDIA'
  vramGb: number
  generation: 'Ampere' | 'Hopper' | 'Blackwell'
  description: string
}

// Hardware catalog only. Fluxion instance allocations, prices and stock are not
// connected yet. B300 uses NVIDIA's nominal 288 GB specification, not the
// different memory figure shown in the reference provider's listing.
export const gpuCatalog: GpuSpec[] = [
  {
    id: 'a100-pcie-80gb',
    name: 'A100 PCIe 80G',
    vendor: 'NVIDIA',
    vramGb: 80,
    generation: 'Ampere',
    description: 'PCIe acceleration for model inference and training.',
  },
  {
    id: 'h100',
    name: 'H100',
    vendor: 'NVIDIA',
    vramGb: 80,
    generation: 'Hopper',
    description: 'Hopper acceleration for demanding language model workloads.',
  },
  {
    id: 'a100-80gb',
    name: 'A100 80G',
    vendor: 'NVIDIA',
    vramGb: 80,
    generation: 'Ampere',
    description:
      'High-memory compute for training and serving language models.',
  },
  {
    id: 'h200',
    name: 'H200',
    vendor: 'NVIDIA',
    vramGb: 141,
    generation: 'Hopper',
    description: 'Expanded GPU memory for larger models and longer contexts.',
  },
  {
    id: 'b200',
    name: 'B200',
    vendor: 'NVIDIA',
    vramGb: 180,
    generation: 'Blackwell',
    description: 'Blackwell compute for large-scale AI training and inference.',
  },
  {
    id: 'b300',
    name: 'B300',
    vendor: 'NVIDIA',
    vramGb: 288,
    generation: 'Blackwell',
    description:
      'High-capacity Blackwell compute for the largest model workloads.',
  },
]
