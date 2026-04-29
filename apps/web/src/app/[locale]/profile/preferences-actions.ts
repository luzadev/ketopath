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
