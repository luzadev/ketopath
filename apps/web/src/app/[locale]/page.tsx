import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CursorGlow } from '@/components/cursor-glow';
import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { fetchBillingStatus, type BillingStatus } from './billing/actions';
import { SignOutButton } from './sign-out-button';

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  const userName = session?.user?.name ?? session?.user?.email ?? null;
  const billing = userName ? await fetchBillingStatus() : null;

  return <HomeContent userName={userName} billing={billing} />;
}

function HomeContent({
  userName,
  billing,
}: {
  userName: string | null;
  billing: BillingStatus | null;
}) {
  return (
    <div className="relative">
      <div className="min-h-screen w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <Masthead />
        {userName ? (
          <SignedInDashboard userName={userName} billing={billing} />
        ) : (
          <MarketingLanding />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Marketing landing — Asymmetric, drastico.
 * Mosse: chapter markers giganti come art di sfondo, titoli che sbordano
 * il viewport (bleed-left), mockup ruotato che si sovrappone al titolo,
 * eyebrow verticali, card ruotate ad angoli diversi.
 * ───────────────────────────────────────────────────────────────────────── */
function MarketingLanding() {
  return (
    <main className="space-y-40 pb-32">
      <Hero />
      <Marquee />
      <StatsScattered />
      <FeaturesAsymmetric />
      <AppShowcaseOffset />
      <FinalCta />
      <Principles />
      <Disclaimer />
    </main>
  );
}

/* HERO — title rompe il bordo sinistro del viewport, mockup absolute
 * sovrappone parte del titolo come un timbro. Eyebrow verticale a destra. */
function Hero() {
  const t = useTranslations('Home');
  const title = t('title');
  const accent = t('titleAccent');
  const accentIdx = title.toLowerCase().indexOf(accent.toLowerCase());
  const before = accentIdx >= 0 ? title.slice(0, accentIdx).trim() : title;
  const accentText = accentIdx >= 0 ? title.slice(accentIdx, accentIdx + accent.length) : '';

  return (
    <section className="relative min-h-[100vh] overflow-hidden">
      <CursorGlow color="hsl(var(--pomodoro))" size={620} />
      <div
        aria-hidden
        className="mesh-blob mesh-blob--pomodoro animate-float-x -left-32 top-12 h-[36rem] w-[36rem] opacity-70"
      />
      <div
        aria-hidden
        className="mesh-blob mesh-blob--oliva animate-float-y -right-40 bottom-0 h-[40rem] w-[40rem] opacity-65"
      />

      {/* Eyebrow VERTICALE sul bordo destro */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-32 hidden md:block"
        style={{ writingMode: 'vertical-rl' }}
      >
        <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">
          N. 01 — Manifesto · Anno I — 2026
        </p>
      </div>

      {/* Titolo che sborda il bordo sinistro del viewport */}
      <h1 className="font-display text-mega animate-fade-up bleed-left relative mt-20 font-medium [animation-delay:120ms]">
        <span className="text-ink block">{before}</span>
        <span className="text-stroke-thick block">italiana,</span>
        <span className="block italic">
          <span className="text-gradient">{accentText}</span>
          <span className="text-pomodoro">.</span>
        </span>
      </h1>

      {/* Mockup-ring assoluto: si sovrappone al titolo da destra,
          ruotato leggermente come un timbro. */}
      <div
        aria-hidden
        className="animate-fade-up pointer-events-none absolute right-[-8vw] top-[8vh] hidden h-[55vw] w-[55vw] max-w-[680px] -rotate-6 [animation-delay:480ms] md:block"
      >
        <PhaseRingsArt />
      </div>

      {/* Tagline + CTA: posizioni completamente sganciate, indentate diverse */}
      <div className="relative mt-16 grid grid-cols-12 items-end gap-8">
        <p className="font-display text-ink-soft animate-fade-up col-span-12 max-w-md text-2xl italic leading-snug [animation-delay:300ms] md:col-span-5 md:col-start-3">
          {t('tagline')}
        </p>
        <div className="animate-fade-up col-span-12 flex flex-col items-stretch gap-3 [animation-delay:420ms] md:col-span-4 md:col-start-9 md:items-end">
          <Link
            href="/sign-up"
            className="btn-gradient font-display inline-flex items-center justify-center rounded-sm px-8 py-5 text-xl font-medium leading-tight"
          >
            {t('ctaTryFree')}
            <span aria-hidden className="ml-3 text-2xl">
              →
            </span>
          </Link>
          <Link
            href="/sign-in"
            className="text-ink hover:text-pomodoro decoration-pomodoro font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[6px] transition-colors md:text-right"
          >
            {t('ctaSecondary')}
          </Link>
          <p className="font-display text-ink-dim mt-1 text-sm italic md:text-right">
            {t('ctaTryFreeHint')}
          </p>
        </div>
      </div>
    </section>
  );
}

function PhaseRingsArt() {
  return (
    <svg viewBox="0 0 600 600" className="h-full w-full">
      <defs>
        <linearGradient id="ringHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--pomodoro))" />
          <stop offset="50%" stopColor="hsl(var(--oro))" />
          <stop offset="100%" stopColor="hsl(var(--oliva))" />
        </linearGradient>
        <radialGradient id="plateHero" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--carta-light))" />
          <stop offset="100%" stopColor="hsl(var(--carta-dim))" />
        </radialGradient>
      </defs>

      <circle
        cx="300"
        cy="300"
        r="280"
        fill="none"
        stroke="hsl(var(--ink) / 0.06)"
        strokeWidth="1"
      />
      <circle
        cx="300"
        cy="300"
        r="220"
        fill="none"
        stroke="hsl(var(--ink) / 0.06)"
        strokeWidth="1"
      />
      <circle cx="300" cy="300" r="160" fill="url(#plateHero)" stroke="hsl(var(--ink) / 0.1)" />

      <ellipse cx="270" cy="280" rx="38" ry="26" fill="hsl(var(--oliva) / 0.85)" />
      <ellipse cx="335" cy="270" rx="26" ry="22" fill="hsl(var(--pomodoro) / 0.85)" />
      <ellipse cx="320" cy="335" rx="42" ry="16" fill="hsl(var(--oro) / 0.75)" />

      <circle
        cx="300"
        cy="300"
        r="280"
        fill="none"
        stroke="url(#ringHeroGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="540 1760"
        className="animate-ring-trace"
        transform="rotate(-90 300 300)"
      />

      {[
        { angle: -90, label: 'I' },
        { angle: 30, label: 'II' },
        { angle: 150, label: 'III' },
      ].map(({ angle, label }) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 300 + Math.cos(rad) * 280;
        const cy = 300 + Math.sin(rad) * 280;
        return (
          <g key={label}>
            <circle
              cx={cx}
              cy={cy}
              r="20"
              fill="hsl(var(--carta))"
              stroke="hsl(var(--ink) / 0.2)"
              strokeWidth="2"
            />
            <text
              x={cx}
              y={cy + 5}
              textAnchor="middle"
              fontSize="14"
              fontFamily="ui-monospace, monospace"
              fontWeight="600"
              fill="hsl(var(--ink-soft))"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Marquee() {
  const tokens = [
    'KETO ITALIANA',
    'MEDITERRANEA',
    'PROGRESSIVA',
    'PERSONALIZZATA',
    'NIENTE FAME',
    'ZERO CARTE',
    '96+ RICETTE',
    '3 FASI',
    'DIGIUNO INTERMITTENTE',
    'GDPR-FIRST',
  ];
  const doubled = [...tokens, ...tokens];
  return (
    <section className="border-ink/15 bg-ink -mx-6 -my-12 overflow-hidden border-y py-7 sm:-mx-10">
      <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap">
        {doubled.map((tok, i) => (
          <span key={i} className="flex items-center gap-12">
            <span className="font-display text-carta-light text-3xl font-medium italic leading-none sm:text-4xl">
              {tok}
            </span>
            <span aria-hidden className="text-pomodoro text-3xl leading-none sm:text-4xl">
              ✦
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* STATS — Una stat occupa 60% della larghezza con numero a 28vw, le altre
 * due flottano in absolute a posizioni diverse. Sezione anche bleed a destra. */
function StatsScattered() {
  const t = useTranslations('Home');
  return (
    <section className="relative grid min-h-[70vh] grid-cols-12 gap-6">
      {/* Chapter marker di sfondo: "II" gigante, stroke trasparente */}
      <span
        aria-hidden
        className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 top-[-4rem] select-none italic"
      >
        II
      </span>

      {/* Stat 1 — gigante, sborda a sinistra */}
      <div className="bleed-left relative col-span-12 self-start md:col-span-8">
        <p className="editorial-eyebrow text-pomodoro">{t('stat1Label')}</p>
        <p
          className="font-display text-pomodoro mt-3 font-medium leading-[0.82] tracking-tight"
          style={{ fontSize: 'clamp(8rem, 32vw, 26rem)' }}
        >
          {t('stat1Value')}
        </p>
        <p className="font-display text-ink-soft mt-2 max-w-md text-xl italic leading-snug">
          {t('stat1Hint')}
        </p>
      </div>

      {/* Stat 2 — assoluta in alto a destra */}
      <div className="relative col-span-6 col-start-1 self-start md:absolute md:right-0 md:top-12 md:col-span-3 md:col-start-auto md:w-64">
        <p className="editorial-eyebrow text-oliva">{t('stat2Label')}</p>
        <p className="font-display text-oliva mt-2 text-7xl font-medium leading-none tracking-tight md:text-8xl">
          {t('stat2Value')}
        </p>
        <p className="font-display text-ink-soft mt-2 text-base italic leading-snug">
          {t('stat2Hint')}
        </p>
      </div>

      {/* Stat 3 — assoluta in basso a destra, sotto la stat 2 */}
      <div className="relative col-span-6 col-start-7 self-end md:absolute md:bottom-12 md:right-0 md:col-span-3 md:col-start-auto md:w-64">
        <p className="editorial-eyebrow text-oro">{t('stat3Label')}</p>
        <p className="font-display text-oro mt-2 text-7xl font-medium leading-none tracking-tight md:text-8xl">
          {t('stat3Value')}
        </p>
        <p className="font-display text-ink-soft mt-2 text-base italic leading-snug">
          {t('stat3Hint')}
        </p>
      </div>
    </section>
  );
}

/* FEATURES — ognuna è una composizione diversa con un chapter marker
 * gigante in stroke come art di sfondo. Card ruotate a -2°, 0°, +2°. */
function FeaturesAsymmetric() {
  const t = useTranslations('Home');
  return (
    <section className="relative space-y-32">
      <header className="grid grid-cols-12 items-end gap-6">
        <p className="editorial-eyebrow col-span-12 md:col-span-2 md:col-start-1">
          {t('featureSectionEyebrow')}
        </p>
        <h2 className="font-display text-display text-ink col-span-12 font-medium leading-[0.92] tracking-tight md:col-span-9 md:col-start-4">
          {t('featureSectionTitle')}
        </h2>
      </header>

      {/* Feature 1 — chapter "01" gigante a sinistra, card a destra */}
      <FeatureBlock
        chapter="01"
        eyebrow={t('feature1Eyebrow')}
        title={t('feature1Title')}
        body={t('feature1Body')}
        accent="oliva"
        align="right"
        rotate="-rotate-1"
        icon={<PlateIcon size={140} />}
      />

      {/* Feature 2 — chapter "02" a destra, card a sinistra (flippata) */}
      <FeatureBlock
        chapter="02"
        eyebrow={t('feature2Eyebrow')}
        title={t('feature2Title')}
        body={t('feature2Body')}
        accent="pomodoro"
        align="left"
        rotate="rotate-1"
        icon={<TimerIcon size={140} />}
      />

      {/* Feature 3 — chapter "03" centrale, card al centro (rompe il pattern) */}
      <FeatureBlock
        chapter="03"
        eyebrow={t('feature3Eyebrow')}
        title={t('feature3Title')}
        body={t('feature3Body')}
        accent="oro"
        align="center"
        rotate="-rotate-[0.5deg]"
        icon={<TrendIcon size={140} />}
      />
    </section>
  );
}

function FeatureBlock({
  chapter,
  eyebrow,
  title,
  body,
  accent,
  align,
  rotate,
  icon,
}: {
  chapter: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: 'oliva' | 'pomodoro' | 'oro';
  align: 'left' | 'right' | 'center';
  rotate: string;
  icon: React.ReactNode;
}) {
  const accentClass =
    accent === 'oliva' ? 'text-oliva' : accent === 'pomodoro' ? 'text-pomodoro' : 'text-oro';
  const tintGrad =
    accent === 'oliva'
      ? 'linear-gradient(135deg, hsl(var(--oliva) / 0.18) 0%, hsl(var(--carta-light)) 60%, transparent 100%)'
      : accent === 'pomodoro'
        ? 'linear-gradient(135deg, hsl(var(--pomodoro) / 0.18) 0%, hsl(var(--carta-light)) 60%, transparent 100%)'
        : 'linear-gradient(135deg, hsl(var(--oro) / 0.18) 0%, hsl(var(--carta-light)) 60%, transparent 100%)';

  // Posizionamento del chapter marker per ogni align
  const chapterPosition =
    align === 'right'
      ? '-left-4 top-[-2rem]'
      : align === 'left'
        ? '-right-4 top-[-3rem]'
        : 'left-1/2 top-[-4rem] -translate-x-1/2';

  // Posizionamento della card per ogni align
  const cardCols =
    align === 'right'
      ? 'md:col-start-6 md:col-span-7'
      : align === 'left'
        ? 'md:col-start-1 md:col-span-7'
        : 'md:col-start-3 md:col-span-8';

  return (
    <div className="relative grid grid-cols-12 items-start gap-6 py-8">
      {/* Chapter marker gigante in stroke, fa da art di sfondo */}
      <span
        aria-hidden
        className={`font-display text-stroke-thin text-chapter pointer-events-none absolute select-none italic ${chapterPosition}`}
      >
        {chapter}
      </span>

      {/* Card della feature, ruotata */}
      <article
        className={`hover-lift border-ink/15 group relative col-span-12 overflow-hidden border ${cardCols} ${rotate} p-7 sm:p-9`}
        style={{ background: tintGrad }}
      >
        <div
          aria-hidden
          className={`mesh-blob ${
            accent === 'oliva'
              ? 'mesh-blob--oliva'
              : accent === 'pomodoro'
                ? 'mesh-blob--pomodoro'
                : 'mesh-blob--oro'
          } animate-float-z -right-20 -top-20 h-72 w-72 opacity-50`}
        />
        <div className="relative grid grid-cols-12 items-start gap-6">
          <div className="col-span-12 md:col-span-8">
            <p className={`editorial-eyebrow ${accentClass}`}>{eyebrow}</p>
            <h3 className="font-display text-ink mt-3 text-3xl font-medium leading-[1.05] tracking-tight sm:text-4xl">
              {title}
            </h3>
            <p className="font-display text-ink-soft mt-5 max-w-xl text-base italic leading-snug">
              {body}
            </p>
          </div>
          <div
            className={`${accentClass} col-span-12 transition-transform duration-500 group-hover:rotate-12 md:col-span-4 md:self-end md:justify-self-end`}
          >
            {icon}
          </div>
        </div>
      </article>
    </div>
  );
}

function PlateIcon({ size = 60 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <circle cx="30" cy="30" r="22" />
      <circle cx="30" cy="30" r="17" opacity="0.4" />
      <ellipse cx="25" cy="27" rx="6" ry="4" fill="currentColor" opacity="0.85" stroke="none" />
      <ellipse cx="34" cy="33" rx="5" ry="3.5" fill="currentColor" opacity="0.55" stroke="none" />
      <line x1="48" y1="14" x2="54" y2="8" strokeLinecap="round" />
      <line x1="50" y1="16" x2="56" y2="10" strokeLinecap="round" />
    </svg>
  );
}

function TimerIcon({ size = 60 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="30" cy="32" r="20" />
      <path d="M 30 32 L 30 18" strokeLinecap="round" strokeWidth="2" />
      <path d="M 30 32 L 40 36" strokeLinecap="round" strokeWidth="2" />
      <line x1="30" y1="8" x2="30" y2="12" strokeLinecap="round" />
      <line x1="22" y1="8" x2="38" y2="8" strokeLinecap="round" strokeWidth="2" />
      <circle cx="30" cy="32" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TrendIcon({ size = 60 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <polyline
        points="6,42 18,32 28,36 38,22 52,12"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="6" cy="42" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="32" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="28" cy="36" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="38" cy="22" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="52" cy="12" r="3.5" fill="currentColor" stroke="none" />
      <line x1="6" y1="50" x2="56" y2="50" opacity="0.3" />
    </svg>
  );
}

/* APP SHOWCASE — mockup ruotato che sborda a destra del viewport. */
function AppShowcaseOffset() {
  const t = useTranslations('Home');
  return (
    <section className="relative">
      <div
        aria-hidden
        className="mesh-blob mesh-blob--pomodoro animate-float-y left-1/4 top-12 h-96 w-96 opacity-50"
      />
      <div
        aria-hidden
        className="mesh-blob mesh-blob--oliva animate-float-x bottom-0 right-0 h-80 w-80 opacity-50"
      />

      {/* Chapter marker "IV" gigante */}
      <span
        aria-hidden
        className="font-display text-stroke-thin text-chapter pointer-events-none absolute left-[5vw] top-[-6rem] select-none italic"
      >
        IV
      </span>

      <div className="relative grid grid-cols-12 items-start gap-8">
        <div className="col-span-12 md:col-span-4 md:pt-32">
          <p className="editorial-eyebrow">{t('previewSectionEyebrow')}</p>
          <h2 className="font-display text-ink mt-4 text-3xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {t('previewSectionTitle')}
          </h2>
          <p className="font-display text-ink-soft mt-5 text-base italic leading-snug">
            {t('previewSectionBody')}
          </p>
        </div>

        {/* Mockup sborda DESTRA del viewport, ruotato +3° */}
        <div className="perspective-1000 md:bleed-right relative col-span-12 md:col-span-8 md:rotate-[2deg]">
          <div className="tilt-3d">
            <BrowserMockup t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

function BrowserMockup({ t }: { t: ReturnType<typeof useTranslations<'Home'>> }) {
  return (
    <div className="border-ink/20 bg-carta-light glow-ring overflow-hidden rounded-sm border shadow-2xl">
      <div className="border-ink/15 bg-carta-dim flex items-center gap-2 border-b px-4 py-3">
        <span className="bg-pomodoro/70 h-3 w-3 rounded-full" />
        <span className="bg-oro/70 h-3 w-3 rounded-full" />
        <span className="bg-oliva/70 h-3 w-3 rounded-full" />
        <span className="text-ink-dim ml-4 font-mono text-xs">ketopath.app/plan</span>
      </div>
      <div className="grid gap-6 p-8 md:grid-cols-3">
        <ShowcasePlanCard t={t} />
        <ShowcaseFastCard t={t} />
        <ShowcaseWeightCard t={t} />
      </div>
    </div>
  );
}

function ShowcasePlanCard({ t }: { t: ReturnType<typeof useTranslations<'Home'>> }) {
  return (
    <div className="border-ink/15 flex flex-col gap-3 border p-5">
      <div className="flex items-baseline justify-between">
        <p className="editorial-eyebrow text-pomodoro">III</p>
        <p className="text-ink-dim font-mono text-[10px] uppercase tracking-widest">
          {t('previewPlanLabel')}
        </p>
      </div>
      <ul className="divide-ink/10 divide-y">
        <ShowcaseRow numeral="I" label={t('previewPlanRecipe1')} kcal="380" />
        <ShowcaseRow numeral="II" label={t('previewPlanRecipe2')} kcal="520" />
        <ShowcaseRow numeral="III" label={t('previewPlanRecipe3')} kcal="610" />
      </ul>
      <div className="border-ink/10 mt-2 flex items-baseline justify-between border-t pt-3">
        <span className="editorial-eyebrow">kcal</span>
        <span className="font-display text-ink text-2xl font-medium tabular-nums">1.510</span>
      </div>
    </div>
  );
}

function ShowcaseRow({ numeral, label, kcal }: { numeral: string; label: string; kcal: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-3">
      <span className="flex items-baseline gap-3">
        <span className="text-ink-dim font-mono text-[10px]">{numeral}</span>
        <span className="font-display text-ink text-base leading-tight">{label}</span>
      </span>
      <span className="text-ink-soft font-mono text-xs tabular-nums">{kcal}</span>
    </li>
  );
}

function ShowcaseFastCard({ t }: { t: ReturnType<typeof useTranslations<'Home'>> }) {
  return (
    <div className="border-ink/15 flex flex-col items-center gap-3 border p-5">
      <div className="flex w-full items-baseline justify-between">
        <p className="editorial-eyebrow text-oliva">II</p>
        <p className="text-ink-dim font-mono text-[10px] uppercase tracking-widest">
          {t('previewFastLabel')}
        </p>
      </div>
      <svg viewBox="0 0 200 200" className="my-2 h-40 w-40">
        <defs>
          <linearGradient id="fastArc4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--oliva))" />
            <stop offset="100%" stopColor="hsl(var(--oro))" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="hsl(var(--ink) / 0.08)"
          strokeWidth="6"
        />
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="url(#fastArc4)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="490 490"
          strokeDashoffset="170"
          transform="rotate(-90 100 100)"
        />
        <text
          x="100"
          y="105"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize="32"
          fontWeight="600"
          fill="hsl(var(--ink))"
        >
          {t('previewFastTime')}
        </text>
      </svg>
      <p className="font-display text-ink-soft text-center text-sm italic leading-snug">
        {t('previewFastHint')}
      </p>
    </div>
  );
}

function ShowcaseWeightCard({ t }: { t: ReturnType<typeof useTranslations<'Home'>> }) {
  return (
    <div className="border-ink/15 flex flex-col gap-3 border p-5">
      <div className="flex items-baseline justify-between">
        <p className="editorial-eyebrow text-oro">III</p>
        <p className="text-ink-dim font-mono text-[10px] uppercase tracking-widest">−4,2 kg</p>
      </div>
      <svg viewBox="0 0 200 110" className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="weightFill4" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--oliva) / 0.35)" />
            <stop offset="100%" stopColor="hsl(var(--oliva) / 0)" />
          </linearGradient>
        </defs>
        <path
          d="M 0 30 L 25 38 L 50 36 L 75 50 L 100 56 L 125 70 L 150 76 L 175 84 L 200 92 L 200 110 L 0 110 Z"
          fill="url(#weightFill4)"
        />
        <path
          d="M 0 30 L 25 38 L 50 36 L 75 50 L 100 56 L 125 70 L 150 76 L 175 84 L 200 92"
          fill="none"
          stroke="hsl(var(--oliva))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[0, 25, 50, 75, 100, 125, 150, 175, 200].map((x, i) => {
          const ys = [30, 38, 36, 50, 56, 70, 76, 84, 92];
          return <circle key={i} cx={x} cy={ys[i]} r="2.5" fill="hsl(var(--oliva))" />;
        })}
      </svg>
      <p className="font-display text-ink mt-2 text-base font-medium leading-tight">
        {t('previewWeightLabel')}
      </p>
    </div>
  );
}

/* CTA finale — full-bleed dark, "?" gigante che sborda in alto a destra,
 * titolo ancorato in basso a sinistra. */
function FinalCta() {
  const t = useTranslations('Home');
  const titleNoMark = t('ctaSectionTitle').replace(/\?$/, '');
  return (
    <section className="section-dark relative -mx-6 overflow-hidden px-6 py-32 sm:-mx-10 sm:px-12">
      <div
        aria-hidden
        className="mesh-blob mesh-blob--pomodoro animate-float-x left-1/4 top-0 h-96 w-96 opacity-50"
      />
      <div
        aria-hidden
        className="mesh-blob mesh-blob--oliva animate-float-y bottom-0 right-1/4 h-96 w-96 opacity-40"
      />

      {/* "?" GIGANTE che sborda fuori dal lato destro e in alto */}
      <span
        aria-hidden
        className="text-gradient font-display pointer-events-none absolute -right-[6vw] -top-[8vh] select-none font-medium italic leading-none"
        style={{ fontSize: 'clamp(14rem, 38vw, 36rem)' }}
      >
        ?
      </span>

      <div className="relative grid grid-cols-12 gap-8 pt-16 md:min-h-[60vh]">
        {/* Pull-quote in alto, indentata */}
        <p className="font-display text-carta/70 col-span-12 max-w-xl text-xl italic leading-snug md:col-span-6 md:col-start-2 md:text-2xl">
          {t('ctaSectionBody')}
        </p>

        {/* Titolo gigante in basso, ancorato a sinistra */}
        <h2 className="font-display text-carta col-span-12 mt-auto text-5xl font-medium leading-[0.92] tracking-tight md:col-span-8 md:col-start-1 md:text-7xl">
          {titleNoMark}
          <span className="text-pomodoro">.</span>
        </h2>

        {/* CTA in basso a destra, defilato */}
        <div className="col-span-12 mt-auto flex flex-col gap-3 md:col-span-3 md:col-start-10 md:items-end">
          <Link
            href="/sign-up"
            className="btn-gradient font-display inline-flex items-center justify-center rounded-sm px-10 py-6 text-2xl font-medium leading-tight"
          >
            {t('ctaTryFree')}
            <span aria-hidden className="ml-3 text-3xl">
              →
            </span>
          </Link>
          <p className="text-carta/60 font-display text-sm italic md:text-right">
            {t('ctaTryFreeHint')}
          </p>
        </div>
      </div>
    </section>
  );
}

function Principles() {
  const t = useTranslations('Home');
  return (
    <section className="relative">
      <span
        aria-hidden
        className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 top-[-6rem] select-none italic"
      >
        V
      </span>

      <p className="editorial-eyebrow relative">{t('principlesEyebrow')}</p>
      <ol className="font-display text-ink relative mt-12 grid grid-cols-12 gap-y-12 text-xl leading-snug">
        <li className="col-span-12 flex gap-4 md:col-span-5 md:col-start-1">
          <span className="text-pomodoro mt-1 font-mono text-xs">I</span>
          <span>{t('principle1')}</span>
        </li>
        <li className="col-span-12 flex gap-4 md:col-span-5 md:col-start-8 md:pt-16">
          <span className="text-pomodoro mt-1 font-mono text-xs">II</span>
          <span>{t('principle2')}</span>
        </li>
        <li className="col-span-12 flex gap-4 md:col-span-7 md:col-start-3 md:pt-8">
          <span className="text-pomodoro mt-1 font-mono text-xs">III</span>
          <span>{t('principle3')}</span>
        </li>
      </ol>
    </section>
  );
}

function Disclaimer() {
  const t = useTranslations('Home');
  return (
    <footer className="border-ink/15 grid grid-cols-12 gap-6 border-t pt-8">
      <p className="font-display text-ink-soft col-span-12 text-base italic leading-relaxed md:col-span-7 md:col-start-2">
        {t('disclaimer')}
      </p>
      <p className="text-ink-dim col-span-12 font-mono text-[10px] uppercase tracking-widest md:col-span-3 md:col-start-10 md:text-right">
        {t('footerCopyright')}
      </p>
    </footer>
  );
}

function SignedInDashboard({
  userName,
  billing,
}: {
  userName: string;
  billing: BillingStatus | null;
}) {
  const t = useTranslations('Home');
  return (
    <main className="relative min-h-[80vh] overflow-hidden pb-24">
      <CursorGlow color="hsl(var(--oliva))" size={560} />
      <div
        aria-hidden
        className="mesh-blob mesh-blob--oliva animate-float-y -right-32 top-12 h-[28rem] w-[28rem] opacity-55"
      />
      <div
        aria-hidden
        className="mesh-blob mesh-blob--pomodoro animate-float-x -left-32 top-64 h-80 w-80 opacity-40"
      />
      <div
        aria-hidden
        className="mesh-blob mesh-blob--oro animate-float-z bottom-12 right-1/4 h-72 w-72 opacity-30"
      />

      {/* Chapter marker gigante "I" come art di sfondo */}
      <span
        aria-hidden
        className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 -top-12 select-none italic"
      >
        I
      </span>

      {/* Eyebrow verticale a destra */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-32 hidden md:block"
        style={{ writingMode: 'vertical-rl' }}
      >
        <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">{t('lettura')}</p>
      </div>

      {/* Greeting bleed-left, sborda fuori dal container */}
      <h1 className="font-display text-mega bleed-left animate-fade-up relative mt-12 font-medium [animation-delay:120ms]">
        <span className="text-ink block">Buongiorno,</span>
        <span className="block italic">
          <span className="text-gradient">{userName}</span>
          <span className="text-pomodoro">.</span>
        </span>
      </h1>

      <p className="font-display text-ink-soft animate-fade-up relative mt-10 max-w-xl text-2xl italic leading-snug [animation-delay:240ms] md:ml-[16.66%]">
        {t('tagline')}
      </p>

      <TrialBanner billing={billing} />

      {/* Nav asimmetrica: card grande "/plan" a sinistra, le altre 4 in colonna a destra */}
      <div className="animate-fade-up relative mt-20 grid grid-cols-12 gap-6 [animation-delay:360ms]">
        <DashboardHero
          href="/plan"
          eyebrow="Capitolo I · Cucina"
          title={t('viewPlan')}
          accent="oliva"
        />
        <ul className="col-span-12 space-y-px md:col-span-5 md:col-start-8">
          <NavItem href="/shopping" label={t('viewShopping')} eyebrow="Spesa" chapter="II" />
          <NavItem href="/fasting" label={t('viewFasting')} eyebrow="Digiuno" chapter="III" />
          <NavItem href="/tracking" label={t('viewTracking')} eyebrow="Tracking" chapter="IV" />
          <NavItem href="/profile" label={t('completeProfile')} eyebrow="Profilo" chapter="V" />
          <NavItem href="/billing" label={t('viewBilling')} eyebrow="Abbonamento" chapter="VI" />
          <li className="pt-6">
            <SignOutButton label={t('signOut')} />
          </li>
        </ul>
      </div>

      <Disclaimer />
    </main>
  );
}

function DashboardHero({
  href,
  eyebrow,
  title,
  accent,
}: {
  href: string;
  eyebrow: string;
  title: string;
  accent: 'oliva' | 'pomodoro' | 'oro';
}) {
  const accentClass =
    accent === 'oliva' ? 'text-oliva' : accent === 'pomodoro' ? 'text-pomodoro' : 'text-oro';
  const tintGrad =
    accent === 'oliva'
      ? 'linear-gradient(135deg, hsl(var(--oliva) / 0.18) 0%, hsl(var(--carta-light)) 70%)'
      : accent === 'pomodoro'
        ? 'linear-gradient(135deg, hsl(var(--pomodoro) / 0.18) 0%, hsl(var(--carta-light)) 70%)'
        : 'linear-gradient(135deg, hsl(var(--oro) / 0.18) 0%, hsl(var(--carta-light)) 70%)';
  return (
    <Link
      href={href}
      className="hover-lift border-ink/15 group col-span-12 -rotate-1 overflow-hidden border md:col-span-6"
      style={{ background: tintGrad }}
    >
      <div
        aria-hidden
        className={`mesh-blob mesh-blob--${accent} animate-float-z -right-16 -top-16 h-60 w-60 opacity-50`}
      />
      <article className="relative flex min-h-[18rem] flex-col justify-between p-8">
        <p className={`editorial-eyebrow ${accentClass}`}>{eyebrow}</p>
        <div>
          <h2 className="font-display text-ink text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {title}
          </h2>
          <p
            aria-hidden
            className={`font-display mt-6 text-3xl italic leading-none ${accentClass} transition-transform duration-500 group-hover:translate-x-2`}
          >
            →
          </p>
        </div>
      </article>
    </Link>
  );
}

function NavItem({
  href,
  label,
  eyebrow,
  chapter,
}: {
  href: string;
  label: string;
  eyebrow: string;
  chapter?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="border-ink/15 hover:bg-ink hover:text-carta-light group -mx-0 flex items-baseline justify-between gap-4 border-t py-4 transition-colors last:border-b hover:-mx-3 hover:px-3"
      >
        <span className="flex items-baseline gap-4">
          {chapter ? (
            <span className="text-ink-dim group-hover:text-carta-light/60 font-mono text-xs">
              {chapter}
            </span>
          ) : null}
          <span className="flex flex-col gap-1">
            <span className="editorial-eyebrow group-hover:text-carta-light/60">{eyebrow}</span>
            <span className="font-display text-xl leading-tight">{label}</span>
          </span>
        </span>
        <span
          aria-hidden
          className="font-display text-ink-dim group-hover:text-carta-light text-xl"
        >
          →
        </span>
      </Link>
    </li>
  );
}

const ITALIAN_DATE = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
});

function TrialBanner({ billing }: { billing: BillingStatus | null }) {
  const t = useTranslations('Billing');
  if (!billing) return null;
  const { derived } = billing;

  if (derived.kind === 'trial' && derived.trialDaysRemaining != null) {
    const endsAt = derived.accessEndsAt ? ITALIAN_DATE.format(new Date(derived.accessEndsAt)) : '—';
    return (
      <aside className="border-oro/35 bg-oro/5 animate-fade-up relative mt-12 border-2 border-dashed p-6 [animation-delay:300ms] md:ml-[16.66%]">
        <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
          <div>
            <p className="editorial-eyebrow">{t('trialBannerTitle')}</p>
            <p className="font-display text-ink mt-2 text-lg leading-snug">
              {t('trialBannerBody', { days: derived.trialDaysRemaining, endsAt })}
            </p>
          </div>
          <Link
            href="/billing"
            className="text-oro hover:text-pomodoro shrink-0 font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px]"
          >
            {t('trialBannerCta')} →
          </Link>
        </div>
      </aside>
    );
  }

  if (derived.kind === 'trial_expired' || derived.kind === 'past_due') {
    return (
      <aside className="border-pomodoro/40 bg-pomodoro/5 animate-fade-up relative mt-12 border-2 border-dashed p-6 [animation-delay:300ms] md:ml-[16.66%]">
        <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
          <div>
            <p className="editorial-eyebrow">{t('trialEndedBannerTitle')}</p>
            <p className="font-display text-ink mt-2 text-lg leading-snug">
              {t('trialEndedBannerBody')}
            </p>
          </div>
          <Link
            href="/billing"
            className="text-pomodoro hover:text-ink shrink-0 font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px]"
          >
            {t('trialEndedBannerCta')} →
          </Link>
        </div>
      </aside>
    );
  }

  return null;
}
