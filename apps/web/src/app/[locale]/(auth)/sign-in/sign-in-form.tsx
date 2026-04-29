'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations('Auth.SignIn');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error: signInError } = await authClient.signIn.email({ email, password });

    if (signInError) {
      setError(signInError.message ?? t('error'));
      setPending(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    const { error: googleError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    });
    if (googleError) {
      setError(googleError.message ?? t('error'));
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-7" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('passwordLabel')}</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="font-display text-pomodoro text-sm italic">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} size="lg" className="w-full">
          {pending ? t('submitting') : t('submit')}
        </Button>
      </form>
      {googleEnabled ? (
        <>
          <div className="flex items-center gap-4">
            <div className="bg-rule h-px flex-1" />
            <span className="editorial-eyebrow">{t('or')}</span>
            <div className="bg-rule h-px flex-1" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            size="lg"
            className="w-full"
          >
            {t('google')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
