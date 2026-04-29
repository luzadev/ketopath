import { enabledSocialProviders } from '@ketopath/auth';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { SignUpForm } from './sign-up-form';

export default function SignUpPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations('Auth.SignUp');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm googleEnabled={enabledSocialProviders.includes('google')} />
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">{t('disclaimer')}</p>
        </CardFooter>
      </Card>
    </main>
  );
}
