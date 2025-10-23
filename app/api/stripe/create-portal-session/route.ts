// API Route: Create Stripe Billing Portal Session
// POST /api/stripe/create-portal-session

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createPortalSession } from '@/lib/stripe/stripe-helpers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Creating portal session for user:', user.id);

    // Get user's Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    console.log('Subscription data:', subscription);

    if (!subscription?.stripe_customer_id) {
      console.error('No Stripe customer ID found for user:', user.id);
      return NextResponse.json(
        { error: 'No Stripe customer found. Please contact support.' },
        { status: 404 }
      );
    }

    const origin = request.headers.get('origin') || process.env.APP_URL || 'http://localhost:3000';

    console.log('Creating portal session with customer:', subscription.stripe_customer_id);

    // Create portal session
    const session = await createPortalSession({
      customerId: subscription.stripe_customer_id,
      returnUrl: `${origin}/settings/billing`,
    });

    console.log('Portal session created:', session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create portal session', details: errorMessage },
      { status: 500 }
    );
  }
}
