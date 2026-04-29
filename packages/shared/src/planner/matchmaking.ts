// PRD §9.4 — algoritmo di matchmaking pasti.
// Implementazione pura senza dipendenze: filtra ricette per esclusioni, fase
// e categoria pasto; calcola un punteggio di distanza dai macros target;
// penalizza ricette consumate di recente; bilancia sui macros già accumulati.
// Non importa nulla da @ketopath/db perché l'algoritmo deve essere
// utilizzabile anche con fixture in test e con feature-flag indipendenti
// dalla persistenza.

export interface RecipeCandidate {
  id: string;
  name: string;
  category: 'COLAZIONE' | 'PRANZO' | 'SPUNTINO' | 'CENA';
  kcal: number;
  proteinG: number;
  fatG: number;
  netCarbG: number;
  exclusionTags: ReadonlyArray<string>;
  phases: ReadonlyArray<1 | 2 | 3>;
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  netCarbG: number;
}

export interface MatchOptions {
  candidates: ReadonlyArray<RecipeCandidate>;
  meal: RecipeCandidate['category'];
  phase: 1 | 2 | 3;
  excludedTags: ReadonlyArray<string>;
  recentlyConsumedIds?: ReadonlyArray<string>;
  // Macros già consumati nello stesso giorno; usati per bilanciare le scelte
  // successive (la cena tiene conto di colazione/pranzo/spuntino).
  consumedSoFar?: MacroTargets;
  dailyTarget: MacroTargets;
  // Quote del pasto sul totale giornaliero (sommano a 1.0).
  mealShare: { COLAZIONE: number; PRANZO: number; SPUNTINO: number; CENA: number };
  topN?: number; // default 5
}

export interface MatchResult extends RecipeCandidate {
  score: number;
}

/**
 * Restituisce le `topN` ricette più adatte, ordinate dalla migliore
 * (score più basso) alla peggiore. Lo score combina:
 * - distanza euclidea dai macros target del pasto (pesato sul giorno residuo)
 * - penalità additiva se la ricetta è stata consumata negli ultimi N giorni
 */
export function matchMeals(opts: MatchOptions): MatchResult[] {
  const consumed = opts.consumedSoFar ?? { kcal: 0, proteinG: 0, fatG: 0, netCarbG: 0 };
  const remainingTarget: MacroTargets = {
    kcal: Math.max(0, opts.dailyTarget.kcal - consumed.kcal),
    proteinG: Math.max(0, opts.dailyTarget.proteinG - consumed.proteinG),
    fatG: Math.max(0, opts.dailyTarget.fatG - consumed.fatG),
    netCarbG: Math.max(0, opts.dailyTarget.netCarbG - consumed.netCarbG),
  };
  const share = opts.mealShare[opts.meal];
  const mealTarget: MacroTargets = {
    kcal: remainingTarget.kcal * share,
    proteinG: remainingTarget.proteinG * share,
    fatG: remainingTarget.fatG * share,
    netCarbG: remainingTarget.netCarbG * share,
  };

  const recentSet = new Set(opts.recentlyConsumedIds ?? []);
  const exclusionSet = new Set(opts.excludedTags);

  const results: MatchResult[] = [];

  for (const r of opts.candidates) {
    if (r.category !== opts.meal) continue;
    if (!r.phases.includes(opts.phase)) continue;
    if (r.exclusionTags.some((tag) => exclusionSet.has(tag))) continue;

    const dKcal = (r.kcal - mealTarget.kcal) / Math.max(1, mealTarget.kcal);
    const dPro = (r.proteinG - mealTarget.proteinG) / Math.max(1, mealTarget.proteinG);
    const dFat = (r.fatG - mealTarget.fatG) / Math.max(1, mealTarget.fatG);
    const dCarb = (r.netCarbG - mealTarget.netCarbG) / Math.max(1, mealTarget.netCarbG);

    let score = Math.sqrt(dKcal * dKcal + dPro * dPro + dFat * dFat + dCarb * dCarb);
    if (recentSet.has(r.id)) score += 1.5;

    results.push({ ...r, score });
  }

  results.sort((a, b) => a.score - b.score);
  return results.slice(0, opts.topN ?? 5);
}

// Default share per pasto (somma 1.0). Può essere sovrascritta dall'utente.
export const DEFAULT_MEAL_SHARE = {
  COLAZIONE: 0.25,
  PRANZO: 0.35,
  SPUNTINO: 0.1,
  CENA: 0.3,
} as const;
