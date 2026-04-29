import { enabledSocialProviders } from '@ketopath/auth';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { SignUpForm } from './sign-up-form';

export default function SignUpPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations('Auth.SignUp');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-slate-600">{t('subtitle')}</p>
      </header>
      <SignUpForm googleEnabled={enabledSocialProviders.includes('google')} />
      <p className="text-xs text-slate-500">{t('disclaimer')}</p>
    </main>
  );
}
