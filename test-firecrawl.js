/**
 * Firecrawl Test Script
 * Run this to verify your Firecrawl API key is working
 *
 * Usage: node test-firecrawl.js
 */

// Load .env.local manually (no dotenv dependency needed)
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
} catch (error) {
  console.error('❌ Could not load .env.local file');
}

async function testFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  console.log('🔍 Testing Firecrawl API Connection...\n');

  // Check if API key exists
  if (!apiKey) {
    console.error('❌ ERROR: FIRECRAWL_API_KEY not found in .env.local');
    console.error('   Please add your Firecrawl API key to .env.local');
    console.error('   Get your key from: https://firecrawl.dev\n');
    process.exit(1);
  }

  console.log(`✓ API Key found: ${apiKey.substring(0, 10)}...`);
  console.log(`  Length: ${apiKey.length} characters\n`);

  // Test API with a simple scrape
  console.log('🌐 Testing API with example.com...\n');

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('\n❌ API Error:');
      console.error(JSON.stringify(errorData, null, 2));

      if (response.status === 401) {
        console.error('\n💡 TIP: Your API key appears to be invalid.');
        console.error('   1. Go to https://firecrawl.dev');
        console.error('   2. Log in to your account');
        console.error('   3. Get a new API key');
        console.error('   4. Update FIRECRAWL_API_KEY in .env.local');
        console.error('   5. Restart your dev server');
      }

      process.exit(1);
    }

    const result = await response.json();

    console.log('\n✅ SUCCESS! Firecrawl is working correctly.\n');
    console.log('Response preview:');
    console.log('  - Success:', result.success);
    console.log('  - Markdown length:', result.data?.markdown?.length || 0, 'chars');
    console.log('  - Title:', result.data?.metadata?.title);
    console.log('  - Status code:', result.data?.metadata?.statusCode);
    console.log('  - Credits used:', result.data?.metadata?.creditsUsed);

    if (result.data?.markdown) {
      console.log('\n📄 Markdown preview (first 200 chars):');
      console.log('  ', result.data.markdown.substring(0, 200) + '...');
    }

    console.log('\n✅ Your Firecrawl integration is ready to use!');
    console.log('   You can now run your Next.js app with: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Connection Error:');
    console.error(error.message);
    console.error('\n💡 TIP: Check your internet connection');
    process.exit(1);
  }
}

// Run the test
testFirecrawl();
