'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ACTIVITY_LEVELS,
  DIET_HISTORIES,
  GENDERS,
  profileInputSchema,
  type ProfileInput,
} from '@ketopath/shared';
import { useRouter } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { saveProfile } from './actions';

type Derived = { bmr: number; tdee: number; activityMultiplier: number };
type Profile = ProfileInput & { derived?: Derived };

export function ProfileForm({
  initial,
  onSaved,
  saveLabel,
}: {
  initial: Profile | null;
  onSaved?: (profile: Profile) => void;
  saveLabel?: string;
}) {
  const t = useTranslations('Profile');
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Derived | null>(initial?.derived ?? null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    ...(initial
      ? {
          defaultValues: {
            age: initial.age,
            gender: initial.gender,
            heightCm: initial.heightCm,
            weightStartKg: initial.weightStartKg,
            weightCurrentKg: initial.weightCurrentKg,
            weightGoalKg: initial.weightGoalKg,
            activityLevel: initial.activityLevel,
            ...(initial.targetWeeklyLossKg != null
              ? { targetWeeklyLossKg: initial.targetWeeklyLossKg }
              : {}),
            ...(initial.dietHistory ? { dietHistory: initial.dietHistory } : {}),
          },
        }
      : {}),
  });

  const onSubmit = form.handleSubmit(async (input) => {
    setServerError(null);
    const result = await saveProfile(input);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    const profile = result.profile as Profile;
    if (profile.derived) setSaved(profile.derived);
    if (onSaved) {
      onSaved(profile);
    } else {
      router.refresh();
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="grid gap-12 md:grid-cols-12" noValidate>
        <fieldset className="space-y-10 md:col-span-7">
          <legend className="editorial-eyebrow">Anagrafica</legend>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t('age')}</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t('gender')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {t(`genderOptions.${g}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="heightCm"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t('heightCm')}</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-6">
            <p className="editorial-eyebrow">Peso (chilogrammi)</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-8">
              {(['weightStartKg', 'weightCurrentKg', 'weightGoalKg'] as const).map((name) => (
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
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="activityLevel"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t('activityLevel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {t(`activityOptions.${a}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="editorial-eyebrow">{t('measurementsTitle')}</p>
              <p className="font-display text-ink-soft text-sm italic leading-snug">
                {t('measurementsHint')}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-x-6 gap-y-8">
              {(['neckCm', 'waistCm', 'hipsCm'] as const).map((name) => (
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
                          step="0.5"
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

          <FormField
            control={form.control}
            name="targetWeeklyLossKg"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t('targetWeeklyLossKg')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={1.5}
                    inputMode="decimal"
                    placeholder="0.5"
                    {...field}
                    value={(field.value as number | undefined) ?? ''}
                  />
                </FormControl>
                <p className="font-display text-ink-soft text-sm italic leading-snug">
                  {t('targetWeeklyLossKgHint')}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dietHistory"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t('dietHistory')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DIET_HISTORIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {t(`dietHistoryLabel.${d}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="font-display text-ink-soft text-sm italic leading-snug">
                  {t('dietHistoryHint')}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {serverError ? (
            <p role="alert" className="font-display text-pomodoro text-base italic">
              {serverError}
            </p>
          ) : null}

          <div className="pt-4">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              size="lg"
              className="w-full sm:w-auto"
            >
              {form.formState.isSubmitting ? t('saving') : (saveLabel ?? t('save'))}
            </Button>
          </div>
        </fieldset>

        <aside className="md:border-ink/15 md:col-span-5 md:border-l md:pl-10">
          <p className="editorial-eyebrow">{t('summary')}</p>
          {saved ? (
            <div className="mt-6 space-y-8">
              <Stat label={t('bmr')} value={saved.bmr} unit="kcal" emphasis />
              <Stat label={t('tdee')} value={saved.tdee} unit="kcal" />
              <Stat label={t('activityMultiplier')} value={saved.activityMultiplier} fixed={3} />
              <p className="border-ink/15 font-display text-ink-dim border-t pt-4 text-sm italic leading-relaxed">
                {t('hint')}
              </p>
            </div>
          ) : (
            <p className="font-display text-ink-dim mt-6 text-base italic leading-relaxed">
              {t('emptySummary')}
            </p>
          )}
        </aside>
      </form>
    </Form>
  );
}

function Stat({
  label,
  value,
  unit,
  emphasis = false,
  fixed,
}: {
  label: string;
  value: number;
  unit?: string;
  emphasis?: boolean;
  fixed?: number;
}) {
  const display = fixed != null ? value.toFixed(fixed) : Math.round(value).toString();
  return (
    <div>
      <p className="editorial-eyebrow text-[10px]">{label}</p>
      <p className={`mt-2 flex items-baseline gap-2 ${emphasis ? 'text-pomodoro' : 'text-ink'}`}>
        <span className="font-mono text-4xl font-medium leading-none tracking-tight">
          {display}
        </span>
        {unit ? <span className="font-display text-ink-soft text-sm italic">{unit}</span> : null}
      </p>
    </div>
  );
}
