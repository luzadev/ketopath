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
  await page.getByLabel('Come ti chiami').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Crea account' }).click();
  await page.waitForURL('/');

  // Open profile from home — first time we'll be redirected through /welcome
  await page.getByRole('link', { name: 'Profilo & calcoli' }).click();
  await page.waitForURL('/welcome');

  // Accept the medical disclaimer (3 mandatory checkboxes + submit)
  await page.getByText(/Confermo di essere maggiorenne/).click();
  await page.getByText(/Dichiaro di non avere condizioni mediche escludenti/).click();
  await page.getByText(/Accetto che KetoPath non sostituisce/).click();
  await page.getByRole('button', { name: 'Accetto e proseguo' }).click();
  await page.waitForURL('/profile');

  // Fill the form with the "Michele" PRD persona values
  await page.getByLabel('Età').fill('49');
  await page.getByLabel('Sesso').click();
  await page.getByRole('option', { name: 'Maschio' }).click();
  await page.getByLabel('Altezza (cm)').fill('170');
  await page.getByLabel('Iniziale').fill('76');
  await page.getByLabel('Attuale').fill('76');
  await page.getByLabel('Obiettivo').fill('70');
  await page.getByLabel('Livello di attività').click();
  await page.getByRole('option', { name: /Sedentario/ }).click();
  await page.getByRole('button', { name: 'Salva profilo' }).click();

  // BMR/TDEE summary panel becomes visible after a successful save
  await expect(page.getByText('Calcolo personalizzato')).toBeVisible();
  // Numbers are rendered in monospace next to a separate "kcal" unit span,
  // so check for the bare numeric values.
  await expect(page.getByText('1583', { exact: true })).toBeVisible();
  await expect(page.getByText('1899', { exact: true })).toBeVisible();
});
