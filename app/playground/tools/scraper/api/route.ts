/**
 * Scraper Testing API
 * Runs all 3 analyzers and returns their results for comparison
 * Cheerio (static HTML), Playwright (browser), Playwright Advanced (comprehensive analysis)
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerioAnalyzer from '../analyzers/cheerio-analyzer';
import * as playwrightAnalyzer from '../analyzers/playwright-analyzer';
import * as playwrightAdvancedAnalyzer from '../analyzers/playwright-advanced-analyzer';

// Timeout for scrapers
export const maxDuration = 30; // 30 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const results = {
      cheerio: { raw: null as any, formatted: '', html: '', error: null as string | null, executionTime: 0 },
      playwright: { raw: null as any, formatted: '', html: '', error: null as string | null, executionTime: 0 },
      playwrightAdvanced: { raw: null as any, formatted: '', html: '', error: null as string | null, executionTime: 0 },
    };

    // Fetch raw HTML first (for Cheerio reference - static HTML)
    let rawHTML = '';
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        timeout: 10000,
      });
      rawHTML = typeof data === 'string' ? data : JSON.stringify(data);
    } catch (error) {
      rawHTML = 'Failed to fetch raw HTML: ' + (error instanceof Error ? error.message : 'Unknown error');
    }

    // Test Cheerio Analyzer
    const cheerioStart = Date.now();
    try {
      const cheerioResult = await cheerioAnalyzer.analyzePage(url);
      results.cheerio.raw = cheerioResult;
      results.cheerio.formatted = cheerioResult.compressedHTML; // Pass compressed HTML directly
      results.cheerio.html = cheerioResult.compressedHTML;
      results.cheerio.executionTime = Date.now() - cheerioStart;
    } catch (error) {
      results.cheerio.error = error instanceof Error ? error.message : 'Unknown error';
      results.cheerio.executionTime = Date.now() - cheerioStart;
    }

    // Test Playwright Analyzer
    const playwrightStart = Date.now();
    try {
      const playwrightResult = await playwrightAnalyzer.analyzePage(url);
      results.playwright.raw = playwrightResult;
      results.playwright.formatted = playwrightResult.compressedHTML; // Pass compressed HTML directly
      results.playwright.html = playwrightResult.compressedHTML;
      results.playwright.executionTime = Date.now() - playwrightStart;
    } catch (error) {
      console.error('Playwright error:', error);
      results.playwright.error = error instanceof Error ? error.message : 'Unknown error';
      results.playwright.executionTime = Date.now() - playwrightStart;
    }

    // Test Advanced Playwright Analyzer
    const playwrightAdvancedStart = Date.now();
    try {
      const playwrightAdvancedResult = await playwrightAdvancedAnalyzer.analyzePage(url);
      results.playwrightAdvanced.raw = playwrightAdvancedResult;
      results.playwrightAdvanced.formatted = playwrightAdvancedResult.compressedHTML; // Pass compressed HTML directly
      results.playwrightAdvanced.html = playwrightAdvancedResult.compressedHTML;
      results.playwrightAdvanced.executionTime = Date.now() - playwrightAdvancedStart;
    } catch (error) {
      console.error('Playwright Advanced error:', error);
      results.playwrightAdvanced.error = error instanceof Error ? error.message : 'Unknown error';
      results.playwrightAdvanced.executionTime = Date.now() - playwrightAdvancedStart;
    }

    return NextResponse.json({ success: true, url, results });

  } catch (error) {
    console.error('Scraper test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
