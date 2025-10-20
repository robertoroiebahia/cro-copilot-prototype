# Module System

The module system provides a pluggable architecture for analysis components. Each module is self-contained and can be registered, enabled/disabled, and executed independently.

## Architecture

```
Module System
├── BaseModule (base.ts)
│   ├── Lifecycle management
│   ├── Error handling
│   ├── Logging
│   └── Caching
└── ModuleRegistry (registry.ts)
    ├── Module registration
    ├── Dependency resolution
    ├── Execution orchestration
    └── Statistics tracking
```

## Creating a Module

### 1. Extend BaseModule

```typescript
import { BaseModule } from '@/lib/modules/base';
import { ModuleConfig } from '@/lib/types/modules';

interface MyModuleInput {
  url: string;
  content: string;
}

interface MyModuleOutput {
  insights: string[];
  score: number;
}

class MyModule extends BaseModule<MyModuleInput, MyModuleOutput> {
  constructor() {
    const config: ModuleConfig = {
      name: 'my-module',
      version: '1.0.0',
      enabled: true,
      priority: 10,
      dependencies: [],
    };

    super(config);
  }

  async validate(input: MyModuleInput): Promise<boolean> {
    return !!(input.url && input.content);
  }

  protected async run(input: MyModuleInput): Promise<MyModuleOutput> {
    // Your module logic here
    this.logger.info('Processing input', { url: input.url });

    return {
      insights: ['insight 1', 'insight 2'],
      score: 85,
    };
  }
}
```

### 2. Register the Module

```typescript
import { registry } from '@/lib/modules/registry';

const myModule = new MyModule();
registry.register(myModule);
```

### 3. Execute the Module

```typescript
const result = await registry.execute('my-module', {
  url: 'https://example.com',
  content: 'Page content...',
});

if (result.success) {
  console.log('Output:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Module Configuration

### Required Fields

- `name`: Unique identifier for the module
- `version`: Semantic version (e.g., "1.0.0")
- `enabled`: Whether the module is active

### Optional Fields

- `priority`: Execution order (lower = earlier, default: 100)
- `dependencies`: Array of module names this module depends on
- `options`: Custom configuration object

## Execution Options

```typescript
interface ModuleExecutionOptions {
  timeout?: number;        // Max execution time in ms
  retries?: number;        // Number of retry attempts
  cache?: boolean;         // Enable caching
  cacheTTL?: number;       // Cache time-to-live in ms
  parallel?: boolean;      // Allow parallel execution
}
```

## Lifecycle Hooks

```typescript
class MyModule extends BaseModule<Input, Output> {
  constructor() {
    super(config);

    this.hooks = {
      onInit: async () => {
        // Called before first execution
        console.log('Module initializing...');
      },
      onDestroy: async () => {
        // Called when module is destroyed
        console.log('Module cleaning up...');
      },
      onError: async (error) => {
        // Called when execution fails
        console.error('Module error:', error);
      },
    };
  }
}
```

## Execution Patterns

### Sequential Execution

```typescript
const results = await registry.executeSequence(
  ['module-1', 'module-2', 'module-3'],
  input
);
```

### Parallel Execution

```typescript
const results = await registry.executeParallel(
  ['module-a', 'module-b', 'module-c'],
  input
);
```

### Priority-Based Execution

```typescript
const results = await registry.executeByPriority(input);
```

## Caching

Enable caching for expensive operations:

```typescript
const result = await module.executeWithCache(
  input,
  'cache-key-123',
  5 * 60 * 1000 // 5 minutes TTL
);
```

## Error Handling

Modules use typed errors:

```typescript
import { ModuleError, ModuleErrorType } from '@/lib/types/modules';

throw new ModuleError(
  ModuleErrorType.VALIDATION_ERROR,
  'my-module',
  'Invalid input provided'
);
```

## Best Practices

1. **Single Responsibility**: Each module should do one thing well
2. **Validation**: Always validate input before processing
3. **Logging**: Use the provided logger for debugging
4. **Error Handling**: Return errors, don't throw them (except in validate/run)
5. **Dependencies**: Keep dependencies minimal
6. **Testing**: Write unit tests for each module

## Registry Statistics

```typescript
const stats = registry.getStats();
console.log({
  totalModules: stats.totalModules,
  enabledModules: stats.enabledModules,
  totalExecutions: stats.totalExecutions,
  averageSuccessRate: stats.averageSuccessRate,
});
```

## Example: Complete Module

See `/lib/analyzers/page-analyzer.ts` for a complete working example.
