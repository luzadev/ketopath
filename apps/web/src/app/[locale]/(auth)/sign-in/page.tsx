import { enabledSocialProviders } from '@ketopath/auth';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SignInForm } from './sign-in-form';

export default function SignInPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations('Auth.SignIn');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm googleEnabled={enabledSocialProviders.includes('google')} />
        </CardContent>
      </Card>
    </main>
  );
}
