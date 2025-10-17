import { chromium, devices, Browser, Page } from 'playwright';

export interface ScreenshotCapture {
  fullPage: string;
  aboveFold: string;
}

export interface ScreenshotResult {
  desktop: ScreenshotCapture;
  mobile: ScreenshotCapture;
  capturedAt: string;
}

export interface ScreenshotOptions {
  blockPatterns?: string[];
  waitForNetworkIdle?: boolean;
}

interface CacheEntry {
  value: ScreenshotResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const NAVIGATION_TIMEOUT_MS = 30_000;
const screenshotCache = new Map<string, CacheEntry>();
const inflightCaptures = new Map<string, Promise<ScreenshotResult>>();

export class ScreenshotService {
  async capturePageScreenshots(
    rawUrl: string,
    options: ScreenshotOptions = {},
  ): Promise<ScreenshotResult> {
    const url = this.normalizeUrl(rawUrl);
    const cacheKey = this.createCacheKey(url, options);
    const cached = this.fromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const existingCapture = inflightCaptures.get(cacheKey);
    if (existingCapture) {
      return existingCapture;
    }

    const capturePromise = this.performCapture(url, options)
      .then((result) => {
        this.storeInCache(cacheKey, result);
        inflightCaptures.delete(cacheKey);
        return result;
      })
      .catch((error) => {
        inflightCaptures.delete(cacheKey);
        throw error;
      });

    inflightCaptures.set(cacheKey, capturePromise);
    return capturePromise;
  }

  private fromCache(key: string): ScreenshotResult | undefined {
    const entry = screenshotCache.get(key);
    if (!entry) {
      return;
    }

    if (Date.now() > entry.expiresAt) {
      screenshotCache.delete(key);
      return;
    }

    return entry.value;
  }

  private storeInCache(key: string, value: ScreenshotResult) {
    screenshotCache.set(key, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  private createCacheKey(url: string, options: ScreenshotOptions): string {
    const blocked =
      options.blockPatterns && options.blockPatterns.length > 0
        ? options.blockPatterns.slice().sort().join('|')
        : 'none';
    const waitIdle = options.waitForNetworkIdle !== false ? 'idle' : 'no-idle';
    return `${url}|${blocked}|${waitIdle}`;
  }

  private async performCapture(
    url: string,
    options: ScreenshotOptions,
  ): Promise<ScreenshotResult> {
    const browser = await chromium.launch({ headless: true });

    try {
      const desktop = await this.captureWithContext(
        browser,
        {
          viewport: { width: 1920, height: 1080 },
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        url,
        options,
      );

      const mobileDevice = devices['iPhone 13'];
      const mobile = await this.captureWithContext(
        browser,
        {
          ...mobileDevice,
        },
        url,
        options,
      );

      return {
        desktop,
        mobile,
        capturedAt: new Date().toISOString(),
      };
    } finally {
      await browser.close();
    }
  }

  private async captureWithContext(
    browser: Browser,
    contextOptions: Parameters<Browser['newContext']>[0],
    url: string,
    options: ScreenshotOptions,
  ): Promise<ScreenshotCapture> {
    const context = await browser.newContext({
      ...contextOptions,
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
    });

    const blockers = this.buildRequestBlockers(options.blockPatterns);
    if (blockers.length > 0) {
      await context.route('**/*', (route) => {
        const requestUrl = route.request().url();
        if (blockers.some((regex) => regex.test(requestUrl))) {
          return route.abort();
        }
        return route.continue();
      });
    }

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

    try {
      await this.navigate(page, url, options.waitForNetworkIdle !== false);
      const aboveFold = await this.captureScreenshot(page, {
        fullPage: false,
      });
      const fullPage = await this.captureScreenshot(page, {
        fullPage: true,
      });

      return {
        aboveFold,
        fullPage,
      };
    } finally {
      await context.close();
    }
  }

  private async navigate(page: Page, url: string, waitForIdle: boolean) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });

      if (waitForIdle) {
        try {
          await page.waitForLoadState('networkidle', {
            timeout: 5_000,
          });
        } catch {
          // Ignored; proceed with best-effort capture.
        }
      }
    } catch (error: any) {
      if (error?.name === 'TimeoutError') {
        throw new Error('Timed out while loading the page');
      }
      throw new Error('Failed to load the page');
    }

    // Allow dynamic content to settle after network idle.
    await page.waitForTimeout(1500);
  }

  private async captureScreenshot(
    page: Page,
    options: Parameters<Page['screenshot']>[0],
  ): Promise<string> {
    try {
      const buffer = await page.screenshot({
        type: 'png',
        timeout: NAVIGATION_TIMEOUT_MS,
        ...options,
      });

      return buffer.toString('base64');
    } catch (error: any) {
      if (error?.name === 'TimeoutError') {
        throw new Error('Timed out while capturing screenshot');
      }
      throw new Error('Failed to capture screenshot');
    }
  }

  private normalizeUrl(url: string): string {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Invalid URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL protocol must be http or https');
    }

    // Normalize trailing slash for caching consistency.
    parsed.hash = '';
    const normalized =
      parsed.pathname === '/' && !parsed.search ? parsed.origin : parsed.toString();

    return normalized;
  }

  private buildRequestBlockers(patterns?: string[]): RegExp[] {
    if (!patterns || patterns.length === 0) {
      return [];
    }

    return patterns.map((pattern) => this.globToRegExp(pattern));
  }

  private globToRegExp(pattern: string): RegExp {
    const escaped = pattern.replace(/[-[\]/{}()+?.\\^$|]/g, '\\$&');
    const regex = escaped.replace(/\*/g, '.*');
    return new RegExp(regex, 'i');
  }
}
