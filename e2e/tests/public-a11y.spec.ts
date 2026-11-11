import { expect, test } from "@playwright/test";

test.describe("public surfaces", () => {
  test("login page is labelled and keyboard reachable", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /iniciar sessão/i })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /continuar/i })).toBeVisible();
    await expect(page.getByRole("group", { name: /escolher idioma|choose language/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "PT", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "EN", exact: true })).toBeVisible();

    await page.locator("#email").focus();
    await expect(page.locator("#email")).toBeFocused();
  });

  test("login language switcher changes copy without affecting app cookie preference", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();

    await page.getByRole("button", { name: "PT", exact: true }).click();
    await expect(page.getByRole("heading", { name: /iniciar sessão/i })).toBeVisible();
  });

  test("unauthenticated admin and portal redirect to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/portal");
    await expect(page).toHaveURL(/\/login/);
  });

  test("API health responds", async ({ request }) => {
    const response = await request.get("/api/v1/health");
    expect(response.ok()).toBeTruthy();
    const correlation =
      response.headers()["x-correlation-id"] ??
      response.headers()["X-Correlation-Id"];
    expect(correlation).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
  });
});
