import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  // Make every public data request fail; bundled content and local writes must work.
  await page.route("https://**/*", (route) => route.abort());
  await page.goto("/");
  await page.getByLabel("设置密码", { exact: true }).fill("2468");
  await page.getByLabel("再次输入密码", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "设置密码并继续" }).click();
  const welcome = page.getByRole("dialog", { name: "欢迎使用「湾区随行」" });
  await welcome.getByRole("checkbox", { name: "不再显示" }).check();
  await welcome.getByRole("button", { name: "开始使用" }).click();
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
  await expect(backup.getByLabel("验证应用密码")).toHaveAttribute(
    "inputmode",
    "numeric",
  );
  await backup.getByLabel("验证应用密码").fill("0000");
  await backup.getByRole("button", { name: "导出加密完整备份" }).click();
  await expect(backup.getByRole("status")).toContainText("密码不正确");
  await backup.getByLabel("验证应用密码").fill("2468");
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
  await expect(backup.getByLabel("验证应用密码")).toHaveCount(0);
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
  // The icon changes only after the asynchronous local write succeeds.
  await expect(
    page.getByRole("button", { name: "取消收藏", exact: true }),
  ).toBeVisible();
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
  await expect(settings.getByRole("switch")).toBeChecked();
  await settings.getByRole("switch").uncheck();
  await settings.getByLabel("时钟城市 2").selectOption("London");
  await settings.getByLabel("时钟城市 3").selectOption("Tokyo");
  await page.keyboard.press("Escape");
  await expect(settings).not.toBeVisible();
  await expect(page.locator(".clocks")).toContainText("伦敦");
  await expect(page.locator(".clocks")).toContainText("东京");
  await page.reload();
  await expect(page.locator(".clocks")).toContainText("伦敦");
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await expect(settings.getByRole("switch")).not.toBeChecked();
  await settings.getByRole("switch").check();
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

test("introduction repeats until opted out and can be reopened from settings", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.removeItem("sfo-welcome-dismissed:v1"),
  );
  await page.reload();
  const welcome = page.getByRole("dialog", { name: "欢迎使用「湾区随行」" });
  const choice = welcome.getByRole("checkbox", { name: "不再显示" });
  const start = welcome.getByRole("button", { name: "开始使用" });
  await expect(choice).not.toBeChecked();
  await expect(welcome.getByRole("link")).toHaveAttribute(
    "href",
    "https://github.com/HeathHuang-7243/SFO-TRAVEL-APP",
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(start).toBeInViewport();
  await page.screenshot({ path: "test-results/welcome-small-light.png" });
  await start.click();
  await page.reload();
  await expect(choice).not.toBeChecked();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(start).toBeInViewport();
  await page.screenshot({ path: "test-results/welcome-small-dark.png" });
  await choice.check();
  await start.click();
  await page.reload();
  await expect(page.locator(".app main")).toBeVisible();
  await expect(welcome).not.toBeVisible();
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "问题反馈 · GitHub Issues" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/HeathHuang-7243/SFO-TRAVEL-APP/issues/new/choose",
  );
  await page.getByRole("button", { name: "关于应用 · 使用说明" }).click();
  await expect(choice).toBeChecked();
  await choice.uncheck();
  await start.click();
  await page.reload();
  await expect(choice).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(welcome).not.toBeVisible();
});

test("update settings handle offline checks, no release and a verified newer APK", async ({
  page,
}) => {
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  const section = page.locator(".update-section");
  const check = section.getByRole("button", { name: "检查更新" });
  await check.click();
  await expect(section.getByRole("status")).toContainText("检查更新失败");
  const api =
    "https://api.github.com/repos/HeathHuang-7243/SFO-TRAVEL-APP/releases/latest";
  await page.route(api, (route) => route.fulfill({ status: 404, json: {} }));
  await check.click();
  await expect(section.getByRole("status")).toContainText(
    "暂时没有更新的正式版本",
  );
  await page.route(api, (route) =>
    route.fulfill({
      json: {
        tag_name: "v99.0.0",
        body: "改进更新体验",
        assets: [
          {
            name: "SFOBusinessTravel-v99.0.0.apk",
            browser_download_url:
              "https://github.com/HeathHuang-7243/SFO-TRAVEL-APP/releases/download/v99.0.0/SFOBusinessTravel-v99.0.0.apk",
            digest: "sha256:" + "a".repeat(64),
            size: 30000000,
          },
        ],
      },
    }),
  );
  await check.click();
  await expect(section).toContainText("发现新版本 99.0.0");
  await expect(section.getByRole("link", { name: "下载 APK" })).toHaveAttribute(
    "href",
    /SFOBusinessTravel-v99\.0\.0\.apk$/,
  );
});

