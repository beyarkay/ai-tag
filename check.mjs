// Quick smoke test: loads pages in a real browser and checks for errors
import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error("Set OPENROUTER_API_KEY env var first (source .env)");
  process.exit(1);
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

// Simple static file server
const server = createServer((req, res) => {
  const path = join(__dirname, req.url === "/" ? "index.html" : req.url);
  if (!existsSync(path)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = extname(path);
  res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
  res.end(readFileSync(path));
});

server.listen(0, async () => {
  const port = server.address().port;
  const base = `http://localhost:${port}`;
  console.log(`Server on ${base}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  let allPassed = true;

  async function check(name, url, { expectAI = false, timeout = 15000 } = {}) {
    const errors = [];
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("Failed to load resource"))
        errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    // Dismiss any dialogs (we pre-set localStorage instead)
    page.on("dialog", async (dialog) => dialog.dismiss());

    // Load a blank page on the same origin to set localStorage
    const origin = new URL(url).origin;
    await page.route(origin + "/__setup", (route) =>
      route.fulfill({ body: "<html></html>", contentType: "text/html" }),
    );
    await page.goto(origin + "/__setup", { waitUntil: "commit" });
    await page.evaluate(
      (key) => localStorage.setItem("ai:key", key),
      API_KEY,
    );

    // Now load the actual page — key is already in localStorage
    await page.goto(url, { waitUntil: "domcontentloaded" });

    if (expectAI) {
      // Wait for at least one ai-done or ai-error class
      try {
        await page.waitForSelector(".ai-done, .ai-error", { timeout });
      } catch {
        errors.push("Timed out waiting for AI response");
      }

      const errorEls = await page.$$(".ai-error");
      for (const el of errorEls) {
        const msg = await el.getAttribute("data-ai-error");
        errors.push(`Element error: ${msg}`);
      }

      const doneCount = (await page.$$(".ai-done")).length;
      const errorCount = errorEls.length;
      if (doneCount === 0 && errorCount === 0) {
        errors.push("No elements processed at all");
      }

      process.stdout.write(
        `  ${name}: ${doneCount} done, ${errorCount} errors`,
      );
    } else {
      process.stdout.write(`  ${name}: loaded`);
    }

    if (errors.length > 0) {
      console.log(` FAIL`);
      errors.forEach((e) => console.log(`    - ${e}`));
      allPassed = false;
    } else {
      console.log(` OK`);
    }

    await page.close();
  }

  console.log("\n--- Smoke tests ---\n");

  // Test pages load without JS errors
  await check("tests/test.html", `${base}/tests/test.html`);

  // Test demo with real API call
  await check("demo.html", `${base}/demo.html`, {
    expectAI: true,
    timeout: 30000,
  });

  // Test basic example
  await check("examples/basic.html", `${base}/examples/basic.html`, {
    expectAI: true,
    timeout: 30000,
  });

  console.log(`\n${allPassed ? "ALL PASSED" : "SOME FAILED"}\n`);

  await browser.close();
  server.close();
  process.exit(allPassed ? 0 : 1);
});
