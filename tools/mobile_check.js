// Opens every page at phone width (390px) and fails if any page scrolls
// sideways or logs a console error. Expects the site served on
// http://localhost:8765 (python3 -m http.server 8765 from the repo root).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const skip = new Set(['tom-solution.html']);
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.html') && !skip.has(e.name)) pages.push(path.relative(root, full));
  }
})(root);

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const width of [390, 1400]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const rel of pages.sort()) {
      const errors = [];
      const onError = (m) => { if (m.type() === 'error' && !/googletagmanager|google-analytics/.test(m.text())) errors.push(m.text()); };
      page.on('console', onError);
      await page.goto(`http://localhost:8765/${rel}`, { waitUntil: 'load' });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > width) problems.push(`${rel} @${width}px: page is ${sw}px wide (scrolls sideways)`);
      for (const e of errors) problems.push(`${rel} @${width}px: console error: ${e}`);
      page.off('console', onError);
    }
    await page.close();
  }
  await browser.close();
  problems.forEach((p) => console.log(p));
  console.log(`${pages.length} pages at 390px and 1400px, ${problems.length} problem(s)`);
  process.exit(problems.length ? 1 : 0);
})();
