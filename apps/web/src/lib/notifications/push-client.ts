// Helper client-side per il flusso Web Push (PRD §5.6).
// Registra il SW, chiede il permesso, ottiene la PushSubscription,
// la passa a una server action che la inoltra all'API. Idempotente:
// se l'utente è già iscritto, riusiamo la subscription corrente.

import {
  registerDevice,
  unregisterDevice,
  type SubscribePayload,
} from '@/app/[locale]/profile/notifications-actions';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export interface SubscribeResult {
  ok: boolean;
  reason?:
    | 'unsupported'
    | 'permission_denied'
    | 'permission_default'
    | 'no_vapid_key'
    | 'api_error'
    | 'sw_error';
}

export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const reg = await ensureRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribe(): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no_vapid_key' };

  const reg = await ensureRegistration();
  if (!reg) return { ok: false, reason: 'sw_error' };

  const permission = await Notification.requestPermission();
  if (permission === 'denied') return { ok: false, reason: 'permission_denied' };
  if (permission !== 'granted') return { ok: false, reason: 'permission_default' };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'sw_error' };
  }
  const payload: SubscribePayload = {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  };
  const result = await registerDevice(payload);
  return result.ok ? { ok: true } : { ok: false, reason: 'api_error' };
}

export async function unsubscribe(deviceId?: string): Promise<boolean> {
  const sub = await getCurrentSubscription();
  if (sub) await sub.unsubscribe();
  if (deviceId) {
    await unregisterDevice(deviceId).catch(() => {
      /* il record verrà ripulito al prossimo invio */
    });
  }
  return true;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
