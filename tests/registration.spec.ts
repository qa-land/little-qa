import { test, expect } from "@playwright/test";

test("Registration", async ({ page }) => {
  await page.goto("https://practice.qabrains.com/registration");

  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Country").selectOption("Canada");
  await page.getByLabel("Account Type").selectOption("Engineer");
  await page.getByLabel("Email").fill("qa_testers@qabrains.com");
  await page.getByLabel("Password", { exact: true }).fill("Password566123");
  await page.getByLabel("Confirm Password").fill("Password566123");
  await page.getByRole("button", { name: "Sign Up" }).click();
});
