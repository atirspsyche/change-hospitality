import { expect, test } from '@playwright/test';

test.describe('form contact guidance without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('temporary candidates can reach email support instead of an inactive mode switch', async ({ page }) => {
    await page.goto('/jobs/');
    const guidance = page.locator('[data-form-contact-fallback]');
    await expect(guidance).toBeVisible();
    await expect(guidance).toContainText('To apply for temporary work, enable JavaScript or email');
    await expect(guidance.getByRole('link')).toHaveAttribute('href', 'mailto:info@changehospitality.co.uk');
    await expect(page.locator('[data-jobs-mode-switch]')).toBeHidden();
    await expect(page.locator('[data-job-listings]')).toBeVisible();
  });

  test('recruiters see email guidance rather than a form that cannot submit JSON', async ({ page }) => {
    await page.goto('/recruit-talent/');
    const guidance = page.locator('[data-form-contact-fallback]');
    await expect(guidance).toBeVisible();
    await expect(guidance).toContainText('To send a staffing brief, enable JavaScript or email');
    await expect(guidance.getByRole('link')).toHaveAttribute('href', /^mailto:[^@\s]+@[^@\s]+$/);
    await expect(page.locator('[data-recruitment-form]')).toBeHidden();
    await expect(page.locator('.recruit-form-wrap')).toHaveCSS('opacity', '1');
  });
});

test('JavaScript-enabled forms and mode controls keep their normal presentation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/recruit-talent/');
  await expect(page.locator('[data-recruitment-form]')).toBeVisible();
  await expect(page.locator('[data-recruitment-form]')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('[data-form-contact-fallback]')).toHaveCount(0);
  await page.goto('/jobs/');
  await expect(page.locator('[data-jobs-mode-switch]')).toBeVisible();
  await expect(page.locator('[data-form-contact-fallback]')).toHaveCount(0);
});
