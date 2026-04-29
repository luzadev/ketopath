'use client';

import {
  COOKING_TIMES,
  CUISINE_TAGS,
  EXCLUSION_GROUPS,
  FASTING_PROTOCOL_VALUES,
  TRAINING_TYPES,
  type CookingTimeLevel,
  type CuisineTag,
  type ExclusionGroup,
  type PreferencesPatch,
  type TrainingType,
} from '@ketopath/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PreferencesValues {
  exclusions: ExclusionGroup[];
  cuisinePreferences: CuisineTag[];
  cookingTime: CookingTimeLevel;
  fastingProtocol: (typeof FASTING_PROTOCOL_VALUES)[number] | null;
  trainingDays: number[];
  trainingType: TrainingType | null;
  sessionMinutes: number | null;
  mealsPerDay: number | null;
}

export const DEFAULT_PREFERENCES_VALUES: PreferencesValues = {
  exclusions: [],
  cuisinePreferences: [],
  cookingTime: 'MEDIUM',
  fastingProtocol: null,
  trainingDays: [],
  trainingType: null,
  sessionMinutes: null,
  mealsPerDay: null,
};

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

interface PreferencesFormProps {
  initial: PreferencesValues;
  onSubmit: (patch: PreferencesPatch) => Promise<{ ok: boolean; error?: string }>;
  submitLabel?: string;
  showFasting?: boolean;
}

