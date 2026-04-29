'use client';

import {
  type CookingTimeLevel,
  type CuisineTag,
  type ExclusionGroup,
  type PreferencesPatch,
} from '@ketopath/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  DEFAULT_PREFERENCES_VALUES,
  PreferencesForm,
  type PreferencesValues,
} from '@/components/preferences/preferences-form';
import { Button } from '@/components/ui/button';

import { savePreferences, type PreferencesView } from '../profile/preferences-actions';
import type { ProfileForm } from '../profile/profile-form';
import { ProfileForm as ProfileFormComponent } from '../profile/profile-form';

const STEPS = ['profile', 'preferences', 'done'] as const;
type StepKey = (typeof STEPS)[number];

interface OnboardingFlowProps {
  initialProfile: Parameters<typeof ProfileForm>[0]['initial'];
  initialPreferences: PreferencesView | null;
}

export function OnboardingFlow({ initialProfile, initialPreferences }: OnboardingFlowProps) {
  const t = useTranslations('Onboarding');
  const router = useRouter();

  // Lo step di partenza salta i form già completati: comodo per chi torna a metà.
  const [step, setStep] = useState<StepKey>(() => {
    if (!initialProfile) return 'profile';
    if (!initialPreferences || initialPreferences.exclusions.length === 0) return 'preferences';
    return 'done';
  });

  const stepIndex = STEPS.indexOf(step);

  return (
    <section className="grid gap-12 md:grid-cols-12">
      <aside className="md:border-ink/15 md:col-span-4 md:border-r md:pr-8">
        <p className="editorial-eyebrow">{t('stepsTitle')}</p>
        <ol className="mt-6 space-y-5">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-baseline gap-3">
              <span
                className={`font-mono text-xs uppercase tracking-widest ${
                  i < stepIndex ? 'text-oliva' : i === stepIndex ? 'text-pomodoro' : 'text-ink-dim'
                }`}
              >
                {['I', 'II', 'III'][i]}
              </span>
              <span
                className={`font-display text-lg leading-tight ${
                  i === stepIndex ? 'text-ink font-medium' : 'text-ink-soft'
                }`}
              >
                {t(`steps.${s}`)}
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="md:col-span-8">
        {step === 'profile' ? (
          <StepProfile
            initial={initialProfile}
            onSaved={() => setStep('preferences')}
            label={t('next')}
          />
        ) : null}

        {step === 'preferences' ? (
          <StepPreferences
            initial={
              initialPreferences ? toFormValues(initialPreferences) : DEFAULT_PREFERENCES_VALUES
            }
            onSaved={() => setStep('done')}
            label={t('next')}
            onBack={() => setStep('profile')}
            backLabel={t('back')}
          />
        ) : null}

        {step === 'done' ? <StepDone onFinish={() => router.push('/plan')} /> : null}
      </div>
    </section>
  );
}

function StepProfile({
  initial,
  onSaved,
  label,
}: {
  initial: Parameters<typeof ProfileForm>[0]['initial'];
  onSaved: () => void;
  label: string;
}) {
  const t = useTranslations('Onboarding');
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 1, total: 3 })}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight">
          {t('profileHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('profileHint')}
        </p>
      </header>
      <ProfileFormComponent initial={initial} onSaved={onSaved} saveLabel={label} />
    </div>
  );
}

function StepPreferences({
  initial,
  onSaved,
  label,
  onBack,
  backLabel,
}: {
  initial: PreferencesValues;
  onSaved: () => void;
  label: string;
  onBack: () => void;
  backLabel: string;
}) {
  const t = useTranslations('Onboarding');

  async function handleSubmit(patch: PreferencesPatch) {
    const result = await savePreferences(patch);
    if (result.ok) onSaved();
    return result;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 2, total: 3 })}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight">
          {t('preferencesHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('preferencesHint')}
        </p>
      </header>
      <PreferencesForm initial={initial} onSubmit={handleSubmit} submitLabel={label} />
      <button
        type="button"
        onClick={onBack}
        className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
      >
        {backLabel}
      </button>
    </div>
  );
}

function StepDone({ onFinish }: { onFinish: () => void }) {
  const t = useTranslations('Onboarding');
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 3, total: 3 })}</p>
        <h2 className="font-display text-ink text-4xl font-medium leading-tight">
          {t('doneHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-xl italic leading-snug">
          {t('doneHint')}
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" size="lg" onClick={onFinish}>
          {t('goToPlan')}
        </Button>
        <Link
          href="/"
          className="text-ink-soft hover:text-ink font-mono text-[11px] uppercase tracking-widest"
        >
          {t('skipToHome')}
        </Link>
      </div>
    </div>
  );
}

function toFormValues(view: PreferencesView): PreferencesValues {
  return {
    exclusions: view.exclusions as ExclusionGroup[],
    cuisinePreferences: view.cuisinePreferences as CuisineTag[],
    cookingTime: view.cookingTime as CookingTimeLevel,
    fastingProtocol: view.fastingProtocol as PreferencesValues['fastingProtocol'],
  };
}
