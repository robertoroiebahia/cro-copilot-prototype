# Galo Brand Guidelines
## "Precision in Motion" – CRO Intelligence, Engineered

---

## 🎯 Brand Concept

**Core Idea:**
Galo represents the fusion of intelligence (AI) and craft (CRO) — sharp, confident, and constantly evolving. Think precision engineering meets creative experimentation.

**Brand Essence:**
🧠 Intelligent • ⚙️ Engineered • 🎯 Purposeful • 🔍 Precise • 🖤 Bold • 💫 Minimal

**Visual Philosophy:**
Like a Formula 1 data team interface — minimal, confident, and kinetic. Dark backgrounds, clear grids, soft gradients, and micro animations that convey focus.

---

## 🖤 Core Brand Identity

### Positioning
**"CRO intelligence, powered by AI, built for pros."**

Galo is not a tool — it's a copilot. We speak to strategists, growth teams, and conversion experts who think in hypotheses, not hunches.

### Personality
- **Confident** – We don't suggest, we diagnose
- **Analytical** – Data first, always
- **Minimal** – No fluff, just signal
- **Insightful** – We reveal what others miss
- **Engineered** – Precision over polish

### Philosophy
- **Authority through clarity** – The interface should feel like a command center
- **Intelligence without arrogance** – Smart, but never condescending
- **Craft over chaos** – Every pixel serves a purpose
- **Motion implies progress** – Subtle animations convey thinking and analysis

---

## 🎨 Color System

### Primary Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Base** | Deep Charcoal | `#0E0E0E` | Primary backgrounds (less harsh than black) |
| **Accent 1** | Electric Gold | `#F5C542` | CTAs, highlights, insights (controlled, matte gold) |
| **Accent 2** | Ultramarine | `#3E6DF4` | Data viz, links, active states (technical edge) |

### Extended Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Surface** | Onyx | `#141414` | Card backgrounds, elevated surfaces |
| **Gray Dark** | Carbon | `#1A1A1A` | Secondary backgrounds |
| **Gray Medium** | Slate | `#2B2B2B` | Borders, dividers |
| **Text Primary** | White | `#FFFFFF` | Primary text, high contrast |
| **Text Secondary** | Silver | `#B3B3B3` | Secondary text, subtle hierarchy |
| **Text Tertiary** | Graphite | `#6B6B6B` | Metadata, timestamps |
| **Success** | Emerald | `#35D399` | Positive feedback, wins |
| **Danger** | Crimson | `#FF5C5C` | Alerts, warnings, risks |
| **Border** | Charcoal Line | `#2A2A2A` | Minimal lines, soft contrasts |

### Color Principles

**The Balance:**
- **Gold = Emotion** – Use gold to highlight insights, wins, and key actions
- **Blue = Logic** – Use blue to indicate intelligence, active analysis, or data
- **Gold + Blue Together = CRO Balance** – The perfect blend of art and science

**Usage Rules:**
- Gold should appear on <10% of the screen (high impact)
- Blue for data visualizations and technical indicators
- Never use both gold and blue in the same component unless showing contrast
- Dark backgrounds always; white text for clarity

---

## 🔤 Typography System

### Font Stack

**Primary:** Satoshi (or Manrope as fallback)
**Secondary:** Inter
**Monospace:** JetBrains Mono

### Type Scale

| Type | Font | Weight | Size | Line Height | Usage |
|------|------|--------|------|-------------|-------|
| **H1** | Satoshi | Bold (700) | 48px | 1.2 | Hero titles |
| **H2** | Satoshi | Semibold (600) | 28px | 1.3 | Section headers |
| **H3** | Satoshi | Semibold (600) | 20px | 1.4 | Card titles |
| **Body** | Inter | Regular (400) | 16px | 1.6 | Paragraphs |
| **Body Small** | Inter | Regular (400) | 14px | 1.5 | Supporting text |
| **Label** | Inter | Medium (500) | 14px | 1.4 | Buttons, tags |
| **Caption** | Inter | Regular (400) | 12px | 1.4 | Metadata |
| **Mono** | JetBrains Mono | Regular (400) | 13px | 1.5 | Metrics, code-like sections |

