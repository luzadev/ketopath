'use server';

import {
  fastEventStartSchema,
  type FastEventStartInput,
  type PROTOCOL_DEFAULT_MINUTES,
} from '@ketopath/shared';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface FastEventRow {
  id: string;
  protocol: keyof typeof PROTOCOL_DEFAULT_MINUTES;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
  startedAt: string; // ISO
  endedAt: string | null;
  targetDuration: number; // minutes
  symptoms: unknown | null;
  notes: string | null;
}

function cookieHeader(): string {
  return headers().get('cookie') ?? '';
}

export interface BreakFastSuggestion {
  id: string;
  name: string;
  kcal: number;
  proteinG: number;
  prepMinutes: number;
  description: string | null;
}

export async function fetchBreakFastSuggestions(
  fastEventId: string,
): Promise<BreakFastSuggestion[]> {
  const res = await fetch(`${API_URL}/me/fast-events/${fastEventId}/break-fast-suggestions`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { suggestions: BreakFastSuggestion[] };
  return data.suggestions;
}

export interface FastingPauseStatus {
  fastingPausedUntil: string | null;
  paused: boolean;
}

export async function fetchFastingPause(): Promise<FastingPauseStatus> {
  const res = await fetch(`${API_URL}/me/fasting/pause`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return { fastingPausedUntil: null, paused: false };
  return (await res.json()) as FastingPauseStatus;
}

export async function setFastingPause(
  until: Date | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = until === null ? { until: null } : { until: until.toISOString() };
  const res = await fetch(`${API_URL}/me/fasting/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) return { ok: false, error: `api_error_${res.status}` };
  revalidatePath('/fasting');
  return { ok: true };
}

export async function fetchFastEvents(): Promise<FastEventRow[]> {
  const res = await fetch(`${API_URL}/me/fast-events`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { events: FastEventRow[] };
  return data.events;
}

export type StartResult = { ok: true; id: string } | { ok: false; error: string };

export async function startFast(input: FastEventStartInput): Promise<StartResult> {
  const parsed = fastEventStartSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' };
  }
  const res = await fetch(`${API_URL}/me/fast-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({
      ...parsed.data,
      startedAt: parsed.data.startedAt
        ? parsed.data.startedAt.toISOString()
        : new Date().toISOString(),
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  const data = (await res.json()) as { event: { id: string } };
  revalidatePath('/fasting');
  return { ok: true, id: data.event.id };
}

export interface FastSymptomsInput {
  headache?: boolean;
  energy?: number;
  hunger?: number;
  clarity?: number;
  other?: string;
}

export async function updateFastSymptoms(
  id: string,
  symptoms: FastSymptomsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${API_URL}/me/fast-events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({ symptoms }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  revalidatePath('/fasting');
  return { ok: true };
}

export type EndResult = { ok: true } | { ok: false; error: string };

export async function endFast(id: string, abort: boolean = false): Promise<EndResult> {
  const res = await fetch(`${API_URL}/me/fast-events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({
      endedAt: new Date().toISOString(),
      status: abort ? 'ABORTED' : 'COMPLETED',
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  revalidatePath('/fasting');
  return { ok: true };
}
