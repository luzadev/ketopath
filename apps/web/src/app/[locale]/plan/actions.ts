'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

interface SlotRecipe {
  id: string;
  name: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  netCarbG: number;
  prepMinutes: number;
}

export interface PlanSlot {
  id: string;
  dayOfWeek: number;
  meal: 'COLAZIONE' | 'PRANZO' | 'SPUNTINO' | 'CENA';
  recipeId: string | null;
  status: string;
  isFreeMeal: boolean;
  selected: SlotRecipe | null;
  alternatives: SlotRecipe[];
}

export interface CurrentPlan {
  id: string;
  weekStart: string;
  slots: PlanSlot[];
  fastingProtocol:
    | 'FOURTEEN_TEN'
    | 'SIXTEEN_EIGHT'
    | 'EIGHTEEN_SIX'
    | 'TWENTY_FOUR'
    | 'ESE_24'
    | 'FIVE_TWO'
    | null;
  currentPhase: 'INTENSIVE' | 'TRANSITION' | 'MAINTENANCE' | null;
  phase2Week: number | null;
}

function cookieHeader(): string {
  return headers().get('cookie') ?? '';
}

export async function fetchCurrentPlan(): Promise<CurrentPlan | null> {
  const res = await fetch(`${API_URL}/me/meal-plans/current`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`api_error_${res.status}`);
  const data = (await res.json()) as { plan: CurrentPlan };
  return data.plan;
}

// Server action invocata via `<form action={regeneratePlan}>`. La firma è
// `(FormData) => Promise<void>` per allinearsi al type richiesto da React 18.
export async function regeneratePlan(_formData?: FormData): Promise<void> {
  const res = await fetch(`${API_URL}/me/meal-plans`, {
    method: 'POST',
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `api_error_${res.status}`);
  }
  revalidatePath('/plan');
}

export type SwapResult = { ok: true } | { ok: false; error: string };

export async function regenerateSlot(slotId: string): Promise<SwapResult> {
  const res = await fetch(`${API_URL}/me/meal-plans/slots/${slotId}/regenerate`, {
    method: 'POST',
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  revalidatePath('/plan');
  return { ok: true };
}

export async function toggleFreeMeal(slotId: string): Promise<SwapResult> {
  const res = await fetch(`${API_URL}/me/meal-plans/slots/${slotId}/free-meal`, {
    method: 'POST',
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  revalidatePath('/plan');
  return { ok: true };
}

export async function swapSlotRecipe(slotId: string, recipeId: string): Promise<SwapResult> {
  const res = await fetch(`${API_URL}/me/meal-plans/slots/${slotId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({ recipeId }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  revalidatePath('/plan');
  return { ok: true };
}
