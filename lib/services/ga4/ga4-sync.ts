import { google } from 'googleapis';
import { createClient } from '@/utils/supabase/server';

// Funnel events we're tracking
export const FUNNEL_EVENTS = [
  'session_start',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'purchase',
] as const;

export type FunnelEvent = typeof FUNNEL_EVENTS[number];

interface GA4EventData {
  event_date: string;
  event_name: FunnelEvent;
  event_count: number;
  total_users: number;
  sessions: number;
  device_category: string | null;
  channel: string | null;
  user_type: string | null;
  country: string | null;
  landing_page_path: string | null;
}

/**
 * Categorize landing page path
 */
function categorizeLandingPage(path: string | null): string {
  if (!path) return 'other';

  const lowerPath = path.toLowerCase();

  if (lowerPath === '/' || lowerPath === '/home' || lowerPath === '/index') {
    return 'homepage';
  }

  if (lowerPath.includes('/product') || lowerPath.includes('/p/')) {
    return 'product';
  }

  if (lowerPath.includes('/collection') || lowerPath.includes('/category')) {
    return 'collection';
  }

  if (lowerPath.includes('/blog') || lowerPath.includes('/article')) {
    return 'blog';
  }

  return 'other';
}

/**
 * Get GA4 client with workspace credentials
 */
async function getGA4Client(workspaceId: string) {
  const supabase = createClient();

  // Get workspace GA4 credentials
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('ga4_property_id, ga4_refresh_token')
    .eq('id', workspaceId)
    .single();

  if (error || !workspace) {
    throw new Error('Workspace not found');
  }

  if (!workspace.ga4_property_id || !workspace.ga4_refresh_token) {
    throw new Error('GA4 not configured for this workspace. Please connect Google Analytics.');
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Set refresh token
  oauth2Client.setCredentials({
    refresh_token: workspace.ga4_refresh_token,
  });

  // Create Analytics Data API client
  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth: oauth2Client,
  });

  return {
    analyticsData,
    propertyId: String(workspace.ga4_property_id),
  };
}

/**
 * Fetch GA4 event data for a date range
 */
export async function fetchGA4Events(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<GA4EventData[]> {
  const { analyticsData, propertyId } = await getGA4Client(workspaceId);

  const events: GA4EventData[] = [];

  // Fetch data for each funnel event
  for (const eventName of FUNNEL_EVENTS) {
    try {
      const response = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'date' },
            { name: 'eventName' },
            { name: 'deviceCategory' },
            { name: 'sessionDefaultChannelGroup' },
            { name: 'newVsReturning' },
            { name: 'country' },
            { name: 'landingPagePath' },
          ],
          metrics: [
            { name: 'eventCount' },
            { name: 'totalUsers' },
            { name: 'sessions' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              stringFilter: {
                value: eventName,
                matchType: 'EXACT',
              },
            },
          },
          limit: 10000, // Max rows per request
        },
      });

      // Process rows
      if (response.data.rows) {
        for (const row of response.data.rows) {
          const dimensions = row.dimensionValues || [];
          const metrics = row.metricValues || [];

          events.push({
            event_date: dimensions[0]?.value || '',
            event_name: eventName,
            event_count: parseInt(metrics[0]?.value || '0'),
            total_users: parseInt(metrics[1]?.value || '0'),
            sessions: parseInt(metrics[2]?.value || '0'),
            device_category: dimensions[2]?.value?.toLowerCase() || null,
            channel: dimensions[3]?.value || null,
            user_type: dimensions[4]?.value?.toLowerCase() || null,
            country: dimensions[5]?.value || null,
            landing_page_path: dimensions[6]?.value || null,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${eventName} events:`, error);
      // Continue with other events even if one fails
    }
  }

  return events;
}

/**
 * Store GA4 events in database
 */
export async function storeGA4Events(
  workspaceId: string,
  events: GA4EventData[]
): Promise<void> {
  if (events.length === 0) return;

  const supabase = createClient();

  // Transform events for database
  const dbEvents = events.map(event => ({
    workspace_id: workspaceId,
    event_date: event.event_date,
    event_name: event.event_name,
    event_count: event.event_count,
    total_users: event.total_users,
    sessions: event.sessions,
    device_category: event.device_category,
    channel: event.channel,
    user_type: event.user_type,
    country: event.country,
    landing_page_path: event.landing_page_path,
    landing_page_category: categorizeLandingPage(event.landing_page_path),
  }));

  // Batch insert (Supabase handles upserts)
  const BATCH_SIZE = 1000;
  for (let i = 0; i < dbEvents.length; i += BATCH_SIZE) {
    const batch = dbEvents.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('ga4_raw_events')
      .upsert(batch, {
        onConflict: 'workspace_id,event_date,event_name,device_category,channel,user_type,country',
      });

    if (error) {
      console.error('Failed to store events batch:', error);
      throw error;
    }
  }
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(workspaceId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('workspaces')
    .update({ ga4_last_sync_at: new Date().toISOString() })
    .eq('id', workspaceId);

  if (error) {
    console.error('Failed to update last sync:', error);
  }
}

/**
 * Sync GA4 data for a workspace
 */
export async function syncGA4Data(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; eventsCount: number; error?: string }> {
  try {
    // Fetch events from GA4
    const events = await fetchGA4Events(workspaceId, startDate, endDate);

    // Store in database
    await storeGA4Events(workspaceId, events);

    // Update last sync
    await updateLastSync(workspaceId);

    return {
      success: true,
      eventsCount: events.length,
    };
  } catch (error) {
    console.error('GA4 sync failed:', error);
    return {
      success: false,
      eventsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync last 90 days for initial sync
 */
export async function syncInitialData(workspaceId: string) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return syncGA4Data(workspaceId, startDate, endDate);
}

/**
 * Sync yesterday's data (daily sync)
 */
export async function syncDailyData(workspaceId: string) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateStr = yesterday.toISOString().split('T')[0];

  return syncGA4Data(workspaceId, dateStr, dateStr);
}
