import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CursorGlow } from '@/components/cursor-glow';
import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { fetchBillingStatus, type BillingStatus } from './actions';
import { BillingActionsBar } from './billing-actions-bar';

const ITALIAN_DATE = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function BillingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');

  const status = await fetchBillingStatus();

  return <BillingPageContent status={status} />;
}

function BillingPageContent({ status }: { status: BillingStatus | null }) {
  const t = useTranslations('Billing');

  if (!status) {
    return (
      <div className="relative">
        <div className="min-h-screen w-full px-6 sm:px-10 lg:px-16 xl:px-24">
          <Masthead issueLabel="N. 08 — Abbonamento" />
          <main className="pb-24 pt-12">
            <p className="editorial-eyebrow">{t('errorLoading')}</p>
          </main>
        </div>
      </div>
    );
  }

  const { subscription, derived, configured } = status;
  const hasStripeCustomer = subscription?.stripePriceId != null;

  return (
    <div className="relative">
      <div className="min-h-screen w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <Masthead issueLabel="N. 08 — Abbonamento" />
        <main className="relative overflow-hidden pb-24 pt-10 sm:pt-12">
          <CursorGlow color="hsl(var(--oro))" size={520} />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oro animate-float-y -right-32 top-12 h-[28rem] w-[28rem] opacity-50"
          />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--pomodoro animate-float-x -left-24 top-72 h-72 w-72 opacity-35"
          />
          <span
            aria-hidden
            className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 -top-12 select-none italic"
          >
            VIII
          </span>
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-32 hidden md:block"
            style={{ writingMode: 'vertical-rl' }}
          >
            <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">
              Capitolo VIII — Abbonamento
            </p>
          </div>
          <h1 className="font-display text-mega bleed-left animate-fade-up relative mt-8 font-medium [animation-delay:120ms]">
            <span className="text-ink block">
              {t('title')}
              <span className="text-pomodoro">.</span>
            </span>
          </h1>
          <p className="font-display text-ink-soft animate-fade-up relative mt-10 max-w-2xl text-2xl italic leading-snug [animation-delay:240ms] md:ml-[16.66%]">
            {t('subtitle')}
          </p>

          <div className="rule animate-rule-in my-12 [animation-delay:360ms]" />

          <section className="animate-fade-up relative grid gap-12 [animation-delay:420ms] md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="editorial-eyebrow mb-4">{t('currentStatus')}</p>
              <StatusBlock derived={derived} subscription={subscription} />
            </div>
            <aside className="md:border-ink/15 md:col-span-5 md:border-l md:pl-10">
              <p className="editorial-eyebrow mb-4">{t('actions')}</p>
              {!configured ? (
                <p className="font-display text-ink-soft text-base italic leading-snug">
                  {t('notConfigured')}
                </p>
              ) : (
                <div className="space-y-6">
                  <BillingActionsBar hasStripeCustomer={hasStripeCustomer} isPro={derived.isPro} />
                  {!derived.isPro || !hasStripeCustomer ? (
                    <p className="text-ink-soft font-mono text-[11px] uppercase tracking-widest">
                      {t('checkoutHint')}
                    </p>
                  ) : null}
                </div>
              )}
            </aside>
          </section>

          <div className="rule animate-rule-in my-16 [animation-delay:540ms]" />

          <section className="animate-fade-up relative [animation-delay:600ms]">
            <p className="editorial-eyebrow mb-4">{t('whatYouGet')}</p>
            <div className="grid gap-8 md:grid-cols-3">
              <Benefit num="01" titleKey="benefit1Title" bodyKey="benefit1Body" />
              <Benefit num="02" titleKey="benefit2Title" bodyKey="benefit2Body" />
              <Benefit num="03" titleKey="benefit3Title" bodyKey="benefit3Body" />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatusBlock({
  derived,
  subscription,
}: {
  derived: BillingStatus['derived'];
  subscription: BillingStatus['subscription'];
}) {
  const t = useTranslations('Billing');

  switch (derived.kind) {
    case 'trial':
      return (
        <div>
          <p className="font-display text-ink text-3xl leading-tight md:text-4xl">
            {t('trialActive', { days: derived.trialDaysRemaining ?? 0 })}
          </p>
          <p className="font-display text-ink-soft mt-3 text-base italic leading-snug">
            {t('trialActiveBody', {
              endsAt: derived.accessEndsAt
                ? ITALIAN_DATE.format(new Date(derived.accessEndsAt))
                : '—',
            })}
          </p>
        </div>
      );
    case 'trial_expired':
      return (
        <div>
          <p className="font-display text-pomodoro text-3xl leading-tight md:text-4xl">
            {t('trialExpired')}
          </p>
          <p className="font-display text-ink-soft mt-3 text-base italic leading-snug">
            {t('trialExpiredBody')}
          </p>
        </div>
      );
    case 'active':
      return (
        <div>
          <p className="font-display text-oliva text-3xl leading-tight md:text-4xl">
            {t('proActive')}
          </p>
          <p className="font-display text-ink-soft mt-3 text-base italic leading-snug">
            {t('proActiveBody', {
              interval:
                subscription?.interval === 'YEAR'
                  ? t('intervalYear')
                  : subscription?.interval === 'MONTH'
                    ? t('intervalMonth')
                    : '—',
              renewsAt: derived.accessEndsAt
                ? ITALIAN_DATE.format(new Date(derived.accessEndsAt))
                : '—',
            })}
          </p>
        </div>
      );
    case 'past_due':
      return (
        <div>
          <p className="font-display text-pomodoro text-3xl leading-tight md:text-4xl">
            {t('pastDue')}
          </p>
          <p className="font-display text-ink-soft mt-3 text-base italic leading-snug">
            {t('pastDueBody')}
          </p>
        </div>
      );
    case 'canceling':
      return (
        <div>
          <p className="font-display text-ink text-3xl leading-tight md:text-4xl">
            {t('canceling')}
          </p>
          <p className="font-display text-ink-soft mt-3 text-base italic leading-snug">
            {t('cancelingBody', {
              endsAt: derived.accessEndsAt
                ? ITALIAN_DATE.format(new Date(derived.accessEndsAt))
                : '—',
            })}
          </p>
        </div>
      );
    case 'canceled':
      return (
        <div>
          <p className="font-display text-ink-dim text-3xl leading-tight md:text-4xl">
            {t('canceled')}
          </p>
          <p className="font-display text-ink-soft mt-3 text-base italic leading-snug">
            {t('canceledBody')}
          </p>
        </div>
      );
    case 'no_subscription':
    default:
      return (
        <p className="font-display text-ink-soft text-base italic leading-snug">
          {t('noSubscription')}
        </p>
      );
  }
}

function Benefit({ num, titleKey, bodyKey }: { num: string; titleKey: string; bodyKey: string }) {
  const t = useTranslations('Billing');
  return (
    <article>
      <p className="font-display text-pomodoro text-2xl italic">{num}</p>
      <h3 className="font-display text-ink mt-2 text-xl font-medium leading-tight">
        {t(titleKey)}
      </h3>
      <p className="font-display text-ink-soft mt-3 text-sm italic leading-snug">{t(bodyKey)}</p>
    </article>
  );
}
