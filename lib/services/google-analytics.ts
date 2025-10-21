import { createClient } from '@/utils/supabase/server';
import { google } from 'googleapis';

/**
 * Get Google Analytics client for the current user
 */
export async function getGoogleAnalyticsClient() {
  const supabase = createClient();

  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  // Check if we have a provider token (from OAuth)
  if (!session.provider_token) {
    throw new Error('No Google OAuth token found. Please sign in with Google.');
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Set credentials
  oauth2Client.setCredentials({
    access_token: session.provider_token,
    refresh_token: session.provider_refresh_token,
  });

  // Create Analytics client
  const analytics = google.analytics({
    version: 'v3',
    auth: oauth2Client,
  });

  // Create Analytics Data API (GA4) client
  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth: oauth2Client,
  });

  return {
    analytics,      // For Universal Analytics
    analyticsData,  // For GA4
    oauth2Client,
  };
}

/**
 * Get list of Google Analytics accounts
 */
export async function getAnalyticsAccounts() {
  const { analytics } = await getGoogleAnalyticsClient();

  const response = await analytics.management.accounts.list();
  return response.data.items || [];
}

/**
 * Get properties for an account
 */
export async function getAnalyticsProperties(accountId: string) {
  const { analytics } = await getGoogleAnalyticsClient();

  const response = await analytics.management.webproperties.list({
    accountId,
  });
  return response.data.items || [];
}

/**
 * Get views for a property
 */
export async function getAnalyticsViews(accountId: string, propertyId: string) {
  const { analytics } = await getGoogleAnalyticsClient();

  const response = await analytics.management.profiles.list({
    accountId,
    webPropertyId: propertyId,
  });
  return response.data.items || [];
}

/**
 * Get GA4 properties
 */
export async function getGA4Properties() {
  const { oauth2Client } = await getGoogleAnalyticsClient();

  const analyticsAdmin = google.analyticsadmin({
    version: 'v1beta',
    auth: oauth2Client,
  });

  const response = await analyticsAdmin.properties.list();
  return response.data.properties || [];
}

/**
 * Run a GA4 report
 */
export async function runGA4Report(
  propertyId: string,
  dateRange: { startDate: string; endDate: string },
  metrics: string[],
  dimensions?: string[]
) {
  const { analyticsData } = await getGoogleAnalyticsClient();

  const response = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [dateRange],
      metrics: metrics.map(name => ({ name })),
      dimensions: dimensions?.map(name => ({ name })),
    },
  });

  return response.data;
}

/**
 * Get pageviews for a date range (GA4)
 */
export async function getPageviews(
  propertyId: string,
  startDate: string,
  endDate: string
) {
  return runGA4Report(
    propertyId,
    { startDate, endDate },
    ['screenPageViews'],
    ['date']
  );
}

/**
 * Get conversions for a date range (GA4)
 */
export async function getConversions(
  propertyId: string,
  startDate: string,
  endDate: string
) {
  return runGA4Report(
    propertyId,
    { startDate, endDate },
    ['conversions', 'totalRevenue'],
    ['date']
  );
}

/**
 * Check if user has Google Analytics access
 */
export async function hasGoogleAnalyticsAccess(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    return !!(session?.provider_token);
  } catch {
    return false;
  }
}
