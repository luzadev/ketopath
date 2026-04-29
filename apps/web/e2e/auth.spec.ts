import { expect, test } from '@playwright/test';

function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1e6);
  return `e2e-${ts}-${rand}@ketopath.test`;
}

test.describe('email/password authentication', () => {
  test('sign-up, sign-out and sign-in restore the session', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'Password!123';
    const name = 'Utente E2E';

    // Sign up
    await page.goto('/sign-up');
    await page.getByLabel('Nome').fill(name);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Crea account' }).click();

    await page.waitForURL('/');
    await expect(page.getByText(`Accesso effettuato come ${name}`)).toBeVisible();

    // Sign out
    await page.getByRole('button', { name: 'Esci' }).click();
    await expect(page.getByRole('link', { name: 'Inizia gratis' })).toBeVisible();

    // Sign in with the same credentials
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Accedi', exact: true }).click();

    await page.waitForURL('/');
    await expect(page.getByText(`Accesso effettuato come ${name}`)).toBeVisible();
  });

  test('shows an error message on invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill('non-esiste@ketopath.test');
    await page.getByLabel('Password').fill('Password!123');
    await page.getByRole('button', { name: 'Accedi', exact: true }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });
});
