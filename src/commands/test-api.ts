import { Command } from "commander";
import { BrowserManager } from "../core/browser-manager.js";
import { SkoolApi } from "../core/skool-api.js";
import { PageOps } from "../core/page-ops.js";

export const testApiCommand = new Command("test-api")
  .description("Test direct API creation of a lesson")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--course <name>", "Course name", "Fundamentos de IA y Claude")
  .action(async (opts) => {
    const browser = new BrowserManager();
    const api = new SkoolApi(browser);
    const ops = new PageOps(browser);

    try {
      const page = await browser.getPage();

      // Set up request interception BEFORE navigating
      let groupId = "";
      let userId = "";
      let rootId = "";

      // Intercept API calls to capture IDs
      page.on("request", (req) => {
        const body = req.postData();
        if (!body) return;

        // Capture group_id from telemetry
        const gMatch = body.match(/"group_id"\s*:\s*"([a-f0-9]{32})"/);
        if (gMatch && !groupId) groupId = gMatch[1];

        const uMatch = body.match(/"member_id"\s*:\s*"([a-f0-9]{32})"/);
        if (uMatch && !userId) userId = uMatch[1];
      });

      // Also capture API calls to api2.skool.com for root_id
      page.on("request", (req) => {
        const url = req.url();
        const body = req.postData();
        if (url.includes("api2.skool.com") && body) {
          const rMatch = body.match(/"root_id"\s*:\s*"([a-f0-9]{32})"/);
          if (rMatch && !rootId) rootId = rMatch[1];
        }
      });

      console.log("Step 1: Navigate to classroom...");
      await ops.gotoClassroom(opts.group);

      console.log("Step 2: Enter course...");
      await page.getByText(opts.course, { exact: false }).first().click();
      await page.waitForTimeout(3000);

      // Extract group_id from the page URL/assets (the group ID is in the OG image URL)
      if (!groupId) {
        const metaContent = await page.evaluate(() => {
          const str = document.documentElement.innerHTML;
          const match = str.match(/01fe[a-f0-9]{28}/);
          return match ? match[0] : "";
        });
        if (metaContent) groupId = metaContent;
      }

      console.log(`\nAfter navigation - groupId: ${groupId}, userId: ${userId}, rootId: ${rootId}`);

      // If we don't have rootId yet, we need to trigger an API call
      // Do the "Add page" action to capture the root_id from the POST to api2.skool.com
      if (!rootId) {
        console.log("\nStep 3: Triggering Add page to discover root_id...");

        // Set up listener for the api2.skool.com/courses POST
        const rootIdPromise = new Promise<string>((resolve) => {
          const timeout = setTimeout(() => resolve(""), 15000);
          page.on("response", async (res) => {
            if (res.url().includes("api2.skool.com/courses") && res.request().method() === "POST") {
              try {
                const data = await res.json() as Record<string, unknown>;
                const rid = (data.root_id as string) || "";
                if (rid) {
                  clearTimeout(timeout);
                  resolve(rid);
                }
              } catch { /* ignore */ }
            }
          });
        });

        // Click "..." and "Add page"
        const courseTopArea = page.locator('div[class*="CourseMenuTop"]').first();
        await courseTopArea.hover();
        await page.waitForTimeout(500);
        await page.evaluate(() => {
          const topArea = document.querySelector('div[class*="CourseMenuTop"]');
          if (!topArea) return;
          topArea.querySelectorAll("div, button, span, svg").forEach((el) => {
            const rect = el.getBoundingClientRect();
            const text = el.textContent?.trim() || "";
            if (rect.width > 10 && rect.width < 50 && rect.height > 10 && rect.height < 50 && text.length < 4) {
              el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            }
          });
        });
        await page.waitForTimeout(800);

        try {
          await page.getByText("Add page", { exact: true }).click({ timeout: 5000 });
        } catch {
          await page.getByText("Add page", { exact: true }).click({ force: true, timeout: 5000 });
        }

        rootId = await rootIdPromise;
        console.log(`Captured root_id: ${rootId}`);

        // Also get user_id from the create request
        // We already have it from telemetry
      }

      // ALWAYS extract userId from the auth_token JWT (member_id from telemetry is NOT the same)
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === "auth_token");
      if (authCookie) {
        try {
          const payload = JSON.parse(Buffer.from(authCookie.value.split(".")[1], "base64").toString());
          userId = payload.sub || payload.user_id || payload.id || "";
          console.log(`userId from JWT: ${userId}`);
          console.log(`JWT payload keys: ${Object.keys(payload).join(", ")}`);
        } catch { /* ignore */ }
      }

      console.log(`\nDiscovered IDs:`);
      console.log(`  group_id: ${groupId}`);
      console.log(`  user_id:  ${userId}`);
      console.log(`  root_id:  ${rootId}`);

      if (!groupId || !userId || !rootId) {
        console.error("\nCould not discover all required IDs.");
        return;
      }

      // Now test: create a page via direct API with the correct root_id
      console.log("\nStep 4: Creating test page via API...");
      const result = await api.createPage({
        groupId,
        userId,
        parentId: rootId, // Top-level page in the course
        rootId,
        title: "API Test Page",
        content: "<h2>Hola desde la API</h2><p>Esta pagina fue creada directamente via api2.skool.com</p><ul><li>Punto 1</li><li>Punto 2</li></ul>",
      });

      console.log(`\nResult: ${JSON.stringify(result, null, 2)}`);

    } finally {
      await browser.close();
    }
  });
