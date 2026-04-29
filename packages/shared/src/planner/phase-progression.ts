// PRD §5.1 — Reintroduzione progressiva degli alimenti in Fase 2.
//
// In Fase 2 (TRANSITION) alcuni ingredienti vengono reintrodotti gradualmente
// (legumi → cereali integrali → frutta più zuccherina). Ciascun `Ingredient`
// ha un `phase2Week` che indica la settimana minima di Fase 2 dalla quale
// è disponibile. NULL = sempre.

export interface IngredientPhase2 {
  phase2Week: number | null | undefined;
}

export function weeksSince(start: Date | string, now: Date = new Date()): number {
  const startMs = typeof start === 'string' ? new Date(start).getTime() : start.getTime();
  const elapsed = Math.max(0, now.getTime() - startMs);
  return Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Settimana corrente della Fase 2. 1 = prima settimana.
 * Se `phase2StartedAt` è null o nel futuro, ritorna 1.
 */
export function currentPhase2Week(phase2StartedAt: Date | string | null | undefined): number {
  if (!phase2StartedAt) return 1;
  return Math.max(1, weeksSince(phase2StartedAt) + 1);
}

/**
 * Vero se tutti gli ingredienti della ricetta sono disponibili nella
 * settimana di fase 2 corrente (o se non siamo in fase 2).
 *
 * Il filtro è hard: ricetta con almeno un ingrediente non ancora reintrodotto
 * viene esclusa. Per la Fase 1 (INTENSIVE) il filtro non si applica perché
 * `Recipe.phases` esclude già le ricette non keto-compatibili.
 */
export function isRecipeAllowedForPhaseWeek(
  ingredients: ReadonlyArray<IngredientPhase2>,
  phase: 1 | 2 | 3,
  weekInPhase: number,
): boolean {
  if (phase !== 2) return true;
  for (const i of ingredients) {
    if (i.phase2Week != null && i.phase2Week > weekInPhase) return false;
  }
  return true;
}

// PRD §5.1 — Compensazione per Free Meal in Fase 3.
//
// L'utente segna uno slot della settimana come "pasto libero" (es. cena al
// ristorante). Il free meal "pesa" un valore stimato (default 750 kcal) e
// gli altri pasti della settimana vengono ricalibrati per restare nel budget
// settimanale.

export const FREE_MEAL_DEFAULT_KCAL = 750;

/**
 * Spalma la differenza fra freeMealKcal e il target normale del pasto sui
 * pasti rimanenti della stessa settimana, fino a un limite di sicurezza.
 *
 *   delta = freeMealKcal − originalSlotKcal
 *   adjustment per pasto = clamp(delta / remainingSlots, -200, +50)
 *
 * Il negativo (riduzione) è limitato a 200 kcal/pasto per non rendere i
 * pasti troppo magri. La compensazione è morbida: il free meal *non* viene
 * mai compensato al 100% del suo extra.
 */
export function freeMealKcalAdjustment(args: {
  freeMealKcal: number;
  originalSlotKcal: number;
  remainingSlots: number;
}): number {
  const { freeMealKcal, originalSlotKcal, remainingSlots } = args;
  if (remainingSlots <= 0) return 0;
  const delta = freeMealKcal - originalSlotKcal;
  const perSlot = delta / remainingSlots;
  return Math.max(-200, Math.min(50, -perSlot));
}
