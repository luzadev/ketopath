import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm initial={initial} />
        </CardContent>
      </Card>
    </main>
  );
}
