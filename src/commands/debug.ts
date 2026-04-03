import { Command } from "commander";
import { BrowserManager } from "../core/browser-manager.js";
import { PageOps } from "../core/page-ops.js";
import { writeFileSync } from "node:fs";

export const debugCommand = new Command("debug")
  .description("Debug: take screenshot and dump page structure")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("-p, --page <type>", "Page to debug: community, classroom, members", "community")
  .action(async (opts) => {
    const browser = new BrowserManager();
    const ops = new PageOps(browser);
    try {
      const pageType = opts.page as string;
      if (pageType === "classroom") {
        await ops.gotoClassroom(opts.group);
      } else if (pageType === "classroom-course") {
        await ops.gotoClassroom(opts.group);
        const p = await browser.getPage();
        // Click first course card
        const courseCard = p.getByText("Fundamentos de IA y Claude", { exact: false });
        await courseCard.first().click();
        await p.waitForTimeout(3000);
      } else if (pageType === "classroom-module") {
        await ops.gotoClassroom(opts.group);
        const p = await browser.getPage();
        const courseCard = p.getByText("Fundamentos de IA y Claude", { exact: false });
        await courseCard.first().click();
        await p.waitForTimeout(3000);
        // Click the module to expand it
        const mod = p.locator('div[class*="MenuItemTitle"]').filter({ hasText: "Fundamentos de IA" }).first();
        await mod.click();
        await p.waitForTimeout(2000);
        // Screenshot after expanding
        await p.screenshot({ path: "/tmp/skool-debug-module-expanded.png", fullPage: false });
        console.log("Module expanded screenshot: /tmp/skool-debug-module-expanded.png");
      } else if (pageType === "classroom-hover") {
        await ops.gotoClassroom(opts.group);
        const p = await browser.getPage();
        const courseCard = p.getByText("Fundamentos de IA y Claude", { exact: false });
        await courseCard.first().click();
        await p.waitForTimeout(3000);
        // Hover over "Fundamentos de IA" module
        const mod = p.locator('div[class*="MenuItemWrapper"]').filter({ hasText: "Fundamentos de IA" }).first();
        await mod.hover();
        await p.waitForTimeout(1000);
        // Take screenshot after hover
        await p.screenshot({ path: "/tmp/skool-debug-hover.png", fullPage: false });
        console.log("Hover screenshot: /tmp/skool-debug-hover.png");
        // Now right-click the module
        await mod.click({ button: "right" });
        await p.waitForTimeout(1000);
        await p.screenshot({ path: "/tmp/skool-debug-rightclick.png", fullPage: false });
        console.log("Right-click screenshot: /tmp/skool-debug-rightclick.png");
      } else if (pageType === "members") {
        await ops.gotoMembers(opts.group);
      } else {
        await ops.gotoCommunity(opts.group);
      }

      const page = await browser.getPage();

      // If community, also click "Write something" to open post form
      if (pageType === "post-form") {
        await ops.gotoCommunity(opts.group);
        const writeTrigger = page.locator('div[class*="CreatePost"], [placeholder*="Write"], button:has-text("Write")');
        await writeTrigger.first().click({ timeout: 10000 }).catch(() => {
          // Try alternative: text-based
          return page.getByText("Write something").click({ timeout: 5000 });
        });
        await page.waitForTimeout(2000);
      }

      // Screenshot
      const ssPath = `/tmp/skool-debug-${pageType}.png`;
      await page.screenshot({ path: ssPath, fullPage: false });
      console.log(`Screenshot: ${ssPath}`);

      // Dump relevant HTML structure (not full page, just key areas)
      const structure = await page.evaluate(() => {
        const result: string[] = [];

        // Get ALL interactive elements and text nodes in sidebar area
        const allElements = document.querySelectorAll("button, a, input, textarea, [contenteditable], [role], div[class*='Module'], div[class*='Folder'], div[class*='Sidebar'], div[class*='sidebar'], div[class*='Nav'], div[class*='Course'], span[class*='title'], div[class*='menu'], div[class*='Menu']");
        allElements.forEach((el) => {
          const text = el.textContent?.trim().slice(0, 60);
          const tag = el.tagName;
          const cls = el.className?.toString().slice(0, 100) || "";
          const role = el.getAttribute("role") || "";
          const href = el.getAttribute("href") || "";
          const aria = el.getAttribute("aria-label") || "";
          if (text || role || aria) {
            let line = `${tag}: "${text || ""}"`;
            if (cls) line += ` class="${cls}"`;
            if (role) line += ` role="${role}"`;
            if (href) line += ` href="${href}"`;
            if (aria) line += ` aria="${aria}"`;
            result.push(line);
          }
        });

        return result;
      });

      const dumpPath = `/tmp/skool-debug-${pageType}.txt`;
      writeFileSync(dumpPath, structure.join("\n"));
      console.log(`Structure dump: ${dumpPath} (${structure.length} elements)`);

    } finally {
      await browser.close();
    }
  });
