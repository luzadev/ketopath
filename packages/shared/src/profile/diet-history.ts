// PRD §5.1 — Adattamento metabolico da diete restrittive precedenti.
//
// Riferimenti: Fothergill 2016 (Biggest Loser, BMR ~500 kcal sotto la
// previsione 6 anni dopo), Rosenbaum 2008. Le persone con storia di diete
// pesanti hanno BMR misurato 5-15% sotto Mifflin/Katch — applichiamo un
// moltiplicatore conservativo per non spingere il deficit oltre il dovuto.

export const DIET_HISTORIES = ['NONE', 'SOME', 'EXTENSIVE', 'SEVERE'] as const;
export type DietHistory = (typeof DIET_HISTORIES)[number];

export function bmrAdjustForDietHistory(history: DietHistory | null | undefined): number {
  switch (history) {
    case 'SOME':
      return 0.97; // 1-2 diete blande negli ultimi 3 anni
    case 'EXTENSIVE':
      return 0.93; // diete frequenti / yo-yo conclamato
    case 'SEVERE':
      return 0.85; // semi-fame prolungata, ricoveri, anoressia in remissione
    case 'NONE':
    case null:
    case undefined:
    default:
      return 1;
  }
}
