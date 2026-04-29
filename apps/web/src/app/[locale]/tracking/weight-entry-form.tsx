'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { weightEntryInputSchema, type WeightEntryInput } from '@ketopath/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { saveWeightEntry, type WeightEntryRow } from './actions';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function WeightEntryForm({ latest }: { latest: WeightEntryRow | null }) {
  const t = useTranslations('Tracking');
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const form = useForm<WeightEntryInput>({
    resolver: zodResolver(weightEntryInputSchema),
    defaultValues: {
      date: todayISO(),
      weightKg: latest?.weightKg,
    } as WeightEntryInput,
  });

  const onSubmit = form.handleSubmit(async (input) => {
    setServerError(null);
    const result = await saveWeightEntry(input);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setSavedAt(new Date().toISOString());
    form.reset({ date: todayISO(), weightKg: input.weightKg } as WeightEntryInput);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-10" noValidate>
        <div className="grid grid-cols-2 gap-x-8 gap-y-8">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t('date')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value as string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weightKg"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t('weightKg')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6">
          <p className="editorial-eyebrow">{t('measurements')}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {(
              [
                ['measurements.waistCm', t('waist')],
                ['measurements.hipsCm', t('hips')],
                ['measurements.thighCm', t('thigh')],
                ['measurements.armCm', t('arm')],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                name={name as any}
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        {...field}
                        value={(field.value as number | undefined) ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <p className="editorial-eyebrow">{t('subjective')}</p>
          <div className="grid grid-cols-3 gap-x-6 gap-y-8">
            {(['energy', 'sleep', 'hunger'] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>{t(name)}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        inputMode="numeric"
                        placeholder="1–10"
                        {...field}
                        value={(field.value as number | undefined) ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {serverError ? (
          <p role="alert" className="font-display text-pomodoro text-base italic">
            {serverError}
          </p>
        ) : null}
        {savedAt && !serverError ? (
          <p className="font-display text-oliva text-base italic">{t('saved')}</p>
        ) : null}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            size="lg"
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
