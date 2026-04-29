'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ACTIVITY_LEVELS, GENDERS, profileInputSchema, type ProfileInput } from '@ketopath/shared';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { saveProfile } from './actions';

type Derived = { bmr: number; tdee: number; activityMultiplier: number };
type Profile = ProfileInput & { derived?: Derived };

export function ProfileForm({ initial }: { initial: Profile | null }) {
  const t = useTranslations('Profile');
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Derived | null>(initial?.derived ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: initial
      ? {
          age: initial.age,
          gender: initial.gender,
          heightCm: initial.heightCm,
          weightStartKg: initial.weightStartKg,
          weightCurrentKg: initial.weightCurrentKg,
          weightGoalKg: initial.weightGoalKg,
          activityLevel: initial.activityLevel,
        }
      : undefined,
  });

  const onSubmit = handleSubmit(async (input) => {
    setServerError(null);
    const result = await saveProfile(input);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    const profile = result.profile as Profile;
    if (profile.derived) setSaved(profile.derived);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('age')} error={errors.age?.message}>
          <Input type="number" inputMode="numeric" {...register('age')} />
        </Field>
        <Field label={t('gender')} error={errors.gender?.message}>
          <select
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            {...register('gender')}
          >
            <option value="">{t('selectPlaceholder')}</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {t(`genderOptions.${g}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t('heightCm')} error={errors.heightCm?.message}>
        <Input type="number" inputMode="numeric" {...register('heightCm')} />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label={t('weightStartKg')} error={errors.weightStartKg?.message}>
          <Input type="number" step="0.1" inputMode="decimal" {...register('weightStartKg')} />
        </Field>
        <Field label={t('weightCurrentKg')} error={errors.weightCurrentKg?.message}>
          <Input type="number" step="0.1" inputMode="decimal" {...register('weightCurrentKg')} />
        </Field>
        <Field label={t('weightGoalKg')} error={errors.weightGoalKg?.message}>
          <Input type="number" step="0.1" inputMode="decimal" {...register('weightGoalKg')} />
        </Field>
      </div>

      <Field label={t('activityLevel')} error={errors.activityLevel?.message}>
        <select
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          {...register('activityLevel')}
        >
          <option value="">{t('selectPlaceholder')}</option>
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a} value={a}>
              {t(`activityOptions.${a}`)}
            </option>
          ))}
        </select>
      </Field>

      {serverError ? (
        <p role="alert" className="text-destructive text-sm">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('saving') : t('save')}
      </Button>

      {saved ? (
        <div className="bg-secondary mt-6 rounded-md p-4 text-sm">
          <p className="font-medium">{t('summary')}</p>
          <ul className="mt-2 space-y-1">
            <li>
              {t('bmr')}: <span className="font-mono">{saved.bmr} kcal</span>
            </li>
            <li>
              {t('tdee')}: <span className="font-mono">{saved.tdee} kcal</span>
            </li>
            <li>
              {t('activityMultiplier')}:{' '}
              <span className="font-mono">{saved.activityMultiplier}</span>
            </li>
          </ul>
          <p className="text-muted-foreground mt-2 text-xs">{t('hint')}</p>
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
