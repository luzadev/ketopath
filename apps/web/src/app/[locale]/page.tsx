import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</h1>
      <p className="text-lg text-slate-600">{t('tagline')}</p>
      {userName ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-700">{t('signedInAs', { name: userName })}</span>
          <SignOutButton label={t('signOut')} />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {t('ctaPrimary')}
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {t('ctaSecondary')}
          </Link>
        </div>
      )}
      <p className="mt-8 text-xs text-slate-500">{t('disclaimer')}</p>
    </main>
  );
}
