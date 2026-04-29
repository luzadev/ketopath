import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { DisclaimerForm } from './disclaimer-form';

export default async function WelcomePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true },
  });
  if (user?.disclaimerAcceptedAt) redirect('/profile');

  return <WelcomePageContent />;
}

function WelcomePageContent() {
  const t = useTranslations('Welcome');

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 sm:px-10">
      <Masthead issueLabel="Editoriale — Nota del medico" />
      <main className="py-12 sm:py-16">
        <p className="editorial-eyebrow animate-fade-up">Lettera al lettore</p>
        <h1 className="font-display text-display text-ink animate-fade-up mt-3 font-medium leading-[0.95] tracking-tight [animation-delay:120ms]">
          {t('title')}
          <span className="text-pomodoro">.</span>
        </h1>
        <p className="font-display text-ink-soft animate-fade-up mt-6 max-w-2xl text-xl italic leading-snug [animation-delay:240ms]">
          {t('subtitle')}
        </p>

        <div className="rule animate-rule-in my-10 [animation-delay:360ms]" />

        <div className="grid gap-10 md:grid-cols-12">
          <div className="animate-fade-up [animation-delay:300ms] md:col-span-7">
            <p className="editorial-eyebrow mb-6">Quattro principi</p>
            <ol className="space-y-6">
              {(['point1', 'point2', 'point3', 'point4'] as const).map((key, idx) => (
                <li key={key} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <span className="font-display text-pomodoro pt-1 text-3xl font-medium italic leading-none">
                    {romanize(idx + 1)}
                  </span>
                  <p className="font-display text-ink text-lg leading-snug">{t(key)}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="md:border-ink/15 animate-fade-up [animation-delay:420ms] md:col-span-5 md:border-l md:pl-8">
            <p className="editorial-eyebrow mb-6">Conferma</p>
            <DisclaimerForm />
          </div>
        </div>

        <div className="rule mt-12" />
        <p className="font-display text-ink-dim mt-5 text-sm italic leading-relaxed">
          {t('legalNote')}
        </p>
      </main>
    </div>
  );
}

function romanize(n: number): string {
  return ['I', 'II', 'III', 'IV'][n - 1] ?? String(n);
}
