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
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog } from '@/components/dialog'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { llmUsageBucketFields } from '@/features/keys/lib/usage-policy'
import { api } from '@/lib/api'

type Operation = {
  request_id: string
  key_id?: string
  actual: number[]
  status: string
}
type OperationPage = { operations: Operation[]; next_cursor: number | null }

export function UsageReconciliationDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
}) {
  const { t } = useTranslation()
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<Operation | null>(null)
  const [amounts, setAmounts] = useState<string[]>(['0', '0', '0', '0'])
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)
  const query = useQuery({
    queryKey: ['usage-operations', props.userId, cursor],
    enabled: props.open,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: OperationPage }>(
        `/api/usage-admin/${props.userId}/operations?cursor=${cursor}`
      )
      if (!response.data.success) throw new Error('usage unavailable')
      return response.data.data
    },
  })
  const numeric = amounts.map((value, i) => {
    // Parse USD decimals as integer microUSD without binary-float rounding.
    if (!(i === 3 ? /^\d+(?:\.\d{1,6})?$/ : /^\d+$/).test(value)) {
      return Number.NaN
    }
    const [whole, fraction = ''] = value.split('.')
    return i === 3
      ? Number(whole) * 1000000 + Number(fraction.padEnd(6, '0'))
      : Number(whole)
  })
  const valid =
    reason.trim().length >= 3 &&
    reason.length <= 1000 &&
    numeric.every(
      (n, i) =>
        Number.isSafeInteger(n) && n >= (selected?.actual[i] ?? 0) && n <= 1e12
    )
  const save = useMutation({
    mutationFn: async () => {
      if (!selected || !valid) throw new Error('invalid reconciliation')
      const response = await api.post<{ success: boolean }>(
        `/api/usage-admin/${props.userId}/operations/${encodeURIComponent(selected.request_id)}/reconcile`,
        { actual: numeric, reason: reason.trim() }
      )
      if (!response.data.success) throw new Error('reconciliation failed')
    },
    onSuccess: () => {
      setConfirm(false)
      setSelected(null)
      setCursor(0)
      void query.refetch()
    },
  })
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t('Review incomplete usage')}
    >
      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState onRetry={() => void query.refetch()} />}
      {query.isSuccess && (
        <div className='space-y-4'>
          <p>
            {t(
              'Incomplete usage does not block new requests. Enter only verified cumulative usage.'
            )}
          </p>
          {query.data.operations.length === 0 && (
            <p>{t('No incomplete usage')}</p>
          )}
          <ul className='space-y-2'>
            {query.data.operations.map((op) => (
              <li
                key={op.request_id}
                className='flex flex-wrap items-center gap-2'
              >
                <code className='break-all'>{op.request_id}</code>
                {op.key_id && (
                  <span>
                    {t('API key')}: {op.key_id}
                  </span>
                )}
                <Button
                  variant='outline'
                  onClick={() => {
                    setSelected(op)
                    setAmounts(
                      op.actual.map((n, i) =>
                        String(n / (i === 3 ? 1000000 : 1))
                      )
                    )
                    setReason('')
                    save.reset()
                  }}
                >
                  {t('Review')}
                </Button>
              </li>
            ))}
          </ul>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              disabled={cursor === 0}
              onClick={() => setCursor(Math.max(0, cursor - 50))}
            >
              {t('Previous')}
            </Button>
            <Button
              variant='outline'
              disabled={query.data.next_cursor === null}
              onClick={() => setCursor(query.data.next_cursor ?? 0)}
            >
              {t('Next')}
            </Button>
          </div>
          {selected && (
            <div className='space-y-3'>
              <p className='break-all'>{selected.request_id}</p>
              {llmUsageBucketFields.map((field, i) => (
                <div key={field.name} className='space-y-1'>
                  <Label htmlFor={`reconcile-${field.name}`}>
                    {t(field.label)}
                  </Label>
                  <Input
                    id={`reconcile-${field.name}`}
                    type='number'
                    min={selected.actual[i] / (i === 3 ? 1000000 : 1)}
                    step={i === 3 ? '0.000001' : '1'}
                    value={amounts[i]}
                    onChange={(e) =>
                      setAmounts((previous) =>
                        previous.map((n, j) => (i === j ? e.target.value : n))
                      )
                    }
                  />
                </div>
              ))}
              <Label htmlFor='reconcile-reason'>
                {t('Reconciliation reason')}
              </Label>
              <Input
                id='reconcile-reason'
                value={reason}
                maxLength={1000}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                disabled={!valid || save.isPending}
                onClick={() => setConfirm(true)}
              >
                {t('Reconcile usage')}
              </Button>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t('Reconcile usage')}
        desc={t(
          'Apply verified cumulative usage? Repeated submissions will not charge twice.'
        )}
        disabled={!valid}
        isLoading={save.isPending}
        handleConfirm={() => save.mutate()}
      >
        {save.isError && (
          <p role='alert'>{t('Failed to reconcile usage. Please retry.')}</p>
        )}
      </ConfirmDialog>
    </Dialog>
  )
}
