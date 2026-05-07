'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { openCustomerPortal, startCheckout } from './actions';

interface Props {
  hasStripeCustomer: boolean;
  isPro: boolean;
}

export function BillingActionsBar({ hasStripeCustomer, isPro }: Props) {
  const t = useTranslations('Billing');
  const [pending, startTransition] = useTransition();

  function handleCheckout(interval: 'MONTH' | 'YEAR') {
    startTransition(async () => {
      const res = await startCheckout(interval);
      if ('url' in res) {
        window.location.href = res.url;
      } else {
        alert(t(`error.${res.error}`));
      }
    });
  }

  function handlePortal() {
    startTransition(async () => {
      const res = await openCustomerPortal();
      if ('url' in res) {
        window.location.href = res.url;
      } else {
        alert(t(`error.${res.error}`));
      }
    });
  }

  if (isPro && hasStripeCustomer) {
    return (
      <Button onClick={handlePortal} disabled={pending} size="lg">
        {pending ? t('opening') : t('managePortal')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Button onClick={() => handleCheckout('MONTH')} disabled={pending} size="lg">
        {pending ? t('opening') : t('upgradeMonthly')}
      </Button>
      <Button onClick={() => handleCheckout('YEAR')} disabled={pending} size="lg" variant="outline">
        {pending ? t('opening') : t('upgradeYearly')}
      </Button>
    </div>
  );
}
