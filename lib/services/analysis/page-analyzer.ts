/**
 * Page Analysis Service
 * Extracts content, compressed HTML, and screenshots from web pages using Playwright
 */

import { chromium, devices } from 'playwright-core';
import type { Page, BrowserContext } from 'playwright-core';
import { startTimer } from '@/lib/utils/timing';

type PlaywrightLaunchOptions = NonNullable<Parameters<typeof chromium.launch>[0]>;
type ChromiumLaunchConfig = Pick<PlaywrightLaunchOptions, 'args' | 'executablePath' | 'headless' | 'timeout' | 'ignoreDefaultArgs'>;

export interface ScreenshotCapture {
  fullPage: string; // base64
  aboveFold: string; // base64
}

export interface PageAnalysisResult {
  compressedHTML: string; // Compressed rendered HTML without scripts - ready for AI
  url: string;
  scrapedAt: string;
  method: 'playwright-browser';
  pageLoadTime: number;
  screenshots: {
    desktop: ScreenshotCapture;
    mobile: ScreenshotCapture;
  };
}

/**
 * Analyzes a web page and returns compressed HTML with screenshots using Playwright
 */
export async function analyzePage(url: string): Promise<PageAnalysisResult> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const startTime = Date.now();
  const overallTimerStop = startTimer('analysis.scraper.total');
  let timerMeta: Record<string, unknown> = { url };

  try {
    const launchConfig = await getChromiumLaunchConfig();
    browser = await chromium.launch(launchConfig);
    // Small stabilization delay to avoid early crashes before first context
    await new Promise((r) => setTimeout(r, 200));

    // Capture desktop version
    let desktopContext;
    try {
      desktopContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        ignoreHTTPSErrors: true,
      });
    } catch (e: any) {
      if (String(e?.message || e).includes('Target page, context or browser has been closed')) {
        try { await browser.close(); } catch {}
        browser = await chromium.launch(await getChromiumLaunchConfig());
        await wait(200);
        desktopContext = await browser.newContext({
          viewport: { width: 1366, height: 900 }, // slightly smaller fallback
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          ignoreHTTPSErrors: true,
        });
      } else {
        throw e;
      }
    }

    let desktopPage;
    try {
      desktopPage = await desktopContext.newPage();
    } catch (e: any) {
      if (String(e?.message || e).includes('Target page, context or browser has been closed')) {
        try { await desktopContext.close(); } catch {}
        try { await browser.close(); } catch {}
        browser = await chromium.launch(await getChromiumLaunchConfig());
        await wait(200);
        desktopContext = await browser.newContext({
          viewport: { width: 1366, height: 900 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          ignoreHTTPSErrors: true,
        });
        desktopPage = await desktopContext.newPage();
      } else {
        throw e;
      }
    }

    // Navigate with fallback and one retry with lighter resources
    try {
      desktopPage.setDefaultNavigationTimeout(25000);
      await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('ERR_INSUFFICIENT_RESOURCES') || msg.includes('Target page, context or browser has been closed')) {
        try { await desktopContext.close(); } catch {}
        try { await browser.close(); } catch {}
        browser = await chromium.launch(await getChromiumLaunchConfig());
        await wait(200);
        desktopContext = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          ignoreHTTPSErrors: true,
        });
        await enableLightweightRouting(desktopContext);
        desktopPage = await desktopContext.newPage();
        desktopPage.setDefaultNavigationTimeout(20000);
        await desktopPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } else {
        console.log('Page analyzer: networkidle timeout, trying domcontentloaded...');
        await desktopPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
    }

    // Wait for content to settle
    await desktopPage.waitForTimeout(1500);

    // Extract compressed HTML from desktop
    const compressedHTML = await desktopPage.evaluate(() => {
      const clone = document.documentElement.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script').forEach(el => el.remove());
      clone.querySelectorAll('noscript').forEach(el => el.remove());

      const removeComments = (node: Node) => {
        const children = Array.from(node.childNodes);
        children.forEach(child => {
          if (child.nodeType === 8) {
            child.remove();
          } else if (child.hasChildNodes()) {
            removeComments(child);
          }
        });
      };
      removeComments(clone);

      clone.querySelectorAll('*').forEach(el => {
        const attributes = (el as HTMLElement).attributes;
        for (let i = attributes.length - 1; i >= 0; i--) {
          const attr = attributes[i];
          if (attr.name.startsWith('on')) {
            (el as HTMLElement).removeAttribute(attr.name);
          }
        }
      });

      const html = clone.outerHTML;
      return html
        .replace(/>\s+</g, '><')
        .replace(/^\s+|\s+$/gm, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*=\s*/g, '=')
        .trim();
    });

    // Capture desktop screenshots (jpeg to reduce payload size)
    const desktopAboveFold = await safeScreenshot(desktopPage, {
      type: 'jpeg',
      quality: 60,
      fullPage: false,
    });
    let desktopFullPage: Buffer;
    try {
      desktopFullPage = await safeScreenshot(desktopPage, {
        type: 'jpeg',
        quality: 60,
        fullPage: true,
      });
    } catch {
      desktopFullPage = await safeScreenshot(desktopPage, {
        type: 'jpeg',
        quality: 60,
        fullPage: false,
      });
    }

    await desktopContext.close();

    // Capture mobile version
    const mobileDevice = devices['iPhone 13'];
    let mobileContext;
    try {
      mobileContext = await browser.newContext({
        ...mobileDevice,
        ignoreHTTPSErrors: true,
      });
    } catch (e: any) {
      if (String(e?.message || e).includes('Target page, context or browser has been closed')) {
        try { await browser.close(); } catch {}
        browser = await chromium.launch(await getChromiumLaunchConfig());
        await wait(200);
        mobileContext = await browser.newContext({
          ...devices['iPhone 13'],
          ignoreHTTPSErrors: true,
        });
      } else {
        throw e;
      }
    }

    let mobilePage;
    try {
      mobilePage = await mobileContext.newPage();
    } catch (e: any) {
      if (String(e?.message || e).includes('Target page, context or browser has been closed')) {
        try { await mobileContext.close(); } catch {}
        try { await browser.close(); } catch {}
        browser = await chromium.launch(await getChromiumLaunchConfig());
        await wait(200);
        mobileContext = await browser.newContext({
          ...devices['iPhone 13'],
          ignoreHTTPSErrors: true,
        });
        mobilePage = await mobileContext.newPage();
      } else {
        throw e;
      }
    }

    try {
      mobilePage.setDefaultNavigationTimeout(25000);
      await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('ERR_INSUFFICIENT_RESOURCES') || msg.includes('Target page, context or browser has been closed')) {
        try { await mobileContext.close(); } catch {}
        try { await browser.close(); } catch {}
        browser = await chromium.launch(await getChromiumLaunchConfig());
        await wait(200);
        mobileContext = await browser.newContext({
          ...devices['iPhone 13'],
          ignoreHTTPSErrors: true,
        });
        await enableLightweightRouting(mobileContext);
        mobilePage = await mobileContext.newPage();
        mobilePage.setDefaultNavigationTimeout(20000);
        await mobilePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } else {
        await mobilePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
    }

    await mobilePage.waitForTimeout(1500);

    // Capture mobile screenshots (jpeg to reduce payload size)
    const mobileAboveFold = await safeScreenshot(mobilePage, {
      type: 'jpeg',
      quality: 60,
      fullPage: false,
    });
    let mobileFullPage: Buffer;
    try {
      mobileFullPage = await safeScreenshot(mobilePage, {
        type: 'jpeg',
        quality: 60,
        fullPage: true,
      });
    } catch {
      mobileFullPage = await safeScreenshot(mobilePage, {
        type: 'jpeg',
        quality: 60,
        fullPage: false,
      });
    }

    await mobileContext.close();

    const pageLoadTime = Date.now() - startTime;
    timerMeta = { ...timerMeta, pageLoadTime };

    return {
      compressedHTML,
      url,
      scrapedAt: new Date().toISOString(),
      method: 'playwright-browser',
      pageLoadTime,
      screenshots: {
        desktop: {
          aboveFold: desktopAboveFold.toString('base64'),
          fullPage: desktopFullPage.toString('base64'),
        },
        mobile: {
          aboveFold: mobileAboveFold.toString('base64'),
          fullPage: mobileFullPage.toString('base64'),
        },
      },
    };

  } catch (error) {
    timerMeta = {
      ...timerMeta,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error('Playwright analyzer error:', error);
    throw new Error(`Failed to analyze page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (!('pageLoadTime' in timerMeta)) {
      timerMeta = {
        ...timerMeta,
        durationFallbackMs: Date.now() - startTime,
      };
    }
    overallTimerStop(timerMeta);
    if (browser) {
      await browser.close();
    }
  }
}

async function getChromiumLaunchConfig(): Promise<ChromiumLaunchConfig> {
  const isVercel = Boolean(process.env.VERCEL);

  if (!isVercel) {
    return {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath: undefined,
      headless: true,
      timeout: 30000,
      ignoreDefaultArgs: ['--disable-extensions'],
    };
  }

  ensureChromiumRuntimeEnv();
  const chromiumModule = await loadChromium();

  const baseArgs = chromiumModule.args ?? [];
  const extraArgs = ['--enable-unsafe-swiftshader', '--disable-webgl', '--disable-gpu-program-cache'];
  const args = Array.from(new Set([...baseArgs, ...extraArgs]));

  return {
    args,
    executablePath: await chromiumModule.executablePath(),
    headless: chromiumModule.headless === 'shell' ? true : chromiumModule.headless ?? true,
    timeout: 30000,
    ignoreDefaultArgs: ['--disable-extensions'],
  };
}

function ensureChromiumRuntimeEnv(): void {
  const nodeMajorVersion = Number.parseInt(process.versions.node?.split('.')?.[0] ?? '', 10);

  let runtime = 'nodejs18.x';
  let lambdaLibPath = '/tmp/al2/lib';
  if (!Number.isNaN(nodeMajorVersion)) {
    if (nodeMajorVersion >= 22) {
      runtime = 'nodejs22.x';
      lambdaLibPath = '/tmp/al2023/lib';
    } else if (nodeMajorVersion >= 20) {
      runtime = 'nodejs20.x';
      lambdaLibPath = '/tmp/al2023/lib';
    } else if (nodeMajorVersion >= 18) {
      runtime = 'nodejs18.x';
      lambdaLibPath = '/tmp/al2/lib';
    }
  }

  process.env.AWS_EXECUTION_ENV ??= `AWS_Lambda_${runtime}`;
  process.env.AWS_LAMBDA_JS_RUNTIME ??= runtime;

  const candidateLibPaths = new Set<string>();
  candidateLibPaths.add(lambdaLibPath);
  candidateLibPaths.add('/tmp/al2/lib');
  candidateLibPaths.add('/tmp/al2023/lib');

  const existingLdPath = process.env.LD_LIBRARY_PATH ?? '';
  existingLdPath
    .split(':')
    .filter(Boolean)
    .forEach((p) => candidateLibPaths.add(p));

  process.env.LD_LIBRARY_PATH = Array.from(candidateLibPaths).join(':');
  process.env.FONTCONFIG_PATH ??= '/tmp/fonts';
  process.env.HOME ??= process.env.HOME && process.env.HOME !== '/' ? process.env.HOME : '/tmp';
  process.env.TMPDIR ??= '/tmp';

  const pathEntries = new Set<string>();
  if (process.env.PATH) {
    process.env.PATH.split(':')
      .filter(Boolean)
      .forEach((entry) => pathEntries.add(entry));
  }
  pathEntries.add('/tmp');
  process.env.PATH = Array.from(pathEntries).join(':');
}

async function loadChromium(): Promise<typeof import('@sparticuz/chromium')> {
  const rawModule = (await import('@sparticuz/chromium')) as unknown;
  if (rawModule && typeof rawModule === 'object' && 'default' in rawModule) {
    const moduleWithDefault = rawModule as { default?: typeof import('@sparticuz/chromium') };
    if (moduleWithDefault.default) return moduleWithDefault.default;
  }
  return rawModule as typeof import('@sparticuz/chromium');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeScreenshot(
  page: Page,
  options: Parameters<Page['screenshot']>[0]
): Promise<Buffer> {
  try {
    return await page.screenshot({ animations: 'disabled', timeout: 10000, ...options });
  } catch {
    await wait(300);
    return await page.screenshot({ animations: 'disabled', timeout: 10000, ...options });
  }
}

async function enableLightweightRouting(context: BrowserContext) {
  try {
    await context.route('**/*', (route) => {
      const req = route.request();
      const type = req.resourceType();
      const url = req.url();
      // Abort heavy/irrelevant resources on retry
      if (
        type === 'media' ||
        type === 'font' ||
        type === 'eventsource' ||
        type === 'websocket' ||
        /analytics|gtm|googletagmanager|doubleclick|facebook|meta|hotjar|segment|amplitude|optimizely/i.test(url)
      ) {
        return route.abort();
      }
      return route.continue();
    });
  } catch {
    // ignore routing setup failures
  }
}
