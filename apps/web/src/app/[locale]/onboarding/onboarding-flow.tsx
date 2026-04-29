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
import { useEffect, useState } from 'react';

import {
  DEFAULT_PREFERENCES_VALUES,
  PreferencesForm,
  type PreferencesValues,
} from '@/components/preferences/preferences-form';
import { Button } from '@/components/ui/button';
import { pushSupported, subscribe, getCurrentSubscription } from '@/lib/notifications/push-client';

import { regeneratePlan } from '../plan/actions';
import { savePreferences, type PreferencesView } from '../profile/preferences-actions';
import { ProfileForm as ProfileFormComponent } from '../profile/profile-form';
import type { ProfileForm } from '../profile/profile-form';

const STEPS = ['goal', 'profile', 'preferences', 'notifications', 'done'] as const;
type StepKey = (typeof STEPS)[number];

const GOALS = ['LOSE', 'MAINTAIN', 'ENERGY'] as const;
type Goal = (typeof GOALS)[number];

interface OnboardingFlowProps {
  initialProfile: Parameters<typeof ProfileForm>[0]['initial'];
  initialPreferences: PreferencesView | null;
}

export function OnboardingFlow({ initialProfile, initialPreferences }: OnboardingFlowProps) {
  const t = useTranslations('Onboarding');

  const [step, setStep] = useState<StepKey>(() => {
    if (!initialProfile) return 'goal';
    if (!initialPreferences || initialPreferences.exclusions.length === 0) return 'preferences';
    return 'done';
  });
  const [goal, setGoal] = useState<Goal | null>(null);

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
                {['I', 'II', 'III', 'IV', 'V'][i]}
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
        {step === 'goal' ? (
          <StepGoal selected={goal} onSelect={setGoal} onContinue={() => setStep('profile')} />
        ) : null}

        {step === 'profile' ? (
          <StepProfile
            initial={initialProfile}
            goal={goal}
            onSaved={() => setStep('preferences')}
          />
        ) : null}

        {step === 'preferences' ? (
          <StepPreferences
            initial={
              initialPreferences ? toFormValues(initialPreferences) : DEFAULT_PREFERENCES_VALUES
            }
            onSaved={() => setStep('notifications')}
            onBack={() => setStep('profile')}
          />
        ) : null}

        {step === 'notifications' ? <StepNotifications onContinue={() => setStep('done')} /> : null}

        {step === 'done' ? <StepDone goal={goal} /> : null}
      </div>
    </section>
  );
}

function StepGoal({
  selected,
  onSelect,
  onContinue,
}: {
  selected: Goal | null;
  onSelect: (g: Goal) => void;
  onContinue: () => void;
}) {
  const t = useTranslations('Onboarding');
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 1, total: 5 })}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight">
          {t('goalHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('goalHint')}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {GOALS.map((g, i) => (
          <button
            key={g}
            type="button"
            onClick={() => onSelect(g)}
            aria-pressed={selected === g}
            className={`group flex flex-col gap-3 border p-5 text-left transition-colors ${
              selected === g
                ? 'border-ink bg-ink text-carta-light'
                : 'border-ink/20 hover:border-ink hover:bg-ink/5 bg-transparent'
            }`}
          >
            <span
              className={`font-mono text-[10px] uppercase tracking-widest ${
                selected === g ? 'text-carta-light/60' : 'text-ink-dim'
              }`}
            >
              {['I', 'II', 'III'][i]}
            </span>
            <span className="font-display text-xl font-medium leading-tight">
              {t(`goals.${g}.title`)}
            </span>
            <span
              className={`font-display text-sm italic leading-snug ${
                selected === g ? 'text-carta-light/80' : 'text-ink-soft'
              }`}
            >
              {t(`goals.${g}.hint`)}
            </span>
          </button>
        ))}
      </div>

      <div>
        <Button type="button" size="lg" onClick={onContinue} disabled={!selected}>
          {t('next')}
        </Button>
      </div>
    </div>
  );
}

function StepProfile({
  initial,
  goal,
  onSaved,
}: {
  initial: Parameters<typeof ProfileForm>[0]['initial'];
  goal: Goal | null;
  onSaved: () => void;
}) {
  const t = useTranslations('Onboarding');
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 2, total: 5 })}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight">
          {goal ? t(`profileHeadingGoal.${goal}`) : t('profileHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('profileHint')}
        </p>
      </header>
      <ProfileFormComponent initial={initial} onSaved={onSaved} saveLabel={t('next')} />
    </div>
  );
}

function StepPreferences({
  initial,
  onSaved,
  onBack,
}: {
  initial: PreferencesValues;
  onSaved: () => void;
  onBack: () => void;
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
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 3, total: 5 })}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight">
          {t('preferencesHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('preferencesHint')}
        </p>
      </header>
      <PreferencesForm initial={initial} onSubmit={handleSubmit} submitLabel={t('next')} />
      <button
        type="button"
        onClick={onBack}
        className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
      >
        {t('back')}
      </button>
    </div>
  );
}

