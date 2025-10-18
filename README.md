# Smart Nudge Builder

> AI-powered CRO analysis platform for DTC brands. Turn any landing page into a conversion machine.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)](https://tailwindcss.com/)

---

## 🚀 Quick Start

Get started in 5 minutes:

```bash
# Clone and install
git clone <repo-url>
cd smart-nudge-builder
npm install

# Set up environment variables (see QUICKSTART.md)
cp .env.example .env.local

# Run development server
npm run dev
```

**📖 Full guide:** [QUICKSTART.md](./QUICKSTART.md)

---

## ✨ Features

### 🔍 **AI-Powered CRO Analysis**
- Vision AI analyzes screenshots like a real user
- GPT-4 and Claude generate actionable recommendations
- Heuristic scoring based on CRO best practices

### 📊 **Smart Insights**
- Above-the-fold analysis
- Mobile vs. desktop comparison
- Prioritized recommendations (P0, P1, P2)
- Expected lift estimates

### 📋 **Test Prioritization Queue**
- Add recommendations to your testing backlog
- Track status: queued → in_progress → completed
- Organize by impact and effort

### 🎨 **Professional UI**
- Clean, modern interface
- Mobile-responsive design
- Real-time progress updates
- Screenshot visualization

---

## 🏗️ Architecture

```
Smart Nudge Builder
├── Next.js 14 (App Router)
├── React 18 + TypeScript
├── Supabase (PostgreSQL + Auth)
├── OpenAI (GPT-5 + Vision)
├── Anthropic (Claude 4.5)
└── Tailwind CSS
```

**📐 Full architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📁 Project Structure

```
smart-nudge-builder/
├── app/                    # Next.js routes
│   ├── analyze/            # Analysis submission
│   ├── dashboard/          # User dashboard
│   ├── queue/              # Test queue
│   └── api/                # API endpoints
├── components/             # React components
├── lib/
│   ├── services/           # Business logic (NEW!)
│   │   ├── analysis/       # Page analysis
│   │   └── database/       # Data repositories
│   └── types/              # TypeScript types
├── supabase/
│   └── migrations/         # Database schema
└── docs/                   # Documentation
    ├── ARCHITECTURE.md
    ├── QUICKSTART.md
    └── API.md
```

---

## 🎯 Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with marketing content |
| `/analyze` | Submit URLs for CRO analysis |
| `/dashboard` | View all your analyses |
| `/dashboard/results/[id]` | Detailed analysis results |
| `/queue` | Test prioritization queue |
| `/login` | User authentication |

---

## 🔧 Tech Stack

### Core
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **UI**: React 18 + Tailwind CSS
- **Auth**: Supabase Auth

### Backend
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Supabase Client
- **API**: Next.js Route Handlers

### AI/ML
- **OpenAI**: GPT-5 for recommendations
- **OpenAI Vision**: Screenshot analysis
- **Anthropic**: Claude 4.5 alternative
- **Cheerio**: HTML parsing

### DevOps
- **Hosting**: Vercel (recommended)
- **Database**: Supabase Cloud
- **Analytics**: Vercel Analytics

---

## 🔐 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

**See:** [QUICKSTART.md](./QUICKSTART.md) for detailed setup

---

## 🚢 Deployment

### Vercel (One Click)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

### Manual Deployment
```bash
npm run build
npm start
```

**Full guide:** [ARCHITECTURE.md#deployment](./ARCHITECTURE.md#deployment)

---

## 📊 Database Setup

Run migrations in order:

1. `001_initial_schema.sql` - Core tables
2. `002_profiles_insert_policy.sql` - Profile permissions
3. `003_test_queue.sql` - Test queue system
4. `add_llm_column.sql` - LLM tracking
5. `add_recommendations_column.sql` - Recommendations

**Via Supabase Dashboard:**
SQL Editor → New Query → Paste & Run

---

## 🧪 Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](./QUICKSTART.md) | Get started in 5 minutes |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture & patterns |
| [app/api/README.md](./app/api/README.md) | API documentation |
| [lib/services/README.md](./lib/services/README.md) | Service layer guide |
| [CLEANUP-SUMMARY.md](./CLEANUP-SUMMARY.md) | Code organization details |

---

## 🎨 Features in Detail

### Analysis Flow
1. User submits landing page URL
2. Backend captures desktop & mobile screenshots
3. Vision AI analyzes visual elements
4. GPT-4/Claude generates recommendations
5. Results saved to database
6. User sees prioritized CRO recommendations

### Test Queue
1. User adds recommendation to queue
2. Track status through workflow
3. Manage priorities and assignments
4. Link back to original analysis

### Dashboard
1. View all analyses
2. Filter by status
3. Quick actions (view, queue, delete)
4. Search and sort

---

## 🤝 Contributing

We welcome contributions! Please see our guidelines:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

**Coding standards:** See [ARCHITECTURE.md](./ARCHITECTURE.md#development-guidelines)

---

## 📝 License

This project is proprietary and confidential.

---

## 🆘 Support

- **Documentation**: Check the docs/ directory
- **Issues**: Open a GitHub issue
- **Questions**: See [QUICKSTART.md](./QUICKSTART.md#troubleshooting)

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [OpenAI](https://openai.com/)
- [Anthropic](https://anthropic.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📈 Roadmap

### ✅ Completed
- [x] CRO analysis engine
- [x] Test prioritization queue
- [x] Mobile responsive UI
- [x] Multi-LLM support (GPT-5 & Claude 4.5)
- [x] Professional architecture

### 🚧 In Progress
- [ ] Background job processing
- [ ] Real-time progress updates
- [ ] Export analysis reports (PDF)

### 📅 Planned
- [ ] A/B test tracking
- [ ] Competitor analysis
- [ ] Team collaboration features
- [ ] API for integrations

---

<div align="center">

**[Get Started](./QUICKSTART.md)** • **[Architecture](./ARCHITECTURE.md)** • **[API Docs](./app/api/README.md)**

Made with ❤️ for DTC growth teams

</div>
