// Server-side PDF export: one PDF per product.
//
// A headless Edge/Chrome opens the app's /print/:id page (the same Angular
// component the creator shows) and prints it. No browser is downloaded:
// puppeteer-core uses the one installed on the machine. Set TDS_BROWSER_PATH
// to pick a specific browser, and TDS_APP_URL when the app is not served by
// this server (e.g. http://localhost:4200 during `ng serve`). TDS_BROWSER_ARGS
// adds browser flags, e.g. "--no-sandbox --disable-dev-shm-usage" in a container.

import fs from 'node:fs';
import JSZip from 'jszip';
import puppeteer from 'puppeteer-core';
import { SESSION_COOKIE } from './auth.js';

const CANDIDATES = [
  process.env.TDS_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

const EXTRA_ARGS = (process.env.TDS_BROWSER_ARGS ?? '').split(/\s+/).filter(Boolean);
// PDFs rendered at the same time; TDS_PDF_CONCURRENCY=1 on hosts with little memory.
const CONCURRENCY = Math.max(1, Number(process.env.TDS_PDF_CONCURRENCY) || 3);
const RENDER_TIMEOUT_MS = 20000;

let browserPromise = null;

function browserPath() {
  const found = CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('No Edge or Chrome found for PDF export. Set TDS_BROWSER_PATH to a Chromium-based browser.');
  return found;
}

function browser() {
  browserPromise ??= puppeteer
    .launch({ executablePath: browserPath(), headless: true, args: ['--disable-gpu', '--no-first-run', ...EXTRA_ARGS] })
    .then((b) => {
      b.on('disconnected', () => (browserPromise = null));
      return b;
    })
    .catch((e) => {
      browserPromise = null;
      throw e;
    });
  return browserPromise;
}

// The headless browser signs in with the requesting user's session cookie,
// so it sees exactly what that user is allowed to see.
async function renderPdf(appUrl, sessionToken, productId, lang = 'EN') {
  const ctx = await (await browser()).createBrowserContext();
  const page = await ctx.newPage();
  try {
    await page.setCookie({ name: SESSION_COOKIE, value: sessionToken ?? '', url: appUrl, httpOnly: true });
    await page.goto(`${appUrl}/print/${productId}?lang=${encodeURIComponent(lang)}`, { waitUntil: 'networkidle0', timeout: RENDER_TIMEOUT_MS });
    // The print page sets this once the TDS is rendered and fitted to the page.
    await page.waitForSelector('body[data-tds-ready="true"]', { timeout: RENDER_TIMEOUT_MS });
    const failed = await page.$('body[data-tds-error]');
    if (failed) throw new Error(`Could not render TDS for product ${productId}`);
    return await page.pdf({ printBackground: true, preferCSSPageSize: true });
  } finally {
    await ctx.close();
  }
}

/** One product -> { fileName, pdf } */
export async function productPdf(appUrl, sessionToken, product, fileName, lang) {
  return { fileName: `${safeName(fileName)}.pdf`, pdf: await renderPdf(appUrl, sessionToken, product.id, lang) };
}

/** Several products -> ZIP with one PDF each. */
export async function productsZip(appUrl, sessionToken, items) {
  const zip = new JSZip();
  const queue = [...items];
  const used = new Set();
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const pdf = await renderPdf(appUrl, sessionToken, item.product.id, item.lang);
      let name = `${safeName(item.fileName)}.pdf`;
      for (let i = 2; used.has(name); i++) name = `${safeName(item.fileName)}_${i}.pdf`;
      used.add(name);
      zip.file(name, pdf);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close().catch(() => {});
}

// Windows-safe file name; keeps the Excel save-name rule otherwise.
function safeName(name) {
  return String(name).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || 'TDS';
}
