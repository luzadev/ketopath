import { expect, test } from '@playwright/test';

function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1e6);
  return `e2e-profile-${ts}-${rand}@ketopath.test`;
}

test('profile flow — submit returns BMR/TDEE for the Michele PRD persona', async ({ page }) => {
  const email = uniqueEmail();
  const password = 'Password!123';
  const name = 'Michele E2E';

  // Sign-up gives us an authenticated session
  await page.goto('/sign-up');
  await page.getByLabel('Nome').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Crea account' }).click();
  await page.waitForURL('/');

  // Open profile from home — first time we'll be redirected through /welcome
  await page.getByRole('link', { name: 'Completa il tuo profilo' }).click();
  await page.waitForURL('/welcome');

  // Accept the medical disclaimer (3 mandatory checkboxes + submit)
  await page.getByLabel(/Confermo di essere maggiorenne/).check();
  await page.getByLabel(/Dichiaro di non avere condizioni mediche escludenti/).check();
  await page.getByLabel(/Accetto che KetoPath non sostituisce/).check();
  await page.getByRole('button', { name: 'Accetto e proseguo' }).click();
  await page.waitForURL('/profile');

  // Fill the form with the "Michele" PRD persona values
  await page.getByLabel('Età').fill('49');
  await page.getByLabel('Sesso').click();
  await page.getByRole('option', { name: 'Maschio' }).click();
  await page.getByLabel('Altezza (cm)').fill('170');
  await page.getByLabel('Peso iniziale (kg)').fill('76');
  await page.getByLabel('Peso attuale (kg)').fill('76');
  await page.getByLabel('Peso obiettivo (kg)').fill('70');
  await page.getByLabel('Livello di attività').click();
  await page.getByRole('option', { name: /Sedentario/ }).click();
  await page.getByRole('button', { name: 'Salva profilo' }).click();

  // BMR/TDEE summary panel becomes visible after a successful save
  await expect(page.getByText('Calcolo personalizzato')).toBeVisible();
  await expect(page.getByText('1583 kcal')).toBeVisible(); // BMR Michele
  await expect(page.getByText('1899 kcal')).toBeVisible(); // TDEE = 1582.5 × 1.2
});
