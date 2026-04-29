'use client';

import {
  EXCLUDING_CONDITIONS,
  MEDICAL_CONDITIONS,
  type CookingTimeLevel,
  type CuisineTag,
  type ExclusionGroup,
  type MedicalCondition,
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
import { fetchProfile, saveConditions } from '../profile/actions';
import { savePreferences, type PreferencesView } from '../profile/preferences-actions';
import { ProfileForm as ProfileFormComponent } from '../profile/profile-form';
import type { ProfileForm } from '../profile/profile-form';
import { saveWeightEntry } from '../tracking/actions';

const STEPS = [
  'goal',
  'profile',
  'conditions',
  'weighIn',
  'preferences',
  'notifications',
  'done',
] as const;
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
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]}
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
          <StepProfile initial={initialProfile} goal={goal} onSaved={() => setStep('conditions')} />
        ) : null}

        {step === 'conditions' ? (
          <StepConditions
            initial={(initialProfile?.medicalConditions as string[] | undefined) ?? []}
            onContinue={() => setStep('weighIn')}
            onBack={() => setStep('profile')}
          />
        ) : null}

        {step === 'weighIn' ? (
          <StepWeighIn
            startKg={initialProfile?.weightStartKg ?? null}
            onContinue={() => setStep('preferences')}
            onBack={() => setStep('conditions')}
          />
        ) : null}

        {step === 'preferences' ? (
          <StepPreferences
            initial={
              initialPreferences ? toFormValues(initialPreferences) : DEFAULT_PREFERENCES_VALUES
            }
            onSaved={() => setStep('notifications')}
            onBack={() => setStep('weighIn')}
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
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 1, total: 7 })}</p>
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
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 2, total: 7 })}</p>
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

