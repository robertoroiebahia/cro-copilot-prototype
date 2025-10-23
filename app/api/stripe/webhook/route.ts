// API Route: Stripe Webhook Handler
// POST /api/stripe/webhook
// Handles Stripe events (subscription created, updated, cancelled, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe-client';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

// This is important - we need the raw body for webhook signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, supabase);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice, supabase);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, supabase);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Helper functions for each webhook event

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in session metadata');
    return;
  }

  console.log('Checkout completed for user:', userId);

  // Subscription will be updated via subscription.created event
  // Just log here for now
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const customerId = subscription.customer as string;

  // Find subscription by Stripe customer ID
  // Note: stripe_customer_id should already exist (set by checkout callback)
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!existingSub) {
    console.error('No subscription found for customer:', customerId);
    console.error('The checkout callback should have created/updated the subscription with this customer_id');
    return;
  }

  const userId = existingSub.user_id;

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let planId = 'pro'; // Default to pro
  let billingCycle = 'monthly';

  // Get plan from pricing_plans table
  const { data: plan } = await supabase
    .from('pricing_plans')
    .select('id, stripe_price_id_monthly, stripe_price_id_annual')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
    .maybeSingle();

  if (plan) {
    planId = plan.id;
    billingCycle = plan.stripe_price_id_annual === priceId ? 'annual' : 'monthly';
  }

  // Type assertion for subscription data (webhook subscriptions have these properties)
  const subscriptionData = subscription as unknown as {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    canceled_at?: number | null;
  };

  // Update subscription with latest data from Stripe
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      plan_id: planId,
      status: subscriptionData.status,
      billing_cycle: billingCycle,
      stripe_subscription_id: subscriptionData.id,
      stripe_price_id: priceId,
      current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
      cancelled_at: subscriptionData.canceled_at
        ? new Date(subscriptionData.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  if (updateError) {
    console.error('Error updating subscription:', updateError);
    return;
  }

  console.log('Subscription updated via webhook for user:', userId, '-> Plan:', planId, 'Status:', subscriptionData.status);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!existingSub) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // Downgrade to free plan
  await supabase
    .from('subscriptions')
    .update({
      plan_id: 'free',
      status: 'cancelled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', existingSub.user_id);

  console.log('Subscription cancelled, downgraded to free:', existingSub.user_id);
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  const customerId = invoice.customer as string;
  console.log('Payment succeeded for customer:', customerId);

  // Subscription status will be updated via subscription.updated event
  // Could send a "payment successful" email here
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  const customerId = invoice.customer as string;

  // Get user by Stripe customer ID
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!existingSub) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // Update subscription status to past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', existingSub.user_id);

  console.log('Payment failed for user:', existingSub.user_id);
  // Could send a "payment failed" email here
}
