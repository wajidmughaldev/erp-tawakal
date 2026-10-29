// Builds card.html (with a real QR code) and card-design.png from card.template.html.
// Run from the project root:  node docs/id-card-design/build.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join} from 'node:path';
import QRCode from 'qrcode';
import {chromium} from '@playwright/test';

const dir = dirname(fileURLToPath(import.meta.url));
const qr = await QRCode.toDataURL('https://portal.example.com/verify?token=SAMPLE-TOKEN-FOR-DESIGN-ONLY', {margin: 0, scale: 10, errorCorrectionLevel: 'M', color: {dark: '#092a4a', light: '#ffffff'}});
const htmlPath = join(dir, 'card.html');
writeFileSync(htmlPath, readFileSync(join(dir, 'card.template.html'), 'utf8').replace('__QR__', qr));

const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page = await browser.newPage({viewport: {width: 1350, height: 960}, deviceScaleFactor: 2});
await page.goto(pathToFileURL(htmlPath).href);
await page.screenshot({path: join(dir, 'card-design.png'), fullPage: true});
await browser.close();
console.log('written', join(dir, 'card-design.png'));
