'use server';

import { weightEntryInputSchema, type WeightEntryInput } from '@ketopath/shared';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface WeightEntryRow {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  measurements: {
    waistCm?: number;
    hipsCm?: number;
    thighCm?: number;
    armCm?: number;
  } | null;
  notes: string | null;
  energy: number | null;
  sleep: number | null;
  hunger: number | null;
  photos: string[];
}

function cookieHeader(): string {
  return headers().get('cookie') ?? '';
}

export async function fetchWeightEntries(): Promise<WeightEntryRow[]> {
  const res = await fetch(`${API_URL}/me/weight-entries`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { entries: WeightEntryRow[] };
  return data.entries;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveWeightEntry(input: WeightEntryInput): Promise<SaveResult> {
  const parsed = weightEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' };
  }

  const res = await fetch(`${API_URL}/me/weight-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({
      ...parsed.data,
      date: parsed.data.date.toISOString(),
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    return { ok: false, error: `api_error_${res.status}` };
  }
  revalidatePath('/tracking');
  return { ok: true };
}

export interface DailyCheckInRow {
  id: string;
  date: string;
  energy: number | null;
  sleep: number | null;
  hunger: number | null;
  mood: number | null;
  notes: string | null;
}

export async function fetchTodayCheckIn(): Promise<DailyCheckInRow | null> {
  const res = await fetch(`${API_URL}/me/check-ins/today`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { item: DailyCheckInRow | null };
  return data.item;
}

export interface CheckInInput {
  energy?: number;
  sleep?: number;
  hunger?: number;
  mood?: number;
  notes?: string;
}

export async function saveTodayCheckIn(
  input: CheckInInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const res = await fetch(`${API_URL}/me/check-ins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({ ...input, date: today.toISOString() }),
    cache: 'no-store',
  });
  if (!res.ok) return { ok: false, error: `api_error_${res.status}` };
  revalidatePath('/tracking');
  return { ok: true };
}
