import { expect, type Page } from "@playwright/test";

export async function fillLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");

  await expect(emailInput).toBeVisible();
  await emailInput.click();
  await emailInput.fill("");
  await emailInput.pressSequentially(email, { delay: 15 });
  await expect(emailInput).toHaveValue(email);

  await passwordInput.click();
  await passwordInput.fill("");
  await passwordInput.pressSequentially(password, { delay: 15 });
  await expect(passwordInput).toHaveValue(password);
}

export async function logoutIfNeeded(page: Page): Promise<void> {
  await page.request.post("/api/v1/auth/logout").catch(() => undefined);
  await page.context().clearCookies();
}
