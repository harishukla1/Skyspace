import { expect, type Page } from '@playwright/test';

export const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';
export const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;
/** A valid, unused-looking Indian mobile number per run. */
export const phone = () => `9${String(Date.now()).slice(-9)}`;

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
