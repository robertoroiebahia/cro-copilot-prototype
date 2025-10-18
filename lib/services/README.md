# Services Layer

This directory contains all business logic for the Smart Nudge Builder application.

## 📁 Structure

```
services/
├── analysis/
│   └── page-analyzer.ts      # Web page scraping and analysis
├── database/
│   ├── analysis-repository.ts  # Analysis CRUD operations
│   └── profile-repository.ts   # Profile CRUD operations
├── index.ts                   # Central exports
└── README.md                  # This file
```

---

## 🎯 Design Principles

### 1. Single Responsibility
Each service has one clear purpose. Don't mix concerns.

✅ **Good**:
```typescript
// page-analyzer.ts - only handles page scraping
export async function analyzePage(url: string) { ... }
```

❌ **Bad**:
```typescript
// page-analyzer.ts - mixed concerns
export async function analyzeAndSavePage(url: string, userId: string) {
  // Scraping + database operations mixed
}
```

### 2. Dependency Injection
Services receive dependencies as parameters, not global imports.

✅ **Good**:
```typescript
class AnalysisRepository {
  constructor(private supabase: SupabaseClient) {}
}
```

❌ **Bad**:
```typescript
import { supabase } from '@/lib/supabase';
class AnalysisRepository {
  // Uses global supabase instance
}
```

### 3. Type Safety
All services use TypeScript with proper types.

✅ **Good**:
```typescript
export async function analyzePage(url: string): Promise<PageAnalysisResult> {
  // Return type is explicit
}
```

### 4. Error Handling
Services throw descriptive errors. Controllers handle them.

✅ **Good**:
```typescript
if (!data) {
  throw new Error(`Failed to fetch analysis: ${error.message}`);
}
```

---

## 📚 Service Documentation

### Analysis Services

#### `analyzePage(url: string)`
Scrapes and analyzes a web page for CRO elements.

**Returns**: `Promise<PageAnalysisResult>`

**Example**:
```typescript
import { analyzePage } from '@/lib/services';

const result = await analyzePage('https://example.com');
console.log(result.h1); // Main headline
console.log(result.ctas); // Call-to-action buttons
```

**What it checks**:
- Headlines (H1, H2, H3)
- Call-to-action buttons
- Form fields
- Trust indicators (reviews, badges)
- Urgency/scarcity elements
- Social proof
- Free shipping mentions
- Money-back guarantees

#### `calculateHeuristicScore(pageData: PageAnalysisResult)`
Calculates a CRO heuristic score from 0-100 based on best practices.

**Returns**:
```typescript
{
  score: number;        // Actual points earned
  maxScore: number;     // Maximum possible points
  percentage: number;   // Score as percentage
  breakdown: {
    [criteria: string]: {
      present: boolean;
      points: number;
    }
  }
}
```

**Example**:
```typescript
const pageData = await analyzePage(url);
const score = calculateHeuristicScore(pageData);

console.log(`CRO Score: ${score.percentage}%`);
console.log(`Passed ${Object.values(score.breakdown).filter(x => x.present).length} checks`);
```

---

### Database Services

#### `AnalysisRepository`
Handles all database operations for analyses.

**Methods**:

```typescript
// Create new analysis
await repo.create(analysisData);

// Get by ID
const analysis = await repo.getById(id, userId);

// List all for user
const analyses = await repo.listByUser(userId);

// Update status
await repo.updateStatus(id, userId, 'completed');

// Delete
await repo.delete(id, userId);
```

**Usage Example**:
```typescript
import { AnalysisRepository } from '@/lib/services';
import { createClient } from '@/utils/supabase/server';

const supabase = createClient();
const repo = new AnalysisRepository(supabase);

// Save analysis
const saved = await repo.create({
  user_id: user.id,
  url: 'https://example.com',
  summary: { headline: '...', confidence: 'high' },
  recommendations: [...],
  status: 'completed',
});

console.log('Saved with ID:', saved.id);
```

#### `ProfileRepository`
Handles all database operations for user profiles.

**Methods**:

```typescript
// Get profile
const profile = await repo.getById(userId);

// Create profile
await repo.create(userId, email);

// Ensure profile exists
await repo.ensureExists(userId, email);
```

**Usage Example**:
```typescript
import { ProfileRepository } from '@/lib/services';

const repo = new ProfileRepository(supabase);

// Ensure user has a profile
await repo.ensureExists(user.id, user.email);
```

---

## 🔧 Adding New Services

### 1. Create Service File

```typescript
// lib/services/example/my-service.ts
export interface MyServiceResult {
  // Define return type
}

export async function processData(input: string): Promise<MyServiceResult> {
  try {
    // Service logic here
    return result;
  } catch (error) {
    console.error('My service error:', error);
    throw new Error(`Failed to process: ${error.message}`);
  }
}
```

### 2. Export from Index

```typescript
// lib/services/index.ts
export * from './example/my-service';
```

### 3. Use in Route

```typescript
// app/api/example/route.ts
import { processData } from '@/lib/services';

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    const result = await processData(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## ✅ Testing Services

Services should be unit tested independently:

```typescript
// __tests__/services/page-analyzer.test.ts
import { analyzePage, calculateHeuristicScore } from '@/lib/services';

describe('analyzePage', () => {
  it('should extract H1 headline', async () => {
    const result = await analyzePage('https://example.com');
    expect(result.h1).toBeDefined();
    expect(result.h1.length).toBeGreaterThan(0);
  });
});

describe('calculateHeuristicScore', () => {
  it('should calculate score correctly', () => {
    const mockData = {
      h1: 'Test',
      hasReviews: true,
      hasTrustBadges: true,
      // ... other fields
    };

    const score = calculateHeuristicScore(mockData);
    expect(score.percentage).toBeGreaterThan(0);
    expect(score.percentage).toBeLessThanOrEqual(100);
  });
});
```

---

## 🔐 Security Considerations

### 1. Never expose secrets
❌ Don't hardcode API keys in services
✅ Use environment variables

### 2. Validate inputs
❌ Don't trust user input
✅ Validate and sanitize all inputs

### 3. Handle errors safely
❌ Don't expose internal errors to users
✅ Log detailed errors, return generic messages

### 4. Use authentication
❌ Don't skip auth checks
✅ Always verify user permissions

---

## 📊 Performance Tips

### 1. Use caching
Cache expensive operations (screenshots, AI calls)

### 2. Parallelize when possible
```typescript
const [pageData, screenshots] = await Promise.all([
  analyzePage(url),
  captureScreenshots(url),
]);
```

### 3. Limit data size
Don't fetch more than you need from the database

### 4. Monitor performance
Log execution times for slow operations

---

## 🎓 Best Practices

1. **Keep services pure**: No side effects unless necessary
2. **Use TypeScript**: Leverage type safety
3. **Write tests**: Test business logic thoroughly
4. **Document clearly**: Add JSDoc comments
5. **Handle errors**: Always catch and log
6. **Keep it simple**: Don't over-engineer

---

## 📖 Further Reading

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)
- [TypeScript Best Practices](https://typescript-eslint.io/docs/)

---

**Questions?** Check the [main architecture docs](../../ARCHITECTURE.md) or open an issue.
