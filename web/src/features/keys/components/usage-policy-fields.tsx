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
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../../system-settings/components/settings-form-layout'
import { llmUsageBucketFields, type LLMUsageRules } from '../lib/usage-policy'

const policyFields = [
  {
    name: 'refill_period_seconds',
    label: 'Refill period (seconds)',
    min: 1,
    max: 86400,
  },
  {
    name: 'max_concurrent',
    label: 'Maximum concurrent operations for this key',
    min: 1,
    max: 1000,
  },
] as const

export function LLMUsagePolicyFields(props: {
  form: UseFormReturn<LLMUsageRules>
  disabled: boolean
}) {
  const { t } = useTranslation()
  return (
    <>
      <FormField
        control={props.form.control}
        name='enabled'
        render={({ field }) => (
          <SettingsSwitchItem>
            <SettingsSwitchContent>
              <FormLabel>{t('Enable limits for this key')}</FormLabel>
              <FormDescription>
                {t('Account limits still apply when key limits are disabled.')}
              </FormDescription>
              <FormMessage />
            </SettingsSwitchContent>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={props.disabled}
              />
            </FormControl>
          </SettingsSwitchItem>
        )}
      />
      {policyFields.map((config) => (
        <FormField
          key={config.name}
          control={props.form.control}
          name={config.name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t(config.label)}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type='number'
                  min={config.min}
                  max={config.max}
                  step={1}
                  disabled={props.disabled}
                  value={Number.isNaN(field.value) ? '' : field.value}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === ''
                        ? Number.NaN
                        : Number(event.target.value)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <p className='text-muted-foreground text-sm'>
        {t(
          'Capacity allows a short burst. Refill is added continuously over the configured period, up to capacity. Set both values to zero to disable a bucket. This is not a strict rolling-window cap.'
        )}
      </p>
      {llmUsageBucketFields.map((bucket) => (
        <FieldSet key={bucket.name}>
          <FieldLegend variant='label'>{t(bucket.label)}</FieldLegend>
          <FieldGroup className='grid gap-4 sm:grid-cols-2'>
            {(['capacity', 'refill'] as const).map((kind) => (
              <FormField
                key={kind}
                control={props.form.control}
                name={`${bucket.name}.${kind}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(
                        kind === 'capacity'
                          ? 'Burst capacity'
                          : 'Refill per period'
                      )}
                      <span className='sr-only'> · {t(bucket.label)}</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='number'
                        min={0}
                        max={bucket.max}
                        step={bucket.step}
                        disabled={props.disabled}
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ''
                              ? Number.NaN
                              : Number(event.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </FieldGroup>
        </FieldSet>
      ))}
    </>
  )
}