export function PreferencesForm({
  initial,
  onSubmit,
  submitLabel,
  showFasting = true,
}: PreferencesFormProps) {
  const t = useTranslations('Preferences');
  const [values, setValues] = useState<PreferencesValues>(initial);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleExclusion(group: ExclusionGroup): void {
    setValues((prev) => {
      const has = prev.exclusions.includes(group);
      return {
        ...prev,
        exclusions: has ? prev.exclusions.filter((g) => g !== group) : [...prev.exclusions, group],
      };
    });
  }
  function toggleCuisine(tag: CuisineTag): void {
    setValues((prev) => {
      const has = prev.cuisinePreferences.includes(tag);
      return {
        ...prev,
        cuisinePreferences: has
          ? prev.cuisinePreferences.filter((g) => g !== tag)
          : [...prev.cuisinePreferences, tag],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setPending(true);
    const result = await onSubmit({
      exclusions: values.exclusions,
      cuisinePreferences: values.cuisinePreferences,
      cookingTime: values.cookingTime,
      fastingProtocol: values.fastingProtocol,
      trainingDays: values.trainingDays,
      trainingType: values.trainingType,
      sessionMinutes: values.sessionMinutes,
      mealsPerDay: values.mealsPerDay,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? t('errorGeneric'));
      return;
    }
    setFeedback(t('saved'));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      <fieldset className="space-y-5">
        <legend className="font-display text-ink text-2xl font-medium leading-tight tracking-tight">
          {t('exclusionsTitle')}
        </legend>
        <p className="font-display text-ink-soft text-base italic leading-snug">
          {t('exclusionsHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          {EXCLUSION_GROUPS.map((g) => (
            <Chip
              key={g}
              label={t(`exclusionLabel.${g}`)}
              active={values.exclusions.includes(g)}
              onToggle={() => toggleExclusion(g)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-ink text-2xl font-medium leading-tight tracking-tight">
          {t('cuisinesTitle')}
        </legend>
        <p className="font-display text-ink-soft text-base italic leading-snug">
          {t('cuisinesHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          {CUISINE_TAGS.map((tag) => (
            <Chip
              key={tag}
              label={t(`cuisineLabel.${tag}`)}
              active={values.cuisinePreferences.includes(tag)}
              onToggle={() => toggleCuisine(tag)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-ink text-2xl font-medium leading-tight tracking-tight">
          {t('cookingTimeTitle')}
        </legend>
        <p className="font-display text-ink-soft text-base italic leading-snug">
          {t('cookingTimeHint')}
        </p>
        <div className="max-w-xs">
          <Select
            value={values.cookingTime}
            onValueChange={(v) =>
              setValues((prev) => ({ ...prev, cookingTime: v as CookingTimeLevel }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COOKING_TIMES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`cookingTimeLabel.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      {showFasting ? (
        <fieldset className="space-y-5">
          <legend className="font-display text-ink text-2xl font-medium leading-tight tracking-tight">
            {t('fastingTitle')}
          </legend>
          <p className="font-display text-ink-soft text-base italic leading-snug">
            {t('fastingHint')}
          </p>
          <details className="border-ink/15 bg-carta-light/40 group border p-4">
            <summary className="text-ink-soft hover:text-ink cursor-pointer list-none font-mono text-[10px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px]">
              {t('fastingTutorialToggle')}
            </summary>
            <div className="mt-4 space-y-3">
              <p className="font-display text-ink text-sm leading-relaxed">
                <strong className="not-italic">{t('fastingTutorialPoint1Title')}</strong>{' '}
                {t('fastingTutorialPoint1')}
              </p>
              <p className="font-display text-ink text-sm leading-relaxed">
                <strong className="not-italic">{t('fastingTutorialPoint2Title')}</strong>{' '}
                {t('fastingTutorialPoint2')}
              </p>
              <p className="font-display text-ink text-sm leading-relaxed">
                <strong className="not-italic">{t('fastingTutorialPoint3Title')}</strong>{' '}
                {t('fastingTutorialPoint3')}
              </p>
              <p className="font-display text-ink-dim text-xs italic leading-snug">
                {t('fastingTutorialDisclaimer')}
              </p>
            </div>
          </details>
          <div className="max-w-xs">
            <Select
              value={values.fastingProtocol ?? 'NONE'}
              onValueChange={(v) =>
                setValues((prev) => ({
                  ...prev,
                  fastingProtocol:
                    v === 'NONE' ? null : (v as (typeof FASTING_PROTOCOL_VALUES)[number]),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{t('fastingNone')}</SelectItem>
                {FASTING_PROTOCOL_VALUES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`fastingProtocolLabel.${p}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>
      ) : null}

      <fieldset className="space-y-5">
        <legend className="font-display text-ink text-2xl font-medium leading-tight tracking-tight">
          {t('trainingTitle')}
        </legend>
        <p className="font-display text-ink-soft text-base italic leading-snug">
          {t('trainingHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, idx) => (
            <Chip
              key={idx}
              label={label}
              active={values.trainingDays.includes(idx)}
              onToggle={() =>
                setValues((prev) => ({
                  ...prev,
                  trainingDays: prev.trainingDays.includes(idx)
                    ? prev.trainingDays.filter((d) => d !== idx)
                    : [...prev.trainingDays, idx].sort((a, b) => a - b),
                }))
              }
            />
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="editorial-eyebrow mb-3">{t('trainingType')}</p>
            <Select
              value={values.trainingType ?? 'NONE'}
              onValueChange={(v) =>
                setValues((prev) => ({
                  ...prev,
                  trainingType: v === 'NONE' ? null : (v as TrainingType),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{t('trainingNone')}</SelectItem>
                {TRAINING_TYPES.map((tt) => (
                  <SelectItem key={tt} value={tt}>
                    {t(`trainingTypeLabel.${tt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="editorial-eyebrow mb-3">{t('sessionMinutes')}</p>
            <input
              type="number"
              min={10}
              max={240}
              step={5}
              inputMode="numeric"
              placeholder="60"
              value={values.sessionMinutes ?? ''}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  sessionMinutes: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              className="border-ink/30 focus:border-ink w-full border-b bg-transparent py-2 outline-none"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-ink text-2xl font-medium leading-tight tracking-tight">
          {t('mealsPerDayTitle')}
        </legend>
        <p className="font-display text-ink-soft text-base italic leading-snug">
          {t('mealsPerDayHint')}
        </p>
        <div className="max-w-xs">
          <Select
            value={values.mealsPerDay != null ? String(values.mealsPerDay) : 'AUTO'}
            onValueChange={(v) =>
              setValues((prev) => ({
                ...prev,
                mealsPerDay: v === 'AUTO' ? null : Number(v),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUTO">{t('mealsAuto')}</SelectItem>
              <SelectItem value="1">{t('mealsLabel.1')}</SelectItem>
              <SelectItem value="2">{t('mealsLabel.2')}</SelectItem>
              <SelectItem value="3">{t('mealsLabel.3')}</SelectItem>
              <SelectItem value="4">{t('mealsLabel.4')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      {error ? (
        <p className="font-display text-pomodoro text-base italic" role="alert">
          {error}
        </p>
      ) : null}
      {feedback ? (
        <p className="font-display text-oliva text-base italic" role="status">
          {feedback}
        </p>
      ) : null}

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t('saving') : (submitLabel ?? t('save'))}
        </Button>
      </div>
    </form>
  );
}

function Chip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`font-display border-ink/30 hover:border-ink rounded-full border px-4 py-2 text-sm leading-tight transition-colors ${
        active ? 'bg-ink text-carta-light border-ink' : 'text-ink hover:bg-ink/5 bg-transparent'
      }`}
    >
      {label}
    </button>
  );
}
