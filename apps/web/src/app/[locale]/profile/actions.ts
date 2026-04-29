'use server';

import { profileInputSchema, type ProfileInput } from '@ketopath/shared';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export type SaveProfileResult = { ok: true; profile: unknown } | { ok: false; error: string };

export async function saveProfile(input: ProfileInput): Promise<SaveProfileResult> {
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' };
  }

  const cookie = headers().get('cookie') ?? '';

  const res = await fetch(`${API_URL}/me/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  });

  if (!res.ok) {
    return { ok: false, error: `api_error_${res.status}` };
  }

  const data = (await res.json()) as { profile: unknown };
  return { ok: true, profile: data.profile };
}

export async function fetchProfile(): Promise<unknown | null> {
  const cookie = headers().get('cookie') ?? '';
  const res = await fetch(`${API_URL}/me/profile`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`api_error_${res.status}`);
  const data = (await res.json()) as { profile: unknown };
  return data.profile;
}

export async function deleteAccount(
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookie = headers().get('cookie') ?? '';
  const res = await fetch(`${API_URL}/me`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  });
  if (res.status === 204) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: false, error: body.error ?? `api_error_${res.status}` };
}

export type SaveConditionsResult = { ok: true } | { ok: false; error: string };

export async function saveConditions(conditions: readonly string[]): Promise<SaveConditionsResult> {
  const cookie = headers().get('cookie') ?? '';
  const res = await fetch(`${API_URL}/me/profile/conditions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ conditions }),
    cache: 'no-store',
  });
  if (!res.ok) {
    return { ok: false, error: `api_error_${res.status}` };
  }
  return { ok: true };
}
