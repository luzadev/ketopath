'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { authClient } from '@/lib/auth-client';

export function SignInForm() {
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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">{t('emailLabel')}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">{t('passwordLabel')}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? t('submitting') : t('submit')}
        </button>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-xs uppercase tracking-wider text-slate-500">
            {t('or')}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleGoogle}
        className="w-full rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        {t('google')}
      </button>
      <p className="text-center text-sm text-slate-600">
        {t.rich('noAccount', {
          link: (chunks) => (
            <Link href="/sign-up" className="font-medium text-emerald-700 hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
