import { test, expect } from "@playwright/test";

test("Forgot Password", async ({ page }) => {
  await page.goto("https://practice.qabrains.com/forgot-password");

  await page.getByLabel("Email").fill("qa_testers@qabrains.com");
  await page.getByRole("button", { name: "Reset Passwsahord" }).click();
});
