// PRD §14.3 — Condizioni mediche dichiarate dall'utente.
//
// Le condizioni "escludenti" bloccano l'uso autonomo dell'app: l'utente viene
// invitato a consultare un medico prima di proseguire. Le altre influenzano
// solo i parametri di calcolo.

export const MEDICAL_CONDITIONS = [
  // Adattabili
  'THYROID_HYPO', // ipotiroidismo: riduce BMR ~10%
  'DIABETES_T2', // diabete tipo 2: riduce velocità di chetoadattamento
  'IBS', // intestino irritabile: filtra alcuni alimenti irritanti
  'DYSLIPIDEMIA', // colesterolo/trigliceridi: monitorare profilo lipidico
  'HYPERTENSION', // ipertensione: attenzione al sodio
  'KIDNEY_ISSUES', // problemi renali: riduce target proteico
  'LIVER_ISSUES', // problemi epatici: monitorare proteine + alcol
  // Escludenti — bloccano l'app
  'PREGNANCY',
  'BREASTFEEDING',
  'DIABETES_T1',
  'EATING_DISORDER',
] as const;

export type MedicalCondition = (typeof MEDICAL_CONDITIONS)[number];

export const EXCLUDING_CONDITIONS: ReadonlySet<MedicalCondition> = new Set([
  'PREGNANCY',
  'BREASTFEEDING',
  'DIABETES_T1',
  'EATING_DISORDER',
]);

export function hasExcludingCondition(conditions: readonly string[]): boolean {
  return conditions.some((c) => EXCLUDING_CONDITIONS.has(c as MedicalCondition));
}

/**
 * Aggiusta il BMR per condizioni che lo influenzano.
 * - Ipotiroidismo non controllato: BMR scende ~10-15%. Usiamo -10% prudente.
 */
export function bmrAdjustmentForConditions(conditions: readonly string[]): number {
  let factor = 1;
  if (conditions.includes('THYROID_HYPO')) factor *= 0.9;
  return factor;
}

/**
 * Limite di proteine raccomandato (g/kg di peso corporeo) in base a condizioni.
 * - Reni compromessi → tetto 0.8 g/kg
 * - Fegato compromesso → tetto 1.0 g/kg
 * - Default keto → 1.5-1.8 g/kg (gestito altrove)
 */
export function proteinCeilingGPerKg(conditions: readonly string[]): number | null {
  if (conditions.includes('KIDNEY_ISSUES')) return 0.8;
  if (conditions.includes('LIVER_ISSUES')) return 1.0;
  return null;
}
