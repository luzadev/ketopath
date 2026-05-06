// PRD §6 — sistema achievement: tassonomia ufficiale.
// Le `key` sono stabili: una volta esposte agli utenti non si rinominano. Per
// dismettere un achievement, lasciare la chiave qui (così il record storico
// continua a risolversi) e rimuoverla dal set "attivi".

export type AchievementKey =
  | 'first_weigh_in'
  | 'first_plan'
  | 'first_fast_complete'
  | 'ten_meals_consumed';

export interface AchievementDefinition {
  key: AchievementKey;
  /** Etichetta corta da mostrare nel badge. */
  title: string;
  /** Una riga di descrizione di cosa serve per sbloccarlo. */
  hint: string;
  /** Categoria visiva — utile per raggruppare in UI. */
  category: 'tracking' | 'plan' | 'fasting';
}

// Set ordinato per la visualizzazione in UI: i più "tutorial" prima.
export const ACHIEVEMENTS: ReadonlyArray<AchievementDefinition> = [
  {
    key: 'first_weigh_in',
    title: 'Prima pesata',
    hint: 'Hai registrato il tuo peso per la prima volta.',
    category: 'tracking',
  },
  {
    key: 'first_plan',
    title: 'Primo piano',
    hint: 'Hai generato il tuo primo piano settimanale.',
    category: 'plan',
  },
  {
    key: 'first_fast_complete',
    title: 'Primo digiuno completato',
    hint: 'Hai portato a termine la tua prima sessione di digiuno.',
    category: 'fasting',
  },
  {
    key: 'ten_meals_consumed',
    title: 'Dieci pasti spuntati',
    hint: 'Hai marcato come consumati 10 pasti dal tuo piano.',
    category: 'plan',
  },
];

export const ACHIEVEMENT_KEYS: ReadonlyArray<AchievementKey> = ACHIEVEMENTS.map((a) => a.key);

// Soglia singola per ten_meals_consumed — esposta come costante per l'eval.
export const TEN_MEALS_THRESHOLD = 10;
