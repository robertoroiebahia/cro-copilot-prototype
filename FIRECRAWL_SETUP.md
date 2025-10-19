# Firecrawl Setup & Troubleshooting Guide

## Quick Setup (5 minutes)

### Step 1: Get Your Firecrawl API Key

1. Go to **https://firecrawl.dev**
2. Click **"Sign Up"** or **"Login"**
3. Go to your **Dashboard**
4. Find your **API Key** (starts with `fc-`)
5. Copy it to clipboard

### Step 2: Add API Key to Environment

Open `.env.local` in your project root and add:

```bash
FIRECRAWL_API_KEY=fc-your-actual-api-key-here
```

**Important:** Replace `fc-your-actual-api-key-here` with your real API key!

### Step 3: Restart Your Dev Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

**Environment variables are only loaded on server startup!**

### Step 4: Test the Connection

Run the test script:

```bash
node test-firecrawl.js
```

You should see:
```
✅ SUCCESS! Firecrawl is working correctly.
```

---

## Common Issues & Solutions

### ❌ Error: "401 Unauthorized - Invalid API key"

**Cause:** Your API key is missing, invalid, or incorrect.

**Solutions:**

1. **Check `.env.local` file:**
   ```bash
   cat .env.local | grep FIRECRAWL
   ```
   Should show: `FIRECRAWL_API_KEY=fc-...`

2. **Verify you have a real API key** (not the placeholder):
   - ❌ Wrong: `FIRECRAWL_API_KEY=your_firecrawl_api_key_here`
   - ✅ Correct: `FIRECRAWL_API_KEY=fc-cc6f1f1ef4b14e89b0632eb1eb52daf1`

3. **Get a new API key:**
   - Go to https://firecrawl.dev
   - Login to your account
   - Generate a new API key
   - Replace the old one in `.env.local`

4. **Restart your dev server:**
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

5. **Test with the diagnostic script:**
   ```bash
   node test-firecrawl.js
   ```

---

### ❌ Error: "FIRECRAWL_API_KEY environment variable is required"

**Cause:** The `.env.local` file is missing or not loaded.

**Solutions:**

1. **Check if `.env.local` exists:**
   ```bash
   ls -la .env.local
   ```

2. **Create it if missing:**
   ```bash
   touch .env.local
   ```

3. **Add your API key:**
   ```bash
   echo "FIRECRAWL_API_KEY=fc-your-key-here" >> .env.local
   ```

4. **Restart dev server:**
   ```bash
   npm run dev
   ```

---

### ❌ Error: "429 Rate limit exceeded"

**Cause:** You've hit Firecrawl's rate limits for your plan.

**Solutions:**

1. **Check your usage:**
   - Go to https://firecrawl.dev/dashboard
   - View your usage and limits

2. **Wait a moment:**
   - Rate limits typically reset every minute/hour

3. **Upgrade your plan:**
   - Click "Upgrade" in Firecrawl dashboard
   - Get higher rate limits

4. **Implement caching:**
   - Already built-in! Cache TTL is 5 minutes
   - Don't scrape the same URL repeatedly

---

### ❌ Error: "402 Payment required"

**Cause:** Your Firecrawl credits are depleted.

**Solutions:**

1. **Check your credits:**
   - https://firecrawl.dev/dashboard
   - View remaining credits

2. **Add credits:**
   - Click "Add Credits" in dashboard
   - Or upgrade to a paid plan

3. **Free tier:**
   - Firecrawl free tier has limited credits
   - Consider upgrading for production use

---

### ❌ Dev server shows old Playwright errors

**Cause:** Old code is cached or dependencies not cleaned.

**Solutions:**

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   ```

2. **Remove Playwright dependencies:**
   ```bash
   npm uninstall playwright-core puppeteer puppeteer-core @sparticuz/chromium
   ```

3. **Reinstall dependencies:**
   ```bash
   npm install
   ```

4. **Restart dev server:**
   ```bash
   npm run dev
   ```

---

### ❌ Vercel deployment fails

**Cause:** Environment variable not set on Vercel.

**Solutions:**

1. **Go to Vercel dashboard:**
   - https://vercel.com/dashboard
   - Select your project
   - Go to **Settings → Environment Variables**

2. **Add the variable:**
   - Name: `FIRECRAWL_API_KEY`
   - Value: `fc-your-actual-key`
   - Environment: **Production**, **Preview**, **Development**

3. **Redeploy:**
   ```bash
   vercel --prod
   ```

---

## Testing Your Setup

### Test Script (Recommended)

Run this first to verify everything works:

```bash
node test-firecrawl.js
```

Expected output:
```
🔍 Testing Firecrawl API Connection...

