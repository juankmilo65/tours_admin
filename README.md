# Tours Admin Dashboard

A modern, responsive admin dashboard for managing tours, reservations, users, and payments. Built with Remix, TypeScript, Supabase, and Auth0.

## 🚀 Tech Stack

- **Frontend**: Remix + React + TypeScript
- **Styling**: CSS Variables / Design Tokens
- **Backend**: Node.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Auth0 (Gmail/email, ADMIN role only)
- **Payments**: Mercado Pago México
- **Internationalization**: i18n (English & Spanish)
- **Code Quality**: ESLint strict + Prettier + TypeScript strict mode

## ✨ Features

### Core Modules
- 🔐 **Authentication**: Secure login with Auth0, role-based access control
- 📊 **Dashboard**: Real-time KPIs, analytics, and visualizations
- 🏛️ **Tours Management**: Full CRUD for tours with images, pricing, and availability
- 🏙️ **Cities & Categories**: Manage locations and tour categories with SEO
- 📰 **News & Content**: Create and manage news with scheduling
- 🎁 **Offers & Promotions**: Manage special offers with subscription integration
- 📅 **Reservations**: Track and manage all tour bookings
- 👥 **Users & Roles**: Manage users, roles, and subscriptions
- 💳 **Payments**: Integration with Mercado Pago México
- ⚙️ **Settings**: Configure app settings, colors, and integrations

### Key Features
- 🌍 **Multi-language**: Full i18n support (English & Spanish)
- 📱 **Responsive**: Optimized for desktop and tablet
- ♿ **Accessible**: WCAG 2.1 AA compliant
- 🔒 **Secure**: Row-level security, audit logs, input sanitization
- ⚡ **Fast**: Minimal clicks, quick actions with modals
- 📈 **Scalable**: Modular architecture ready for growth

## 📋 Prerequisites

- Node.js >= 20.0.0
- pnpm
- Supabase account
- Auth0 account
- Mercado Pago account (for payment integration)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/juankmilo65/tours_admin.git
cd tours_admin
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Auth0
AUTH0_DOMAIN=your_auth0_domain
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=your_auth0_audience

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=your_mercado_pago_access_token
MERCADO_PAGO_PUBLIC_KEY=your_mercado_pago_public_key

# App
NODE_ENV=development
```

4. **Set up Supabase database**
```bash
# Apply database migrations
npx supabase db push

# Or run the SQL from DATABASE_SCHEMA.md manually in Supabase dashboard
```

5. **Configure Auth0**
- Create a new application in Auth0 dashboard
- Set callback URLs: `http://localhost:3000/auth/callback`
- Enable Google and email/password authentication
- Configure role mapping (admin/staff)

6. **Start development server**
```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
tours_admin/
├── app/
│   ├── components/          # React components
│   │   ├── layout/        # Layout components (Sidebar, Header)
│   │   ├── ui/            # Reusable UI components
│   │   ├── forms/         # Form components
│   │   └── charts/        # Chart components
│   ├── routes/            # Remix routes
│   │   ├── auth/          # Authentication routes
│   │   ├── dashboard/     # Dashboard routes
│   │   ├── tours/         # Tours management
│   │   ├── cities/        # Cities management
│   │   ├── categories/    # Categories management
│   │   ├── news/          # News management
│   │   ├── offers/        # Offers management
│   │   ├── reservations/   # Reservations management
│   │   ├── users/         # Users management
│   │   └── settings/      # Settings routes
│   ├── services/           # External services
│   │   ├── supabase/      # Supabase client
│   │   ├── auth0/         # Auth0 integration
│   │   └── payments/      # Payment integrations
│   ├── lib/               # Utility libraries
│   │   ├── i18n/          # Internationalization
│   │   └── validations/   # Form validations
│   ├── styles/            # Styles
│   │   ├── tokens/        # Design tokens
│   │   └── global.css    # Global styles
│   ├── entry.client.tsx    # Client entry point
│   ├── entry.server.tsx    # Server entry point
│   └── root.tsx          # Root component
├── supabase/             # Supabase migrations
│   └── migrations/
├── public/               # Static assets
│   └── images/
├── config/               # Configuration files
│   ├── auth0.config.ts
│   ├── supabase.config.ts
│   └── mercadopago.config.ts
├── .env.example         # Environment variables template
├── .eslintrc.json       # ESLint configuration
├── .prettierrc          # Prettier configuration
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
├── DATABASE_SCHEMA.md     # Database schema documentation
├── PROJECT_PLAN.md       # Implementation plan
└── README.md            # This file
```

## 🏗️ Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Fix ESLint issues
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting
- `pnpm run typecheck` - Run TypeScript type checking

### Code Quality

The project uses strict code quality standards:

- **TypeScript**: Strict mode enabled
- **ESLint**: Strict rules with TypeScript support
- **Prettier**: Code formatting enforced
- **No `any` types**: All types must be explicit
- **No unused variables**: All code must be used

### Design System

The app uses CSS custom properties (design tokens) for consistent styling:

- Colors (Primary, Secondary, Success, Warning, Error, Neutral)
- Typography (Font families, sizes, weights, line heights)
- Spacing (8px grid system)
- Border radius
- Shadows
- Transitions
- Layout dimensions

See `app/styles/tokens.css` for the complete design system.

## 🌍 Internationalization

The app supports multiple languages using a custom i18n system:

- Supported languages: English (en), Spanish (es)
- Translations are located in `app/lib/i18n/`
- Default language is English
- Auto-detects browser language
- Falls back to English if translation is missing

## 🔒 Security

- **Authentication**: Auth0 with role-based access control
- **Authorization**: Row-level security (RLS) in Supabase
- **Input Validation**: Server-side validation with Zod
- **Audit Logging**: All actions are logged
- **HTTPS**: Required in production
- **Environment Variables**: Sensitive data in .env files

## 📊 Database

The database schema is documented in `DATABASE_SCHEMA.md`. It includes:

- 12 tables with proper relations
- Indexes for performance
- Row-level security policies
- Views for analytics
- Triggers for automatic timestamps

## 🚀 Deployment

### Build for Production

```bash
pnpm run build
```

### Environment Variables

Ensure all required environment variables are set in production:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- AUTH0_DOMAIN
- AUTH0_CLIENT_ID
- AUTH0_CLIENT_SECRET
- AUTH0_AUDIENCE
- MERCADO_PAGO_ACCESS_TOKEN
- MERCADO_PAGO_PUBLIC_KEY

### Deployment Platforms

The app can be deployed to:

- Vercel
- Netlify
- AWS
- DigitalOcean
- Any Node.js hosting platform

## 📝 License

ISC

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email juankmilo65@gmail.com or open an issue in the repository.

## 🗺️ Roadmap

- [ ] Phase 1: Project Setup ✅
- [ ] Phase 2: Database & Backend
- [ ] Phase 3: Authentication
- [ ] Phase 4: Core UI Components
- [ ] Phase 5: Dashboard & Analytics
- [ ] Phase 6: Tours Management
- [ ] Phase 7: Cities & Categories Management
- [ ] Phase 8: News & Content Management
- [ ] Phase 9: Offers & Promotions
- [ ] Phase 10: Reservations & Payments
- [ ] Phase 11: Users & Roles Management
- [ ] Phase 12: Application Configuration
- [ ] Phase 13: Testing & Optimization
- [ ] Phase 14: Documentation & Deployment

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed implementation plan.
