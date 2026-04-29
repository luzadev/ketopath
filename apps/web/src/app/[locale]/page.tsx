import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Masthead } from '@/components/masthead';
import { Button } from '@/components/ui/button';
import { getServerSession } from '@/lib/auth';

import { SignOutButton } from './sign-out-button';

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();

  return <HomeContent userName={session?.user?.name ?? session?.user?.email ?? null} />;
}

function HomeContent({ userName }: { userName: string | null }) {
  const t = useTranslations('Home');

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 sm:px-10">
      <Masthead />
      <main className="grid gap-12 py-10 sm:py-16 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="editorial-eyebrow animate-fade-up">N. 01 — Manifesto</p>
          <h1 className="font-display text-display-lg text-ink animate-fade-up mt-4 font-medium [animation-delay:120ms]">
            {t('title')}
            <span className="text-pomodoro">.</span>
          </h1>
          <p className="font-display text-ink-soft animate-fade-up mt-6 max-w-xl text-2xl italic leading-snug [animation-delay:240ms]">
            {t('tagline')}
          </p>
        </div>

        <aside className="md:border-ink/15 animate-fade-up [animation-delay:360ms] md:col-span-5 md:border-l md:pl-8">
          <p className="editorial-eyebrow">{userName ? t('lettura') : t('inizia')}</p>
          <div className="mt-6">
            {userName ? <SignedInBlock userName={userName} t={t} /> : <SignedOutBlock t={t} />}
          </div>
        </aside>
      </main>

      <div className="rule" />

      <footer className="grid gap-8 py-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="font-display text-ink-soft text-base italic leading-relaxed sm:text-lg">
            {t('disclaimer')}
          </p>
        </div>
        <div className="md:border-ink/15 md:col-span-5 md:border-l md:pl-8">
          <p className="editorial-eyebrow">Tre principi</p>
          <ol className="font-display text-ink mt-4 space-y-3 text-lg leading-snug">
            <li className="flex gap-4">
              <span className="text-ink-dim mt-1 font-mono text-xs">I</span>
              <span>{t('principle1')}</span>
            </li>
            <li className="flex gap-4">
              <span className="text-ink-dim mt-1 font-mono text-xs">II</span>
              <span>{t('principle2')}</span>
            </li>
            <li className="flex gap-4">
              <span className="text-ink-dim mt-1 font-mono text-xs">III</span>
              <span>{t('principle3')}</span>
            </li>
          </ol>
        </div>
      </footer>

      <div className="rule-thick mb-10" />
    </div>
  );
}

function SignedOutBlock({ t }: { t: ReturnType<typeof useTranslations<'Home'>> }) {
  return (
    <div className="space-y-5">
      <Button asChild size="lg" className="w-full">
        <Link href="/sign-up">{t('ctaPrimary')}</Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/sign-in">{t('ctaSecondary')}</Link>
      </Button>
    </div>
  );
}

function SignedInBlock({
  userName,
  t,
}: {
  userName: string;
  t: ReturnType<typeof useTranslations<'Home'>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-ink text-2xl italic leading-snug">
          {t.rich('greeting', {
            name: () => <span className="font-medium not-italic">{userName}</span>,
          })}
        </p>
      </div>
      <ul className="space-y-px">
        <NavItem href="/plan" label={t('viewPlan')} eyebrow="Cucina" />
        <NavItem href="/profile" label={t('completeProfile')} eyebrow="Profilo" />
      </ul>
      <SignOutButton label={t('signOut')} />
    </div>
  );
}

function NavItem({ href, label, eyebrow }: { href: string; label: string; eyebrow: string }) {
  return (
    <li>
      <Link
        href={href}
        className="border-ink/15 hover:bg-ink hover:text-carta-light group -mx-0 flex items-baseline justify-between gap-4 border-t py-4 transition-colors last:border-b hover:-mx-3 hover:px-3"
      >
        <span className="flex flex-col gap-1">
          <span className="editorial-eyebrow group-hover:text-carta-light/60">{eyebrow}</span>
          <span className="font-display text-xl leading-tight">{label}</span>
        </span>
        <span
          aria-hidden
          className="font-display text-ink-dim group-hover:text-carta-light text-xl"
        >
          →
        </span>
      </Link>
    </li>
  );
}
