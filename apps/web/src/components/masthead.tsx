import Link from 'next/link';

import { cn } from '@/lib/utils';

interface MastheadProps {
  /**
   * Etichetta opzionale a destra (es. "N. 05 — Cucina"). Se omessa, l'header
   * resta minimale con solo il logo a sinistra. Tono più \"app\" che \"magazine\".
   */
  issueLabel?: string;
  className?: string;
}

/**
 * Top-of-page header minimale: logo a sinistra, sezione corrente a destra (se
 * fornita). Una riga sottile sotto fa da divider editoriale.
 */
export function Masthead({ issueLabel, className }: MastheadProps) {
  return (
    <header className={cn('relative pb-5 pt-6', className)}>
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="monogram tracking-tight transition-opacity hover:opacity-70"
          aria-label="KetoPath"
        >
          KetoPath<span className="text-pomodoro">.</span>
        </Link>
        {issueLabel ? <p className="editorial-eyebrow hidden sm:block">{issueLabel}</p> : null}
      </div>
      <div className="rule mt-5" />
    </header>
  );
}
