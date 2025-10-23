// TEST ROUTE: Simulate subscription cancellation
// GET /api/test/cancel-subscription
// REMOVE THIS FILE IN PRODUCTION!

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('TEST: Simulating subscription cancellation for user:', user.id);

    // Simulate what the webhook does when subscription is cancelled
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: 'free',
        status: 'cancelled',
        stripe_subscription_id: null,
        stripe_price_id: null,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('TEST: Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel subscription', details: updateError },
        { status: 500 }
      );
    }

    console.log('TEST: Subscription cancelled, downgraded to free plan');

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled and downgraded to free plan',
      user_id: user.id,
    });

  } catch (error) {
    console.error('TEST: Error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
