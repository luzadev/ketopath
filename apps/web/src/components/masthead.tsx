'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface MastheadProps {
  /**
   * Etichetta opzionale a destra (es. "N. 05 — Cucina"). Mostrata solo
   * quando la nav app non è attiva (auth pages, welcome, onboarding).
   */
  issueLabel?: string;
  /**
   * Mostra la nav app (Cucina/Tracking/Digiuno/Spesa/Profilo/Abbonamento).
   * Da accendere su tutte le pagine logged-in dopo onboarding.
   */
  showNav?: boolean;
  className?: string;
}

interface NavEntry {
  href: string;
  key: 'navPlan' | 'navTracking' | 'navFasting' | 'navShopping' | 'navProfile' | 'navBilling';
}

const NAV: ReadonlyArray<NavEntry> = [
  { href: '/plan', key: 'navPlan' },
  { href: '/tracking', key: 'navTracking' },
  { href: '/fasting', key: 'navFasting' },
  { href: '/shopping', key: 'navShopping' },
  { href: '/profile', key: 'navProfile' },
  { href: '/billing', key: 'navBilling' },
];

/**
 * Top-of-page header dell'app. Logo a sx, nav orizzontale al centro/destra
 * (desktop) o hamburger drawer (mobile). Pagina corrente evidenziata in
 * pomodoro. Una riga sottile sotto fa da divider editoriale.
 */
export function Masthead({ issueLabel, showNav = false, className }: MastheadProps) {
  const t = useTranslations('Home');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Quando il pathname cambia, chiudi il drawer mobile (utente ha navigato).
  useEffect(() => setOpen(false), [pathname]);

  // Match di fallback: il pathname è tipo /it/plan, dobbiamo confrontare
  // ignorando il segmento di locale. Usiamo `.includes('/plan')` con
  // controllo che inizi con /<locale>/plan oppure /plan.
  function isActive(href: string): boolean {
    if (!pathname) return false;
    // strip locale prefix se presente
    const stripped = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
    if (href === '/') return stripped === '/';
    return stripped.startsWith(href);
  }

  return (
    <header className={cn('relative pb-5 pt-6', className)}>
      <div className="flex items-center justify-between gap-6">
        <Link
          href="/"
          className="monogram shrink-0 tracking-tight transition-opacity hover:opacity-70"
          aria-label="KetoPath"
        >
          KetoPath<span className="text-pomodoro">.</span>
        </Link>

        {showNav ? (
          <>
            {/* Desktop nav */}
            <nav className="hidden items-baseline gap-7 md:flex">
              {NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'font-mono text-[11px] uppercase tracking-widest transition-colors',
                      active ? 'text-pomodoro' : 'text-ink-soft hover:text-ink',
                    )}
                  >
                    {t(item.key)}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile: hamburger button */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Apri menu"
              className="text-ink hover:text-pomodoro -mr-2 inline-flex items-center gap-2 p-2 font-mono text-[11px] uppercase tracking-widest transition-colors md:hidden"
            >
              <span aria-hidden className="text-base leading-none">
                {open ? '×' : '≡'}
              </span>
              <span>Menu</span>
            </button>
          </>
        ) : issueLabel ? (
          <p className="editorial-eyebrow hidden sm:block">{issueLabel}</p>
        ) : null}
      </div>

      {/* Mobile drawer: appare sotto la riga di header */}
      {showNav && open ? (
        <nav
          aria-label="Navigazione principale"
          className="border-ink/15 bg-carta-light animate-fade-up mt-4 border-b border-t py-2 [animation-duration:200ms] md:hidden"
        >
          <ul className="flex flex-col">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'border-ink/10 flex items-center justify-between gap-4 border-b py-3 font-mono text-xs uppercase tracking-widest transition-colors last:border-b-0',
                      active ? 'text-pomodoro' : 'text-ink hover:text-pomodoro',
                    )}
                  >
                    {t(item.key)}
                    <span aria-hidden>→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      <div className="rule mt-5" />
    </header>
  );
}
