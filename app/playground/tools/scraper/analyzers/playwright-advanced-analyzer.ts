/**
 * PLAYWRIGHT ADVANCED ANALYZER
 * Modern browser automation with comprehensive analysis
 */

import { chromium as playwright } from 'playwright-core';

type PlaywrightLaunchOptions = NonNullable<Parameters<typeof playwright.launch>[0]>;
type ChromiumLaunchConfig = Pick<PlaywrightLaunchOptions, 'args' | 'executablePath' | 'headless' | 'timeout' | 'ignoreDefaultArgs'>;

export interface PageAnalysisResult {
  compressedHTML: string; // Compressed rendered HTML without scripts - ready for AI
  url: string;
  scrapedAt: string;
  method: 'playwright-advanced';
  pageLoadTime: number;
  screenshots?: {
    aboveFold: string; // base64 jpeg
    fullPage: string;  // base64 jpeg
  };
}

export async function analyzePage(url: string): Promise<PageAnalysisResult> {
  let browser: Awaited<ReturnType<typeof playwright.launch>> | undefined;
  const startTime = Date.now();

  try {
    const launchConfig = await getChromiumLaunchConfig();
    browser = await playwright.launch(launchConfig);
    await wait(200);

    let context;
    try {
      context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      });
    } catch (e: any) {
      if (String(e?.message || e).includes('Target page, context or browser has been closed')) {
        try { await browser.close(); } catch {}
        browser = await playwright.launch(await getChromiumLaunchConfig());
        await wait(200);
        context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        });
      } else {
        throw e;
      }
    }

    let page;
    try {
      page = await context.newPage();
    } catch (e: any) {
      if (String(e?.message || e).includes('Target page, context or browser has been closed')) {
        try { await context.close(); } catch {}
        try { await browser.close(); } catch {}
        browser = await playwright.launch(await getChromiumLaunchConfig());
        await wait(200);
        context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        });
        page = await context.newPage();
      } else {
        throw e;
      }
    }

    // Navigate with fallback
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (e) {
      console.log('Advanced Playwright: networkidle timeout, trying domcontentloaded...');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }

    await page.waitForTimeout(2000);

    // Extract compressed HTML
    const compressedHTML = await page.evaluate(() => {
      // Get clean HTML - clone document and remove all scripts
      const clone = document.documentElement.cloneNode(true) as HTMLElement;
      // Remove all script tags
      clone.querySelectorAll('script').forEach(el => el.remove());
      // Remove all noscript tags
      clone.querySelectorAll('noscript').forEach(el => el.remove());
      // Remove HTML comments
      const removeComments = (node: Node) => {
        const children = Array.from(node.childNodes);
        children.forEach(child => {
          if (child.nodeType === 8) { // Comment node
            child.remove();
          } else if (child.hasChildNodes()) {
            removeComments(child);
          }
        });
      };
      removeComments(clone);
      // Remove inline event handlers
      clone.querySelectorAll('*').forEach(el => {
        const attributes = (el as HTMLElement).attributes;
        for (let i = attributes.length - 1; i >= 0; i--) {
          const attr = attributes[i];
          if (attr.name.startsWith('on')) {
            (el as HTMLElement).removeAttribute(attr.name);
          }
        }
      });

      // Get HTML and compress it
      const html = clone.outerHTML;
      return html
        // Remove whitespace between tags
        .replace(/>\s+</g, '><')
        // Remove leading/trailing whitespace
        .replace(/^\s+|\s+$/gm, '')
        // Collapse multiple spaces into one
        .replace(/\s+/g, ' ')
        // Remove spaces around = in attributes
        .replace(/\s*=\s*/g, '=')
        .trim();
    });

    // Capture screenshots
    const aboveFold = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    const fullPage = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: true });

    const pageLoadTime = Date.now() - startTime;

    return {
      compressedHTML,
      url,
      scrapedAt: new Date().toISOString(),
      method: 'playwright-advanced',
      pageLoadTime,
      screenshots: {
        aboveFold: aboveFold.toString('base64'),
        fullPage: fullPage.toString('base64'),
      },
    };

  } catch (error) {
    console.error('Advanced Playwright analyzer error:', error);
    throw new Error(`Failed to analyze page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
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
  return {
    args: chromiumModule.args ?? [],
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
    if (nodeMajorVersion >= 22) { runtime = 'nodejs22.x'; lambdaLibPath = '/tmp/al2023/lib'; }
    else if (nodeMajorVersion >= 20) { runtime = 'nodejs20.x'; lambdaLibPath = '/tmp/al2023/lib'; }
    else if (nodeMajorVersion >= 18) { runtime = 'nodejs18.x'; lambdaLibPath = '/tmp/al2/lib'; }
  }
  process.env.AWS_EXECUTION_ENV ??= `AWS_Lambda_${runtime}`;
  process.env.AWS_LAMBDA_JS_RUNTIME ??= runtime;
  const candidateLibPaths = new Set<string>([lambdaLibPath, '/tmp/al2/lib', '/tmp/al2023/lib']);
  const existingLdPath = process.env.LD_LIBRARY_PATH ?? '';
  existingLdPath.split(':').filter(Boolean).forEach((p) => candidateLibPaths.add(p));
  process.env.LD_LIBRARY_PATH = Array.from(candidateLibPaths).join(':');
  process.env.FONTCONFIG_PATH ??= '/tmp/fonts';
  process.env.HOME ??= process.env.HOME && process.env.HOME !== '/' ? process.env.HOME : '/tmp';
  process.env.TMPDIR ??= '/tmp';
  const pathEntries = new Set<string>((process.env.PATH ?? '').split(':').filter(Boolean));
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
