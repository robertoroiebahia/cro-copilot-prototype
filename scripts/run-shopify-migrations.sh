#!/bin/bash

# Run Shopify migrations manually
# This script applies only the new Shopify-related migrations

echo "🚀 Running Shopify migrations..."
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "📋 Migrations to apply:"
echo "  • 021_shopify_order_analysis.sql"
echo "  • 022_oauth_states.sql"
echo ""

# Get project ref from URL
PROJECT_REF=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'/' -f3 | cut -d'.' -f1)

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Could not find Supabase project ref in .env.local"
    exit 1
fi

echo "📍 Project: $PROJECT_REF"
echo ""

# Link to project
supabase link --project-ref $PROJECT_REF

# Apply migrations
echo ""
echo "🔄 Applying migrations..."
supabase db push --dry-run

echo ""
echo "✅ Migrations ready to apply!"
echo ""
echo "To apply, run:"
echo "  supabase db push"
