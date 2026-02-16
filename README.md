<div align="center">
  <a href="https://taxbracketai.com">
    <img src="./public/og-image.png" alt="TaxBracket AI" width="100%" style="max-width: 1200px; border-radius: 12px;"/>
  </a>
  
  <h1>TaxBracket AI</h1>
  
  <p><strong>AI-powered financial assistant for Nigerian tax calculations and bank statement analysis</strong></p>

  <p>
    <a href="https://github.com/taxbracket/taxbracket/stargazers">
      <img src="https://img.shields.io/github/stars/taxbracket/taxbracket?style=social" alt="GitHub stars"/>
    </a>
    <a href="https://github.com/taxbracket/taxbracket/network/members">
      <img src="https://img.shields.io/github/forks/taxbracket/taxbracket?style=social" alt="GitHub forks"/>
    </a>
    <a href="https://github.com/taxbracket/taxbracket/issues">
      <img src="https://img.shields.io/github/issues/taxbracket/taxbracket" alt="GitHub issues"/>
    </a>
    <a href="https://github.com/taxbracket/taxbracket/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"/>
    </a>
  </p>
  
  <p>
    <a href="https://taxbracketai.com">Live Demo</a>
    ·
    <a href="#features">Features</a>
    ·
    <a href="#getting-started">Getting Started</a>
    ·
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## About

TaxBracket AI is an intelligent financial assistant designed specifically for Nigerian taxpayers, accountants, and financial advisors. Upload your bank statements, get instant tax calculations based on the Nigeria Tax Act 2025, and receive AI-powered insights about your financial data.

### Why TaxBracket?

- **Nigerian Tax Expertise**: Built with deep knowledge of Nigerian tax laws, brackets, and regulations
- **Bank Statement Analysis**: Automatically parse and analyze PDF, CSV, and Excel bank statements
- **AI-Powered Insights**: Get intelligent recommendations and calculations powered by GPT-4
- **Privacy First**: Your financial data stays secure with bank-level encryption

---

## Features

