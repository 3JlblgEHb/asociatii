# Asociatii — SaaS Platform for Condominium Management

MVP platform for managing owner associations: buildings, apartments, documents, votes, service requests, and announcements.

## Product documentation

- [Roadmap](ROADMAP.md)
- [Product context and operating principles](docs/PROJECT_CONTEXT.md)
- [Moldova domain research and sources](docs/RESEARCH_MOLDOVA.md)
- [Architecture decisions and open choices](docs/ARCHITECTURE_DECISIONS.md)
- [Supabase security baseline](docs/SECURITY_BASELINE.md)
- [Development standards](docs/DEVELOPMENT_STANDARDS.md)

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** — Auth, PostgreSQL, RLS, Storage, Edge Functions
- **TailwindCSS** + **shadcn/ui**
- **Resend** — email notifications
- **Vercel** — deployment

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in SQL Editor:

```bash
# File: supabase/migrations/00001_initial_schema.sql
```

3. Enable Email auth in Authentication → Providers
4. Copy project URL and anon key to `.env.local`

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`.

### 4. Deploy Edge Function (vote PDF export)

```bash
supabase functions deploy export-vote-results
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roles

| Role | Description |
|------|-------------|
| `super_admin` | SaaS platform owner — sees all organizations |
| `association_admin` | Organization admin |
| `manager` | Building manager / chairman |
| `owner` | Apartment owner with voting rights |
| `resident` | Resident without voting rights |

Set super admin manually in DB:

```sql
UPDATE users_profiles SET global_role = 'super_admin' WHERE email = 'your@email.com';
```

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview stats |
| `/organizations` | Org management & members |
| `/buildings` | Building CRUD |
| `/apartments` | Apartment CRUD |
| `/documents` | Document upload/list |
| `/announcements` | Announcements + email |
| `/votes` | Voting management |
| `/votes/[id]` | Vote detail & cast |
| `/requests` | Service requests |
| `/settings` | User profile |
| `/admin` | Super admin panel |

## Multi-tenant Architecture

- All tenant data scoped by `organization_id`
- RLS policies enforce org isolation
- Current org stored in HTTP-only cookie
- Storage paths: `{org_id}/{filename}`

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables from `.env.example`
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register
│   ├── (dashboard)/     # Protected app pages
│   └── invite/          # Invitation acceptance
├── components/          # UI components by module
├── lib/
│   ├── actions/         # Server actions
│   ├── auth/            # Auth context & roles
│   ├── email/           # Resend integration
│   ├── supabase/        # Supabase clients
│   └── types/           # TypeScript types
supabase/
├── migrations/          # SQL schema + RLS
└── functions/           # Edge functions
```
# asociatii
