import { expect, test } from "@playwright/test";
import * as OTPAuth from "otpauth";
import { fillLogin, logoutIfNeeded } from "./helpers";

const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

function currentTotp(): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(DEMO_TOTP_SECRET),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  });
  return totp.generate();
}

test.describe.configure({ mode: "serial" });

test.describe("authenticated flows", () => {
  test.beforeEach(async ({ page }) => {
    await logoutIfNeeded(page);
  });

  test("business admin reaches admin home after TOTP", async ({ page }) => {
    await fillLogin(page, "admin@aact.test", "admin-passphrase");
    await page.getByRole("button", { name: /continuar/i }).click();

    await expect(page).toHaveURL(/\/login\/mfa/);
    await page.locator("#code").fill(currentTotp());
    await page.getByRole("button", { name: /confirmar/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /área administrativa/i })).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: /payouts/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /menu da conta|account menu/i }).click();
    await expect(
      page.getByRole("group", { name: /escolher idioma|choose language/i }),
    ).toBeVisible();
  });

  test("referrer logs in and sees portal + referral code", async ({ page }) => {
    await fillLogin(page, "referrer@aact.test", "referrer-passphrase");
    await page.getByRole("button", { name: /continuar/i }).click();

    await expect(page).toHaveURL(/\/portal/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /portal do referrer/i })).toBeVisible();
    await expect(page.getByText("REF-DEMOCODE01")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /pedidos? de payout/i }),
    ).toBeVisible();
  });
});