test("update password gate preserves expenses on wrong passwords and supports password changes", async ({
  page,
}) => {
  await page.getByRole("button", { name: /旅行账本/ }).click();
  await page
    .getByRole("button", { name: "新增消费", exact: true })
    .first()
    .click();
  const expense = page.getByRole("dialog", { name: "记录消费" });
  await expense.getByLabel("金额", { exact: true }).fill("88");
  await expense.getByLabel("描述", { exact: true }).fill("密码升级保留测试");
  await expense.getByRole("button", { name: "保存账目", exact: true }).click();
  await expect(page.locator(".expense-row")).toHaveCount(1);
  async function simulateUpdate() {
    await page.evaluate(() => {
      const key = "sfo-access-lock:v1",
        record = JSON.parse(localStorage.getItem(key)!);
      record.approvedVersion = "previous-version";
      localStorage.setItem(key, JSON.stringify(record));
    });
    await page.reload();
    await expect(
      page.locator('.access-form[data-access-mode="unlock"]'),
    ).toBeVisible();
    await expect(page.locator(".app main")).toHaveCount(0);
  }
  await simulateUpdate();
  await page.getByLabel("密码", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "解锁并继续" }).click();
  await expect(page.getByRole("alert")).toContainText("记录没有被删除");
  await expect(page.locator(".app main")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/password-wrong-preserves-records.png",
  });
  await page.getByLabel("密码", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "解锁并继续" }).click();
  await page.getByRole("button", { name: /旅行账本/ }).click();
  await expect(page.locator(".expense-row")).toContainText("密码升级保留测试");
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await page.getByRole("button", { name: "修改密码", exact: true }).click();
  await page.getByLabel("当前密码", { exact: true }).fill("2468");
  await expect(page.getByLabel("新密码", { exact: true })).toHaveAttribute(
    "inputmode",
    "numeric",
  );
  await page.getByRole("checkbox", { name: "字母 / 符号键盘" }).check();
  await expect(page.getByLabel("新密码", { exact: true })).toHaveAttribute(
    "inputmode",
    "text",
  );
  await expect(page.getByLabel("当前密码", { exact: true })).toHaveValue(
    "2468",
  );
  await page.getByLabel("新密码", { exact: true }).fill("Ab09!");
  await page.getByLabel("再次输入新密码", { exact: true }).fill("Ab09!");
  await page.getByRole("button", { name: "保存新密码" }).click();
  await expect(page.locator(".password-settings [role=status]")).toContainText(
    "密码已修改",
  );
  await simulateUpdate();
  await page.getByLabel("密码", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "解锁并继续" }).click();
  await expect(page.getByRole("alert")).toContainText("密码不正确");
  await expect(page.getByLabel("密码", { exact: true })).toHaveAttribute(
    "inputmode",
    "numeric",
  );
  await page.getByRole("checkbox", { name: "字母 / 符号键盘" }).check();
  await page.getByLabel("密码", { exact: true }).fill("Ab09!");
  await page.getByRole("button", { name: "解锁并继续" }).click();
  await expect(page.locator(".app main")).toBeVisible();
  await page.reload();
  await expect(page.locator(".app main")).toBeVisible();
  await expect(page.locator(".access-form")).toHaveCount(0);
  await page.getByRole("button", { name: /旅行账本/ }).click();
  await expect(page.locator(".expense-row")).toContainText("密码升级保留测试");
});

test("one password exports backups and older passwords remain usable only for older files", async ({
  page,
}) => {
  async function settings() {
    await page.getByRole("button", { name: "设置中心", exact: true }).click();
  }
  async function openBackup() {
    await settings();
    await page.getByRole("button", { name: "本地备份", exact: true }).click();
    return page.getByRole("dialog", { name: "本地数据与备份" });
  }
  let backup = await openBackup();
  await expect(backup.locator('input[type="password"]')).toHaveCount(0);
  const firstDownload = page.waitForEvent("download");
  await backup.getByRole("button", { name: "导出加密完整备份" }).click();
  const oldFile = await (await firstDownload).path();
  await backup.getByRole("button", { name: "关闭", exact: true }).click();
  await settings();
  await page.getByRole("button", { name: "修改密码", exact: true }).click();
  await page.getByLabel("当前密码", { exact: true }).fill("0000");
  await page.getByLabel("新密码", { exact: true }).fill("9753");
  await page.getByLabel("再次输入新密码", { exact: true }).fill("9753");
  await page.getByRole("button", { name: "保存新密码" }).click();
  await expect(page.getByRole("alert")).toContainText("密码不正确");
  await page.getByLabel("当前密码", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "保存新密码" }).click();
  await expect(page.locator(".password-settings [role=status]")).toContainText(
    "密码已修改",
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  backup = await openBackup();
  await expect(backup.locator('input[type="password"]')).toHaveCount(0);
  const nextDownload = page.waitForEvent("download");
  await backup.getByRole("button", { name: "导出加密完整备份" }).click();
  const newFile = await (await nextDownload).path();
  await backup.getByLabel("选择本应用的备份文件").setInputFiles(oldFile!);
  await backup.getByRole("button", { name: "合并恢复，保留已有记录" }).click();
  await expect(backup.getByRole("status")).toContainText(
    "当前应用密码无法打开",
  );
  await backup.getByLabel("使用旧备份的密码", { exact: true }).check();
  await backup.getByLabel("旧备份密码", { exact: true }).fill("2468");
  await backup.getByRole("button", { name: "合并恢复，保留已有记录" }).click();
  await expect(backup.getByRole("status")).toContainText("恢复完成");
  await backup.getByLabel("使用旧备份的密码", { exact: true }).uncheck();
  await backup.getByLabel("选择本应用的备份文件").setInputFiles(newFile!);
  await backup.getByRole("button", { name: "合并恢复，保留已有记录" }).click();
  await expect(backup.getByRole("status")).toContainText("恢复完成");
  await page.screenshot({
    path: "test-results/unified-password-backup.png",
    fullPage: true,
  });
});

