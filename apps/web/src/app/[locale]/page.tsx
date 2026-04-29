import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</h1>
      <p className="text-muted-foreground text-lg">{t('tagline')}</p>
      {userName ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-foreground text-sm">{t('signedInAs', { name: userName })}</span>
          <SignOutButton label={t('signOut')} />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-up">{t('ctaPrimary')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">{t('ctaSecondary')}</Link>
          </Button>
        </div>
      )}
      <p className="text-muted-foreground mt-8 text-xs">{t('disclaimer')}</p>
    </main>
  );
}
