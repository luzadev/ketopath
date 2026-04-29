import Link from 'next/link';

import { cn } from '@/lib/utils';

interface MastheadProps {
  issueLabel?: string;
  className?: string;
}

const FORMATTER = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Top-of-page editorial header. Three columns on desktop:
 *   ┌──────────────────┬─────────────────────┬──────────────────┐
 *   │ KP · monogram    │  ANNO I · N. 01     │  Lunedì 29 aprile │
 *   └──────────────────┴─────────────────────┴──────────────────┘
 * On mobile collapses to a row with monogram + date only.
 */
export function Masthead({ issueLabel = 'ANNO I · N. 01', className }: MastheadProps) {
  const today = FORMATTER.format(new Date());

  return (
    <header className={cn('relative pb-5 pt-6', className)}>
      <div className="rule-thick mb-4" />
      <div className="flex items-baseline justify-between gap-4">
        <Link href="/" className="monogram tracking-tight" aria-label="KetoPath">
          KetoPath<span className="text-pomodoro">.</span>
        </Link>
        <p className="editorial-eyebrow hidden sm:block">{issueLabel}</p>
        <p className="text-ink-soft font-mono text-[11px] tracking-wide first-letter:uppercase">
          {today}
        </p>
      </div>
      <div className="rule mt-4" />
    </header>
  );
}
