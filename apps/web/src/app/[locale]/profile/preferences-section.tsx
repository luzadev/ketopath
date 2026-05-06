'use client';

import {
  type CookingTimeLevel,
  type CuisineTag,
  type ExclusionGroup,
  type PreferencesPatch,
} from '@ketopath/shared';
import { useTranslations } from 'next-intl';

import {
  DEFAULT_PREFERENCES_VALUES,
  PreferencesForm,
  type PreferencesValues,
} from '@/components/preferences/preferences-form';

import { savePreferences, type PreferencesView } from './preferences-actions';

export function PreferencesSection({ initial }: { initial: PreferencesView | null }) {
  const t = useTranslations('Preferences');

  const initialValues: PreferencesValues = initial
    ? toFormValues(initial)
    : DEFAULT_PREFERENCES_VALUES;

  async function handleSubmit(patch: PreferencesPatch) {
    return savePreferences(patch);
  }

  return (
    <section className="space-y-10">
      <header className="space-y-3">
        <p className="editorial-eyebrow">{t('eyebrow')}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight tracking-tight">
          {t('title')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('subtitle')}
        </p>
      </header>
      <div className="border-ink/15 border-t" />
      <PreferencesForm initial={initialValues} onSubmit={handleSubmit} />
    </section>
  );
}

function toFormValues(view: PreferencesView): PreferencesValues {
  return {
    trainingDays: view.trainingDays,
    trainingType: view.trainingType as PreferencesValues['trainingType'],
    sessionMinutes: view.sessionMinutes,
    mealsPerDay: view.mealsPerDay,
    exclusions: view.exclusions as ExclusionGroup[],
    cuisinePreferences: view.cuisinePreferences as CuisineTag[],
    cookingTime: view.cookingTime as CookingTimeLevel,
    fastingProtocol: view.fastingProtocol as PreferencesValues['fastingProtocol'],
    bannedIngredientIds: view.bannedIngredientIds ?? [],
  };
}
