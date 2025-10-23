// API Route: Stripe Checkout Success Callback
// GET /api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}
// Handles the redirect after successful Stripe checkout
// Updates the database with Stripe customer and subscription details

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe/stripe-client';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/settings/billing?error=no_session', request.url));
  }

  try {
    // Retrieve the checkout session with expanded customer and subscription
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (!session.customer || !session.subscription) {
      console.error('Session missing customer or subscription:', sessionId);
      return NextResponse.redirect(new URL('/settings/billing?error=invalid_session', request.url));
    }

    // Type assertions for expanded objects
    const customer = session.customer as Stripe.Customer;
    const subscription = session.subscription as Stripe.Subscription;
    const customerId = customer.id;
    const subscriptionId = subscription.id;

    // Get subscription details using type assertion since expanded objects have these properties
    const subscriptionData = subscription as unknown as {
      current_period_start: number;
      current_period_end: number;
      trial_end?: number | null;
      status: string;
    };

    const currentPeriodStart = subscriptionData.current_period_start;
    const currentPeriodEnd = subscriptionData.current_period_end;
    const trialEnd = subscriptionData.trial_end;

    // Get the price and product information
    const lineItem = subscription.items.data[0];
    if (!lineItem) {
      console.error('No line items in subscription:', subscriptionId);
      return NextResponse.redirect(new URL('/settings/billing?error=invalid_subscription', request.url));
    }

    const priceId = lineItem.price.id;
    const productId = typeof lineItem.price.product === 'string'
      ? lineItem.price.product
      : lineItem.price.product.id;

    // Get user from client_reference_id (set during checkout creation)
    const userId = session.client_reference_id;
    if (!userId) {
      console.error('No client_reference_id in session:', sessionId);
      return NextResponse.redirect(new URL('/settings/billing?error=no_user', request.url));
    }

    const supabase = await createClient();

    // Determine plan from price ID
    const { data: plan } = await supabase
      .from('pricing_plans')
      .select('id, stripe_price_id_monthly, stripe_price_id_annual')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
      .maybeSingle();

    const planId = plan?.id || 'pro';
    const billingCycle = plan?.stripe_price_id_annual === priceId ? 'annual' : 'monthly';

    // Check if user already has a subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSub) {
      // UPDATE existing subscription (user upgraded from free to pro)
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          status: subscriptionData.status,
          billing_cycle: billingCycle,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
          current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
          trial_ends_at: trialEnd
            ? new Date(trialEnd * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return NextResponse.redirect(new URL('/settings/billing?error=update_failed', request.url));
      }

      console.log('Successfully updated subscription for user:', userId, 'to plan:', planId);
    } else {
      // INSERT new subscription (user went straight to pro)
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: subscriptionData.status,
          billing_cycle: billingCycle,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
          current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
          trial_ends_at: trialEnd
            ? new Date(trialEnd * 1000).toISOString()
            : null,
        });

      if (insertError) {
        console.error('Error creating subscription:', insertError);
        return NextResponse.redirect(new URL('/settings/billing?error=create_failed', request.url));
      }

      console.log('Successfully created subscription for user:', userId, 'plan:', planId);
    }

    // Success! Redirect to billing page with success message
    return NextResponse.redirect(new URL('/settings/billing?success=true', request.url));

  } catch (error) {
    console.error('Error processing checkout session:', error);
    return NextResponse.redirect(new URL('/settings/billing?error=processing_failed', request.url));
  }
}