### Typography Rules

- **Always use bold or heavier** – No light or regular weights for headings
- **Generous spacing** – 24px minimum between major sections
- **High contrast** – White on dark, always crisp
- **Tracking** – Slight letter spacing (0.02em) on uppercase labels
- **Never use more than 3 weights per page**

---

## 🧱 Visual Language

### Layout Principles

**Gridded Precision:**
- Strict 8pt grid system (8, 16, 24, 32, 48, 64px)
- No arbitrary spacing
- Everything aligns to the grid

**Edge-to-Edge Design:**
- Full-width sections with contained content
- No floating cards with excessive margins
- Content breathes within structure

**Split-Hero Pattern:**
- One side: Text and CTA
- Other side: Screenshot/animation of analysis
- Creates immediate clarity

### Spacing System

| Name | Size | Usage |
|------|------|-------|
| **xs** | 4px | Icon gaps, tight spacing |
| **sm** | 8px | Component internal padding |
| **md** | 16px | Default spacing |
| **lg** | 24px | Section spacing |
| **xl** | 32px | Major section breaks |
| **2xl** | 48px | Page-level spacing |

### Border & Radius

- **Border Radius:** 4px (minimal, not rounded)
- **Border Width:** 1px default, 2px for emphasis
- **Border Color:** `#2A2A2A` (charcoal line)
- **No box shadows** – Use contrast and tint instead

---

## 🪄 Component Design

### Buttons

**Primary (Gold):**
```
Background: #F5C542
Text: #0E0E0E
Border: none
Hover: Thin glowing gold border (#F5C542 with 50% opacity ring)
```

**Secondary (Outline):**
```
Background: transparent
Text: #F5C542
Border: 1px solid #F5C542
Hover: Background: #F5C542/10
```

**Ghost:**
```
Background: transparent
Text: #B3B3B3
Hover: Text: #FFFFFF
```

### Cards

**Standard Card:**
```
Background: #141414
Border: 1px solid #2A2A2A
Border Top: 2px solid #F5C542 (accent)
Padding: 24px
Radius: 4px
```

**Insight Card (AI Output):**
```
Background: #0E0E0E
Border: 1px solid #F5C542/30
Gold accent bar on top (4px height)
Terminal-inspired layout
```

### Badges

**Priority Badge:**
```
Background: #0E0E0E
Text: #F5C542
Border: 2px solid #F5C542
Font: Bold, 12px, uppercase
Padding: 4px 12px
```

**Status Badge:**
```
Active: Gold background (#F5C542), black text
Inactive: Gray background (#2B2B2B), gray text (#B3B3B3)
```

### Input Fields

```
Background: #1A1A1A
Border: 1px solid #2A2A2A
Text: #FFFFFF
Placeholder: #6B6B6B
Focus: Border color changes to #F5C542
```

---

## 🎬 Motion & Animation

### Principles

- **Micro animations only** – Subtle, purposeful motion
- **Speed:** 200ms for UI, 300ms for transitions
- **Easing:** `cubic-bezier(0.4, 0.0, 0.2, 1)` (smooth acceleration)
- **Motion conveys intelligence** – Things should feel "thinking"

### Animation Library

**Button Hover:**
```css
transition: all 200ms ease;
hover: box-shadow: 0 0 0 2px rgba(245, 197, 66, 0.5);
```

**AI Typing Indicator:**
```
Three dots pulsing: gold → blue → gold
Stagger: 100ms between dots
```

**Card Entrance:**
```
Fade in + slide up 8px
Duration: 300ms
Stagger: 30ms per card
```

**Data Reveal:**
```
Numbers count up from 0
Charts draw from left to right
Duration: 500ms
```

---

## 📐 Grid & Layout System

### Desktop Grid
- **Max Width:** 1280px
- **Columns:** 12
- **Gutter:** 24px
- **Margin:** 48px

### Responsive Breakpoints
- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

---

## ✍️ Brand Voice & Copy

### Tone Guidelines

