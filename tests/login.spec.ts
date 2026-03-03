import { test, expect } from "@playwright/test";

test("user can log in with email and password", async ({ page }) => {
  await page.goto("https://practice.qabrains.com/");

  await page.getByLabel("Email").fill("qa_testers@qabrains.com");
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/.*dashboard/);
});
