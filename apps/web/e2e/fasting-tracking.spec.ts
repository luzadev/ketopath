import { expect, test, type Page } from '@playwright/test';

function uniqueEmail(prefix: string): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1e6);
  return `e2e-${prefix}-${ts}-${rand}@ketopath.test`;
}

async function signupOnboarded(page: Page, email: string): Promise<void> {
  const password = 'Password!123';
  await page.goto('/sign-up');
  await page.getByLabel('Come ti chiami').fill('FT E2E');
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
  await page.getByLabel('Età').fill('45');
  await page.getByLabel('Sesso').click();
  await page.getByRole('option', { name: 'Maschio' }).click();
  await page.getByLabel('Altezza (cm)').fill('175');
  await page.getByLabel('Iniziale').fill('80');
  await page.getByLabel('Attuale').fill('80');
  await page.getByLabel('Obiettivo').fill('75');
  await page.getByLabel('Livello di attività').click();
  await page.getByRole('option', { name: /Sedentario/ }).click();
  await page.getByRole('button', { name: 'Salva e continua' }).click();
  await page.getByRole('button', { name: 'Salva e continua' }).click();
}

test.describe('fasting flow', () => {
  test('start a 16:8 fast then abort it', async ({ page }) => {
    test.setTimeout(60_000);
    await signupOnboarded(page, uniqueEmail('fasting'));

    await page.goto('/fasting');
    // Default protocollo è 16:8 — clicca "Avvia digiuno"
    await page.getByRole('button', { name: 'Avvia digiuno' }).click();

    // Live timer dovrebbe apparire (00:00:0X)
    await expect(page.locator('text=/^\\d\\d:\\d\\d:\\d\\d$/').first()).toBeVisible();
    // Diario sintomi presente
    await expect(page.getByText('Come ti senti?')).toBeVisible();

    // Annulla la sessione (dialog confirm → accept)
    page.once('dialog', (d) => {
      void d.accept();
    });
    await page.getByRole('button', { name: 'Annulla sessione' }).click();
    // Dopo l'abort si torna alla schermata di avvio
    await expect(page.getByRole('button', { name: 'Avvia digiuno' })).toBeVisible();
  });
});

test.describe('weight tracking flow', () => {
  test('inserire una pesata + apparire nella history', async ({ page }) => {
    test.setTimeout(60_000);
    await signupOnboarded(page, uniqueEmail('tracking'));

    await page.goto('/tracking');

    // Form pesata
    await page.getByLabel('Peso (kg)').fill('80');
    await page.getByRole('button', { name: 'Registra', exact: true }).click();

    // "Peso attuale" + "80.0kg" appaiono nella history
    await expect(page.getByText('Peso attuale')).toBeVisible();
    await expect(page.getByText(/80\.0\s*kg/).first()).toBeVisible();
  });
});