✓ API Key found: fc-cc6f1f...
  Length: 44 characters

🌐 Testing API with example.com...

📡 Response status: 200 OK

✅ SUCCESS! Firecrawl is working correctly.

Response preview:
  - Success: true
  - Markdown length: 156 chars
  - Title: Example Domain
  - Status code: 200
  - Credits used: 1

📄 Markdown preview (first 200 chars):
   # Example Domain

   This domain is for use in documentation examples...

✅ Your Firecrawl integration is ready to use!
   You can now run your Next.js app with: npm run dev
```

---

### Manual API Test (Advanced)

Test Firecrawl API directly with curl:

```bash
curl -X POST https://api.firecrawl.dev/v1/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-your-key-here" \
  -d '{
    "url": "https://example.com",
    "formats": ["markdown"]
  }'
```

Should return JSON with `success: true`.

---

### Test Your Next.js App

Once the test script passes, test your app:

```bash
# Start dev server
npm run dev

# In another terminal, test the analyze endpoint
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "llm": "gpt"
  }'
```

Should return analysis results without errors.

---

## Environment Variables Checklist

Make sure you have all required variables in `.env.local`:

```bash
# ✅ Required for Firecrawl
FIRECRAWL_API_KEY=fc-your-key-here

# ✅ Required for AI analysis
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# ✅ Required for database
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

---

## Debugging Tips

### Enable Verbose Logging

The Firecrawl client already logs key information:

```typescript
// You'll see these in your console:
🔑 Firecrawl API key loaded: fc-cc6f1...
🌐 Firecrawl scraping: https://example.com
📝 Scraping with options: { formats: [...], mobile: true }
✅ Firecrawl scrape completed: https://example.com
📄 Markdown length: 5000 chars
📸 Screenshot: YES
```

### Check Server Logs

When running `npm run dev`, watch for:
- ✅ Green checkmarks = success
- ❌ Red X's = errors
- 🔑 Key icon = API key loaded

### Verify API Key Format

Firecrawl API keys should:
- Start with `fc-`
- Be 40-50 characters long
- Contain only alphanumeric characters and dashes

Example valid format: `fc-cc6f1f1ef4b14e89b0632eb1eb52daf1`

---

## Production Deployment (Vercel)

### 1. Set Environment Variables on Vercel

```bash
vercel env add FIRECRAWL_API_KEY
# Paste your API key when prompted
```

Or via dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add `FIRECRAWL_API_KEY`
5. Check all environments (Production, Preview, Development)

### 2. Deploy

```bash
vercel --prod
```

### 3. Verify Deployment

Check your deployed site logs:
- Vercel Dashboard → Your Project → Deployments → [Latest] → Functions
- Look for the green checkmark: `🔑 Firecrawl API key loaded`

---

## Cost Monitoring

### Track Your Usage

1. **Firecrawl Dashboard:** https://firecrawl.dev/dashboard
   - View credits used
   - See scrape history
   - Monitor rate limits

2. **Built-in Caching:**
   - Same URL scraped twice within 5 minutes = 1 credit (not 2)
   - Cache stats: `getFirecrawlClient().getCacheStats()`

3. **Optimize Usage:**
   - Use `onlyMainContent: true` (default)
   - Use `removeBase64Images: true` for smaller responses
   - Batch scrape multiple URLs: `scrapeMultiple([url1, url2, ...])`
   - Use `map()` before scraping to discover relevant URLs

---

## Support Resources

- **Firecrawl Docs:** https://docs.firecrawl.dev
- **Firecrawl Discord:** https://discord.gg/firecrawl
- **Firecrawl Status:** https://status.firecrawl.dev
- **Test Script:** `node test-firecrawl.js`
- **Migration Guide:** `FIRECRAWL_MIGRATION.md`

---

## Quick Reference Commands

```bash
# Test Firecrawl connection
node test-firecrawl.js

# Check environment variables
cat .env.local | grep FIRECRAWL

# Restart dev server
npm run dev

# Clear Next.js cache
rm -rf .next && npm run dev

# Remove old dependencies
npm uninstall playwright-core puppeteer puppeteer-core @sparticuz/chromium

# Deploy to Vercel
vercel --prod
```

---

**Still having issues?** Run the test script and share the output:

```bash
node test-firecrawl.js > firecrawl-test-output.txt 2>&1
cat firecrawl-test-output.txt
```
