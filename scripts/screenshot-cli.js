#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const path = require('path');

const parseArgument = (argumentList, prefix, fallback) => {
  const match = argumentList.find(item => item.startsWith(prefix));
  return match ? match.split('=')[1] : fallback;
};

const cliArguments = process.argv.slice(2);
const baseUrl = parseArgument(cliArguments, '--base-url=', 'https://asharahmed.com');
const outputDirectory = parseArgument(cliArguments, '--out-dir=', path.resolve('assets/screenshots'));
const browserWindowSize = parseArgument(cliArguments, '--window-size=', '1280,720');
const targetDimensions = parseArgument(cliArguments, '--resize=', '1280x720');
const browserExecutable = process.env.CHROMIUM_BIN || chromium.executablePath();

const resizeOutputImage = (imagePath, dimensions) => {
  if (!dimensions) return;
  const [targetWidth, targetHeight] = dimensions.split('x').map(Number);
  if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight)) return;

  try {
    const resizeScript = path.join(__dirname, 'resize-image.py');
    execFileSync('python3', [resizeScript, imagePath, String(targetWidth), String(targetHeight)], { stdio: 'ignore' });
  } catch (error) {
    console.warn('screenshot: resize skipped (Pillow missing).');
  }
};

const capturePageScreenshot = (pageUrl, outputPath) => {
  execFileSync(browserExecutable, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--force-device-scale-factor=1',
    '--run-all-compositor-stages-before-draw',
    `--window-size=${browserWindowSize}`,
    '--virtual-time-budget=12000',
    `--screenshot=${outputPath}`,
    pageUrl
  ], { stdio: 'inherit' });
  resizeOutputImage(outputPath, targetDimensions);
};

const stripTrailingSlash = (urlString) => urlString.replace(/\/$/, '');
const siteBaseUrl = stripTrailingSlash(baseUrl);

capturePageScreenshot(`${siteBaseUrl}/?screenshot=1`, path.join(outputDirectory, 'home.png'));
capturePageScreenshot(`${siteBaseUrl}/status/?screenshot=1`, path.join(outputDirectory, 'status.png'));
