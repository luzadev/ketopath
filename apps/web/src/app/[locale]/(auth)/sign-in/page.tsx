import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { SignInForm } from './sign-in-form';

export default function SignInPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations('Auth.SignIn');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-slate-600">{t('subtitle')}</p>
      </header>
      <SignInForm />
    </main>
  );
}
