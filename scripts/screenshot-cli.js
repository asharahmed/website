#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const path = require('path');

const args = process.argv.slice(2);
const baseUrlFlag = args.find(arg => arg.startsWith('--base-url='));
const baseUrl = baseUrlFlag ? baseUrlFlag.split('=')[1] : 'https://asharahmed.com';
const outputDirFlag = args.find(arg => arg.startsWith('--out-dir='));
const outputDir = outputDirFlag ? outputDirFlag.split('=')[1] : path.resolve('assets/screenshots');
const windowSizeFlag = args.find(arg => arg.startsWith('--window-size='));
const windowSize = windowSizeFlag ? windowSizeFlag.split('=')[1] : '1280,720';
const resizeFlag = args.find(arg => arg.startsWith('--resize='));
const resize = resizeFlag ? resizeFlag.split('=')[1] : '1280x720';

const chromiumPath = process.env.CHROMIUM_BIN || chromium.executablePath();

const resizeImage = outputPath => {
  if (!resize) {
    return;
  }
  const [width, height] = resize.split('x').map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return;
  }
  const script = `
from PIL import Image
path = r"${outputPath}"
img = Image.open(path)
img = img.resize((${width}, ${height}), Image.LANCZOS)
img.save(path)
`;
  try {
    execFileSync('python3', ['-c', script], { stdio: 'ignore' });
  } catch (error) {
    console.warn('screenshot: resize skipped (Pillow missing).');
  }
};

const runShot = (url, outputPath) => {
  execFileSync(chromiumPath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--force-device-scale-factor=1',
    '--run-all-compositor-stages-before-draw',
    `--window-size=${windowSize}`,
    '--virtual-time-budget=12000',
    `--screenshot=${outputPath}`,
    url
  ], { stdio: 'inherit' });
  resizeImage(outputPath);
};

const normalizeUrl = url => url.replace(/\/$/, '');

const homeUrl = `${normalizeUrl(baseUrl)}/?screenshot=1`;
const statusUrl = `${normalizeUrl(baseUrl)}/status/?screenshot=1`;

runShot(homeUrl, path.join(outputDir, 'home.png'));
runShot(statusUrl, path.join(outputDir, 'status.png'));
