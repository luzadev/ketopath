import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li>
              <span className="font-medium">1. </span>
              {t('point1')}
            </li>
            <li>
              <span className="font-medium">2. </span>
              {t('point2')}
            </li>
            <li>
              <span className="font-medium">3. </span>
              {t('point3')}
            </li>
            <li>
              <span className="font-medium">4. </span>
              {t('point4')}
            </li>
          </ol>
          <DisclaimerForm />
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">{t('legalNote')}</p>
        </CardFooter>
      </Card>
    </main>
  );
}
