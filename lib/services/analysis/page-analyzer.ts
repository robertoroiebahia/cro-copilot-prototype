/**
 * Page Analysis Service
 * Extracts content and metadata from web pages using Cheerio
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

export interface PageAnalysisResult {
  h1: string;
  subheadline: string;
  headlines: string[];
  ctas: string[];
  formFields: number;
  hasReviews: boolean;
  reviewCount: number;
  hasTrustBadges: boolean;
  hasUrgency: boolean;
  hasSocialProof: boolean;
  hasMoneyBackGuarantee: boolean;
  hasFreeShipping: boolean;
  fullText: string;
  meta: {
    title: string;
    description: string;
  };
}

/**
 * Analyzes a web page and extracts key conversion elements
 */
export async function analyzePage(url: string): Promise<PageAnalysisResult> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);

    return {
      h1: $('h1').first().text().trim() || 'Not found',
      subheadline: $('h2').first().text().trim() || '',
      headlines: $('h2, h3')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(h => h.length > 0)
        .slice(0, 10),
      ctas: $('button, a.btn, [class*="button"], [class*="cta"], [class*="add-to-cart"]')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(cta => cta.length > 0 && cta.length < 50)
        .slice(0, 15),
      formFields: $('input, select, textarea').length,
      hasReviews: $('[class*="review"], [class*="rating"], [class*="stars"], [class*="testimonial"]').length > 0,
      reviewCount: $('[class*="review"], [class*="testimonial"]').length,
      hasTrustBadges: $('[class*="trust"], [class*="secure"], [class*="guarantee"], [class*="badge"], [class*="certified"]').length > 0,
      hasUrgency: /(limited|hurry|now|today|sale|ending|last chance|only.*left|selling fast)/i.test($.text()),
      hasSocialProof: /(customer|bought|purchased|rated|verified|reviews|testimonial|people love|bestseller)/i.test($.text()),
      hasMoneyBackGuarantee: /(money.back|satisfaction guaranteed|100% guarantee|risk.free|refund)/i.test($.text()),
      hasFreeShipping: /(free shipping|free delivery|ships free)/i.test($.text()),
      fullText: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000),
      meta: {
        title: $('title').text(),
        description: $('meta[name="description"]').attr('content') || '',
      },
    };
  } catch (error) {
    console.error('Page analysis error:', error);
    throw new Error(`Failed to analyze page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculates heuristic CRO score based on page elements
 */
export function calculateHeuristicScore(pageData: PageAnalysisResult): {
  score: number;
  maxScore: number;
  percentage: number;
  breakdown: Record<string, { present: boolean; points: number }>;
} {
  const breakdown = {
    'Clear H1 Headline': { present: pageData.h1 !== 'Not found' && pageData.h1.length > 0, points: 10 },
    'Subheadline': { present: pageData.subheadline.length > 0, points: 5 },
    'Call-to-Action Buttons': { present: pageData.ctas.length > 0, points: 15 },
    'Social Proof (Reviews/Testimonials)': { present: pageData.hasReviews, points: 10 },
    'Trust Badges/Security Indicators': { present: pageData.hasTrustBadges, points: 10 },
    'Urgency/Scarcity Elements': { present: pageData.hasUrgency, points: 8 },
    'Social Proof Language': { present: pageData.hasSocialProof, points: 7 },
    'Money-Back Guarantee': { present: pageData.hasMoneyBackGuarantee, points: 10 },
    'Free Shipping Offer': { present: pageData.hasFreeShipping, points: 8 },
    'Form Fields (Not Too Many)': { present: pageData.formFields > 0 && pageData.formFields <= 5, points: 7 },
    'SEO Meta Description': { present: pageData.meta.description.length > 0, points: 5 },
    'Clear Page Title': { present: pageData.meta.title.length > 0, points: 5 },
  };

  const score = Object.values(breakdown).reduce(
    (sum, item) => sum + (item.present ? item.points : 0),
    0
  );

  const maxScore = Object.values(breakdown).reduce((sum, item) => sum + item.points, 0);

  return {
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    breakdown,
  };
}
