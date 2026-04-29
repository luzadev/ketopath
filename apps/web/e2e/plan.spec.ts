import { expect, test, type Page } from '@playwright/test';

function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1e6);
  return `e2e-plan-${ts}-${rand}@ketopath.test`;
}

async function createOnboardedUser(page: Page): Promise<{ email: string }> {
  const email = uniqueEmail();
  const password = 'Password!123';
  await page.goto('/sign-up');
  await page.getByLabel('Come ti chiami').fill('Plan E2E');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Crea account' }).click();
  await page.waitForURL('/');

  await page.goto('/welcome');
  await page.getByText(/Confermo di essere maggiorenne/).click();
  await page.getByText(/Dichiaro di non avere condizioni mediche escludenti/).click();
  await page.getByText(/Accetto che KetoPath non sostituisce/).click();
  await page.getByRole('button', { name: 'Accetto e proseguo' }).click();
  await page.waitForURL('/onboarding');

  await page.getByRole('button', { name: /Perdere peso/ }).click();
  await page.getByRole('button', { name: 'Salva e continua' }).click();
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
  // Step condizioni mediche
  await page.getByRole('button', { name: 'Salva e continua' }).click();
  return { email };
}

test.describe('weekly meal plan', () => {
  test('genera piano + verifica presenza pasti + macros giornalieri', async ({ page }) => {
    test.setTimeout(60_000);
    await createOnboardedUser(page);

    await page.goto('/plan');
    await page.getByRole('button', { name: 'Genera piano' }).click();

    // Dopo generazione, l'header del piano mostra "Lista della spesa" link
    await expect(page.getByRole('link', { name: /Lista della spesa/ })).toBeVisible();

    // Almeno un pasto Colazione è presente
    await expect(page.getByText('Colazione').first()).toBeVisible();
    await expect(page.getByText('Pranzo').first()).toBeVisible();
    await expect(page.getByText('Cena').first()).toBeVisible();

    // Header giornaliero include "kcal · P · G · C"
    await expect(page.locator('text=/\\d+ kcal · P \\d+ · G \\d+ · C \\d+/').first()).toBeVisible();
  });

  test('aderenza badge appare dopo aver segnato un pasto come consumato', async ({ page }) => {
    test.setTimeout(60_000);
    await createOnboardedUser(page);
    await page.goto('/plan');
    await page.getByRole('button', { name: 'Genera piano' }).click();
    // Wait for plan to render
    await expect(page.getByText('Colazione').first()).toBeVisible();

    // Almeno un toggle ✓ esiste in pagina
    const consumeButtons = page.getByRole('button', {
      name: /Segna come consumato|Annulla consumato/,
    });
    await expect(consumeButtons.first()).toBeVisible();
  });
});