| Feature | Description |
|---------|-------------|
| **Bank Statement Analysis** | Upload PDF, CSV, or XLSX bank statements for automatic parsing |
| **Tax Calculations** | Accurate calculations based on Nigeria Tax Act 2025 (effective 2026) |
| **Financial Insights** | Visual charts and data visualizations of your finances |
| **Bank Charge Detection** | Automatic identification of fees, charges, and deductions |
| **Transaction Categorization** | Smart categorization of income, expenses, and deductions |
| **Rent Relief Calculation** | Automatic rent relief deductions based on Nigerian tax law |
| **Real-time Streaming** | Responses stream in real-time with incremental block rendering |
| **Credit System** | Flexible credit-based usage with weekly resets or purchased credits |

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Framework** | [TanStack Start](https://tanstack.com/start) (React, SSR, File-based routing) |
| **Database** | PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/) |
| **AI** | [OpenAI GPT-4o](https://openai.com/) via [Vercel AI SDK](https://sdk.vercel.ai/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Storage** | [Cloudflare R2](https://www.cloudflare.com/r2/) (S3-compatible) |
| **Queue** | [pg-boss](https://github.com/timgit/pg-boss) (PostgreSQL-based job queue) |
| **Authentication** | Custom session-based auth with Google OAuth |
| **Charts** | [Recharts](https://recharts.org/) |
| **Payments** | [Polar](https://polar.sh/) (optional, for credit purchases) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** or **yarn**
- **OpenAI API key** (for AI features)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/taxbracket/taxbracket.git
cd taxbracket
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/taxbracket
SESSION_SECRET=your-secure-random-secret-min-32-chars
OPENAI_API_KEY=sk-...

# Required for file uploads
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_ACCESS_KEY=your-access-key
CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=taxbracket-uploads

# Required for OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

4. **Run database migrations**

```bash
npm run db:migrate
```

5. **Start the development server**

```bash
npm run dev
```

6. **Start the worker (for file processing)**

In a separate terminal:

```bash
npx tsx scripts/worker.ts
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

---

## Project Structure

```
taxbracket/
├── src/
│   ├── components/     # React components
│   │   ├── chat/       # Chat interface components
│   │   ├── charts/     # Chart and visualization components
│   │   ├── credits/    # Credit system UI
│   │   ├── layout/     # Layout components (sidebar, header)
│   │   └── ui/         # Base UI components
│   ├── db/             # Database schema and migrations
│   ├── hooks/          # React hooks
│   ├── lib/            # Utility functions
│   ├── routes/         # File-based routes
│   │   └── api/        # API routes
│   ├── server/         # Server-side code
│   │   ├── data/       # System prompts and static data
│   │   ├── functions/  # Server functions
│   │   ├── jobs/       # Background jobs
│   │   ├── lib/        # Server utilities
│   │   └── middleware/ # Request middleware
│   └── workers/        # Background workers
├── drizzle/            # Database migrations
├── public/             # Static assets
└── scripts/            # CLI scripts
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session encryption key (min 32 chars) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features |
| `CLOUDFLARE_*` | Yes | Cloudflare R2 credentials for file storage |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `SITE_URL` | No | Production URL (default: https://taxbracketai.com) |
| `CREDITS_WEEKLY_LIMIT` | No | Weekly credit limit (default: 1000) |
| `CREDITS_PER_TOKEN` | No | Credit-to-token ratio (default: 0.1) |
| `BETA_MODE` | No | Enable beta features (default: true) |
| `CREDIT_PURCHASE_ENABLED` | No | Enable credit purchases (default: false) |
| `POLAR_API_KEY` | No | Polar API key for payments |

---

## Development

### Available Scripts

```bash
# Development
npm run dev           # Start dev server
npm run build         # Build for production
npm run start         # Start production server

# Database
npm run db:generate   # Generate migrations
npm run db:migrate    # Run migrations
npm run db:studio     # Open Drizzle Studio

# Testing
npm run test          # Run tests
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint
```

### Running the Worker

The worker handles file processing and scheduled jobs:

```bash
# Development
npx tsx scripts/worker.ts

# Production (Railway)
# Use separate service with railway.worker.json config
```

---

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Railway

1. Create a new project from GitHub
2. Add PostgreSQL service
3. Set environment variables
4. Create separate service for worker using `railway.worker.json`

---

## Contributing

We welcome contributions! Please follow these guidelines:

### How to Contribute

1. **Fork the repository** and create a feature branch
2. **Make your changes** following our code style
3. **Add tests** for new features
4. **Update documentation** as needed
5. **Submit a pull request** with a clear description

### Development Workflow

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/taxbracket.git
cd taxbracket

# 2. Create a branch
git checkout -b feature/amazing-feature

# 3. Make changes and commit
git commit -m 'Add amazing feature'

# 4. Push and create PR
git push origin feature/amazing-feature
```

### Code Style

- Follow TypeScript best practices
- Use Prettier for formatting (`npm run format`)
- Write meaningful commit messages
- Add JSDoc comments for complex functions
- Follow the existing project structure

### Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Search existing issues before creating new ones

---

## Roadmap

- [ ] **RAG Implementation** - Reduce token usage with vector-based retrieval
- [ ] **Template Responses** - Fast responses for common queries
- [ ] **Response Caching** - Cache frequent calculations
- [ ] **Mobile App** - React Native mobile application
- [ ] **Multi-language** - Support for Hausa, Yoruba, and Igbo
- [ ] **Tax Filing** - Direct FIRS integration for tax filing

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [TanStack Start](https://tanstack.com/start)
- AI powered by [OpenAI](https://openai.com)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com)
- Charts by [Recharts](https://recharts.org)
- Icons by [Lucide](https://lucide.dev)

---

## Support

- [GitHub Issues](https://github.com/taxbracket/taxbracket/issues) - Bug reports and feature requests
- [Discussions](https://github.com/taxbracket/taxbracket/discussions) - Questions and community

---

<div align="center">
  <p>Made with love for Nigerian taxpayers</p>
  <p>
    <a href="https://taxbracketai.com">Website</a>
    ·
    <a href="https://twitter.com/taxbracketai">Twitter</a>
  </p>
</div>
