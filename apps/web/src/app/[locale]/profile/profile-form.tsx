'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ACTIVITY_LEVELS, GENDERS, profileInputSchema, type ProfileInput } from '@ketopath/shared';
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

export function ProfileForm({ initial }: { initial: Profile | null }) {
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
    router.refresh();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
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
              <FormItem>
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
            <FormItem>
              <FormLabel>{t('heightCm')}</FormLabel>
              <FormControl>
                <Input type="number" inputMode="numeric" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          {(['weightStartKg', 'weightCurrentKg', 'weightGoalKg'] as const).map((name) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
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

        <FormField
          control={form.control}
          name="activityLevel"
          render={({ field }) => (
            <FormItem>
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

        {serverError ? (
          <p role="alert" className="text-destructive text-sm">
            {serverError}
          </p>
        ) : null}

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? t('saving') : t('save')}
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
    </Form>
  );
}
