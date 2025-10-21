# 🚀 Workspace Migration Execution Plan

**Critical Priority Migration**
**Estimated Time:** 2-4 hours
**Risk Level:** Medium (has rollback plan)
**Status:** Ready for execution

---

## 📋 Overview

This migration adds `workspace_id` to all user data tables, enabling the multi-workspace architecture. Without this migration, the workspace system you just built **will not work**.

### What Gets Updated
- ✅ `analyses` table
- ✅ `insights` table
- ✅ `themes` table
- ✅ `hypotheses` table
- ✅ `experiments` table

### What Happens to Existing Data
- Creates "Default Workspace" for all existing users
- All existing data gets assigned to the default workspace
- **No data is deleted**
- User experience remains unchanged for existing users

---

## ⚠️ Pre-Migration Checklist

### 1. Backup Your Database

```bash
# Using Supabase CLI
supabase db dump -f backup_before_workspace_migration.sql

# Or via Supabase Dashboard:
# Project Settings → Database → Backups → Create manual backup
```

**✅ Verify backup exists before proceeding**

### 2. Verify Current State

```bash
# Check if workspaces table exists
psql $DATABASE_URL -c "SELECT COUNT(*) FROM public.workspaces;"

# Check how many users you have
psql $DATABASE_URL -c "SELECT COUNT(*) FROM public.profiles;"

# Check how many analyses exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM public.analyses;"
```

### 3. Check for Active Users

**Important:** If you have active users, schedule this migration during low-traffic hours.

### 4. Review Migration Files

Files created:
- ✅ `011_add_workspace_id_to_all_tables.sql` - Main migration
- ✅ `011_add_workspace_id_to_all_tables_ROLLBACK.sql` - Rollback script

---

## 🎯 Step-by-Step Execution

### Phase 1: Test in Development First

**Never run migrations directly in production without testing!**

#### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Make sure you're in project directory
cd /Users/robertobahia/Projects/cro-copilot-prototype

# 2. Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# 3. Run migration locally first
supabase db reset  # This resets local dev database

# 4. Check migration status
supabase migration list

# 5. Apply the migration locally
supabase db push

# 6. Verify it worked
supabase db diff
```

#### Option B: Using psql Directly

```bash
# Development database
export DEV_DB_URL="your_dev_database_url"

# 1. Run migration
psql $DEV_DB_URL -f supabase/migrations/011_add_workspace_id_to_all_tables.sql

# 2. Check for errors in output
# Look for "Migration 011 completed successfully" message

# 3. Verify columns were added
psql $DEV_DB_URL -c "
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE column_name = 'workspace_id'
  AND table_schema = 'public'
  ORDER BY table_name;
"
```

### Phase 2: Verify Migration Worked

Run these verification queries:

```sql
-- 1. Check all tables have workspace_id
SELECT
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE column_name = 'workspace_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Expected output: 5 rows (analyses, experiments, hypotheses, insights, themes)

-- 2. Check all existing data has workspace_id populated
SELECT 'analyses' as table_name, COUNT(*) as total, COUNT(workspace_id) as with_workspace
FROM analyses
UNION ALL
SELECT 'insights', COUNT(*), COUNT(workspace_id) FROM insights
UNION ALL
SELECT 'themes', COUNT(*), COUNT(workspace_id) FROM themes
UNION ALL
SELECT 'hypotheses', COUNT(*), COUNT(workspace_id) FROM hypotheses
UNION ALL
SELECT 'experiments', COUNT(*), COUNT(workspace_id) FROM experiments;

-- Expected: total should equal with_workspace for all tables

-- 3. Check default workspaces were created
SELECT
  w.name,
  w.user_id,
  COUNT(a.id) as analysis_count
FROM workspaces w
LEFT JOIN analyses a ON a.workspace_id = w.id
GROUP BY w.id, w.name, w.user_id
ORDER BY w.created_at;

-- 4. Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('analyses', 'insights', 'themes', 'hypotheses', 'experiments')
ORDER BY tablename, policyname;

-- Expected: Should see "in their workspaces" policies, not "their own" policies
```

### Phase 3: Test Application Functionality

Before moving to production, test your app:

```bash
# 1. Start your development server
npm run dev

# 2. Test these critical flows:
```

**Test Checklist:**
- [ ] Login works
- [ ] Can see existing workspaces
- [ ] Can view existing analyses in workspace
- [ ] Can create new analysis (check it saves with workspace_id)
- [ ] Can view insights
- [ ] Can create hypothesis
- [ ] Can create experiment
- [ ] Switching workspaces shows different data
- [ ] Navigation lock works (disabled when no workspace)

### Phase 4: Production Deployment

⚠️ **Only proceed if all development tests passed**

```bash
# 1. Final backup of production database
supabase db dump --db-url="$PROD_DB_URL" -f backup_prod_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migration to production
psql $PROD_DB_URL -f supabase/migrations/011_add_workspace_id_to_all_tables.sql

# 3. Watch for errors
# If you see "Migration 011 completed successfully" - you're good!

