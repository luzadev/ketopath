'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  pushSupported,
  subscribe,
  unsubscribe,
  getCurrentSubscription,
} from '@/lib/notifications/push-client';

import {
  sendTestNotification,
  unregisterDevice,
  updateNotificationSettings,
  type NotificationConfig,
  type NotificationDevice,
} from './notifications-actions';

const FORMATTER = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function NotificationsPanel({ initial }: { initial: NotificationConfig | null }) {
  const t = useTranslations('Notifications');
  const [config, setConfig] = useState<NotificationConfig | null>(initial);
  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown');
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSupported(pushSupported());
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
    void getCurrentSubscription().then((sub) => setHasSubscription(!!sub));
  }, []);

  if (!config) {
    return <p className="font-display text-ink-soft text-base italic">{t('configUnavailable')}</p>;
  }

  // Capture narrowed config in a const so handler closures don't lose the
  // narrowing (TS treats `config` as nullable inside async closures because
  // `setConfig` is in scope).
  const cfg: NotificationConfig = config;
  // Una subscription web richiede tutti e tre: server abilitato, browser
  // capace, permesso concesso, e una subscription effettivamente registrata
  // sul pushManager. Se manca l'ultima, mostriamo di nuovo "Attiva".
  const pushReady = cfg.pushEnabled && supported && permission === 'granted' && hasSubscription;
  const blocked = permission === 'denied';

  function refreshConfig(next: NotificationConfig): void {
    setConfig(next);
  }

  function flash(msg: string): void {
    setError(null);
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 3000);
  }
  function flashError(msg: string): void {
    setFeedback(null);
    setError(msg);
  }

  function handleSubscribe(): void {
    startTransition(async () => {
      const result = await subscribe();
      if (!result.ok) {
        const reasonKey = `errors.${result.reason ?? 'unknown'}` as const;
        flashError(t.has(reasonKey) ? t(reasonKey) : t('errors.unknown'));
        return;
      }
      setPermission('granted');
      flash(t('subscribed'));
      // revalidatePath è già stato chiamato lato server action; ricarico la
      // pagina così l'elenco device si rinfresca senza altre fetch a mano.
      window.location.reload();
    });
  }

  function handleUnsubscribe(deviceId: string): void {
    startTransition(async () => {
      const sub = await getCurrentSubscription();
      const subEndpoint = sub?.endpoint;
      const device = cfg.devices.find((d) => d.id === deviceId);
      if (subEndpoint && device?.endpoint === subEndpoint) {
        await unsubscribe(deviceId);
      } else {
        const r = await unregisterDevice(deviceId);
        if (!r.ok) {
          flashError(t('errors.api_error'));
          return;
        }
      }
      flash(t('unsubscribed'));
      window.location.reload();
    });
  }

  function handleToggle(
    key: 'weeklyWeighIn' | 'fastingMilestones' | 'mealReminders',
    value: boolean,
  ): void {
    startTransition(async () => {
      const result = await updateNotificationSettings({ [key]: value });
      if (!result.ok) {
        flashError(t('errors.api_error'));
        return;
      }
      refreshConfig({ ...cfg, settings: { ...cfg.settings, [key]: value } });
    });
  }

  function handleTest(): void {
    startTransition(async () => {
      const result = await sendTestNotification();
      if (!result.ok) {
        const key = `errors.${result.error}` as const;
        flashError(t.has(key) ? t(key) : t('errors.api_error'));
        return;
      }
      flash(t('testSent'));
    });
  }

  return (
    <section className="space-y-10">
      <header className="space-y-3">
        <p className="editorial-eyebrow">{t('eyebrow')}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight tracking-tight">
          {t('title')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('subtitle')}
        </p>
      </header>

      <div className="border-ink/15 border-t" />

      {!supported ? (
        <p className="font-display text-ink-soft text-base italic">{t('unsupported')}</p>
      ) : !cfg.pushEnabled ? (
        <p className="font-display text-ink-soft text-base italic">{t('serverDisabled')}</p>
      ) : (
        <div className="grid gap-10 md:grid-cols-12">
          <div className="space-y-5 md:col-span-7">
            <ToggleRow
              label={t('weeklyWeighInLabel')}
              description={t('weeklyWeighInHint')}
              checked={cfg.settings.weeklyWeighIn}
              onChange={(v) => handleToggle('weeklyWeighIn', v)}
              disabled={pending || !pushReady}
            />
            <ToggleRow
              label={t('fastingMilestonesLabel')}
              description={t('fastingMilestonesHint')}
              checked={cfg.settings.fastingMilestones}
              onChange={(v) => handleToggle('fastingMilestones', v)}
              disabled={pending || !pushReady}
            />
            <ToggleRow
              label={t('mealRemindersLabel')}
              description={t('mealRemindersHint')}
              checked={cfg.settings.mealReminders ?? false}
              onChange={(v) => handleToggle('mealReminders', v)}
              disabled={pending || !pushReady}
            />
          </div>

          <aside className="md:border-ink/15 space-y-5 md:col-span-5 md:border-l md:pl-8">
            <p className="editorial-eyebrow">{t('thisDevice')}</p>
            {pushReady ? (
              <>
                <p className="font-display text-ink text-base italic leading-snug">
                  {t('thisDeviceActive')}
                </p>
                <Button type="button" variant="outline" onClick={handleTest} disabled={pending}>
                  {pending ? t('working') : t('sendTest')}
                </Button>
              </>
            ) : blocked ? (
              <p className="font-display text-pomodoro text-base italic leading-snug">
                {t('blocked')}
              </p>
            ) : (
              <>
                <p className="font-display text-ink-soft text-base italic leading-snug">
                  {t('thisDeviceInactive')}
                </p>
                <Button type="button" onClick={handleSubscribe} disabled={pending}>
                  {pending ? t('working') : t('enableHere')}
                </Button>
              </>
            )}
          </aside>
        </div>
      )}

      {cfg.devices.length > 0 ? (
        <div className="space-y-4">
          <p className="editorial-eyebrow">{t('registeredDevices')}</p>
          <ul className="divide-ink/10 divide-y">
            {cfg.devices.map((d) => (
              <DeviceRow
                key={d.id}
                device={d}
                onRemove={(id) => handleUnsubscribe(id)}
                disabled={pending}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {feedback ? (
        <p className="font-display text-oliva text-base italic" role="status">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="font-display text-pomodoro text-base italic" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  comingSoon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <label className="border-ink/10 flex cursor-pointer items-baseline gap-4 border-b py-4 last:border-b-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled || comingSoon}
        className="border-ink mt-1 h-4 w-4 cursor-pointer accent-current disabled:cursor-not-allowed disabled:opacity-40"
      />
      <span className="flex-1">
        <span className="font-display text-ink flex items-baseline gap-2 text-lg leading-tight">
          {label}
          {comingSoon ? (
            <span className="text-ink-dim font-mono text-[10px] uppercase tracking-widest">
              · in arrivo
            </span>
          ) : null}
        </span>
        <span className="font-display text-ink-soft mt-1 block text-sm italic leading-snug">
          {description}
        </span>
      </span>
    </label>
  );
}

function DeviceRow({
  device,
  onRemove,
  disabled,
}: {
  device: NotificationDevice;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const ua = device.userAgent ?? '';
  const label = describeUserAgent(ua) || device.platform;
  return (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3">
      <div>
        <p className="font-display text-ink text-base leading-tight">{label}</p>
        <p className="text-ink-soft mt-1 font-mono text-[10px] uppercase tracking-widest">
          {device.platform} · {FORMATTER.format(new Date(device.createdAt))}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(device.id)}
        disabled={disabled}
        className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors disabled:opacity-40"
      >
        Rimuovi
      </button>
    </li>
  );
}

function describeUserAgent(ua: string): string | null {
  if (!ua) return null;
  const matches = [
    [/iPhone|iPad/i, 'iOS'],
    [/Android/i, 'Android'],
    [/Mac OS X/i, 'macOS'],
    [/Windows/i, 'Windows'],
    [/Linux/i, 'Linux'],
  ] as const;
  const platform = matches.find(([re]) => re.test(ua))?.[1] ?? 'Browser';
  const browserMatches = [
    [/Edg\//i, 'Edge'],
    [/Chrome\//i, 'Chrome'],
    [/Safari\//i, 'Safari'],
    [/Firefox\//i, 'Firefox'],
  ] as const;
  const browser = browserMatches.find(([re]) => re.test(ua))?.[1];
  return browser ? `${platform} · ${browser}` : platform;
}