test("startup language switches preserve inputs and sync introduction, app settings and future unlocks", async ({
  page,
}) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("设置密码", { exact: true }).fill("2468");
  await page.getByLabel("再次输入密码", { exact: true }).fill("0000");
  await page.getByRole("button", { name: "设置密码并继续" }).click();
  await expect(page.getByRole("alert")).toContainText("两次输入的密码不一致");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The passwords do not match",
  );
  await expect(page.getByLabel("Set password", { exact: true })).toHaveValue(
    "2468",
  );
  await page.getByLabel("Repeat password", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "Set password and continue" }).click();
  const welcome = page.getByRole("dialog");
  await expect(welcome).toHaveAccessibleName("Welcome to Bay Companion");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.setViewportSize({ width: 320, height: 568 });
  await welcome.getByRole("checkbox", { name: "Don’t show again" }).check();
  await welcome.getByRole("link").scrollIntoViewIfNeeded();
  await expect(
    welcome.getByRole("button", { name: "中文", exact: true }),
  ).toBeInViewport();
  await welcome.getByRole("button", { name: "中文", exact: true }).click();
  await expect(welcome).toHaveAccessibleName("欢迎使用「湾区随行」");
  await expect(
    welcome.getByRole("checkbox", { name: "不再显示" }),
  ).toBeChecked();
  await welcome.locator(".welcome-content").evaluate((element) => {
    element.scrollTop = 0;
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/startup-language-welcome.png" });
  await welcome.getByRole("button", { name: "开始使用" }).click();
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "语言", exact: true }),
  ).toHaveValue("zh");
  await page
    .getByRole("combobox", { name: "语言", exact: true })
    .selectOption("en");
  await page
    .getByRole("button", { name: "About this app · Introduction" })
    .click();
  await expect(welcome).toHaveAccessibleName("Welcome to Bay Companion");
  await expect(
    welcome.getByRole("button", { name: "English", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await welcome.getByRole("button", { name: "Close introduction" }).click();
  await page.evaluate(() => {
    const key = "sfo-access-lock:v1",
      record = JSON.parse(localStorage.getItem(key)!);
    record.approvedVersion = "previous-version";
    localStorage.setItem(key, JSON.stringify(record));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Enter your password to continue" }),
  ).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("0000");
  await page.getByRole("button", { name: "Unlock and continue" }).click();
  await expect(page.getByRole("alert")).toContainText("Incorrect password");
  await page.getByLabel("Password", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue("2468");
  await expect(page.getByRole("alert")).toContainText("密码不正确");
  await page.getByRole("button", { name: "解锁并继续" }).click();
  await expect(page.locator(".app main")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "设置中心", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "语言", exact: true }),
  ).toHaveValue("zh");
});

test("English device can choose Chinese before setting a password and keep it after restart", async ({
  browser,
}) => {
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width: 320, height: 568 },
    colorScheme: "dark",
  });
  try {
    const first = await context.newPage();
    await first.route("https://**/*", (route) => route.abort());
    await first.goto("/");
    await expect(
      first.getByRole("heading", { name: "Set an unlock password" }),
    ).toBeVisible();
    await first.screenshot({
      path: "test-results/startup-language-password-dark.png",
    });
    expect(
      await first.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await first.getByRole("button", { name: "中文", exact: true }).click();
    await first.reload();
    await expect(
      first.getByRole("heading", { name: "设置解锁密码" }),
    ).toBeVisible();
    await expect(first.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(
      first.getByRole("button", { name: "中文", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await context.close();
  }
});
