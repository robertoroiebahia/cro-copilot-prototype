# Quick Fixes for Critical Issues

## 1. Enable TypeScript Strict Mode ✅

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,  // ✅ Enable
    "noUncheckedIndexedAccess": true,  // ✅ Add
    "noImplicitReturns": true,  // ✅ Add
    // ... rest of config
  }
}
```

**Then run**: `npm run type-check` and fix errors

---

## 2. Add Authentication to API Routes ✅

**File**: `app/api/analyze-v2/route.ts`

**Before**:
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, userId } = body;  // ❌ Trusting client
```

**After**:
```typescript
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  // ✅ Verify authentication
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { url, options = {} } = body;
  const userId = user.id;  // ✅ From session

  // ... rest of route
}
```

---

## 3. Add Rate Limiting ⚡

**Option A**: Upstash Redis (Recommended)

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Create**: `lib/utils/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 requests per minute per user
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});
```

**Usage in route**:
```typescript
import { ratelimit } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ Rate limit check
  const { success, limit, reset, remaining } = await ratelimit.limit(user.id);

  if (!success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit,
        reset,
        remaining,
      },
      { status: 429 }
    );
  }

  // ... rest of route
}
```

---

## 4. Add Environment Validation ✅

**Create**: `lib/utils/env.ts`

```typescript
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'OPENAI_API_KEY',
  'FIRECRAWL_API_KEY',
] as const;

export function validateEnv() {
  if (typeof window !== 'undefined') return; // Client-side

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}`
    );
  }

  console.log('✅ All required environment variables present');
}
```

**Add to**: `middleware.ts` or `app/layout.tsx`

```typescript
import { validateEnv } from '@/lib/utils/env';

// In middleware or root layout
validateEnv();
```

---

## 5. Add Package Scripts ✅

**File**: `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:migrate": "supabase migration new"
  }
}
```

---

## Order of Execution

1. **Fix #5** (package scripts) - 2 min
2. **Fix #4** (env validation) - 10 min
3. **Fix #2** (authentication) - 15 min
4. **Fix #3** (rate limiting) - 30 min
5. **Fix #1** (strict mode) - 2-3 hours

**Total**: ~4 hours for production-ready state

---

## Testing After Fixes

```bash
# 1. Type check
npm run type-check

# 2. Build
npm run build

# 3. Test API locally
curl -X POST http://localhost:3000/api/analyze-v2 \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Should return 401 Unauthorized (no auth)

# 4. Test with auth (use Supabase client)
# Login → get session token → retry
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All 5 quick fixes applied
- [ ] TypeScript compiles with `strict: true`
- [ ] Environment variables set in Vercel
- [ ] Rate limiting configured (Upstash account)
- [ ] Database migration applied (`supabase db push`)
- [ ] Tested API with real authentication
- [ ] Monitored first 100 requests
- [ ] Set up error tracking (Sentry)

---

**Estimated Time**: 4 hours to production-ready ✅
