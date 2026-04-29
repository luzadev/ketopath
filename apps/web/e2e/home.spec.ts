import { expect, test } from '@playwright/test';

test('home page renders Italian copy and CTAs', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/KetoPath/);
  await expect(page.getByRole('heading', { name: /Una keto italiana, sostenibile/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Iscriviti' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Accedi' })).toBeVisible();
  await expect(page.getByText(/non sostituiscono il parere/)).toBeVisible();
});
