import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  // Make every public data request fail; bundled content and local writes must work.
  await page.route("https://**/*", (route) => route.abort());
  await page.goto("/");
});
test("offline expenses and receipts survive restart; encrypted restore is idempotent", async ({
  page,
}) => {
  await page.getByRole("button", { name: /旅行账本/ }).click();
  await page
    .getByRole("button", { name: "新增消费", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "记录消费" });
  await dialog.getByLabel("金额", { exact: true }).fill("42");
  await dialog.getByLabel("描述", { exact: true }).fill("离线午餐测试");
  await dialog
    .locator('input[type="file"]')
    .last()
    .setInputFiles({
      name: "receipt.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="green"/></svg>',
      ),
    });
  await dialog.getByRole("button", { name: "保存账目", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".expense-row")).toHaveCount(1);
  await expect(page.locator(".receipt-thumb")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /旅行账本/ }).click();
  await expect(page.locator(".expense-row")).toContainText("离线午餐测试");
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await page.getByRole("button", { name: "本地备份", exact: true }).click();
  const backup = page.getByRole("dialog", { name: "本地数据与备份" });
  await backup.getByLabel("备份密码（至少 8 位）").fill("test-password");
  await backup.getByLabel("导出时再次输入密码").fill("test-password");
  const download = page.waitForEvent("download");
  await backup.getByRole("button", { name: "导出加密完整备份" }).click();
  const file = await download;
  const path = await file.path();
  await backup.getByLabel("选择本应用的备份文件").setInputFiles(path!);
  await backup.getByRole("button", { name: "合并恢复，保留已有记录" }).click();
  await expect(backup.getByRole("status")).toContainText("跳过 1 笔");
  await backup.getByRole("button", { name: "关闭", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "删除账目" }).click();
  await expect(page.locator(".expense-row")).toHaveCount(0);
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await page.getByRole("button", { name: "本地备份", exact: true }).click();
  await backup.getByLabel("备份密码（至少 8 位）").fill("test-password");
  await backup.getByLabel("选择本应用的备份文件").setInputFiles(path!);
  await backup.getByRole("button", { name: "合并恢复，保留已有记录" }).click();
  await expect(backup.getByRole("status")).toContainText("新增 1 笔");
  await backup.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator(".expense-row")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/android-ledger.png",
    fullPage: true,
  });
});
test("catalogue favorites, language, theme and mobile layout persist", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Ignite 会议/ }).click();
  const bookmark = page
    .getByRole("button", { name: "收藏会议", exact: true })
    .first();
  await expect(bookmark).toBeVisible();
  await bookmark.click();
  await page.reload();
  await page.getByRole("button", { name: /Ignite 会议/ }).click();
  await page.getByRole("button", { name: "只看收藏" }).click();
  await expect(page.locator(".session-card")).toHaveCount(1);
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await page.getByRole("radio", { name: "深色", exact: true }).click();
  await page
    .getByRole("combobox", { name: "语言", exact: true })
    .selectOption("en");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/android-home-dark.png",
    fullPage: true,
  });
});

test("settings replace the breadcrumb and persist gallery choice and clock cities", async ({
  page,
}) => {
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置中心" });
  await expect(settings.getByRole("switch")).not.toBeChecked();
  await settings.getByRole("switch").check();
  await settings.getByLabel("时钟城市 2").selectOption("London");
  await settings.getByLabel("时钟城市 3").selectOption("Tokyo");
  await page.keyboard.press("Escape");
  await expect(settings).not.toBeVisible();
  await expect(page.locator(".clocks")).toContainText("伦敦");
  await expect(page.locator(".clocks")).toContainText("东京");
  await page.reload();
  await expect(page.locator(".clocks")).toContainText("伦敦");
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await expect(settings.getByRole("switch")).toBeChecked();
  await settings.getByRole("switch").uncheck();
  await settings.getByRole("radio", { name: "深色", exact: true }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#152019",
  );
  await settings.locator(".settings-content").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({
    path: "test-results/settings-dark.png",
    animations: "disabled",
  });
  await settings.getByRole("radio", { name: "浅色", exact: true }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#fbfcf9",
  );
  await settings.locator(".settings-content").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({
    path: "test-results/settings-light.png",
    animations: "disabled",
  });
  await settings.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".breadcrumb")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "主要功能" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-home-settings.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("automatic theme follows system changes and manual choices override it", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  const auto = page.getByRole("radio", { name: "自动", exact: true });
  await expect(auto).toBeChecked();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(auto).toBeChecked();
  await page.getByRole("radio", { name: "浅色", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await auto.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "test-results/automatic-theme-dark.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#fbfcf9",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "auto",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
