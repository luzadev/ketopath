'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await authClient.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {label}
    </Button>
  );
}
