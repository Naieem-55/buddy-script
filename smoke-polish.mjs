import { chromium } from "playwright";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// wait for server
for (let i = 0; i < 30; i++) {
  try {
    const r = await fetch(base + "/login");
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

await page.goto(base + "/login");
await page.fill('input[type="email"]', "karim@buddy.dev");
await page.fill('input[type="password"]', "Password123");
await page.click('button[type="submit"]');
await page.waitForURL("**/feed", { timeout: 15000 });
await page.waitForSelector("._feed_inner_timeline_post_area", { timeout: 15000 });
await page.waitForTimeout(1500);

// hover a post card to show elevation
await page.hover("._feed_inner_timeline_post_area");
await page.screenshot({ path: "smoke-feed-polish.png", fullPage: false });

// open likers modal
const reactsBtn = page.locator("._feed_inner_timeline_total_reacts_image").first();
if (await reactsBtn.count()) {
  await reactsBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "smoke-likers-polish.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const modalGone = (await page.locator(".bs-modal-overlay").count()) === 0;
  console.log("esc-closes-modal:", modalGone);
}

console.log("console-errors:", errors.length, errors.slice(0, 5));
await browser.close();
