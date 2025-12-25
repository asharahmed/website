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
const windowSize = windowSizeFlag ? windowSizeFlag.split('=')[1] : '1400,9000';

const chromiumPath = process.env.CHROMIUM_BIN || chromium.executablePath();

const runShot = (url, outputPath) => {
  execFileSync(chromiumPath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--run-all-compositor-stages-before-draw',
    `--window-size=${windowSize}`,
    '--virtual-time-budget=12000',
    `--screenshot=${outputPath}`,
    url
  ], { stdio: 'inherit' });
};

const normalizeUrl = url => url.replace(/\/$/, '');

const homeUrl = normalizeUrl(baseUrl);
const statusUrl = `${normalizeUrl(baseUrl)}/status/`;

runShot(homeUrl, path.join(outputDir, 'home.png'));
runShot(statusUrl, path.join(outputDir, 'status.png'));
