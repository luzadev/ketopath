import { expect, test } from '@playwright/test';

test('home page renders Italian copy and CTAs', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/KetoPath/);
  await expect(page.getByRole('heading', { name: 'KetoPath' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inizia gratis' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Scopri come funziona' })).toBeVisible();
  await expect(page.getByText(/non sostituiscono il parere di un medico/)).toBeVisible();
});
