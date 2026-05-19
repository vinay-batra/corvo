// Test tilt jitter on a card that's actually IN view.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bento-card-inner', { timeout: 15000 });

  // Scroll so the bento section is visible. Try a smaller offset.
  await page.evaluate(() => {
    const el = document.querySelector('.page-fadein');
    if (el) el.scrollTop = 1500;
  });
  await page.waitForTimeout(800);

  // Find a card that's actually in the viewport
  const cards = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.bento-card-inner').forEach((c) => {
      const r = c.getBoundingClientRect();
      if (r.top >= 0 && r.bottom <= window.innerHeight && r.width > 100) {
        const eyebrow = c.querySelector('p');
        out.push({
          label: eyebrow ? eyebrow.textContent.trim() : '?',
          x: r.x, y: r.y, w: r.width, h: r.height,
        });
      }
    });
    return out;
  });
  console.log('Cards in view:', cards.map(c => `${c.label} ${Math.round(c.w)}x${Math.round(c.h)}`).join(' | '));

  if (!cards.length) {
    console.log('no card in view; bailing');
    await browser.close();
    return;
  }

  const c = cards[0];
  const edgeX = c.x + c.w - 2;
  const yMid = c.y + c.h / 2;

  // Step into the card from outside the right edge
  await page.mouse.move(c.x + c.w / 2, yMid);
  await page.waitForTimeout(120);

  // Now oscillate microscopically right at the edge
  const samples = [];
  for (let i = 0; i < 40; i++) {
    const offset = (i % 2 === 0) ? 0 : -1;
    await page.mouse.move(edgeX + offset, yMid + (i % 3 === 0 ? 0 : 1));
    await page.waitForTimeout(35);
    const t = await page.evaluate((label) => {
      const cards = document.querySelectorAll('.bento-card-inner');
      for (const c of cards) {
        const eb = c.querySelector('p');
        if (eb && eb.textContent.trim() === label) return c.style.transform;
      }
      return null;
    }, c.label);
    samples.push(t);
  }

  const isIdentity = (t) => !t || t.includes('rotateX(0deg) rotateY(0deg)');
  let flips = 0;
  for (let i = 1; i < samples.length; i++) {
    if (isIdentity(samples[i]) !== isIdentity(samples[i - 1])) flips++;
  }
  console.log(`\nTested card: "${c.label}"`);
  console.log(`Last 6 transforms:`, samples.slice(-6));
  console.log(`identity↔rotated flips over 40 micro-moves at right edge: ${flips}`);
  console.log(flips === 0 ? '✓ no jitter — tilt stays stable' : `✗ ${flips} flips — still jittering`);

  await browser.close();
})();
