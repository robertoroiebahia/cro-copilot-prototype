import { createClient } from '@/utils/supabase/server';
import { FUNNEL_EVENTS } from './ga4-sync';

export interface FunnelStep {
  name: string;
  event: string;
  users: number;
  conversion_rate: number; // % from total landing users
  drop_off: number; // Users lost from previous step
  drop_off_rate: number; // % drop-off from previous step
}

export interface FunnelData {
  steps: FunnelStep[];
  overall_cvr: number;
  total_landing_users: number;
  total_purchases: number;
}

export type SegmentType =
  | 'all_users'
  | 'device_mobile'
  | 'device_desktop'
  | 'device_tablet'
  | 'channel_direct'
  | 'channel_email'
  | 'channel_organic'
  | 'channel_paid'
  | 'channel_social'
  | 'user_new'
  | 'user_returning'
  | 'country_us'
  | 'country_non_us'
  | 'landing_homepage'
  | 'landing_product'
  | 'landing_collection'
  | 'landing_blog';

interface SegmentConfig {
  type: SegmentType;
  label: string;
  filter?: (row: any) => boolean;
}

// Define all segments to track
const SEGMENTS: SegmentConfig[] = [
  { type: 'all_users', label: 'All Users' },
  {
    type: 'device_mobile',
    label: 'Mobile',
    filter: (row) => row.device_category === 'mobile',
  },
  {
    type: 'device_desktop',
    label: 'Desktop',
    filter: (row) => row.device_category === 'desktop',
  },
  {
    type: 'device_tablet',
    label: 'Tablet',
    filter: (row) => row.device_category === 'tablet',
  },
  {
    type: 'channel_direct',
    label: 'Direct',
    filter: (row) => row.channel?.toLowerCase().includes('direct'),
  },
  {
    type: 'channel_email',
    label: 'Email',
    filter: (row) => row.channel?.toLowerCase().includes('email'),
  },
  {
    type: 'channel_organic',
    label: 'Organic Search',
    filter: (row) => row.channel?.toLowerCase().includes('organic'),
  },
  {
    type: 'channel_paid',
    label: 'Paid',
    filter: (row) =>
      row.channel?.toLowerCase().includes('paid') ||
      row.channel?.toLowerCase().includes('cpc'),
  },
  {
    type: 'channel_social',
    label: 'Social',
    filter: (row) => row.channel?.toLowerCase().includes('social'),
  },
  {
    type: 'user_new',
    label: 'New Users',
    filter: (row) => row.user_type === 'new',
  },
  {
    type: 'user_returning',
    label: 'Returning Users',
    filter: (row) => row.user_type === 'returning',
  },
  {
    type: 'country_us',
    label: 'United States',
    filter: (row) => row.country === 'United States' || row.country === 'US',
  },
  {
    type: 'country_non_us',
    label: 'International',
    filter: (row) => row.country !== 'United States' && row.country !== 'US',
  },
  {
    type: 'landing_homepage',
    label: 'Homepage Landing',
    filter: (row) => row.landing_page_category === 'homepage',
  },
  {
    type: 'landing_product',
    label: 'Product Page Landing',
    filter: (row) => row.landing_page_category === 'product',
  },
  {
    type: 'landing_collection',
    label: 'Collection Page Landing',
    filter: (row) => row.landing_page_category === 'collection',
  },
  {
    type: 'landing_blog',
    label: 'Blog Landing',
    filter: (row) => row.landing_page_category === 'blog',
  },
];

/**
 * Fetch raw events for date range
 */
async function fetchRawEvents(
  workspaceId: string,
  startDate: string,
  endDate: string
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ga4_raw_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('event_date', startDate)
    .lte('event_date', endDate);

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  return data || [];
}

/**
 * Calculate funnel for a segment
 */
