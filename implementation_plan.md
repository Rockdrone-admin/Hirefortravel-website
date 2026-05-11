# HireForTravel Architecture & Migration Plan

## Overview
This document outlines the architecture analysis of the existing HireForTravel production application and details the migration plan to a scalable, environment-isolated monorepo architecture with a database-backed dynamic content system and a dedicated Admin Panel.

---

## Phase 1: Architecture Analysis of Current Codebase

### 1. Frontend Structure & Routing
- **Structure**: Static HTML5, CSS3 (Vanilla), and JavaScript.
- **Routes**: `/`, `/companies`, `/candidates`, `/AboutUs`, `/ContactUs`. These are mapped directly to directories with `index.html` files.
- **Vercel Setup**: `vercel.json` is configured with `"cleanUrls": true` to hide `.html` extensions.

### 2. Form Handling Flow & APIs
- **Flow**: `site.js` captures form data (Company vs Candidate leads), converts file uploads to Base64, and POSTs to `/api/submit`.
- **API**: The `/api/submit.js` Vercel serverless function acts as a proxy. It validates the payload and forwards it to a Google Apps Script endpoint.
- **Data Dependencies**: Google Sheets acts as the database; Google Drive stores CVs. Apps Script handles the actual data insertion and email sending.

### 3. Hardcoded Dynamic Sections
- **Jobs**: Hardcoded in `candidates/index.html` within `<details class="role-panel">` tags.
- **Client Logos**: Hardcoded in `index.html`, `companies/index.html`, and `AboutUs/index.html` within `<div class="clients-strip">`.

### 4. Observability & SEO
- **BetterStack**: Integrated natively in `/api/submit.js` and `AppscriptCode.gs` to track form submissions and errors.
- **SEO & Indexing**: Contains standard `robots.txt`, `sitemap.xml`, and appropriate canonical tags. Uses JSON-LD for rich snippets (`@type: "Organization"` and `"WebPage"`). Favicon and Open Graph (OG) tags are well-configured.

### 5. Environment Isolation (Current State)
- Currently, there is **no strict environment isolation**. Development and Production share the same Apps Script backend and Google Sheets (though the webhook URL can be manually swapped in `assets/js/config.js`).

---

## Phase 2: Target Architecture & Monorepo Structure

We will transition the repository to a modern Monorepo using a tool like **Turborepo** or **npm/pnpm workspaces**.

```text
/
├── apps/
│   ├── website/    # The public-facing site
│   ├── admin/      # The new Next.js Admin Panel
│   └── api/        # The centralized API layer (Node.js/Express or Next.js API)
├── packages/
│   ├── shared/     # Shared assets, styles, or logic
│   ├── types/      # TypeScript interfaces/types for DB schemas
│   ├── schemas/    # Zod schemas for API validation
│   ├── utils/      # Shared utility functions
│   └── constants/  # Shared constants (e.g., job statuses)
├── scripts/
│   ├── migration/  # Data migration scripts
│   └── seed/       # DB seeding scripts
└── docs/           # Documentation
```

### Framework Selection
- **`apps/admin`**: Next.js (App Router) + Tailwind CSS + shadcn/ui (or similar component library) for rapid, accessible dashboard development.
- **`apps/api`**: A lightweight Node.js/Express or Fastify server, or potentially a standalone Next.js application acting as an API, to serve both Website and Admin.
- **`apps/website`**: To easily support **dynamic Schema.org SEO generation** for jobs while retaining the existing static HTML/CSS feel, we will migrate the existing HTML to Next.js (App Router). This allows us to use Server Components to fetch jobs and render dynamic HTML/JSON-LD *before* serving the page to the crawler, fulfilling the SEO requirements without breaking existing styling.

### Database Architecture
We will use **Supabase (PostgreSQL)**. 

**Schemas**:
- `JOBS`: `id`, `title`, `company_name`, `location`, `experience`, `salary`, `responsibilities`, `requirements`, `benefits`, `status` (active/inactive/archived), `created_at`, `updated_at`, `environment`
- `CLIENT_LOGOS`: `id`, `company_name`, `logo_url`, `alt_text`, `is_visible`, `created_at`, `updated_at`, `environment`
- `ANALYTICS_EVENTS`: `id`, `event_type`, `source`, `page`, `metadata`, `created_at`, `environment`
- `ADMIN_USERS`: `id`, `username`, `password_hash`, `reset_token`, `created_at`, `updated_at`, `environment`

