// PRD §5.2 — Aderenza al piano alimentare. Quota di pasti effettivamente
// consumati rispetto a quelli pianificati. Solo i giorni passati contano
// (non posso aderire a un futuro non ancora arrivato), e i free-meal sono
// auto-conteggiati come "rispettati" (l'utente li ha programmati lui).

export interface AdherenceSlot {
  dayOfWeek: number; // 0 = Lunedì
  consumed: boolean;
  isFreeMeal: boolean;
}

export interface AdherenceResult {
  pastSlots: number;
  consumedSlots: number;
  /** [0, 1]; 1 se non ci sono slot passati (default ottimistico). */
  rate: number;
}

/**
 * Calcola l'aderenza rispetto a uno specifico giorno di riferimento.
 *
 * @param slots tutti gli slot del piano corrente
 * @param weekStart inizio settimana (Mon 00:00)
 * @param now data corrente per cui calcolare il "passato"
 */
export function computeAdherence(
  slots: ReadonlyArray<AdherenceSlot>,
  weekStart: Date,
  now: Date = new Date(),
): AdherenceResult {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const elapsedMs = now.getTime() - weekStart.getTime();
  // dayOfWeek 0 = Lun. Un giorno è "passato" appena è iniziato.
  const lastPastDay = Math.min(6, Math.floor(elapsedMs / DAY_MS));
  if (lastPastDay < 0) {
    return { pastSlots: 0, consumedSlots: 0, rate: 1 };
  }
  const pastSlotsArr = slots.filter((s) => s.dayOfWeek <= lastPastDay);
  const consumedSlots = pastSlotsArr.filter((s) => s.isFreeMeal || s.consumed).length;
  if (pastSlotsArr.length === 0) {
    return { pastSlots: 0, consumedSlots: 0, rate: 1 };
  }
  return {
    pastSlots: pastSlotsArr.length,
    consumedSlots,
    rate: consumedSlots / pastSlotsArr.length,
  };
}
