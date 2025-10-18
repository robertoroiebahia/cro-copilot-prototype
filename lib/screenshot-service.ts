import { chromium, devices, type Browser, type Page } from 'playwright';

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

/**
 * Result of capturing specific page sections
 */
export interface PageSectionsResult {
  hero: string;              // Always present - first section or hero area
  socialProof?: string;       // Optional - reviews/testimonials/ratings
  cta?: string;              // Optional - primary call-to-action button
  fullPage: string;          // Always present - full page reference
  metadata: {
    heroSelector: string;    // CSS selector used for hero
    socialProofFound: boolean;
    ctaFound: boolean;
    viewport: 'desktop' | 'mobile';
  };
}

interface CacheEntry {
  value: ScreenshotResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const NAVIGATION_TIMEOUT_MS = 45_000; // Increased timeout for slower sites
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
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled', // Hide automation
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--allow-running-insecure-content',
        '--disable-blink-features=BlockCredentialedSubresources',
      ],
    });

    try {
      const desktop = await this.captureWithContext(
        browser,
        {
          viewport: { width: 1920, height: 1080 },
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          locale: 'en-US',
          timezoneId: 'America/New_York',
        },
        url,
        options,
      );

      const mobileDevice = devices['iPhone 13'];
      const mobile = await this.captureWithContext(
        browser,
        {
          ...mobileDevice,
          locale: 'en-US',
          timezoneId: 'America/New_York',
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
      hasTouch: true,
      permissions: ['geolocation'],
      colorScheme: 'light',
    });

    // Add extra headers to look more like a real browser
    await context.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
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

    // Inject scripts to mask automation
    await page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Add chrome object
      (window as any).chrome = {
        runtime: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);

      // Add plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Add languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    try {
      await this.navigate(page, url, options.waitForNetworkIdle !== false);

      // Random mouse movement to simulate human behavior
      await page.mouse.move(100, 100);
      await page.mouse.move(200, 200);

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
      // Try multiple navigation strategies for robustness
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });

      // Wait for body to be present
      await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

      if (waitForIdle) {
        try {
          await page.waitForLoadState('networkidle', {
            timeout: 8_000,
          });
        } catch {
          // Fallback: wait for load state
          try {
            await page.waitForLoadState('load', { timeout: 5_000 });
          } catch {
            // Ignored; proceed with best-effort capture.
          }
        }
      }
    } catch (error: any) {
      // More detailed error handling
      if (error?.name === 'TimeoutError') {
        console.log('Page navigation timed out, attempting best-effort capture');
        // Don't throw - try to capture anyway
      } else if (error?.message?.includes('net::ERR_')) {
        throw new Error('Failed to load the page - network error');
      } else {
        console.error('Navigation error:', error);
        // Don't throw - try to capture anyway
      }
    }

    // Allow dynamic content to settle after network idle.
    // Increased wait time for heavy JavaScript sites
    await page.waitForTimeout(2500);

    // Scroll to trigger lazy loading
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
    } catch {
      // Ignore scroll errors
    }
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

  /**
   * Captures specific sections of a page (hero, social proof, CTA)
   *
   * @param url - The URL to capture
   * @param viewport - 'desktop' (1440x900) or 'mobile' (375x812)
   * @returns Promise with base64-encoded screenshots of each section
   *
   * @example
   * ```typescript
   * const service = new ScreenshotService();
   * const sections = await service.capturePageSections('https://example.com', 'desktop');
   * console.log(sections.hero); // base64 string
   * ```
   */
  async capturePageSections(
    url: string,
    viewport: 'desktop' | 'mobile' = 'desktop'
  ): Promise<PageSectionsResult> {
    const normalizedUrl = this.normalizeUrl(url);

    // Set viewport dimensions based on device type
    const viewportConfig = viewport === 'desktop'
      ? { width: 1440, height: 900 }
      : { width: 375, height: 812 };

    let browser: Browser | null = null;

    try {
      // Step 1: Launch headless browser with anti-bot detection
      console.log(`🚀 Launching browser for ${viewport} capture...`);
      browser = await chromium.launch({
        headless: true,
        timeout: 15000, // 15 second timeout
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });

      // Step 2: Create browser context with realistic settings
      const context = await browser.newContext({
        viewport: viewportConfig,
        userAgent: viewport === 'desktop'
          ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
          : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });

      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      // Step 3: Navigate to the URL
      console.log(`📄 Navigating to ${normalizedUrl}...`);
      await page.goto(normalizedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      // Wait for body and dynamic content
      await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000); // Let JavaScript settle

      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 3);
      });
      await page.waitForTimeout(300);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);

      // Step 4: Capture full page screenshot first (for reference)
      console.log('📸 Capturing full page...');
      const fullPageBuffer = await page.screenshot({
        type: 'png',
        fullPage: true,
        timeout: 10000,
      });
      const fullPage = fullPageBuffer.toString('base64');

      // Step 5: Find and capture HERO section
      console.log('🎯 Looking for hero section...');
      let heroSelector = '';
      let heroBuffer: Buffer | null = null;

      // Try multiple selectors for hero section
      const heroSelectors = [
        '[class*="hero" i]',           // Any class containing "hero"
        '[id*="hero" i]',              // Any ID containing "hero"
        'header section:first-of-type', // First section in header
        'main > section:first-child',   // First section in main
        'section:first-of-type',        // First section on page
        'main > div:first-child',       // First div in main
      ];

      for (const selector of heroSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const boundingBox = await element.boundingBox();
            if (boundingBox && boundingBox.height > 100) { // Must be substantial
              heroSelector = selector;
              heroBuffer = await element.screenshot({ type: 'png' });
              console.log(`✓ Hero found with selector: ${selector}`);
              break;
            }
          }
        } catch (error) {
          // Try next selector
          continue;
        }
      }

      // Fallback: If no hero found, capture above-the-fold
      if (!heroBuffer) {
        console.log('⚠️  No hero section found, using above-the-fold');
        heroSelector = 'viewport (above-the-fold)';
        heroBuffer = await page.screenshot({
          type: 'png',
          clip: {
            x: 0,
            y: 0,
            width: viewportConfig.width,
            height: Math.min(viewportConfig.height, 800),
          },
        });
      }

      const hero = heroBuffer.toString('base64');

      // Step 6: Find and capture SOCIAL PROOF section (optional)
      console.log('⭐ Looking for social proof...');
      let socialProof: string | undefined;
      let socialProofFound = false;

      const socialProofSelectors = [
        '[class*="review" i]',
        '[class*="testimonial" i]',
        '[class*="rating" i]',
        '[class*="stars" i]',
        '[data-testid*="review" i]',
        '[class*="customer" i][class*="review" i]',
      ];

      for (const selector of socialProofSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const boundingBox = await element.boundingBox();
            if (boundingBox && boundingBox.height > 50) {
              const buffer = await element.screenshot({ type: 'png' });
              socialProof = buffer.toString('base64');
              socialProofFound = true;
              console.log(`✓ Social proof found with selector: ${selector}`);
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }

      if (!socialProofFound) {
        console.log('⚠️  No social proof section found');
      }

      // Step 7: Find and capture PRIMARY CTA button (optional)
      console.log('🔘 Looking for primary CTA...');
      let cta: string | undefined;
      let ctaFound = false;

      const ctaSelectors = [
        'button[class*="cta" i]',
        'a[class*="cta" i]',
        '[class*="primary" i][class*="button" i]',
        'button[class*="buy" i]',
        'button[class*="add-to-cart" i]',
        'button[class*="get-started" i]',
        '[role="button"][class*="primary" i]',
      ];

      for (const selector of ctaSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const boundingBox = await element.boundingBox();
            if (boundingBox && boundingBox.width > 60) { // Must be button-sized
              const buffer = await element.screenshot({ type: 'png' });
              cta = buffer.toString('base64');
              ctaFound = true;
              console.log(`✓ CTA found with selector: ${selector}`);
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }

      if (!ctaFound) {
        console.log('⚠️  No primary CTA found');
      }

      // Step 8: Close browser and return results
      await context.close();
      await browser.close();
      browser = null;

      console.log('✅ Screenshot capture complete');

      return {
        hero,
        socialProof,
        cta,
        fullPage,
        metadata: {
          heroSelector,
          socialProofFound,
          ctaFound,
          viewport,
        },
      };

    } catch (error: any) {
      console.error('❌ Screenshot capture failed:', error.message);

      // Ensure browser is closed on error
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }

      throw new Error(`Failed to capture page sections: ${error.message}`);
    }
  }
}
