// PRD §5.1 — Calcolo dinamico del deficit calorico.
//
// 1 kg di tessuto adiposo ≈ 7700 kcal (regola classica). Quindi un calo di
// `r` kg/settimana richiede un deficit medio di r × 7700 / 7 kcal/giorno.
//
// Limiti di sicurezza:
//   - max deficit ≤ 30% del TDEE (linee guida Schoenfeld 2014)
//   - max calo ≤ 1% peso corporeo / settimana (raccomandazione Helms 2014)
// Se l'utente chiede oltre, capiamo il deficit e segnaliamo.

const KCAL_PER_KG_FAT = 7700;
const SAFE_DEFICIT_PCT = 0.3; // 30% TDEE
const SAFE_LOSS_PCT_BODYWEIGHT = 0.01; // 1% peso/settimana

export interface DeficitInput {
  tdee: number; // kcal/giorno
  weightCurrentKg: number;
  /**
   * Velocità desiderata di calo peso, kg/settimana. Se omessa, usiamo
   * il fallback per fase passato dal chiamante (default 0.5 kg/wk per LOSE).
   */
  targetWeeklyLossKg?: number | null;
  /** 1=intensiva, 2=transizione, 3=mantenimento. */
  phase: 1 | 2 | 3;
}

export interface DeficitResult {
  /** kcal/giorno target. */
  kcalTarget: number;
  /** kg/settimana effettivamente raggiungibili col target. */
  effectiveWeeklyLossKg: number;
  /** True se il calo richiesto era oltre i limiti di sicurezza. */
  cappedToSafe: boolean;
}

export function computeDailyKcalTarget(input: DeficitInput): DeficitResult {
  const { tdee, weightCurrentKg, targetWeeklyLossKg, phase } = input;

  // Fase 3 (mantenimento) → eat at TDEE.
  if (phase === 3) {
    return { kcalTarget: Math.round(tdee), effectiveWeeklyLossKg: 0, cappedToSafe: false };
  }

  // Fase 2 (transizione) → reverse dieting morbido.
  if (phase === 2) {
    return {
      kcalTarget: Math.round(tdee - 200),
      effectiveWeeklyLossKg: Math.max(0, 200 / (KCAL_PER_KG_FAT / 7)),
      cappedToSafe: false,
    };
  }

  // Fase 1 (intensiva): deficit derivato da targetWeeklyLossKg, con caps.
  const requested = targetWeeklyLossKg ?? 0.5;
  const safeMaxByWeight = weightCurrentKg * SAFE_LOSS_PCT_BODYWEIGHT;
  const cappedRate = Math.min(requested, safeMaxByWeight);

  let dailyDeficit = (cappedRate * KCAL_PER_KG_FAT) / 7;
  const maxDeficitByTdee = tdee * SAFE_DEFICIT_PCT;
  const finalDeficit = Math.min(dailyDeficit, maxDeficitByTdee);
  dailyDeficit = finalDeficit;

  const cappedToSafe =
    requested > safeMaxByWeight || (cappedRate * KCAL_PER_KG_FAT) / 7 > maxDeficitByTdee;

  return {
    kcalTarget: Math.round(tdee - dailyDeficit),
    effectiveWeeklyLossKg: Number(((dailyDeficit * 7) / KCAL_PER_KG_FAT).toFixed(2)),
    cappedToSafe,
  };
}
