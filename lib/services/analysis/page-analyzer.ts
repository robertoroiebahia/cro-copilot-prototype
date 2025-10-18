/**
 * Page Analysis Service
 * Extracts content, compressed HTML, and screenshots from web pages using Playwright
 */

import { chromium, devices } from 'playwright';

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

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      timeout: 30000,
    });

    // Capture desktop version
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    const desktopPage = await desktopContext.newPage();

    // Navigate with fallback
    try {
      await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (e) {
      console.log('Page analyzer: networkidle timeout, trying domcontentloaded...');
      await desktopPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
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

    // Capture desktop screenshots
    const desktopAboveFold = await desktopPage.screenshot({
      type: 'png',
      fullPage: false,
    });
    const desktopFullPage = await desktopPage.screenshot({
      type: 'png',
      fullPage: true,
    });

    await desktopContext.close();

    // Capture mobile version
    const mobileDevice = devices['iPhone 13'];
    const mobileContext = await browser.newContext({
      ...mobileDevice,
      ignoreHTTPSErrors: true,
    });

    const mobilePage = await mobileContext.newPage();

    try {
      await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (e) {
      await mobilePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }

    await mobilePage.waitForTimeout(1500);

    // Capture mobile screenshots
    const mobileAboveFold = await mobilePage.screenshot({
      type: 'png',
      fullPage: false,
    });
    const mobileFullPage = await mobilePage.screenshot({
      type: 'png',
      fullPage: true,
    });

    await mobileContext.close();

    const pageLoadTime = Date.now() - startTime;

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
    console.error('Playwright analyzer error:', error);
    throw new Error(`Failed to analyze page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