---

## Phase 3: Deployment & Environment Isolation Plan

> [!CAUTION]
> Environment isolation is the most critical constraint. Dev must NEVER mutate Production.

### Deployment Endpoints
- **Production**: `hirefortravel.com` (Web), `admin.hirefortravel.com` (Admin), `api.hirefortravel.com` (API)
- **Development**: `dev.hirefortravel.com` (Web), `dev-admin.hirefortravel.com` (Admin), `dev-api.hirefortravel.com` (API)

### Isolation Strategy
1. **Separate Supabase Projects**: We will provision two completely separate Supabase instances—one for DEV, one for PROD. This physically isolates the data.
2. **Environment Variables**: Vercel projects will have strictly separated `DATABASE_URL` and `API_URL` variables.
3. **CORS & Origin Restrictions**: `dev-api.hirefortravel.com` will only accept requests from `dev.hirefortravel.com` and `dev-admin.hirefortravel.com`. Prod API will only accept Prod origins.
4. **Environment DB Column**: As a failsafe, tables include an `environment` column. The API will strictly enforce `WHERE environment = 'production'` in prod and `WHERE environment = 'development'` in dev.

### Indexing Protection
- Admin (`admin.` and `dev-admin.`) and API (`api.` and `dev-api.`) will have:
  - `X-Robots-Tag: noindex, nofollow` HTTP headers.
  - `<meta name="robots" content="noindex, nofollow">`.
  - `robots.txt` disallowing all (`Disallow: /`).
  - Auth protection on all Admin pages.

---

## Phase 4: Implementation & Migration Workflow

1. **Step 1-2**: (Completed via this document).
2. **Step 3 (Monorepo)**: Initialize Turborepo. Move current codebase into `apps/website`.
3. **Step 4 (Database)**: Setup Supabase projects. Run initial schema migrations using a tool like Drizzle ORM or Prisma.
4. **Step 5 (API)**: Scaffold the `apps/api` layer with endpoints for Jobs, Logos, Analytics, and Admin Auth.
5. **Step 6 (Admin)**: Build the Next.js Admin Panel (Auth, Dashboard, Job Manager, Logo Manager).
6. **Step 7-8 (Content Migration)**: Write scripts to populate the DEV database with the currently hardcoded jobs and logos.
7. **Step 9 (Analytics)**: Implement the custom analytics ingestion endpoint and update `site.js` to dispatch events (e.g., WhatsApp clicks).
8. **Step 10-11 (Isolation & SEO)**: Apply CORS, strict ENV configs, and `noindex` headers to internal apps.
9. **Step 12-13 (Deployment)**: Deploy to Vercel DEV environments. Validate end-to-end functionality before any production rollout.

> [!IMPORTANT]
> The current Vercel production site will remain untouched during DEV implementation. We will deploy the monorepo to separate Vercel projects linked to the `dev` branch. Once validated, we will execute a DNS/Project swap to roll out production safely.

---

## Open Questions for the User
1. **Frontend Migration**: To achieve dynamic Schema.org SEO for jobs, keeping the site as pure static HTML requires an SSG build step whenever a job changes. Migrating the HTML/CSS to Next.js App Router (which natively supports dynamic SEO) is the industry standard approach for this. Are you comfortable with moving the `website` code into Next.js React components (preserving exact HTML/CSS), or do you strictly want it to remain `.html` files? 
Answer: Yes
2. **Form Submissions**: Should we migrate the Google Apps Script / Google Sheets lead capture to Supabase as well during this phase, or keep leads flowing to Google Sheets while only migrating Jobs/Logos/Analytics to the new DB?
Answer: Keep leads flowing to Google Sheets only for the time being. Only migrate Jobs,Logos,Analytics to the new DB.
3. **Image Storage**: For Client Logos, should we use Supabase Storage buckets to host the SVGs?
Answer: Sure