# 4. Run verification queries (from Phase 2)
psql $PROD_DB_URL -c "SELECT table_name FROM information_schema.columns WHERE column_name = 'workspace_id';"
```

### Phase 5: Monitor Production

After deployment:

1. **Check error logs** for 15-30 minutes
2. **Monitor user activity** - make sure users can still access their data
3. **Test a few critical user journeys** yourself
4. Have the **rollback script ready** just in case

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# EMERGENCY ROLLBACK
psql $DATABASE_URL -f supabase/migrations/011_add_workspace_id_to_all_tables_ROLLBACK.sql

# This will:
# - Remove workspace_id columns
# - Restore old user_id-based RLS policies
# - Keep all your data intact
# - Keep workspaces table (in case you want to retry)
```

**When to Rollback:**
- Migration fails halfway through
- Data integrity issues detected
- Application breaking errors after deployment
- Users reporting access issues

**After Rollback:**
1. Investigate the error
2. Fix the issue
3. Test the fix in development
4. Re-run migration

---

## 🔧 Next Steps: Update API Routes

After migration succeeds, you **MUST** update your API routes to use `workspace_id`.

### Critical API Routes to Update:

1. **`/app/api/analyze-v2/route.ts`** ← Most critical
2. `/app/api/insights/route.ts`
3. `/app/api/themes/route.ts`
4. `/app/api/hypotheses/route.ts`
5. `/app/api/experiments/route.ts`

I'll create detailed examples for updating these routes after you confirm the migration succeeded.

---

## ⚡ Quick Reference Commands

```bash
# Check migration status
supabase migration list

# Test locally
supabase db reset && supabase db push

# Backup production
supabase db dump -f backup.sql

# Apply to production
psql $PROD_DB_URL -f supabase/migrations/011_add_workspace_id_to_all_tables.sql

# Verify
psql $PROD_DB_URL -c "SELECT COUNT(*) FROM information_schema.columns WHERE column_name = 'workspace_id';"

# Rollback if needed
psql $PROD_DB_URL -f supabase/migrations/011_add_workspace_id_to_all_tables_ROLLBACK.sql
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "workspaces table does not exist"

**Solution:** Run migration 010 first:
```bash
psql $DATABASE_URL -f supabase/migrations/010_complete_workspace_ga4_system.sql
```

### Issue 2: "column workspace_id already exists"

**Solution:** Migration is idempotent. This is safe. Check if data is populated:
```sql
SELECT COUNT(*) FROM analyses WHERE workspace_id IS NULL;
```

### Issue 3: RLS policy conflicts

**Solution:** The migration drops old policies before creating new ones. If you get conflicts:
```sql
-- Manually drop all old policies
DROP POLICY IF EXISTS "Users can view their own analyses" ON analyses;
-- (repeat for all tables)
```

### Issue 4: "NOT NULL violation" during backfill

**Solution:** This means some records couldn't find a workspace. Check:
```sql
-- Find orphaned records
SELECT * FROM analyses WHERE user_id NOT IN (SELECT id FROM profiles);

-- Create missing workspaces
INSERT INTO workspaces (user_id, name)
SELECT DISTINCT user_id, 'Default Workspace'
FROM analyses
WHERE user_id NOT IN (SELECT user_id FROM workspaces);
```

---

## 📊 Expected Results

After successful migration:

```
✅ 5 tables updated with workspace_id column
✅ All existing data preserved
✅ Default workspaces created (1 per user)
✅ All data assigned to default workspace
✅ RLS policies updated (workspace-aware)
✅ Indexes created for performance
✅ Foreign keys cascade on workspace deletion
```

---

## 🆘 Need Help?

If you encounter issues:

1. **Check migration output** - Look for error messages
2. **Run verification queries** - Identify what failed
3. **Check Supabase logs** - Dashboard → Logs
4. **Review RLS policies** - Dashboard → Database → Policies
5. **Rollback if critical** - Use rollback script
6. **Ask for help** - Share error messages and which step failed

---

## ✅ Post-Migration Checklist

After migration completes:

- [ ] Verified all 5 tables have workspace_id
- [ ] Verified all existing data has workspace_id populated
- [ ] Verified default workspaces created
- [ ] Tested login/logout
- [ ] Tested viewing existing data
- [ ] Tested creating new data
- [ ] Tested workspace switching
- [ ] Updated API routes (see next section)
- [ ] Deployed frontend with API changes
- [ ] Monitored for errors for 24 hours
- [ ] Updated documentation

---

## 🎓 Understanding the Migration

**Why this approach?**

1. **Safety First:** Creates default workspaces before touching data
2. **Idempotent:** Can be run multiple times safely (uses IF NOT EXISTS)
3. **Backward Compatible:** Keeps user_id column (don't need it, but safe)
4. **Data Integrity:** Foreign keys cascade, indexes for performance
5. **Rollback Ready:** Can revert without data loss

**What could go wrong?**
- Missing workspaces table (fix: run migration 010)
- Orphaned records (fix: create missing workspaces)
- RLS policy conflicts (fix: drop old policies first)
- Performance during backfill (mitigate: run during low traffic)

---

## 📝 Timeline

| Phase | Duration | Can Skip? |
|-------|----------|-----------|
| Backup | 5 min | ❌ No |
| Dev Testing | 30-60 min | ❌ No |
| Verification | 15 min | ❌ No |
| Production Deploy | 5 min | - |
| Monitoring | 30 min | ⚠️ Risky |
| **Total** | **1.5-2 hours** | - |

---

## 🚀 Ready to Start?

**Your next command:**

```bash
# 1. Create backup
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test in development
supabase db reset && supabase db push

# 3. If successful, tell me and we'll update the API routes next!
```

Good luck! 🍀
