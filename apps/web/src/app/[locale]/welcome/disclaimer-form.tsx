'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';

import { acceptDisclaimer } from './actions';

export function DisclaimerForm() {
  const t = useTranslations('Welcome');
  const [adult, setAdult] = useState(false);
  const [aware, setAware] = useState(false);
  const [accepts, setAccepts] = useState(false);
  const [pending, setPending] = useState(false);

  const allChecked = adult && aware && accepts;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allChecked) return;
    setPending(true);
    await acceptDisclaimer();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Checkbox checked={adult} onChange={setAdult} label={t('checkAdult')} />
      <Checkbox checked={aware} onChange={setAware} label={t('checkAware')} />
      <Checkbox checked={accepts} onChange={setAccepts} label={t('checkAccepts')} />
      <Button type="submit" disabled={!allChecked || pending} size="lg" className="mt-2 w-full">
        {pending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-3">
      <span
        className={`relative mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center border ${
          checked ? 'border-ink bg-ink' : 'border-ink/40 bg-transparent'
        } transition-colors`}
      >
        {checked ? (
          <svg viewBox="0 0 20 20" className="text-carta-light h-3.5 w-3.5">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
              d="M4 11l4 4 8-9"
            />
          </svg>
        ) : null}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="font-display text-ink text-base leading-snug">{label}</span>
    </label>
  );
}
