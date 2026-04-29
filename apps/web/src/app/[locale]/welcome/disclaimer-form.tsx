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
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <Checkbox checked={adult} onChange={setAdult} label={t('checkAdult')} />
      <Checkbox checked={aware} onChange={setAware} label={t('checkAware')} />
      <Checkbox checked={accepts} onChange={setAccepts} label={t('checkAccepts')} />
      <Button type="submit" disabled={!allChecked || pending} className="mt-4 w-full">
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
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="border-input text-primary focus-visible:ring-ring mt-0.5 h-4 w-4 rounded border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
