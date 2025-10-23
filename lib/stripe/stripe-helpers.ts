// Stripe Helper Functions
// Utilities for Stripe integration

import { stripe } from './stripe-client';
import { createClient } from '@/utils/supabase/server';

/**
 * Create or retrieve Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const supabase = await createClient();

  // Check if user already has a Stripe customer ID
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // Update subscription with Stripe customer ID
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Failed to update subscription with customer ID:', updateError);
    throw new Error('Failed to link Stripe customer to subscription');
  }

  return customer.id;
}

/**
 * Create Stripe Checkout Session for upgrading to Pro
 * Uses client_reference_id to link back to user after checkout
 */
export async function createCheckoutSession({
  userId,
  email,
  priceId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  // Note: We don't pre-create the customer anymore
  // Stripe will create it during checkout, and we'll link it in the callback

  const session = await stripe.checkout.sessions.create({
    customer_email: email, // Let Stripe create the customer
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId, // This is how we identify the user in the callback
    metadata: {
      user_id: userId,
    },
    allow_promotion_codes: true, // Enable promo codes
  });

  return session;
}

/**
 * Create Stripe Billing Portal Session
 * Allows users to manage their subscription, payment methods, etc.
 * Inspired by Next.js SaaS Starter pattern
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  // Check if portal configuration exists, if not create one
  const configurations = await stripe.billingPortal.configurations.list({
    limit: 1,
  });

  let configurationId: string | undefined;

  if (configurations.data.length === 0) {
    console.log('No billing portal configuration found, creating default configuration');

    // Get products to enable subscription updates
    const products = await stripe.products.list({
      active: true,
      limit: 10,
    });

    const proPrices = await stripe.prices.list({
      active: true,
      limit: 10,
    });

    // Create a default configuration
    const configuration = await stripe.billingPortal.configurations.create({
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity'],
          proration_behavior: 'always_invoice',
          products: products.data
            .filter(p => p.active)
            .map(product => ({
              product: product.id,
              prices: proPrices.data
                .filter(price => price.product === product.id && price.active)
                .map(price => price.id),
            }))
            .filter(p => p.prices.length > 0),
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'customer_service',
              'too_complex',
              'low_quality',
              'other',
            ],
          },
        },
        payment_method_update: {
          enabled: true,
        },
      },
      business_profile: {
        headline: 'Manage your subscription',
      },
    });

    configurationId = configuration.id;
    console.log('Created billing portal configuration:', configurationId);
  } else {
    configurationId = configurations.data[0]?.id;
    if (!configurationId) {
      throw new Error('No billing portal configuration found');
    }
  }

  // Create portal session with configuration
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    configuration: configurationId,
  });

  return session;
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Reactivate a cancelled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Get Stripe subscription details
 */
export async function getStripeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}
