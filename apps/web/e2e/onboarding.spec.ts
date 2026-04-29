import { expect, test } from '@playwright/test';

function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1e6);
  return `e2e-onboarding-${ts}-${rand}@ketopath.test`;
}

test.describe('onboarding flow', () => {
  test('signup → welcome → onboarding goal+profile → BMR/TDEE saved', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'Password!123';
    const name = 'Michele E2E';

    // Sign-up
    await page.goto('/sign-up');
    await page.getByLabel('Come ti chiami').fill(name);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Crea account' }).click();
    await page.waitForURL('/');

    // Apri "Profilo & calcoli" → redirige a /welcome (disclaimer)
    await page.getByRole('link', { name: 'Profilo & calcoli' }).click();
    await page.waitForURL('/welcome');

    // Disclaimer medico (3 checkbox + accetta)
    await page.getByText(/Confermo di essere maggiorenne/).click();
    await page.getByText(/Dichiaro di non avere condizioni mediche escludenti/).click();
    await page.getByText(/Accetto che KetoPath non sostituisce/).click();
    await page.getByRole('button', { name: 'Accetto e proseguo' }).click();

    // Welcome accept → /onboarding
    await page.waitForURL('/onboarding');

    // Step I: goal — scegli "Perdere peso"
    await page.getByRole('button', { name: /Perdere peso/ }).click();
    await page.getByRole('button', { name: 'Salva e continua' }).click();

    // Step II: profile (form Michele del PRD)
    await page.getByLabel('Età').fill('49');
    await page.getByLabel('Sesso').click();
    await page.getByRole('option', { name: 'Maschio' }).click();
    await page.getByLabel('Altezza (cm)').fill('170');
    await page.getByLabel('Iniziale').fill('76');
    await page.getByLabel('Attuale').fill('76');
    await page.getByLabel('Obiettivo').fill('70');
    await page.getByLabel('Livello di attività').click();
    await page.getByRole('option', { name: /Sedentario/ }).click();
    await page.getByRole('button', { name: 'Salva e continua' }).click();

    // Step III: condizioni mediche — niente da selezionare, vai avanti
    await page.getByRole('button', { name: 'Salva e continua' }).click();

    // Verifica che il profilo sia stato persistito visitando /profile
    await page.goto('/profile');
    await expect(page.getByText('Calcolo personalizzato')).toBeVisible();
    // BMR Michele Mifflin-St Jeor: 10*76 + 6.25*170 - 5*49 + 5 = 1582.5 → 1583
    await expect(page.getByText('1583', { exact: true })).toBeVisible();
    // TDEE = 1582.5 * 1.2 (sedentario) = 1899
    await expect(page.getByText('1899', { exact: true })).toBeVisible();
  });
});