function calculateFunnel(events: any[], segment: SegmentConfig): FunnelData {
  // Filter events by segment
  const filteredEvents = segment.filter
    ? events.filter(segment.filter)
    : events;

  // Group by event name and sum users
  const eventUsers: Record<string, number> = {};

  for (const event of filteredEvents) {
    if (!eventUsers[event.event_name]) {
      eventUsers[event.event_name] = 0;
    }
    eventUsers[event.event_name] += event.total_users;
  }

  // Build funnel steps
  const stepConfigs = [
    { name: 'Landing', event: 'session_start' },
    { name: 'Product View', event: 'view_item' },
    { name: 'Add to Cart', event: 'add_to_cart' },
    { name: 'Checkout', event: 'begin_checkout' },
    { name: 'Purchase', event: 'purchase' },
  ];

  const steps: FunnelStep[] = [];
  let previousUsers = 0;

  for (let i = 0; i < stepConfigs.length; i++) {
    const config = stepConfigs[i];
    if (!config) continue;

    const users = eventUsers[config.event] || 0;
    const landingUsers = eventUsers['session_start'] || 0;

    const conversionRate = landingUsers > 0 ? (users / landingUsers) * 100 : 0;
    const dropOff = i > 0 ? previousUsers - users : 0;
    const dropOffRate = previousUsers > 0 ? (dropOff / previousUsers) * 100 : 0;

    steps.push({
      name: config.name,
      event: config.event,
      users,
      conversion_rate: Number(conversionRate.toFixed(2)),
      drop_off: dropOff,
      drop_off_rate: Number(dropOffRate.toFixed(2)),
    });

    previousUsers = users;
  }

  const landingUsers = eventUsers['session_start'] || 0;
  const purchases = eventUsers['purchase'] || 0;
  const overallCvr = landingUsers > 0 ? (purchases / landingUsers) * 100 : 0;

  return {
    steps,
    overall_cvr: Number(overallCvr.toFixed(2)),
    total_landing_users: landingUsers,
    total_purchases: purchases,
  };
}

/**
 * Store calculated funnel
 */
async function storeFunnel(
  workspaceId: string,
  startDate: string,
  endDate: string,
  segment: SegmentConfig,
  funnelData: FunnelData
) {
  const supabase = createClient();

  const { error } = await supabase.from('ga4_calculated_funnels').upsert(
    {
      workspace_id: workspaceId,
      start_date: startDate,
      end_date: endDate,
      segment_type: segment.type,
      segment_label: segment.label,
      funnel_data: funnelData,
      total_landing_users: funnelData.total_landing_users,
      total_purchases: funnelData.total_purchases,
      overall_cvr: funnelData.overall_cvr,
      calculated_at: new Date().toISOString(),
    },
    {
      onConflict: 'workspace_id,segment_type,start_date,end_date',
    }
  );

  if (error) {
    throw new Error(`Failed to store funnel: ${error.message}`);
  }
}

/**
 * Calculate all funnels for a workspace and date range
 */
export async function calculateFunnels(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; funnelsCount: number; error?: string }> {
  try {
    // Fetch raw events
    const events = await fetchRawEvents(workspaceId, startDate, endDate);

    if (events.length === 0) {
      return {
        success: true,
        funnelsCount: 0,
        error: 'No events found for this date range',
      };
    }

    // Calculate funnel for each segment
    let funnelsCount = 0;

    for (const segment of SEGMENTS) {
      const funnelData = calculateFunnel(events, segment);

      // Only store if we have landing users
      if (funnelData.total_landing_users > 0) {
        await storeFunnel(workspaceId, startDate, endDate, segment, funnelData);
        funnelsCount++;
      }
    }

    return {
      success: true,
      funnelsCount,
    };
  } catch (error) {
    console.error('Funnel calculation failed:', error);
    return {
      success: false,
      funnelsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate funnels for common date ranges
 */
export async function calculateStandardFunnels(workspaceId: string) {
  const today = new Date();
  const results = [];

  // Last 7 days
  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);
  results.push(
    await calculateFunnels(
      workspaceId,
      last7Days.toISOString().split('T')[0]!,
      today.toISOString().split('T')[0]!
    )
  );

  // Last 30 days
  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);
  results.push(
    await calculateFunnels(
      workspaceId,
      last30Days.toISOString().split('T')[0]!,
      today.toISOString().split('T')[0]!
    )
  );

  // Last 90 days
  const last90Days = new Date(today);
  last90Days.setDate(last90Days.getDate() - 90);
  results.push(
    await calculateFunnels(
      workspaceId,
      last90Days.toISOString().split('T')[0]!,
      today.toISOString().split('T')[0]!
    )
  );

  return results;
}

/**
 * Get calculated funnel for a segment
 */
export async function getFunnel(
  workspaceId: string,
  segmentType: SegmentType,
  startDate: string,
  endDate: string
): Promise<FunnelData | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ga4_calculated_funnels')
    .select('funnel_data')
    .eq('workspace_id', workspaceId)
    .eq('segment_type', segmentType)
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .single();

  if (error || !data) {
    return null;
  }

  return data.funnel_data as FunnelData;
}

/**
 * Get all funnels for a date range
 */
export async function getAllFunnels(
  workspaceId: string,
  startDate: string,
  endDate: string
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ga4_calculated_funnels')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .order('overall_cvr', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch funnels: ${error.message}`);
  }

  return data || [];
}
