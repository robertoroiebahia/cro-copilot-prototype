/**
 * Page Analysis Service
 * Extracts content, compressed HTML, and screenshots from web pages using Playwright
 */

import { chromium, devices } from 'playwright-core';
import type { Page, BrowserContext } from 'playwright-core';
import { startTimer } from '@/lib/utils/timing';

type PlaywrightLaunchOptions = NonNullable<Parameters<typeof chromium.launch>[0]>;
type ChromiumLaunchConfig = Pick<PlaywrightLaunchOptions, 'args' | 'executablePath' | 'headless' | 'timeout' | 'ignoreDefaultArgs'>;

export interface PageAnalysisResult {
  compressedHTML: string; // Compressed rendered HTML without scripts - ready for AI
  url: string;
  scrapedAt: string;
  method: 'playwright-browser';
  pageLoadTime: number;
  screenshots: {
    mobile: {
      fullPage: string; // base64
    };
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
    await wait(200);

    const createMobileContext = async () => {
      const ctx = await browser!.newContext({
        ...devices['iPhone 13'],
        ignoreHTTPSErrors: true,
      });
      await installBlockers(ctx);
      return ctx;
    };

    let mobileContext = await createMobileContext();
    let mobilePage = await mobileContext.newPage();

    const navigate = async (page: Page, waitUntil: 'networkidle' | 'domcontentloaded', timeout: number) => {
      page.setDefaultNavigationTimeout(timeout + 5000);
      await page.goto(url, { waitUntil, timeout });
    };

    try {
      await navigate(mobilePage, 'networkidle', 20000);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('ERR_INSUFFICIENT_RESOURCES') || msg.includes('Target page, context or browser has been closed')) {
        try { await mobileContext.close(); } catch {}
        try { await browser.close(); } catch {}
        browser = await chromium.launch(await getChromiumLaunchConfig());
        await wait(200);
        mobileContext = await createMobileContext();
        mobilePage = await mobileContext.newPage();
        await enableLightweightRouting(mobileContext);
        await navigate(mobilePage, 'domcontentloaded', 15000);
      } else {
        console.log('Page analyzer: networkidle timeout, trying domcontentloaded...');
        await navigate(mobilePage, 'domcontentloaded', 15000);
      }
    }

    await mobilePage.waitForTimeout(1500);

    const compressedHTML = await mobilePage.evaluate(() => {
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

    await hideStickyBeforeFullPage(mobilePage);
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
        mobile: {
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

async function installBlockers(context: BrowserContext) {
  const ANALYTICS_RE = /(google-analytics|googletagmanager|doubleclick|facebook|fbcdn|meta\.com|hotjar|segment|amplitude|optimizely|fullstory|sentry|clarity|intercom|hubspot|widget|analytics)/i;

  await context.route('**/*', (route) => {
    const req = route.request();
    const type = req.resourceType();
    const url = req.url();

    if (
      type === 'font' ||
      type === 'media' ||
      type === 'websocket' ||
      type === 'eventsource'
    ) {
      return route.abort();
    }

    if (ANALYTICS_RE.test(url)) {
      return route.abort();
    }

    return route.continue();
  });

  // Disable animations and force system fonts very early
  await context.addInitScript(() => {
    try {
      const style = document.createElement('style');
      style.id = '__capture_overrides';
      style.textContent = `
        *, *::before, *::after { 
          animation: none !important; 
          transition: none !important; 
        }
        html, body, * { 
          font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif !important; 
        }
      `;
      document.documentElement.appendChild(style);
    } catch {}
  });
}

async function hideStickyBeforeFullPage(page: Page) {
  try {
    await page.addStyleTag({
      content: `
        *[data-__stashed-fixed] { position: static !important; top: auto !important; bottom: auto !important; z-index: auto !important; }
      `,
    });
    await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('body *'));
      for (const el of nodes) {
        const cs = window.getComputedStyle(el);
        if (cs.position === 'fixed' || cs.position === 'sticky') {
          el.setAttribute('data-__stashed-fixed', '1');
          el.style.setProperty('position', 'static', 'important');
          el.style.setProperty('top', 'auto', 'important');
          el.style.setProperty('bottom', 'auto', 'important');
          el.style.setProperty('z-index', 'auto', 'important');
        }
      }
    });
  } catch {}
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
