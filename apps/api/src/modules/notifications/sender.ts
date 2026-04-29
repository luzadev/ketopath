// PRD §5.6 — invio push agnostico rispetto alla piattaforma.
// Per ora c'è solo l'implementazione web (VAPID). Aggiungere mobile = un nuovo
// `Sender` (Expo / APNs / FCM) senza toccare i call site. Vedi ADR 0003.

import type { DeviceToken } from '@ketopath/db';
// `web-push` espone CommonJS: il default import è ciò che funziona a runtime,
// ma il plugin `import` di ESLint non lo riconosce — disabilitiamo solo qui.
// eslint-disable-next-line import/default
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';

import { env } from '../../config/env.js';

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  // Niente dati sanitari nel payload (CLAUDE.md "Privacy first").
}

export interface SendResult {
  ok: boolean;
  /** true ↔ il token è scaduto/revocato e va cancellato dal DB. */
  expired: boolean;
  errorCode?: number;
}

let webPushConfigured = false;
function configureWebPush(): boolean {
  if (webPushConfigured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return false;
  }
  // eslint-disable-next-line import/no-named-as-default-member
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  webPushConfigured = true;
  return true;
}

export function pushIsEnabled(): boolean {
  return configureWebPush();
}

export async function sendToDevice(
  device: DeviceToken,
  payload: NotificationPayload,
): Promise<SendResult> {
  if (device.platform === 'web') {
    return sendWebPush(device, payload);
  }
  // Placeholder per iOS/Android — vedi ADR 0003.
  return { ok: false, expired: false, errorCode: 501 };
}

async function sendWebPush(device: DeviceToken, payload: NotificationPayload): Promise<SendResult> {
  if (!configureWebPush()) {
    return { ok: false, expired: false };
  }
  if (!device.endpoint || !device.p256dh || !device.auth) {
    return { ok: false, expired: true }; // record incompleto: trattalo come scaduto
  }
  const subscription: PushSubscription = {
    endpoint: device.endpoint,
    keys: { p256dh: device.p256dh, auth: device.auth },
  };
  try {
    // eslint-disable-next-line import/no-named-as-default-member
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60, // 1 ora
    });
    return { ok: true, expired: false };
  } catch (err) {
    const e = err as { statusCode?: number };
    const status = e.statusCode ?? 0;
    return { ok: false, expired: status === 404 || status === 410, errorCode: status };
  }
}
