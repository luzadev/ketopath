'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { deleteAccount } from './actions';

export function DataPanel() {
  const t = useTranslations('Profile');
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(): void {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount(password);
      if (!result.ok) {
        setError(t(`dataDeleteErrors.${result.error}` as never) ?? t('dataDeleteErrors.api_error'));
        return;
      }
      // Account cancellato: vai alla home pubblica.
      router.replace('/');
    });
  }

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="editorial-eyebrow">{t('dataEyebrow')}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight tracking-tight">
          {t('dataTitle')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('dataSubtitle')}
        </p>
      </header>

      <div className="border-ink/15 border-t" />

      <div className="grid gap-8 md:grid-cols-2">
        <article className="space-y-3">
          <p className="editorial-eyebrow">{t('dataExportEyebrow')}</p>
          <p className="font-display text-ink text-base leading-snug">
            {t('dataExportDescription')}
          </p>
          <a
            href="/api/gdpr-export"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink hover:text-pomodoro decoration-pomodoro inline-block font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
          >
            {t('dataExportAction')} ↗
          </a>
        </article>

        <article className="border-pomodoro/40 space-y-3 border-l pl-6">
          <p className="editorial-eyebrow text-pomodoro">{t('dataDeleteEyebrow')}</p>
          <p className="font-display text-ink text-base leading-snug">
            {t('dataDeleteDescription')}
          </p>
          {!confirmOpen ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              className="border-pomodoro text-pomodoro hover:bg-pomodoro hover:text-carta-light"
            >
              {t('dataDeleteAction')}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="font-display text-pomodoro text-sm italic">{t('dataDeleteWarning')}</p>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('dataDeletePasswordPlaceholder')}
                autoComplete="current-password"
              />
              {error ? (
                <p className="font-display text-pomodoro text-sm italic" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending || password.length === 0}
                  className="bg-pomodoro text-carta-light hover:bg-ink"
                >
                  {pending ? t('working') : t('dataDeleteConfirm')}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    setPassword('');
                    setError(null);
                  }}
                  className="text-ink-soft hover:text-ink font-mono text-[11px] uppercase tracking-widest"
                >
                  {t('dataDeleteCancel')}
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
