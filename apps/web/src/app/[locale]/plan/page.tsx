import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerSession } from '@/lib/auth';

import { fetchCurrentPlan, regeneratePlan } from './actions';
import { PlanWeek } from './plan-week';

export default async function PlanPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true, profile: { select: { id: true } } },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');
  if (!user.profile) redirect('/profile');

  const plan = await fetchCurrentPlan();

  return <PlanPageContent plan={plan} />;
}

function PlanPageContent({ plan }: { plan: Awaited<ReturnType<typeof fetchCurrentPlan>> }) {
  const t = useTranslations('Plan');

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {plan ? t('weekOf', { date: plan.weekStart }) : t('noPlan')}
            </CardDescription>
          </div>
          <form action={regeneratePlan}>
            <Button type="submit" variant={plan ? 'outline' : 'default'} size="sm">
              {plan ? t('regenerate') : t('generate')}
            </Button>
          </form>
        </CardHeader>
        <CardContent>{plan ? <PlanWeek plan={plan} /> : null}</CardContent>
      </Card>
    </main>
  );
}
