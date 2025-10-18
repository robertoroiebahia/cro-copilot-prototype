# Playground

The Playground is a development and testing environment for various tools and experiments.

## Structure

```
app/playground/
├── layout.tsx           # Main playground layout with left sidebar
├── page.tsx            # Auto-redirects to first tool
└── tools/              # Individual tools
    └── scraper/        # Scraper testing tool
        ├── analyzers/  # 5 scraper implementations
        ├── api/        # API endpoint for running scrapers
        └── page.tsx    # UI for testing scrapers
```

## Features

- **Left Navigation**: Persistent sidebar showing all available tools
- **Auto-load**: Visiting `/playground` automatically loads the first tool
- **Isolated Testing**: Tools are self-contained and don't affect production code
- **Easy Expansion**: Add new tools by creating a new folder under `tools/`

## Current Tools

### Scraper Test
**Path**: `/playground/tools/scraper`

Compare 5 different web scraping approaches:
1. **Cheerio** - Fast static HTML parsing (current production)
2. **Puppeteer** - Full browser automation with Chrome
3. **Playwright** - Modern cross-browser automation (recommended)
4. **Puppeteer Advanced** - Comprehensive UX analysis with metrics
5. **Playwright Advanced** - Same as Puppeteer Advanced but faster

Features:
- Test any URL against all 5 scrapers simultaneously
- View results in 3 modes: Formatted (AI input), Raw JSON, Raw HTML
- Compare execution times and data extraction quality
- 30-second timeout per scraper

## Adding New Tools

To add a new tool to the playground:

1. Create a new folder: `app/playground/tools/your-tool/`
2. Add a `page.tsx` file with your tool's UI
3. Add any necessary API routes: `app/playground/tools/your-tool/api/route.ts`
4. Update `components/PlaygroundNav.tsx` to add your tool to the navigation:

```typescript
const tools: Tool[] = [
  {
    name: 'Your Tool',
    href: '/playground/tools/your-tool',
    icon: YourIcon,
    description: 'Brief description',
  },
  // ... other tools
];
```

## Access

- **URL**: `/playground`
- **Navigation**: "Playground" link in main app navigation (logged-in users only)
- **Layout**: Full-screen with left sidebar (main navigation is hidden)
