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

export type MealShare = MatchOptions['mealShare'];

// Default share per pasto (somma 1.0). Può essere sovrascritta dall'utente.
export const DEFAULT_MEAL_SHARE: MealShare = {
  COLAZIONE: 0.25,
  PRANZO: 0.35,
  SPUNTINO: 0.1,
  CENA: 0.3,
};

export type FastingProtocolKey =
  | 'FOURTEEN_TEN'
  | 'SIXTEEN_EIGHT'
  | 'EIGHTEEN_SIX'
  | 'TWENTY_FOUR'
  | 'ESE_24'
  | 'FIVE_TWO';

/**
 * Piano del singolo giorno per un certo protocollo IF.
 * - `share`: quote per pasto (sommano a `kcalMultiplier`, non a 1, perché un
 *   giorno di digiuno completo ha tutto a 0).
 * - `kcalMultiplier`: moltiplicatore sul TDEE/kcalTarget del giorno.
 *   - 1.0 → giorno normale
 *   - 0.0 → giorno di digiuno completo (il piano salta il giorno intero)
 *   - 0.25 → giorno "fasting day" del 5:2 (~500 kcal su 2000)
 */
export interface ProtocolDayPlan {
  share: MealShare;
  kcalMultiplier: number;
}

const ALL_ZERO: MealShare = { COLAZIONE: 0, PRANZO: 0, SPUNTINO: 0, CENA: 0 };

// PRD §5.6 + §9.4 — finestra alimentare per protocollo, declinata per giorno
// della settimana. `dayOfWeek` è Mon-anchored: 0=Lunedì … 6=Domenica.
//
// 14:10  → 10h, tutti i pasti, ogni giorno.
// 16:8   → 8h, niente colazione (brunch + cena + spuntino), ogni giorno.
// 18:6   → 6h, niente colazione, pranzo grande + cena + spuntino piccolo.
// 20:4   → 4h, un solo pasto sostanzioso a cena + spuntino opzionale.
// ESE 24h → mercoledì digiuno completo (kcalMultiplier=0), altri giorni
//           default. Variante "una volta a settimana" del classico Eat-Stop-Eat.
// 5:2    → lunedì + giovedì giorni "magri" (~500 kcal, un solo pasto a cena),
//          gli altri 5 giorni default.
export function protocolPlanForDay(
  protocol: FastingProtocolKey | null | undefined,
  dayOfWeek: number,
): ProtocolDayPlan {
  switch (protocol) {
    case 'SIXTEEN_EIGHT':
      return {
        share: { COLAZIONE: 0, PRANZO: 0.5, SPUNTINO: 0.1, CENA: 0.4 },
        kcalMultiplier: 1,
      };
    case 'EIGHTEEN_SIX':
      return {
        share: { COLAZIONE: 0, PRANZO: 0.55, SPUNTINO: 0.05, CENA: 0.4 },
        kcalMultiplier: 1,
      };
    case 'TWENTY_FOUR':
      return {
        share: { COLAZIONE: 0, PRANZO: 0, SPUNTINO: 0.1, CENA: 0.9 },
        kcalMultiplier: 1,
      };
    case 'ESE_24':
      // Mercoledì (dayOfWeek === 2) digiuno completo, altrimenti normale.
      return dayOfWeek === 2
        ? { share: ALL_ZERO, kcalMultiplier: 0 }
        : { share: DEFAULT_MEAL_SHARE, kcalMultiplier: 1 };
    case 'FIVE_TWO':
      // Lunedì (0) e giovedì (3) "fasting days": un solo pasto a cena con
      // kcal complessive ridotte (~25% di TDEE, target classico ~500 kcal).
      // Nota: la share somma comunque a 1 (è la quota del *giorno ridotto*),
      // mentre la riduzione totale viene applicata via kcalMultiplier.
      return dayOfWeek === 0 || dayOfWeek === 3
        ? {
            share: { COLAZIONE: 0, PRANZO: 0, SPUNTINO: 0, CENA: 1 },
            kcalMultiplier: 0.25,
          }
        : { share: DEFAULT_MEAL_SHARE, kcalMultiplier: 1 };
    case 'FOURTEEN_TEN':
    case null:
    case undefined:
    default:
      return { share: DEFAULT_MEAL_SHARE, kcalMultiplier: 1 };
  }
}
