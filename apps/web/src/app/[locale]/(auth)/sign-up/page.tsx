import { enabledSocialProviders } from '@ketopath/auth';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Masthead } from '@/components/masthead';

import { SignUpForm } from './sign-up-form';

export default function SignUpPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations('Auth.SignUp');

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 sm:px-10">
      <Masthead issueLabel="N. 03 — Iscrizione" />
      <main className="grid gap-12 py-12 sm:py-20 md:grid-cols-12">
        <aside className="md:sticky md:top-12 md:col-span-6 md:self-start">
          <p className="editorial-eyebrow animate-fade-up">Capitolo III</p>
          <h1 className="font-display text-display text-ink animate-fade-up mt-3 font-medium leading-[0.95] tracking-tight [animation-delay:120ms]">
            <span className="block">Inizia il tuo</span>
            <span className="text-pomodoro block italic">percorso.</span>
          </h1>
          <p className="font-display text-ink-soft animate-fade-up mt-6 max-w-md text-xl italic leading-snug [animation-delay:240ms]">
            {t('subtitle')}
          </p>
          <p className="text-ink-dim animate-fade-up mt-10 hidden max-w-md text-sm leading-relaxed [animation-delay:360ms] md:block">
            {t.rich('haveAccount', {
              link: (chunks) => (
                <Link
                  href="/sign-in"
                  className="text-pomodoro hover:decoration-ink underline decoration-[1.5px] underline-offset-[6px]"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </aside>
        <section className="md:border-ink/15 animate-fade-up [animation-delay:240ms] md:col-span-6 md:border-l md:pl-10">
          <p className="editorial-eyebrow mb-8">{t('title')}</p>
          <SignUpForm googleEnabled={enabledSocialProviders.includes('google')} />
          <p className="border-ink/15 text-ink-dim mt-10 border-t pt-5 text-xs leading-relaxed">
            {t('disclaimer')}
          </p>
          <p className="text-ink-dim mt-6 text-sm leading-relaxed md:hidden">
            {t.rich('haveAccount', {
              link: (chunks) => (
                <Link
                  href="/sign-in"
                  className="text-pomodoro underline decoration-[1.5px] underline-offset-[6px]"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </section>
      </main>
    </div>
  );
}