| Context | Tone | Example |
|---------|------|---------|
| **Analysis Results** | Confident & Direct | "Here's what's costing you conversions." |
| **Insights** | Analytical & Clear | "82% of users drop before seeing your CTA." |
| **CTAs** | Minimal & Imperative | "Run Analysis" not "Let's analyze this page!" |
| **Explanations** | Insightful & Behavioral | "This section creates friction. Users scan but don't act." |
| **Errors** | Helpful & Technical | "Analysis failed. Check your URL and try again." |

### Writing Rules

1. **No fluff** – Get to the point
2. **Data first** – Always back claims with numbers
3. **Active voice** – "We found" not "It was found"
4. **Short sentences** – 15 words max when possible
5. **Technical precision** – Use proper CRO terms (hypothesis, variant, lift)

### Examples

**❌ Avoid:**
- "Looks like this might be an issue!"
- "Let's dive deeper into this..."
- "Your page has some problems"

**✅ Use:**
- "This costs you 23% of conversions."
- "Test this first."
- "Users abandon here. Fix the CTA."

---

## 🧭 Brand Applications

### Landing Page
- **Feel:** Precision + Authority
- **Hero:** Dark background, gold typography, animated analysis mockup
- **Layout:** Split-screen (text left, visual right)

### Dashboard
- **Feel:** Minimal + Data-First
- **Design:** Flat cards, low contrast borders, subtle gold accents
- **Navigation:** Fixed sidebar, gold active state

### Analysis Reports
- **Feel:** Premium + Analytical
- **Design:** Dark cards with gold accent bars
- **Typography:** Mono fonts for metrics

### AI Chat UI
- **Feel:** Technical + Human
- **Design:** Terminal-style dark background, gold highlights for insights
- **Interaction:** Typing indicators, smooth message reveal

---

## 🎨 Visual Inspiration

**Design Tribes:**
- Linear (dark UI precision)
- Formula 1 telemetry dashboards (data intensity)
- Notion black theme (clean hierarchy)
- Figma design system dark mode (component clarity)
- Tesla command interface (minimal confidence)
- Beehiiv Pro (premium dark aesthetic)

**Moodboard Keywords:**
- Precision engineering
- Data minimalism
- Kinetic intelligence
- Controlled motion
- Authority through clarity

---

## 🔧 Technical Implementation

### Tailwind Config
```javascript
theme: {
  extend: {
    colors: {
      brand: {
        black: '#0E0E0E',
        gold: '#F5C542',
        blue: '#3E6DF4',
        surface: '#141414',
        'gray-dark': '#1A1A1A',
        'gray-medium': '#2B2B2B',
        'gray-border': '#2A2A2A',
        'text-secondary': '#B3B3B3',
        'text-tertiary': '#6B6B6B',
        success: '#35D399',
        danger: '#FF5C5C',
      },
    },
    fontFamily: {
      sans: ['Satoshi', 'Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    borderRadius: {
      DEFAULT: '4px',
    },
    spacing: {
      '128': '32rem',
    },
  },
}
```

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Update Tailwind config with new color tokens
- [ ] Install/configure Satoshi and JetBrains Mono fonts
- [ ] Create base component styles
- [ ] Set up 8pt grid system

### Phase 2: Core Pages
- [ ] Rebrand dashboard (module hub)
- [ ] Update analysis results page
- [ ] Redesign recommendation cards
- [ ] Update navigation and header

### Phase 3: Components
- [ ] Button components (primary, secondary, ghost)
- [ ] Card components (standard, insight)
- [ ] Badge components (priority, status)
- [ ] Input components

### Phase 4: Polish
- [ ] Add micro animations
- [ ] Implement hover states
- [ ] Test responsive layouts
- [ ] Verify contrast ratios (WCAG AA minimum)

### Phase 5: Content
- [ ] Update all copy to match brand voice
- [ ] Replace placeholder text
- [ ] Add loading states with animations
- [ ] Create empty states

---

## 🎯 Brand Summary