function StepConditions({
  initial,
  onContinue,
  onBack,
}: {
  initial: string[];
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useTranslations('Onboarding');
  const [selected, setSelected] = useState<string[]>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(c: MedicalCondition): void {
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  const blocked = selected.some((c) => EXCLUDING_CONDITIONS.has(c as MedicalCondition));

  async function handleNext(): Promise<void> {
    setError(null);
    setPending(true);
    const result = await saveConditions(selected);
    setPending(false);
    if (!result.ok) {
      setError(t('conditionsSaveError'));
      return;
    }
    onContinue();
  }

  const adaptive = MEDICAL_CONDITIONS.filter(
    (c) => !EXCLUDING_CONDITIONS.has(c as MedicalCondition),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 3, total: 7 })}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight">
          {t('conditionsHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('conditionsHint')}
        </p>
      </header>

      <fieldset className="space-y-3">
        <legend className="editorial-eyebrow">{t('conditionsAdaptive')}</legend>
        <div className="flex flex-wrap gap-2">
          {adaptive.map((c) => (
            <ConditionChip
              key={c}
              label={t(`conditionLabel.${c}`)}
              active={selected.includes(c)}
              onToggle={() => toggle(c as MedicalCondition)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="editorial-eyebrow">{t('conditionsExcluding')}</legend>
        <p className="font-display text-ink-soft text-sm italic leading-snug">
          {t('conditionsExcludingHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from(EXCLUDING_CONDITIONS).map((c) => (
            <ConditionChip
              key={c}
              label={t(`conditionLabel.${c}`)}
              active={selected.includes(c)}
              onToggle={() => toggle(c)}
              danger
            />
          ))}
        </div>
      </fieldset>

      {blocked ? (
        <div className="border-pomodoro/40 bg-pomodoro/5 border-2 border-dashed p-5">
          <p className="editorial-eyebrow">{t('blockedEyebrow')}</p>
          <p className="font-display text-ink mt-3 text-base leading-snug">{t('blockedMessage')}</p>
        </div>
      ) : null}

      {error ? (
        <p className="font-display text-pomodoro text-base italic" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" size="lg" onClick={handleNext} disabled={pending}>
          {pending ? t('working') : t('next')}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="text-ink-soft hover:text-ink font-mono text-[11px] uppercase tracking-widest"
        >
          {t('back')}
        </button>
      </div>
    </div>
  );
}

function ConditionChip({
  label,
  active,
  onToggle,
  danger,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  danger?: boolean;
}) {
  const palette = active
    ? danger
      ? 'bg-pomodoro text-carta-light border-pomodoro'
      : 'bg-ink text-carta-light border-ink'
    : danger
      ? 'border-pomodoro/40 hover:border-pomodoro text-pomodoro hover:bg-pomodoro/5 bg-transparent'
      : 'border-ink/30 hover:border-ink text-ink hover:bg-ink/5 bg-transparent';
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`font-display rounded-full border px-4 py-2 text-sm leading-tight transition-colors ${palette}`}
    >
      {label}
    </button>
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
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 5, total: 7 })}</p>
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

function StepWeighIn({
  startKg,
  onContinue,
  onBack,
}: {
  startKg: number | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useTranslations('Onboarding');
  const [todayKg, setTodayKg] = useState<string>(startKg != null ? String(startKg) : '');
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(): Promise<void> {
    const value = Number(todayKg);
    if (!Number.isFinite(value) || value < 35 || value > 300) {
      onContinue();
      return;
    }
    setPending(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await saveWeightEntry({ date: today, weightKg: value });
    if (result.ok) setSaved(true);
    setPending(false);
    onContinue();
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 4, total: 7 })}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight">
          {t('weighInHeading')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('weighInHint')}
        </p>
      </header>

      <div className="max-w-sm space-y-3">
        <p className="editorial-eyebrow">{t('weighInLabel')}</p>
        <input
          type="number"
          step="0.1"
          min={35}
          max={300}
          inputMode="decimal"
          value={todayKg}
          onChange={(e) => setTodayKg(e.target.value)}
          placeholder={startKg != null ? String(startKg) : ''}
          className="border-ink/30 focus:border-ink font-display text-ink w-full border-b bg-transparent py-2 text-2xl outline-none"
        />
        <p className="font-display text-ink-soft text-xs italic">{t('weighInTip')}</p>
      </div>

      {saved ? <p className="font-display text-oliva text-sm italic">{t('weighInSaved')}</p> : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" size="lg" onClick={handleSave} disabled={pending}>
          {pending ? t('working') : t('next')}
        </Button>
        <button
          type="button"
          onClick={onContinue}
          className="text-ink-soft hover:text-ink font-mono text-[11px] uppercase tracking-widest"
        >
          {t('skipForNow')}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-ink-soft hover:text-ink font-mono text-[11px] uppercase tracking-widest"
        >
          {t('back')}
        </button>
      </div>
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
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 6, total: 7 })}</p>
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

interface PlanSummary {
  bmr: number;
  tdee: number;
  currentPhase: string;
}

function StepDone({ goal }: { goal: Goal | null }) {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const [planStatus, setPlanStatus] = useState<'idle' | 'pending' | 'ready' | 'error'>('idle');
  const [iosInstallHint, setIosInstallHint] = useState(false);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);

  // Genera il primo piano se non esiste — best-effort.
  useEffect(() => {
    if (planStatus !== 'idle') return;
    setPlanStatus('pending');
    regeneratePlan()
      .then(async () => {
        setPlanStatus('ready');
        // Carica il summary profilo per il riassunto
        const profile = (await fetchProfile()) as {
          derived?: { bmr: number; tdee: number };
          currentPhase?: string;
        } | null;
        if (profile?.derived) {
          setPlanSummary({
            bmr: profile.derived.bmr,
            tdee: profile.derived.tdee,
            currentPhase: profile.currentPhase ?? 'INTENSIVE',
          });
        }
      })
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
        <p className="editorial-eyebrow">{t('stepEyebrow', { n: 7, total: 7 })}</p>
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

      {planSummary ? (
        <section className="border-ink/15 bg-carta-light/40 grid grid-cols-2 gap-x-8 gap-y-4 border p-5 sm:grid-cols-4">
          <div>
            <p className="editorial-eyebrow">{t('summaryPhase')}</p>
            <p className="font-display text-pomodoro mt-2 text-2xl font-medium leading-tight">
              {t(`phaseLabel.${planSummary.currentPhase}`)}
            </p>
            <p className="text-ink-soft font-mono text-[10px] uppercase tracking-widest">
              {t(`phaseDuration.${planSummary.currentPhase}`)}
            </p>
          </div>
          <div>
            <p className="editorial-eyebrow">{t('summaryBmr')}</p>
            <p className="text-ink mt-2 font-mono text-3xl font-medium tabular-nums leading-none">
              {planSummary.bmr}
              <span className="font-display text-ink-soft ml-1 text-xs italic">kcal</span>
            </p>
          </div>
          <div>
            <p className="editorial-eyebrow">{t('summaryTdee')}</p>
            <p className="text-ink mt-2 font-mono text-3xl font-medium tabular-nums leading-none">
              {planSummary.tdee}
              <span className="font-display text-ink-soft ml-1 text-xs italic">kcal</span>
            </p>
          </div>
          <div>
            <p className="editorial-eyebrow">{t('summaryAdherence')}</p>
            <p className="text-ink mt-2 font-mono text-3xl font-medium tabular-nums leading-none">
              {planSummary.currentPhase === 'INTENSIVE' ? '90%' : '85%'}
            </p>
            <p className="text-ink-soft font-mono text-[10px] uppercase tracking-widest">
              {t('summaryAdherenceHint')}
            </p>
          </div>
        </section>
      ) : null}

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
    trainingDays: view.trainingDays,
    trainingType: view.trainingType as PreferencesValues['trainingType'],
    sessionMinutes: view.sessionMinutes,
    mealsPerDay: view.mealsPerDay,
  };
}
