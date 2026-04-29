import { prisma } from '@ketopath/db';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

interface RecipeIngredientView {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

interface RecipeView {
  id: string;
  name: string;
  category: 'COLAZIONE' | 'PRANZO' | 'SPUNTINO' | 'CENA';
  description: string | null;
  prepMinutes: number;
  difficulty: 'FACILE' | 'MEDIA' | 'ELABORATA';
  kcal: number;
  proteinG: number;
  fatG: number;
  netCarbG: number;
  phases: number[];
  notesChef: string | null;
  ingredients: RecipeIngredientView[];
}

export default async function RecipePage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: {
        include: {
          ingredient: { select: { id: true, name: true, category: true } },
        },
      },
    },
  });

  if (!recipe) notFound();

  const view: RecipeView = {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    description: recipe.description,
    prepMinutes: recipe.prepMinutes,
    difficulty: recipe.difficulty,
    kcal: recipe.kcal,
    proteinG: recipe.proteinG,
    fatG: recipe.fatG,
    netCarbG: recipe.netCarbG,
    phases: recipe.phases,
    notesChef: recipe.notesChef,
    ingredients: recipe.ingredients.map((ri) => ({
      id: ri.id,
      name: ri.ingredient.name,
      category: ri.ingredient.category,
      quantity: ri.quantity,
      unit: ri.unit,
    })),
  };

  return <RecipeContent recipe={view} />;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function RecipeContent({ recipe }: { recipe: RecipeView }) {
  const t = useTranslations('Recipe');
  const phasesAll = recipe.phases.length === 3;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 sm:px-10">
      <Masthead issueLabel={`N. 08 — ${t(`categoryLabel.${recipe.category}`)}`} />
      <main className="py-10 sm:py-14">
        <Link
          href="/plan"
          className="editorial-eyebrow hover:text-ink text-ink-soft animate-fade-up inline-flex items-center transition-colors"
        >
          {t('back')}
        </Link>

        <header className="mt-6 grid gap-8 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="editorial-eyebrow animate-fade-up [animation-delay:120ms]">
              {t(`categoryLabel.${recipe.category}`)}
            </p>
            <h1 className="font-display text-display text-ink animate-fade-up mt-3 font-medium leading-[0.95] tracking-tight [animation-delay:180ms]">
              {recipe.name}
              <span className="text-pomodoro">.</span>
            </h1>
            {recipe.description ? (
              <p className="font-display text-ink-soft animate-fade-up mt-5 max-w-2xl text-xl italic leading-snug [animation-delay:300ms]">
                {recipe.description}
              </p>
            ) : null}
          </div>
          <aside className="md:border-ink/15 animate-fade-up [animation-delay:420ms] md:col-span-4 md:border-l md:pl-8">
            <p className="editorial-eyebrow">{t('metaTitle')}</p>
            <dl className="mt-5 space-y-4">
              <MetaRow label={t('prepTime')} value={t('minutes', { n: recipe.prepMinutes })} />
              <MetaRow label={t('difficulty')} value={t(`difficultyLabel.${recipe.difficulty}`)} />
              <MetaRow
                label={t('phase')}
                value={
                  phasesAll
                    ? t('phasesAll')
                    : t('phasesSome', { phases: recipe.phases.join(' · ') })
                }
              />
            </dl>
          </aside>
        </header>

        <div className="rule animate-rule-in my-10 [animation-delay:480ms]" />

        <section className="grid gap-12 md:grid-cols-12">
          <div className="animate-fade-up [animation-delay:540ms] md:col-span-7">
            <p className="editorial-eyebrow">{t('ingredientsTitle')}</p>
            <p className="font-display text-ink-soft mt-1 text-sm italic">
              {t('ingredientsSubtitle')}
            </p>
            <ol className="mt-7 space-y-5">
              {recipe.ingredients.map((ing, idx) => (
                <li
                  key={ing.id}
                  className="border-ink/10 grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 border-b pb-4"
                >
                  <span className="text-ink-dim font-mono text-xs uppercase tracking-widest">
                    {ROMAN[idx] ?? idx + 1}
                  </span>
                  <div>
                    <p className="font-display text-ink text-lg leading-tight">{ing.name}</p>
                    <p className="text-ink-soft mt-1 font-mono text-[10px] uppercase tracking-widest">
                      {ing.category}
                    </p>
                  </div>
                  <span className="text-ink font-mono text-sm tabular-nums">
                    {formatQuantity(ing.quantity)} {ing.unit}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <aside className="md:border-ink/15 animate-fade-up [animation-delay:660ms] md:col-span-5 md:border-l md:pl-10">
            <p className="editorial-eyebrow">{t('macrosTitle')}</p>
            <dl className="mt-7 space-y-6">
              <MacroRow label={t('kcal')} value={Math.round(recipe.kcal)} unit="kcal" big />
              <MacroRow label={t('protein')} value={Math.round(recipe.proteinG)} unit="g" />
              <MacroRow label={t('fat')} value={Math.round(recipe.fatG)} unit="g" />
              <MacroRow label={t('netCarb')} value={Math.round(recipe.netCarbG)} unit="g" />
            </dl>
          </aside>
        </section>

        <div className="rule animate-rule-in my-12 [animation-delay:780ms]" />

        <section className="animate-fade-up grid gap-12 [animation-delay:840ms] md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="editorial-eyebrow">{t('preparationTitle')}</p>
            <p className="font-display text-ink mt-6 text-lg leading-relaxed">
              <span className="drop-cap">
                {(recipe.description ?? t('preparationFallback'))[0]}
              </span>
              {(recipe.description ?? t('preparationFallback')).slice(1)}
            </p>
          </div>
          {recipe.notesChef ? (
            <aside className="md:border-ink/15 md:col-span-5 md:border-l md:pl-10">
              <p className="editorial-eyebrow">{t('notesChef')}</p>
              <p className="font-display text-ink-soft mt-6 text-base italic leading-relaxed">
                “{recipe.notesChef}”
              </p>
            </aside>
          ) : null}
        </section>
      </main>

      <div className="rule-thick mt-16" />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 items-baseline gap-3">
      <dt className="editorial-eyebrow">{label}</dt>
      <dd className="font-display text-ink text-base leading-tight">{value}</dd>
    </div>
  );
}

function MacroRow({
  label,
  value,
  unit,
  big = false,
}: {
  label: string;
  value: number;
  unit: string;
  big?: boolean;
}) {
  return (
    <div className="border-ink/10 grid grid-cols-2 items-baseline gap-3 border-b pb-4 last:border-b-0">
      <dt className="editorial-eyebrow">{label}</dt>
      <dd
        className={`text-ink font-mono tabular-nums ${
          big ? 'text-3xl font-medium' : 'text-xl'
        } leading-none`}
      >
        {value}
        <span className="font-display text-ink-soft ml-1 text-xs italic">{unit}</span>
      </dd>
    </div>
  );
}

function formatQuantity(q: number): string {
  if (Number.isInteger(q)) return String(q);
  if (q < 1) {
    if (q === 0.25) return '¼';
    if (q === 0.5) return '½';
    if (q === 0.75) return '¾';
  }
  return q.toFixed(1);
}
