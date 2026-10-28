import path from 'node:path';
import { expect, test } from '@playwright/test';
import { login, phone, unique } from './helpers';

/** Runs against the seeded development stack (see playwright.config.ts). */
test.describe.configure({ mode: 'serial' });

test('1. guest searches and views property details', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'City', exact: true }).selectOption('Mumbai');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/city=Mumbai/);
  await expect(page.getByText(/propert(y|ies) found/)).toBeVisible();
  const first = page.locator('article h3 a').first();
  const title = await first.textContent();
  await first.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title!.trim());
  await expect(page.getByRole('heading', { name: /Contact (owner|agent)/ })).toBeVisible();
});

test('2–4. customer registers, shortlists, enquires and requests a site visit', async ({ page }) => {
  const id = unique();
  await page.goto('/register');
  await page.getByLabel('Full name').fill('E2E Customer');
  await page.getByLabel('Email').fill(`e2e${id}@test.in`);
  await page.getByLabel('Mobile number').fill(phone());
  await page.getByLabel('Password').fill('Password123');
  await page.getByLabel(/I accept the/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/customer/);

  await page.goto('/buy');
  await page.locator('article h3 a').first().click();
  await page.getByRole('button', { name: 'Add to shortlist' }).first().click();
  await expect(page.getByText('Added to shortlist')).toBeVisible();

  await page.getByLabel('Message').fill('Is this property still available? Please call me.');
  await page.getByLabel(/I agree to be contacted/).check();
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText('Enquiry received.')).toBeVisible();

  const date = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel('Preferred date').fill(date);
  await page.getByLabel('Time (IST)').selectOption('11:00');
  await page.getByRole('button', { name: 'Request site visit' }).click();
  await expect(page.getByText('Visit requested — awaiting confirmation.')).toBeVisible();

  await page.goto('/customer/shortlist');
  await expect(page.locator('article')).toHaveCount(1);
  await page.goto('/customer/site-visits');
  await expect(page.getByRole('listitem').filter({ hasText: 'Pending Confirmation' })).toHaveCount(1);
});

test('5–7. owner submits a listing, admin approves, it becomes searchable', async ({ page, browser }) => {
  const title = `E2E Sea-view 2 BHK ${unique()}`;
  await login(page, 'owner@skyspace.test', 'Password@123');
  await page.goto('/owner/listings/new');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('textbox', { name: 'Address', exact: true }).fill('12, Marine Drive');
  await page.getByRole('textbox', { name: 'Locality', exact: true }).fill('Powai');
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Mumbai');
  await page.getByRole('combobox', { name: 'State', exact: true }).selectOption('Maharashtra');
  await page.getByRole('textbox', { name: 'PIN code', exact: true }).fill('400076');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('textbox', { name: 'Listing title', exact: true }).fill(title);
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Bright two-bedroom apartment with sea view, modular kitchen and covered parking.');
  await page.getByRole('spinbutton', { name: 'Bedrooms', exact: true }).fill('2');
  await page.getByRole('spinbutton', { name: 'Carpet area', exact: true }).fill('850');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('spinbutton', { name: 'Expected price (₹)', exact: true }).fill('18500000');
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.locator('input[type=file]').setInputFiles(path.resolve('e2e/fixtures/photo.png'));
  await expect(page.getByText('Cover')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(page.getByText('Pending Approval').first()).toBeVisible();

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, 'admin@skyspace.test', 'Admin@12345');
  await admin.goto('/admin/approvals');
  await admin.getByRole('link', { name: new RegExp(title) }).click();
  await admin.getByRole('button', { name: 'Approve & publish' }).click();
  await admin.getByRole('button', { name: 'Confirm' }).click();
  await expect(admin.getByText('Listing approved')).toBeVisible();

  await page.goto(`/search?q=${encodeURIComponent('Sea-view')}`);
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  await adminCtx.close();
});

test('8. agent sees and manages an assigned lead', async ({ page }) => {
  await login(page, 'riya.agent@skyspace.test', 'Password@123');
  await page.goto('/agent/leads');
  await page.locator('table a').first().click();
  await expect(page.getByRole('heading', { name: 'Follow-up notes' })).toBeVisible();
  await page.getByLabel('Add a note').fill('Spoke to the customer; sharing floor plan.');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('Note added')).toBeVisible();
});

test('9. admin suspends a user', async ({ page }) => {
  await login(page, 'admin@skyspace.test', 'Admin@12345');
  await page.goto('/admin/users');
  await page.getByLabel('Search').fill('E2E Customer');
  await page.getByRole('link', { name: /E2E Customer/ }).first().click();
  await page.getByRole('button', { name: 'Suspend' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Account status updated')).toBeVisible();
});

test('10. unauthorised users are blocked', async ({ page, request }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  await login(page, 'customer@skyspace.test', 'Password@123');
  await page.goto('/admin');
  await expect(page.getByText('You don’t have access to this area')).toBeVisible();
  const r = await request.get(`${process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1'}/admin/dashboard`);
  expect(r.status()).toBe(401);
});

test('responsive navigation works on mobile @mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Rent' }).click();
  await expect(page).toHaveURL(/\/rent/);
});
