// API Route: Create Stripe Checkout Session
// POST /api/stripe/create-checkout-session

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/stripe-helpers';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { priceId, billingCycle } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || process.env.APP_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    // Success URL points to our callback route which will update the database
    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email!,
      priceId,
      successUrl: `${origin}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/settings/billing?cancelled=true`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
