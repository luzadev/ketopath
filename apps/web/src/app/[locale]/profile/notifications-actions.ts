'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

function cookieHeader(): string {
  return headers().get('cookie') ?? '';
}

export interface NotificationDevice {
  id: string;
  platform: string;
  endpoint: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface NotificationConfig {
  pushEnabled: boolean;
  settings: { weeklyWeighIn: boolean; fastingMilestones: boolean; mealReminders: boolean };
  devices: NotificationDevice[];
}

export async function fetchNotificationConfig(): Promise<NotificationConfig | null> {
  const res = await fetch(`${API_URL}/me/notifications/config`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as NotificationConfig;
}

export interface SubscribePayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerDevice(payload: SubscribePayload): Promise<ActionResult> {
  const res = await fetch(`${API_URL}/me/device-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  revalidatePath('/profile');
  return { ok: true };
}

export async function unregisterDevice(deviceId: string): Promise<ActionResult> {
  const res = await fetch(`${API_URL}/me/device-tokens/${deviceId}`, {
    method: 'DELETE',
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 204) {
    return { ok: false, error: `api_error_${res.status}` };
  }
  revalidatePath('/profile');
  return { ok: true };
}

export async function updateNotificationSettings(
  patch: Partial<{ weeklyWeighIn: boolean; fastingMilestones: boolean; mealReminders: boolean }>,
): Promise<ActionResult> {
  const res = await fetch(`${API_URL}/me/notifications/settings`, {
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
  return { ok: true };
}

export async function sendTestNotification(): Promise<ActionResult> {
  const res = await fetch(`${API_URL}/me/notifications/test`, {
    method: 'POST',
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `api_error_${res.status}` };
  }
  return { ok: true };
}
