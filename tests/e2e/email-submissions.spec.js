import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import ts from 'typescript';

const reference = 'CH-HIRE-20261113-AABBCCDDEEFF';
const confirmation = { ok: true, reference, message: 'Your details have been sent to the recruitment team.' };
const invalidResponses = [
  ['invalid JSON', '{broken'],
  ['false success flag', { ...confirmation, ok: false }],
  ['nonboolean success flag', { ...confirmation, ok: 'false' }],
  ['missing reference', { ok: true, message: 'Received.' }],
  ['blank reference', { ...confirmation, reference: ' ' }],
  ['null JSON', null],
  ['empty response', undefined],
];

const flows = [
  { name: 'recruitment', form: '[data-recruitment-form]', status: '[data-form-status]', submit: '[data-submit-button]', success: '[data-form-status][data-state="success"]' },
  { name: 'temporary', form: '[data-temp-application-form]', status: '[data-temp-form-status]', submit: '[data-temp-submit]', success: '[data-temp-form-success]' },
  { name: 'application component', form: '[data-job-application-form]', status: '[data-job-form-status]', submit: '[data-job-submit]', success: '[data-job-form-success]' },
];

async function openForm(page, flow) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (flow.name === 'recruitment') {
    await page.goto('/recruit-talent/');
    await expect(page.locator(flow.form)).toHaveAttribute('data-ready', 'true');
  } else if (flow.name === 'temporary') {
    await page.goto('/jobs/');
    await expect(page.locator('[data-jobs-mode-switch]')).toHaveAttribute('data-ready', 'true');
    await page.locator('label:has(input[name="jobsMode"][value="temporary"])').click();
    await expect(page.locator('[data-temp-experience]')).toHaveAttribute('data-temp-ready', 'true');
  } else {
    // Sample vacancies deliberately have no form. Exercise the current component markup and handlers without publishing a test job.
    await page.goto('/404/');
    const source = readFileSync(new URL('../../src/components/JobApplicationForm.astro', import.meta.url), 'utf8');
    const markup = source.slice(source.indexOf('<section'), source.indexOf('<FormContactFallback'))
      .replace(/\{[^}]+\}/g, 'Audit');
    await page.setContent(`<style>[hidden]{display:none!important}</style>${markup}`);
    const helper = readFileSync(new URL('../../src/lib/formSubmission.ts', import.meta.url), 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    const compile = (input) => ts.transpileModule(input, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    await page.evaluate(({ helper, component }) => {
      const exports = {};
      new Function('exports', helper)(exports);
      new Function('exports', 'require', component)({}, () => exports);
      document.querySelector('[data-job-application]').removeAttribute('hidden');
    }, { helper: compile(helper), component: compile(script) });
  }
  const form = page.locator(flow.form);
  const values = {
    submitterName: 'Alex Recruiter', companyName: 'Test Hotel',
    name: 'Alex Candidate', email: 'alex@example.com', phone: '02000000000',
    country: 'UK', city: 'London', location: 'London', idealLocation: 'London',
    experience: 'Three years of hospitality experience.',
  };
  for (const [name, value] of Object.entries(values)) {
    const field = form.locator(`[name="${name}"]`);
    if (await field.count() && await field.isVisible()) await field.fill(value);
  }
  if (flow.name === 'recruitment') await form.locator('[name="jobTypes"]').first().locator('..').click();
  else if (flow.name === 'temporary') await form.locator('[name="roles"]').first().locator('..').click();
  else {
    await form.locator('[data-step-next]').first().click();
    await form.locator('[name="nationality"][value="British"]').check();
    await form.locator('[name="idealLocation"]').fill('London');
    await form.locator('[data-step-next]').last().click();
    await form.locator('[name="resume"]').setInputFiles({
      name: 'test-cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nTest CV'),
    });
  }
  await form.locator('[name="consent"]').check();
  return form;
}