function StepNotifications({ onContinue }: { onContinue: () => void }) {
  const t = useTranslations('Onboarding');
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown');
  const [hasSub, setHasSub] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(pushSupported());
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
    void getCurrentSubscription().then((s) => setHasSub(!!s));
  }, []);

  async function activate(): Promise<void> {
    setError(null);
    setPending(true);
    const result = await subscribe();
    setPending(false);
    if (!result.ok) {
      setError(t('notificationsError'));
      return;
    }
    setHasSub(true);
    setPermission('granted');
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 4, total: 5 })}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight">
          {t('notificationsHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('notificationsHint')}
        </p>
      </header>

      {!supported ? (
        <p className="font-display text-ink-soft text-base italic">
          {t('notificationsUnsupported')}
        </p>
      ) : hasSub ? (
        <p className="font-display text-oliva text-base italic">{t('notificationsActive')}</p>
      ) : permission === 'denied' ? (
        <p className="font-display text-pomodoro text-base italic">{t('notificationsBlocked')}</p>
      ) : (
        <Button type="button" size="lg" variant="outline" onClick={activate} disabled={pending}>
          {pending ? t('working') : t('notificationsActivate')}
        </Button>
      )}

      {error ? (
        <p className="font-display text-pomodoro text-base italic" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="button" size="lg" onClick={onContinue}>
          {t('next')}
        </Button>
        <button
          type="button"
          onClick={onContinue}
          className="text-ink-soft hover:text-ink font-mono text-[11px] uppercase tracking-widest"
        >
          {t('skipForNow')}
        </button>
      </div>
    </div>
  );
}

function StepDone({ goal }: { goal: Goal | null }) {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const [planStatus, setPlanStatus] = useState<'idle' | 'pending' | 'ready' | 'error'>('idle');
  const [iosInstallHint, setIosInstallHint] = useState(false);

  // Genera il primo piano se non esiste — best-effort.
  useEffect(() => {
    if (planStatus !== 'idle') return;
    setPlanStatus('pending');
    regeneratePlan()
      .then(() => setPlanStatus('ready'))
      .catch(() => setPlanStatus('error'));
  }, [planStatus]);

  // iOS Safari non-standalone: serve "Aggiungi alla Home" per le push.
  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // legacy iOS: window.navigator.standalone
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIosInstallHint(isIOS && !standalone);
  }, []);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 5, total: 5 })}</p>
        <h2 className="font-display text-ink text-4xl font-medium leading-tight">
          {goal ? t(`doneHeadingGoal.${goal}`) : t('doneHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-xl italic leading-snug">
          {planStatus === 'pending'
            ? t('doneGenerating')
            : planStatus === 'ready'
              ? t('donePlanReady')
              : t('doneHint')}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <NextCard
          eyebrow={t('nextPlanEyebrow')}
          title={t('nextPlanTitle')}
          hint={t('nextPlanHint')}
          href="/plan"
        />
        <NextCard
          eyebrow={t('nextFastingEyebrow')}
          title={t('nextFastingTitle')}
          hint={t('nextFastingHint')}
          href="/fasting"
        />
        <NextCard
          eyebrow={t('nextTrackingEyebrow')}
          title={t('nextTrackingTitle')}
          hint={t('nextTrackingHint')}
          href="/tracking"
        />
      </div>

      {iosInstallHint ? (
        <div className="border-ink/20 bg-carta-light flex flex-col gap-3 border-2 border-dashed p-5">
          <p className="editorial-eyebrow">{t('iosInstallEyebrow')}</p>
          <p className="font-display text-ink text-lg leading-snug">{t('iosInstallTitle')}</p>
          <ol className="font-display text-ink-soft list-decimal pl-5 text-sm italic leading-relaxed">
            <li>{t('iosInstallStep1')}</li>
            <li>{t('iosInstallStep2')}</li>
            <li>{t('iosInstallStep3')}</li>
          </ol>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" size="lg" onClick={() => router.push('/plan')}>
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

function NextCard({
  eyebrow,
  title,
  hint,
  href,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border-ink/20 hover:border-ink hover:bg-ink/5 group flex flex-col gap-3 border p-5 transition-colors"
    >
      <span className="editorial-eyebrow">{eyebrow}</span>
      <span className="font-display text-ink text-xl font-medium leading-tight">{title}</span>
      <span className="font-display text-ink-soft text-sm italic leading-snug">{hint}</span>
      <span aria-hidden className="text-ink-dim mt-2 font-mono text-xs">
        →
      </span>
    </Link>
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