| Attribute | Definition |
|-----------|------------|
| **Core Emotion** | Authority through clarity |
| **Style** | Data minimalism + precision motion |
| **Primary Color** | Deep Charcoal (#0E0E0E) |
| **Accent Colors** | Electric Gold (#F5C542) + Ultramarine (#3E6DF4) |
| **Typography** | Satoshi / Inter / JetBrains Mono |
| **Tone** | Strategic, clear, confident |
| **Inspiration** | Linear, Formula 1 telemetry, Tesla UI, ConversionXL |
| **Tagline** | "Precision in Motion" |

---

---

## 🌟 Light Theme Design System (Current Implementation)

### Light Theme Philosophy

The light theme maintains the "Precision in Motion" philosophy while adapting for better readability and a softer, more accessible aesthetic. The theme emphasizes:
- **Clarity over contrast** – White/off-white backgrounds with dark text
- **Subtle warmth** – Muted amber accents replace bright gold
- **Sophisticated interactions** – Refined hover effects that feel premium
- **Hierarchy through spacing** – Generous whitespace and alternating section backgrounds

### Light Theme Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary Background** | Pure White | `#FFFFFF` | Main page background |
| **Secondary Background** | Light Gray | `#F9FAFB` (gray-50) | Alternating sections for visual rhythm |
| **Surface** | Off-White | `#FAFAFA` | Card backgrounds |
| **Text Primary** | Deep Charcoal | `#0E0E0E` | Headings, primary text |
| **Text Secondary** | Medium Gray | `#525252` | Body text, supporting content |
| **Text Tertiary** | Light Gray | `#A3A3A3` | Metadata, timestamps |
| **Accent Gold** | Electric Gold | `#F5C542` | Brand accents (used sparingly) |
| **Hover Amber** | Muted Amber | `#D4A574` | Hover states, subtle interactions |
| **Hover Cream** | Soft Cream | `#FEF3C7` | Background hover for light buttons |
| **Blue Accent** | Ultramarine | `#3E6DF4` | Links, data visualization |
| **Success** | Green | `#10B981` | Positive feedback |
| **Danger** | Red | `#EF4444` | Alerts, warnings |
| **Border Light** | Border Gray | `#E0E0E0` | Minimal borders |
| **Border Medium** | Gray | `#D1D5DB` (gray-300) | Visible borders |

### Button Design System (Light Theme)

#### Primary CTA Buttons
**Default State:**
```css
Background: #0E0E0E (black)
Text: #FFFFFF (white)
Border: none
Shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
```

**Hover State:**
```css
Transform: translateY(-2px) scale(1.02)
Background: #1A1A1A (lighter charcoal)
Shadow: 0 20px 50px -10px rgba(212, 165, 116, 0.6),
        0 0 0 2px rgba(212, 165, 116, 0.4)
/* Golden glow aura + visible golden ring */
Transition: all 300ms ease
```

**Effect Description:**
- Button lifts up 2px and scales 2% larger
- Background lightens subtly from pure black to charcoal
- Warm amber glow appears around the button
- 2px golden ring creates a premium outline
- Creates a "floating" effect that draws attention

#### Secondary CTA Buttons
**Default State:**
```css
Background: transparent
Text: #0E0E0E (black)
Border: 2px solid #0E0E0E
```

**Hover State:**
```css
Border: 2px solid #D4A574 (muted amber)
Text: #D4A574 (muted amber)
Transition: all 200ms ease
```

#### Navigation Sign In Button
**Default State:**
```css
Background: #FFFFFF (white)
Text: #0E0E0E (black)
Border: none
```

**Hover State:**
```css
Background: #FEF3C7 (soft cream)
/* No border, just background change */
Transition: all 200ms ease
```

#### Navigation "Start Free" Button
**Default State:**
```css
Background: #0E0E0E (black)
Text: #FFFFFF (white)
Shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
```

**Hover State:**
```css
Transform: translateY(-1px) scale(1.02)
Background: #1A1A1A (lighter charcoal)
Shadow: 0 12px 35px -8px rgba(212, 165, 116, 0.5),
        0 0 0 2px rgba(212, 165, 116, 0.4)
Transition: all 300ms ease
```

### Section Layout Pattern

**Alternating Backgrounds for Visual Rhythm:**
```
1. Hero Section          → bg-white (#FFFFFF)
2. Social Proof          → bg-gray-50 (#F9FAFB)
3. How It Works          → bg-gray-50 (#F9FAFB)
4. Features              → bg-white (#FFFFFF)
5. Results (Gold Card)   → bg-gray-50 (#F9FAFB)
6. Final CTA             → bg-white (#FFFFFF)
7. Footer                → bg-white (#FFFFFF)
```

**Pattern Rule:** Alternate white and light gray sections to create visual separation without heavy borders.

### Color Usage Rules (Light Theme)

1. **Gold (#F5C542) – Use Sparingly**
   - Brand logo
   - Active states in navigation
   - Key data highlights
   - Should appear on <5% of the screen

2. **Muted Amber (#D4A574) – Hover Effects**
   - Button borders on hover
   - Text color changes on hover
   - Link hover states
   - Subtle, warm interaction feedback

3. **Soft Cream (#FEF3C7) – Background Hovers**
   - Light button background hovers
   - Subtle highlighting without borders
   - Creates warmth without being loud

4. **Black Text (#0E0E0E) – Strong Hierarchy**
   - All headings
   - Primary CTAs
   - Important labels
   - Navigation items

5. **Gray Hierarchy:**
   - Primary text: `#525252`
   - Secondary text: `#A3A3A3`
   - Borders: `#E0E0E0` (subtle), `#D1D5DB` (visible)

### Light Theme Component Patterns

#### Cards
```css
Background: #FFFFFF (white)
Border: 1px solid #E0E0E0
Padding: 24px
Border-radius: 4px
Hover: border-color: #D4A574
```

#### Navigation Bar
```css
Background: #FFFFFF with backdrop-blur
Border-bottom: 1px solid #E5E7EB (gray-200)
Shadow: 0 1px 3px rgba(0, 0, 0, 0.05) when scrolled
Fixed position with smooth scroll effect
```

#### Feature Cards (Homepage)
```css
Background: #FFFFFF
Border: 1px solid #E0E0E0
Gold icon accent: #F5C542/10 background
Hover: border-color transitions to #D4A574/30
```

### Animation & Interaction Principles

**Micro-interactions:**
- Duration: 200-300ms for UI feedback
- Easing: `ease` or `cubic-bezier(0.4, 0.0, 0.2, 1)`
- Transform-based animations for performance
- Subtle scale and lift effects

**Hover Philosophy:**
- Primary CTAs: Dramatic (lift + scale + glow)
- Secondary CTAs: Subtle (color change only)
- Navigation: Minimal (background tint)
- Cards: Gentle (border color shift)

**Color Transition Strategy:**
- Borders: Instant color change
- Backgrounds: Smooth 200ms fade
- Shadows: 300ms for glow effects
- Transforms: 300ms with slight scale

### Typography in Light Theme

Same font stack as dark theme but optimized contrast:

```css
Headings: #0E0E0E (pure black for maximum contrast)
Body: #525252 (softer for extended reading)
Labels: #0E0E0E (black for clarity)
Metadata: #A3A3A3 (light gray for de-emphasis)
```

**Font Weights:**
- Headings: Black (900) or Bold (700)
- Labels/Buttons: Black (900)
- Body: Regular (400) or Medium (500)
- Never use Light (300) weights

### Accessibility Notes

**Contrast Ratios (WCAG AA):**
- Black on White: 21:1 ✓
- `#525252` on White: 7.3:1 ✓
- `#A3A3A3` on White: 3.2:1 ✓ (for large text)
- All interactive elements meet AA standard

**Interactive States:**
- Hover states are visually distinct (not color-only)
- Focus states use visible outlines
- Button transforms provide non-color feedback

### Implementation Files

**Core Configuration:**
- `tailwind.config.js` – Light theme color tokens
- `app/globals.css` – Button component classes, animations
- `components/Navigation.tsx` – Nav button interactions
- `app/page.tsx` – Homepage CTAs and sections

**Key Components Using Light Theme:**
- Navigation bar with cream hover effect
- Primary CTAs with golden glow hover
- Secondary buttons with amber hover
- Alternating section backgrounds
- Feature cards with subtle borders

---

**Last Updated:** January 2025
**Version:** 3.0 – Light Theme "Precision in Motion"
