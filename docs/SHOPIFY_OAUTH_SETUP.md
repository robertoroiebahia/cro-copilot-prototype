# Shopify OAuth Setup Guide

This guide explains how to set up Shopify OAuth for the CRO Copilot app.

## Prerequisites

- Shopify Partner account
- Your app deployed to a public URL (or use ngrok for local development)

## Step 1: Create Shopify Partner Account

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Sign up for a free account
3. Complete your profile

## Step 2: Create a Custom App

1. In your Shopify Partner dashboard, go to **Apps**
2. Click **Create app** → **Create app manually**
3. Fill in the app details:
   - **App name**: CRO Copilot (or your preferred name)
   - **App URL**: `https://your-domain.com` (your app's public URL)
   - **Allowed redirection URL(s)**:
     ```
     https://your-domain.com/api/shopify/callback
     ```
     For local development with ngrok:
     ```
     https://your-ngrok-id.ngrok.io/api/shopify/callback
     ```

## Step 3: Configure App Scopes

In your app settings, configure the following scopes under **API access**:

### Required Scopes:
- `read_orders` - Access order data
- `read_products` - Access product catalog
- `read_customers` - Access customer information
- `read_analytics` - Access analytics data

## Step 4: Get API Credentials

1. In your app's settings, go to **API credentials**
2. Copy the following:
   - **API key** (Client ID)
   - **API secret key** (Client Secret)

## Step 5: Add to Environment Variables

Add the credentials to your `.env.local` file:

```bash
# Shopify OAuth
SHOPIFY_API_KEY=your-api-key-here
SHOPIFY_API_SECRET=your-api-secret-here

# Your app URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 6: Run Database Migrations

Run the OAuth states migration:

```bash
# Using Supabase CLI
supabase db push

# Or run the migration file directly
psql $DATABASE_URL < supabase/migrations/022_oauth_states.sql
```

## Testing OAuth Flow

### Local Development with ngrok:

1. Start ngrok:
   ```bash
   ngrok http 3000
   ```

2. Update your `.env.local`:
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-ngrok-id.ngrok.io
   ```

3. Update Shopify app settings with the ngrok URL

4. Start your dev server:
   ```bash
   npm run dev
   ```

5. Test the OAuth flow:
   - Navigate to `/analyze/shopify-orders`
   - Click "Connect Shopify"
   - Enter your test store domain
   - Authorize the app
   - You should be redirected back with a success message

## OAuth Flow Diagram

```
User
  ↓
[Enter shop domain]
  ↓
GET /api/shopify/auth?shop=mystore&workspaceId=xxx
  ↓
[Generate state token, store in DB]
  ↓
Redirect to Shopify OAuth
  ↓
User authorizes app
  ↓
Shopify redirects to callback
  ↓
GET /api/shopify/callback?code=xxx&state=xxx&shop=xxx
  ↓
[Verify state, exchange code for token]
  ↓
[Store encrypted token in DB]
  ↓
Redirect to success page
```

## Security Features

1. **State Token (CSRF Protection)**
   - Random 32-byte token generated per request
   - Stored in database with 10-minute expiry
   - Verified during callback

2. **Token Encryption**
   - Access tokens encrypted using AES-256-GCM
   - Encryption key stored in environment variables
   - Tokens decrypted only when needed

3. **HMAC Validation**
   - Shopify callback parameters validated via HMAC
   - Prevents tampering

4. **Workspace Isolation**
   - Row Level Security ensures users only access their data
   - Each connection tied to specific workspace

## Troubleshooting

### "App not installed" error
- Make sure your app URL and redirect URL are correctly configured in Shopify
- Verify SHOPIFY_API_KEY matches your app's API key

### "Invalid state" error
- State tokens expire after 10 minutes
- Clear expired states: `SELECT cleanup_expired_oauth_states();`

### "OAuth callback failed"
- Check server logs for detailed error messages
- Verify ENCRYPTION_KEY is set in environment
- Ensure database migrations have run

### HMAC validation failed
- Verify SHOPIFY_API_SECRET is correct
- Check that callback URL hasn't been modified

## Production Checklist

- [ ] Shopify Partner app created
- [ ] Production domain configured in app settings
- [ ] Environment variables set in production
- [ ] Database migrations run
- [ ] HTTPS enabled (required by Shopify)
- [ ] Test OAuth flow on production domain
- [ ] Monitor error logs for OAuth issues

## API Routes

- `GET /api/shopify/auth` - Initiate OAuth flow
- `GET /api/shopify/callback` - OAuth callback handler
- `GET /api/shopify/connections` - List connections
- `POST /api/shopify/connections` - Create connection (manual token)
- `PUT /api/shopify/connections` - Update connection
- `DELETE /api/shopify/connections` - Delete connection

## Resources

- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [Shopify API Scopes](https://shopify.dev/docs/api/usage/access-scopes)
- [Shopify Partner Dashboard](https://partners.shopify.com)
