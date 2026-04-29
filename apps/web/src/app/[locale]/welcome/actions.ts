'use server';

import { prisma } from '@ketopath/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getServerSession } from '@/lib/auth';

export async function acceptDisclaimer(): Promise<void> {
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  await prisma.user.update({
    where: { id: session.user.id },
    data: { disclaimerAcceptedAt: new Date() },
  });

  revalidatePath('/', 'layout');
  redirect('/onboarding');
}
