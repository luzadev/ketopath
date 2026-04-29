import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { fetchProfile } from './actions';
import { ProfileForm } from './profile-form';

export default async function ProfilePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');

  const profile = (await fetchProfile()) as Parameters<typeof ProfileForm>[0]['initial'];

  return <ProfilePageContent initial={profile} />;
}

function ProfilePageContent({
  initial,
}: {
  initial: Parameters<typeof ProfileForm>[0]['initial'];
}) {
  const t = useTranslations('Profile');

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 sm:px-10">
      <Masthead issueLabel="N. 04 — Profilo" />
      <main className="py-12 sm:py-16">
        <p className="editorial-eyebrow animate-fade-up">Capitolo IV</p>
        <h1 className="font-display text-display text-ink animate-fade-up mt-3 font-medium leading-[0.95] tracking-tight [animation-delay:120ms]">
          {t('title')}
          <span className="text-pomodoro">.</span>
        </h1>
        <p className="font-display text-ink-soft animate-fade-up mt-6 max-w-2xl text-xl italic leading-snug [animation-delay:240ms]">
          {t('subtitle')}
        </p>

        <div className="rule animate-rule-in my-10 [animation-delay:360ms]" />

        <div className="animate-fade-up [animation-delay:300ms]">
          <ProfileForm initial={initial} />
        </div>
      </main>
    </div>
  );
}
