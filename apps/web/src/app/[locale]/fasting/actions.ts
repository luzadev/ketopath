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
