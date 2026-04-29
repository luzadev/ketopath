'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'ketopath:cookie-notice-ack';

export function CookieBanner() {
  const t = useTranslations('CookieBanner');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) !== 'true') {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t('aria')}
      className="border-ink bg-carta-light/95 fixed inset-x-0 bottom-0 z-50 border-t px-6 py-4 backdrop-blur-sm sm:px-10"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-ink-soft text-sm italic leading-snug">
          <span className="editorial-eyebrow mr-2 not-italic">Privacy</span>
          {t('message')}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={dismiss}>
          {t('dismiss')}
        </Button>
      </div>
    </div>
  );
}
