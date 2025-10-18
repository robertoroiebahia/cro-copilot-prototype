/**
 * CHEERIO ANALYZER
 * Lightweight static HTML parser - fetches and cleans HTML without browser rendering
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

export interface PageAnalysisResult {
  compressedHTML: string; // Compressed HTML without scripts - ready for AI
  url: string;
  scrapedAt: string;
  method: 'cheerio-static';
}

export async function analyzePage(url: string): Promise<PageAnalysisResult> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);

    // Remove all script tags and noscript tags for clean HTML
    $('script').remove();
    $('noscript').remove();

    // Remove inline event handlers
    $('*').each((_, el) => {
      const element = $(el);
      if (el.type === 'tag') {
        const attributes = Object.keys(el.attribs || {});
        attributes.forEach(attr => {
          if (attr.startsWith('on')) {
            element.removeAttr(attr);
          }
        });
      }
    });

    // Get clean HTML and compress it
    const cleanHTML = $.html();

    // Compress HTML: remove extra whitespace, line breaks, comments
    const compressedHTML = cleanHTML
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove whitespace between tags
      .replace(/>\s+</g, '><')
      // Remove leading/trailing whitespace
      .replace(/^\s+|\s+$/gm, '')
      // Collapse multiple spaces into one
      .replace(/\s+/g, ' ')
      // Remove spaces around = in attributes
      .replace(/\s*=\s*/g, '=')
      // Trim the result
      .trim();

    return {
      compressedHTML,
      url,
      scrapedAt: new Date().toISOString(),
      method: 'cheerio-static',
    };
  } catch (error) {
    console.error('Cheerio analyzer error:', error);
    throw new Error(`Failed to analyze page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
