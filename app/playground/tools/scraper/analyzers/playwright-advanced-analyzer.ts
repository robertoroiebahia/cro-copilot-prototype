/**
 * PLAYWRIGHT ADVANCED ANALYZER
 * Modern browser automation with comprehensive analysis
 */

import { chromium as playwright } from 'playwright-core';
import chromium from '@sparticuz/chromium';

export interface PageAnalysisResult {
  compressedHTML: string; // Compressed rendered HTML without scripts - ready for AI
  url: string;
  scrapedAt: string;
  method: 'playwright-advanced';
  pageLoadTime: number;
}

export async function analyzePage(url: string): Promise<PageAnalysisResult> {
  let browser;
  const startTime = Date.now();

  try {
    const isLocal = !process.env.VERCEL;
    const executablePath = isLocal ? undefined : await chromium.executablePath();

    browser = await playwright.launch({
      args: isLocal
        ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        : chromium.args,
      executablePath,
      headless: true,
      timeout: 30000,
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });

    const page = await context.newPage();

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

    const pageLoadTime = Date.now() - startTime;

    return {
      compressedHTML,
      url,
      scrapedAt: new Date().toISOString(),
      method: 'playwright-advanced',
      pageLoadTime,
    };

  } catch (error) {
    console.error('Advanced Playwright analyzer error:', error);
    throw new Error(`Failed to analyze page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
