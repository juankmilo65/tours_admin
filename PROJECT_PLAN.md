# Tours Admin Dashboard - Implementation Plan

## Project Overview

Modern admin dashboard for managing tours, reservations, users, and payments. Built with Remix, TypeScript, Supabase, and Auth0.

## Tech Stack

- **Frontend**: Remix + React + TypeScript + CSS Variables/Design Tokens
- **Backend**: Node.js + TypeScript (API modular)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Auth0 (Gmail/email, ADMIN role only)
- **Quality**: ESLint strict + Prettier + TypeScript strict mode
- **i18n**: Backend and frontend internationalization
- **Payments**: Mercado Pago México integration

## Implementation Phases

### Phase 1: Project Setup & Configuration

- [x] Create project plan
- [ ] Initialize Remix project with TypeScript
- [ ] Configure ESLint, Prettier, and TypeScript strict mode
- [ ] Set up design tokens and CSS variables
- [ ] Configure i18n framework
- [ ] Create folder structure

### Phase 2: Database & Backend

- [ ] Set up Supabase project
- [ ] Design database schema
- [ ] Create migration files for all tables
- [ ] Set up database relations and constraints
- [ ] Configure Row Level Security (RLS) policies
- [ ] Create database views for analytics
- [ ] Set up Supabase client and utilities

### Phase 3: Authentication

- [ ] Configure Auth0 application
- [ ] Set up Auth0 integration with Remix
- [ ] Implement authentication flow (login/logout)
- [ ] Create route guards for ADMIN role
- [ ] Set up session management
- [ ] Create auth utilities and hooks

### Phase 4: Core UI Components

- [ ] Create layout components (Sidebar, Header, Main)
- [ ] Build reusable UI components (Buttons, Cards, Modals, Tables)
- [ ] Implement design tokens system
- [ ] Create form components with validation
- [ ] Build notification/alert components
- [ ] Implement responsive design patterns

### Phase 5: Dashboard & Analytics

- [ ] Create dashboard main page
- [ ] Implement KPI cards component
- [ ] Build charts and graphs components
- [ ] Create date range filter
- [ ] Implement city and category filters
- [ ] Build subscription plan filters
- [ ] Create analytics data fetching

### Phase 6: Tours Management

- [ ] Create tours list page with filters
- [ ] Build tour creation/edit form
- [ ] Implement image upload for tours
- [ ] Create tour detail view
- [ ] Add pricing and discount management
- [ ] Implement availability calendar
- [ ] Add tour i18n support

### Phase 7: Cities & Categories Management

- [ ] Create cities CRUD interface
- [ ] Build categories CRUD interface
- [ ] Implement SEO metadata management
- [ ] Add icon/color management for categories
- [ ] Create association management

### Phase 8: News & Content Management

- [ ] Create news CRUD interface
- [ ] Implement draft/published states
- [ ] Add scheduling functionality
- [ ] Build image upload for news
- [ ] Add content i18n support

### Phase 9: Offers & Promotions

- [ ] Create offers CRUD interface
- [ ] Implement dynamic landing pages
- [ ] Add offer scheduling
- [ ] Integrate with subscription plans
- [ ] Build promotion ranking system

### Phase 10: Reservations & Payments

- [ ] Create reservations list with filters
- [ ] Build reservation detail view
- [ ] Implement payment status management
- [ ] Add manual payment modification
- [ ] Create email confirmation system
- [ ] Build availability management
- [ ] Integrate Mercado Pago

### Phase 11: Users & Roles Management

- [ ] Create users list page
- [ ] Build role assignment interface
- [ ] Implement activity history view
- [ ] Add subscription management
- [ ] Create audit logs

### Phase 12: Application Configuration

- [ ] Build settings page
- [ ] Implement color and typography configuration
- [ ] Create payment settings
- [ ] Add notification settings
- [ ] Build integration settings (Auth0, Mercado Pago, analytics)

### Phase 13: Testing & Optimization

- [ ] Write unit tests for critical components
- [ ] Implement integration tests
- [ ] Perform accessibility testing
- [ ] Optimize performance
- [ ] Test responsive design
- [ ] Security audit

### Phase 14: Documentation & Deployment

- [ ] Create API documentation
- [ ] Write deployment guide
- [ ] Set up CI/CD pipeline
- [ ] Configure environment variables
- [ ] Deploy to production

## Design Principles

1. **Minimal Clicks**: Optimize workflows to reduce the number of clicks needed for common tasks
2. **Quick Actions**: Use modals for fast operations (e.g., add tour, confirm reservation)
3. **Responsive Design**: Optimized for desktop and tablet
4. **Visual Feedback**: Immediate visual feedback for critical actions
5. **Consistent UX**: Uniform design patterns across all modules
6. **Accessible**: WCAG 2.1 AA compliant
7. **Secure**: Role-based access control, audit logs, input sanitization

## File Structure

```
tours_admin/
├── app/
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/
│   │   ├── forms/
│   │   └── charts/
│   ├── routes/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── tours/
│   │   ├── cities/
│   │   ├── categories/
│   │   ├── news/
│   │   ├── offers/
│   │   ├── reservations/
│   │   ├── users/
│   │   └── settings/
│   ├── services/
│   │   ├── supabase/
│   │   ├── auth0/
│   │   └── payments/
│   ├── utils/
│   ├── styles/
│   │   ├── tokens/
│   │   └── global.css
│   └── lib/
│       ├── i18n/
│       └── validations/
├── supabase/
│   ├── migrations/
│   └── functions/
├── prisma/ (if using Prisma with Supabase)
├── public/
│   └── images/
└── config/
    ├── auth0.config.ts
    ├── supabase.config.ts
    └── mercadopago.config.ts
```

## Next Steps

Starting with Phase 1: Project Setup & Configuration