for (const flow of flows) {
  test.describe(flow.name, () => {
    for (const [name, body] of invalidResponses) {
      test(`preserves details and never confirms ${name}`, async ({ page }) => {
        await page.route('**/api/**', (route) => route.fulfill({
          status: body === undefined ? 204 : 200,
          contentType: 'application/json',
          body: body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body),
        }));
        const form = await openForm(page, flow);
        await form.locator(flow.submit).click();
        await expect(page.locator(flow.status)).not.toHaveText('');
        await expect(form.locator(flow.submit)).toBeEnabled();
        await expect(page.locator(flow.success)).toBeHidden();
        await expect(form.locator('[name="email"]')).toHaveValue('alex@example.com');
        await expect(page.locator(flow.status)).not.toContainText('undefined');
        await expect(page.locator(flow.status)).not.toContainText('Cannot read');
      });
    }

    test('only resets after a validated acceptance', async ({ page }) => {
      await page.route('**/api/**', (route) => route.fulfill({ status: 202, json: confirmation }));
      const form = await openForm(page, flow);
      await form.locator(flow.submit).click();
      await expect(page.locator(flow.success)).toBeVisible();
      await expect(page.locator(flow.success)).toContainText(reference);
      await expect(form.locator('[name="email"]')).toHaveValue('');
    });

    test('renders accessible server errors and preserves other values and the selected CV', async ({ page }) => {
      await page.route('**/api/**', (route) => route.fulfill({
        status: 422, json: { ok: false, message: 'Check the highlighted fields.', errors: { email: 'This email needs attention.' } },
      }));
      const form = await openForm(page, flow);
      await form.locator(flow.submit).click();
      const email = form.locator('[name="email"]');
      await expect(email).toHaveAttribute('aria-invalid', 'true');
      await expect(email).toBeFocused();
      await expect(form.locator('[data-submission-error]')).toHaveText('This email needs attention.');
      await expect(email).toHaveAttribute('aria-describedby', /submission-error-/);
      if (flow.name === 'application component') {
        expect(await form.locator('[name="resume"]').evaluate((input) => input.files[0].name)).toBe('test-cv.pdf');
      }
      await email.fill('corrected@example.com');
      await expect(email).not.toHaveAttribute('aria-invalid');
      await expect(form.locator('[data-submission-error]')).toHaveCount(0);
    });

    test('keeps entered data on provider, configuration and network failures', async ({ page }) => {
      const form = await openForm(page, flow);
      for (const status of [502, 503, 504, 'network']) {
        await page.unroute('**/api/**');
        await page.route('**/api/**', (route) => status === 'network'
          ? route.abort('failed')
          : route.fulfill({ status, json: { ok: false, message: 'Contact the recruitment team before resubmitting.' } }));
        await form.locator(flow.submit).click();
        await expect(form.locator(flow.submit)).toBeEnabled();
        await expect(page.locator(flow.status)).toContainText(/contact the recruitment team/i);
        await expect(form.locator('[name="email"]')).toHaveValue('alex@example.com');
      }
    });

    test('prevents concurrent submit events while a response is pending', async ({ page }) => {
      let requests = 0;
      let release;
      const pending = new Promise((resolve) => { release = resolve; });
      await page.route('**/api/**', async (route) => {
        requests++;
        await pending;
        await route.fulfill({ status: 202, json: confirmation });
      });
      const form = await openForm(page, flow);
      await form.evaluate((element) => {
        element.requestSubmit();
        element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await expect(form.locator(flow.submit)).toBeDisabled();
      release();
      await expect(page.locator(flow.success)).toBeVisible();
      expect(requests).toBe(1);
    });

    test('releases a stalled submission with retained details and an uncertain-outcome warning', async ({ page }) => {
      await page.route('**/api/**', () => {});
      const form = await openForm(page, flow);
      await page.clock.install();
      await form.locator(flow.submit).click();
      await expect(form.locator(flow.submit)).toBeDisabled();
      await page.clock.fastForward(65_000);
      await expect(form.locator(flow.submit)).toBeEnabled();
      await expect(page.locator(flow.status)).toContainText('before resubmitting');
      await expect(form.locator('[name="email"]')).toHaveValue('alex@example.com');
      await expect(page.locator(flow.success)).toBeHidden();
    });
  });
}
