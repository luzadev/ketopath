// Seed minimo del catalogo ricette italiane keto/low-carb (PRD §5.1).
// 16 ricette distribuite su COLAZIONE/PRANZO/SPUNTINO/CENA, fasi 1/2/3.
// Macros stimati per porzione singola.
//
// Ogni ricetta dichiara una lista di `ingredients` con quantità e unità,
// usata dal seeder per creare i record `RecipeIngredient`. Il `name` deve
// corrispondere esattamente a un ingrediente di `seed-ingredients.ts`.

import type { Difficulty, MealCategory } from '@prisma/client';

export interface SeedRecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface SeedRecipe {
  name: string;
  category: MealCategory;
  description: string;
  prepMinutes: number;
  difficulty: Difficulty;
  kcal: number;
  proteinG: number;
  fatG: number;
  netCarbG: number;
  phases: number[];
  notesChef?: string;
  ingredients: SeedRecipeIngredient[];
}

export const SEED_RECIPES: SeedRecipe[] = [
  // COLAZIONE
  {
    name: 'Frittata di spinaci e parmigiano',
    category: 'COLAZIONE',
    description: 'Tre uova con spinaci saltati e parmigiano grattugiato.',
    prepMinutes: 10,
    difficulty: 'FACILE',
    kcal: 360,
    proteinG: 28,
    fatG: 26,
    netCarbG: 4,
    phases: [1, 2, 3],
    notesChef:
      'Cuoci la frittata a fuoco basso, coperta: la consistenza resta morbida e le uova non bruciano.',
    ingredients: [
      { name: 'Uova', quantity: 3, unit: 'pz' },
      { name: 'Spinaci freschi', quantity: 80, unit: 'g' },
      { name: 'Parmigiano Reggiano', quantity: 20, unit: 'g' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
    ],
  },
  {
    name: 'Yogurt greco con noci e cannella',
    category: 'COLAZIONE',
    description: 'Yogurt greco intero con un cucchiaio di noci tritate.',
    prepMinutes: 3,
    difficulty: 'FACILE',
    kcal: 320,
    proteinG: 18,
    fatG: 22,
    netCarbG: 8,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Yogurt greco intero', quantity: 200, unit: 'g' },
      { name: 'Noci', quantity: 20, unit: 'g' },
      { name: 'Cannella in polvere', quantity: 1, unit: 'cucchiaino' },
    ],
  },
  {
    name: 'Avocado toast keto su pane di mandorle',
    category: 'COLAZIONE',
    description: 'Mezzo avocado schiacciato su una fetta di pane proteico.',
    prepMinutes: 5,
    difficulty: 'FACILE',
    kcal: 380,
    proteinG: 12,
    fatG: 30,
    netCarbG: 6,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Avocado', quantity: 0.5, unit: 'pz' },
      { name: 'Pane proteico di mandorle', quantity: 40, unit: 'g' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
      { name: 'Limone', quantity: 0.25, unit: 'pz' },
    ],
  },
  {
    name: 'Uova strapazzate con pancetta',
    category: 'COLAZIONE',
    description: 'Due uova strapazzate al burro con pancetta croccante.',
    prepMinutes: 8,
    difficulty: 'FACILE',
    kcal: 410,
    proteinG: 24,
    fatG: 33,
    netCarbG: 2,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Uova', quantity: 2, unit: 'pz' },
      { name: 'Pancetta affumicata', quantity: 30, unit: 'g' },
      { name: 'Burro', quantity: 10, unit: 'g' },
    ],
  },
  // PRANZO
  {
    name: 'Insalata di pollo, avocado e pomodorini',
    category: 'PRANZO',
    description: 'Petto di pollo grigliato, avocado, pomodorini, olio EVO.',
    prepMinutes: 15,
    difficulty: 'FACILE',
    kcal: 540,
    proteinG: 38,
    fatG: 36,
    netCarbG: 9,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Petto di pollo', quantity: 130, unit: 'g' },
      { name: 'Avocado', quantity: 0.5, unit: 'pz' },
      { name: 'Pomodorini ciliegino', quantity: 100, unit: 'g' },
      { name: 'Insalata mista', quantity: 60, unit: 'g' },
      { name: 'Olio extravergine di oliva', quantity: 2, unit: 'cucchiaio' },
    ],
  },
  {
    name: 'Salmone al forno con asparagi',
    category: 'PRANZO',
    description: 'Filetto di salmone con asparagi al forno e limone.',
    prepMinutes: 20,
    difficulty: 'FACILE',
    kcal: 510,
    proteinG: 36,
    fatG: 35,
    netCarbG: 6,
    phases: [1, 2, 3],
    notesChef: 'Inforna a 200°C per 12-14 minuti, salmone con la pelle verso il basso.',
    ingredients: [
      { name: 'Filetto di salmone', quantity: 150, unit: 'g' },
      { name: 'Asparagi', quantity: 200, unit: 'g' },
      { name: 'Limone', quantity: 0.5, unit: 'pz' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
    ],
  },
  {
    name: 'Bistecca con zucchine grigliate',
    category: 'PRANZO',
    description: 'Tagliata di manzo con zucchine grigliate e olio EVO.',
    prepMinutes: 18,
    difficulty: 'MEDIA',
    kcal: 580,
    proteinG: 42,
    fatG: 38,
    netCarbG: 5,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Tagliata di manzo', quantity: 180, unit: 'g' },
      { name: 'Zucchine', quantity: 200, unit: 'g' },
      { name: 'Olio extravergine di oliva', quantity: 2, unit: 'cucchiaio' },
    ],
  },
  {
    name: 'Insalatona con tonno e olive',
    category: 'PRANZO',
    description: "Insalata mista, tonno sott'olio, olive nere, capperi.",
    prepMinutes: 10,
    difficulty: 'FACILE',
    kcal: 470,
    proteinG: 32,
    fatG: 32,
    netCarbG: 7,
    phases: [1, 2, 3],
    ingredients: [
      { name: "Tonno sott'olio", quantity: 120, unit: 'g' },
      { name: 'Insalata mista', quantity: 100, unit: 'g' },
      { name: 'Olive nere', quantity: 30, unit: 'g' },
      { name: 'Capperi sotto sale', quantity: 1, unit: 'cucchiaio' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
    ],
  },
  // SPUNTINO
  {
    name: 'Mandorle al naturale',
    category: 'SPUNTINO',
    description: 'Una manciata di mandorle (~25 g).',
    prepMinutes: 1,
    difficulty: 'FACILE',
    kcal: 150,
    proteinG: 5,
    fatG: 13,
    netCarbG: 3,
    phases: [1, 2, 3],
    ingredients: [{ name: 'Mandorle', quantity: 25, unit: 'g' }],
  },
  {
    name: 'Cubetti di parmigiano',
    category: 'SPUNTINO',
    description: '30 g di parmigiano stagionato 24 mesi.',
    prepMinutes: 1,
    difficulty: 'FACILE',
    kcal: 120,
    proteinG: 11,
    fatG: 8,
    netCarbG: 0,
    phases: [1, 2, 3],
    ingredients: [{ name: 'Parmigiano Reggiano', quantity: 30, unit: 'g' }],
  },
  {
    name: 'Olive verdi marinate',
    category: 'SPUNTINO',
    description: 'Una porzione di olive verdi (60 g) con erbe aromatiche.',
    prepMinutes: 1,
    difficulty: 'FACILE',
    kcal: 90,
    proteinG: 1,
    fatG: 9,
    netCarbG: 1,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Olive verdi', quantity: 60, unit: 'g' },
      { name: 'Olio extravergine di oliva', quantity: 0.5, unit: 'cucchiaio' },
    ],
  },
  {
    name: 'Cetrioli con hummus di zucchine',
    category: 'SPUNTINO',
    description: 'Cetrioli a bastoncino con hummus light di zucchine.',
    prepMinutes: 5,
    difficulty: 'FACILE',
    kcal: 110,
    proteinG: 3,
    fatG: 8,
    netCarbG: 5,
    phases: [2, 3],
    ingredients: [
      { name: 'Cetrioli', quantity: 100, unit: 'g' },
      { name: 'Zucchine', quantity: 60, unit: 'g' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
    ],
  },
  // CENA
  {
    name: 'Branzino al cartoccio con verdure',
    category: 'CENA',
    description: 'Branzino al cartoccio con zucchine, carote e pomodorini.',
    prepMinutes: 25,
    difficulty: 'MEDIA',
    kcal: 460,
    proteinG: 38,
    fatG: 28,
    netCarbG: 7,
    phases: [1, 2, 3],
    notesChef: 'Cottura 18-20 minuti a 190°C; il cartoccio mantiene il pesce umido.',
    ingredients: [
      { name: 'Branzino', quantity: 1, unit: 'pz' },
      { name: 'Zucchine', quantity: 100, unit: 'g' },
      { name: 'Carote', quantity: 60, unit: 'g' },
      { name: 'Pomodorini ciliegino', quantity: 80, unit: 'g' },
      { name: 'Limone', quantity: 0.5, unit: 'pz' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
    ],
  },
  {
    name: 'Polpette di pollo e ricotta',
    category: 'CENA',
    description: 'Polpette al forno con ricotta, basilico e parmigiano.',
    prepMinutes: 30,
    difficulty: 'MEDIA',
    kcal: 490,
    proteinG: 40,
    fatG: 32,
    netCarbG: 4,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Petto di pollo', quantity: 150, unit: 'g' },
      { name: 'Ricotta vaccina', quantity: 60, unit: 'g' },
      { name: 'Parmigiano Reggiano', quantity: 20, unit: 'g' },
      { name: 'Basilico fresco', quantity: 10, unit: 'g' },
      { name: 'Uova', quantity: 1, unit: 'pz' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
    ],
  },
  {
    name: 'Zuppa di cavolfiore e gorgonzola',
    category: 'CENA',
    description: 'Crema di cavolfiore con gorgonzola dolce DOP.',
    prepMinutes: 25,
    difficulty: 'FACILE',
    kcal: 420,
    proteinG: 18,
    fatG: 33,
    netCarbG: 9,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Cavolfiore', quantity: 250, unit: 'g' },
      { name: 'Gorgonzola dolce DOP', quantity: 60, unit: 'g' },
      { name: 'Burro', quantity: 10, unit: 'g' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
    ],
  },
  {
    name: 'Tagliata di manzo con rucola e grana',
    category: 'CENA',
    description: 'Tagliata di manzo su letto di rucola con scaglie di grana.',
    prepMinutes: 15,
    difficulty: 'MEDIA',
    kcal: 540,
    proteinG: 44,
    fatG: 36,
    netCarbG: 3,
    phases: [1, 2, 3],
    ingredients: [
      { name: 'Tagliata di manzo', quantity: 180, unit: 'g' },
      { name: 'Rucola', quantity: 60, unit: 'g' },
      { name: 'Grana Padano', quantity: 25, unit: 'g' },
      { name: 'Olio extravergine di oliva', quantity: 1, unit: 'cucchiaio' },
    ],
  },
];
