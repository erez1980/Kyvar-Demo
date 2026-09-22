/* Re-shoot the console screenshots that would otherwise name KYVAR's own
   build. Run `tools/stage-shots.py` against a throwaway control plane first,
   then point this at the frontend in front of it:

     cp tools/shoot.mjs <a dir with @playwright/test>/ && node shoot.mjs

   (Node resolves imports from the SCRIPT's directory, and this repo is a
   static site with no node_modules — so it runs from wherever Playwright is
   installed, with SHOT_DIR pointing back here.)

   Each surface is captured in both themes at the same 1600px viewport the
   rest of the set uses, so `tools/crop-shots.py` trims them identically
   afterwards.

   The last thing it does is the point of the exercise: it reads the rendered
   text of every page and FAILS if a stack fact appears in it. A screenshot
   that names the model we buy or the agent we embed must not be able to
   reach the site by accident again. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const WEB = process.env.E2E_WEB_URL || 'http://127.0.0.1:19777';
const EMAIL = process.env.KYVAR_ADMIN_EMAIL || 'admin@acme.io';
const PASSWORD = process.env.KYVAR_ADMIN_PASSWORD || 'local-Qk7pN2wR4tZ';
const OUT = process.env.SHOT_DIR || 'assets/screenshots';
const EXEC = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

// Anything here in a rendered page is a leak, not a style choice.
const FORBIDDEN = [
  'OpenClaw', 'openclaw', 'Hermes', 'hermes',
  'Azure AI Foundry', 'azure-ai-foundry', 'gpt-5', 'gpt-4',
];

const SURFACES = [
  { name: 'overview', path: '/dashboard', height: 1000, frame: 700 },
  { name: 'chat-approval', path: '/chat', height: 1000, settle: 3500, openThread: true },
  { name: 'runtimes', path: '/runtimes', height: 900 },
  { name: 'run-detail', path: null, height: 1100 },   // resolved from /runs
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXEC });
const leaks = [];

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: theme });
  // The console's theme is a localStorage flag applied before first paint,
  // not the OS preference — `colorScheme` alone renders the dark UI twice,
  // which is how a "light" capture can quietly be the dark one.
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('kyvar.theme', t); } catch (e) {}
  }, theme);
  const page = await ctx.newPage();
  await page.goto(`${WEB}/login`);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(4000);

  // The most recent completed run is the one the staging script answered.
  await page.goto(`${WEB}/runs`);
  await page.waitForTimeout(2500);
  const runHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/runs/run_"]')];
    return a.length ? a[a.length - 1].getAttribute('href') : null;
  });

  for (const s of SURFACES) {
    const path = s.path || runHref;
    if (!path) { console.log(`! ${s.name}: no run to open`); continue; }
    await page.setViewportSize({ width: 1600, height: s.height });
    await page.goto(WEB + path);
    await page.waitForTimeout(s.settle || 2500);
    if (s.openThread) {
      // /chat opens on an empty composer; the staged conversation is the
      // first row of the rail.
      await page.locator('aside button, [data-testid="thread-row"]').first().click().catch(() => {});
      await page.getByText(/OpenSSH patch/).first().click().catch(() => {});
      await page.waitForTimeout(3000);
    }

    const text = await page.evaluate(() => document.body.innerText);
    const found = FORBIDDEN.filter((w) => text.includes(w));
    if (found.length) leaks.push(`${s.name} (${theme}): ${found.join(', ')}`);

    // `main`, not the viewport: the rest of the set is the content column
    // without the shell's rail and header, and a shot that carries them is
    // ~340px wider, so it renders smaller beside its neighbours for no gain.
    const file = `${OUT}/${s.name}${theme === 'light' ? '-light' : ''}.png`;
    const main = page.locator('main').first();
    if (await main.count()) {
      // `frame` stops the capture where the surface stops being the point —
      // the Overview's own cards continue below the architecture diagram,
      // and a taller shot renders smaller in a fixed-width frame.
      const box = await main.boundingBox();
      if (s.frame && box) {
        // A PAGE screenshot with a clip: `clip` on an element screenshot is
        // ignored, which silently returns the full element and is how a
        // framed shot quietly stops being framed.
        await page.screenshot({
          path: file,
          clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, s.frame) },
        });
      } else await main.screenshot({ path: file });
    } else await page.screenshot({ path: file });
    console.log(`${s.name} (${theme}) -> ${file}`);
  }
  await ctx.close();
}
await browser.close();

if (leaks.length) {
  console.error('\nLEAKS:\n  ' + leaks.join('\n  '));
  process.exit(1);
}
console.log('\nno stack facts in any captured surface');
