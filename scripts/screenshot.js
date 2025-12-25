#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('@playwright/test');
const path = require('path');

const args = process.argv.slice(2);
const mode = args.includes('--live') ? 'live' : 'local';
const baseUrlFlag = args.find(arg => arg.startsWith('--base-url='));
const baseUrl = baseUrlFlag ? baseUrlFlag.split('=')[1] : 'https://asharahmed.com';
const outputDirFlag = args.find(arg => arg.startsWith('--out-dir='));
const outputDir = outputDirFlag ? outputDirFlag.split('=')[1] : path.resolve('assets/screenshots');

const waitForStable = async page => {
  await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 30000 });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
  await page.waitForTimeout(1500);
};

const warmScroll = async page => {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.7));
    const max = document.body.scrollHeight;
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
};

const capture = async (page, url, selector, outPath) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector(selector, { timeout: 20000 });
  await waitForStable(page);
  await page.screenshot({ path: outPath, fullPage: true });
};

const run = async () => {
  const browser = await chromium.launch({
    chromiumSandbox: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    await page.addStyleTag({
      content: [
        '*{animation:none !important; transition:none !important;}',
        'html{scroll-behavior:auto !important;}',
        'section,.timeline{content-visibility:visible !important; contain:none !important; contain-intrinsic-size:auto !important;}',
        '.timeline-item,.education-card,.cert-card,.skill-category,.publication-card{opacity:1 !important; transform:none !important;}'
      ].join('\n')
    });
    const homeUrl = mode === 'live'
      ? baseUrl
      : `file://${path.resolve('/tmp/site-screenshot/index.html')}`;
    const statusUrl = mode === 'live'
      ? `${baseUrl.replace(/\/$/, '')}/status/`
      : `file://${path.resolve('/tmp/site-screenshot/status/index.html')}`;

    await capture(page, homeUrl, 'header', path.join(outputDir, 'home.png'));
    await page.waitForSelector('.timeline-item', { timeout: 15000 });
    await warmScroll(page);
    await page.waitForSelector('.timeline-content', { timeout: 15000 });
    await waitForStable(page);
    await page.screenshot({ path: path.join(outputDir, 'home.png'), fullPage: true });
    await capture(page, statusUrl, '.status-metrics-grid', path.join(outputDir, 'status.png'));
  } finally {
    await browser.close();
  }
};

run().catch(error => {
  console.error('Screenshot capture failed:', error);
  process.exit(1);
});
