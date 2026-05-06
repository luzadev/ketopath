'use server';

import { type PreferencesPatch } from '@ketopath/shared';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

function cookieHeader(): string {
  return headers().get('cookie') ?? '';
}

export interface PreferencesView {
  exclusions: string[];
  cuisinePreferences: string[];
  cookingTime: 'LOW' | 'MEDIUM' | 'HIGH';
  fastingProtocol: string | null;
  trainingDays: number[];
  trainingType: string | null;
  sessionMinutes: number | null;
  mealsPerDay: number | null;
  bannedIngredientIds: string[];
}

export interface IngredientView {
  id: string;
  name: string;
  category: string | null;
  exclusionGroups: string[];
}

export async function searchIngredients(query: string): Promise<IngredientView[]> {
  const url = new URL(`${API_URL}/me/ingredients`);
  if (query.trim()) url.searchParams.set('q', query.trim());
  const res = await fetch(url.toString(), {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { ingredients: IngredientView[] };
  return body.ingredients;
}

export async function fetchIngredientsByIds(ids: string[]): Promise<IngredientView[]> {
  if (ids.length === 0) return [];
  const url = new URL(`${API_URL}/me/ingredients`);
  url.searchParams.set('ids', ids.join(','));
  const res = await fetch(url.toString(), {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { ingredients: IngredientView[] };
  return body.ingredients;
}

export async function fetchPreferences(): Promise<PreferencesView | null> {
  const res = await fetch(`${API_URL}/me/preferences`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { preferences: PreferencesView };
  return body.preferences;
}

export type SavePrefsResult = { ok: true } | { ok: false; error: string };

export async function savePreferences(patch: PreferencesPatch): Promise<SavePrefsResult> {
  const res = await fetch(`${API_URL}/me/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify(patch),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  revalidatePath('/profile');
  revalidatePath('/onboarding');
  return { ok: true };
}
