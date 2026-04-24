# Momo — Production Application

This is the real, deployable Next.js + Supabase version of Momo. It's the production codebase that replaces the HTML prototype in `../prototype`.

## What you're getting

- **Next.js 15 App Router** (React, TypeScript, Tailwind CSS)
- **Supabase** for Postgres database, auth, and file storage
- **Anthropic Claude** for AI generation (real, not template-stitching)
- **Deployment-ready** for Vercel

Three public routes:
- `/` — Landing page
- `/p/[share_slug]` — Family archive view (anyone with the link can add memories)
- `/home` — Funeral home console dashboard
- `/home/[share_slug]` — Per-family detail view with AI generation tools

## Setup — step by step

This guide assumes no prior experience with Next.js, Supabase, or Vercel. Budget 60–90 minutes the first time. Once set up, deploys take 30 seconds.

### 1. Install Node.js

You need Node.js 20 or later.

- Go to [https://nodejs.org](https://nodejs.org)
- Download and install the LTS version
- Verify in a terminal: `node --version` should print something like `v20.x.x`

### 2. Install dependencies

In a terminal, navigate to this folder (`F:\families\momo\app`) and run:

```bash
npm install
```

This downloads all the libraries the project needs. Takes 2–3 minutes.

### 3. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign up (free)
2. Click **New project**
3. Name it "momo", choose a region near you, set a strong database password (save it — you'll need it later)
4. Wait 2–3 minutes for the project to provision

### 4. Run the database schema

1. In your Supabase project dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project in a text editor, copy everything
4. Paste into the SQL editor, click **Run** (green button)
5. You should see "Success. No rows returned." — all tables and indexes are now created

### 5. Create the media storage bucket

1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `media`
4. Make it **Public** (toggle on — for v1; we'll tighten later)
5. Click **Create bucket**

### 6. Get your Supabase API keys

1. In Supabase, click **Project Settings** (gear icon, bottom left) → **API**
2. You'll see:
   - **Project URL** — copy this (looks like `https://abcdefg.supabase.co`)
   - **anon public key** — copy this (starts with `eyJ…`)
   - **service_role key** — copy this (also starts with `eyJ…`) **Keep this one secret**

### 7. Get an Anthropic API key

1. Go to [https://console.anthropic.com](https://console.anthropic.com) and sign up
2. Add $5–$20 in credits to start (you'll use maybe $1–5 during initial testing)
3. Click **Settings** → **API Keys** → **Create Key**
4. Name it "momo", copy the key (starts with `sk-ant-…`)

### 8. Create your environment file

In this folder, create a new file called `.env.local` (the leading dot matters). Copy from `.env.example` and fill in your real values:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Save. This file should **never** be committed to git — it's in `.gitignore` already.

### 9. Run it locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the landing page.

To test the full flow:
1. Go to [http://localhost:3000/home](http://localhost:3000/home)
2. Click **+ New family archive**, create an archive for a test subject
3. Click **Open family view** — add a couple of text memories and a photo
4. Go back to the console, open that family's detail view
5. Click **Obituary — Traditional** — watch real Claude generate a draft from your test contributions

If that works: you have a real, functional product.

## Deploying to Vercel

Once it runs locally, putting it on the internet is a 5-minute job.

### 1. Push to GitHub

1. Create a new repo on [github.com](https://github.com) called `momo`
2. In this folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/momo.git
   git push -u origin main
   ```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign up with GitHub
2. Click **Add New Project**, import your `momo` repo
3. Framework preset should auto-detect as **Next.js**
4. Expand **Environment Variables** and paste in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (put your eventual domain like `https://momo.family` — you can update this later)
5. Click **Deploy**

In 2–3 minutes your site is live at `your-project.vercel.app`. Share that URL with anyone.

### 3. Add a real domain (optional, recommended before selling)

1. Buy a domain from Namecheap, Porkbun, or Google Domains — something like `momo.family`, `rememberwith.momo`, `keepmomo.com`. Cost: $10–15/year.
2. In Vercel project → **Settings** → **Domains** → **Add**, enter your domain
3. Follow Vercel's DNS instructions — paste two records into your domain registrar's DNS page
4. Within 1–4 hours your real domain points at your site

## Running costs

Estimated monthly costs for the first 10 funeral home customers:

- **Vercel** (Pro plan needed once you have traffic): $20/month
- **Supabase** (Pro plan, required for production): $25/month
- **Anthropic Claude API**: ~$1–5 per 100 generations. Budget $20–50/month depending on usage.
- **Domain**: $1–2/month
- **Mux video hosting** (if you add video beyond Supabase defaults): $10–30/month

**Total: ~$80–130/month** while you're small. Scales up linearly with usage.

Revenue at 10 customers at $99/month = $990/month. Solidly profitable from customer one.

## What's in this codebase

```
app/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── p/[slug]/page.tsx         # Family view (server component)
│   ├── p/[slug]/FamilyArchiveClient.tsx  # Family view (client)
│   ├── home/page.tsx             # Console dashboard (server)
│   ├── home/ConsoleDashboardClient.tsx
│   ├── home/[slug]/page.tsx      # Console detail (server)
│   ├── home/[slug]/ConsoleDetailClient.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── archives/route.ts              # Create/list archives
│       ├── archives/[slug]/route.ts       # Get/update one archive
│       ├── memories/route.ts              # Create/delete memory
│       ├── upload/route.ts                # Upload media to Supabase
│       └── generate/route.ts              # Claude generation proxy
├── lib/
│   ├── supabase.ts               # Supabase client + admin
│   ├── claude.ts                 # Claude client + prompts
│   └── types.ts                  # Shared TypeScript types
├── supabase/
│   └── schema.sql                # Run this in Supabase SQL editor
├── package.json
├── next.config.js
├── tailwind.config.ts
└── .env.example                  # Template for .env.local
```

## What still needs building (before you sell to real funeral homes)

This codebase is a v1 foundation. To be truly sellable to a funeral home, you still need:

1. **Staff authentication** — funeral home staff should sign in. Right now any request to `/home` is unauthenticated. Add Supabase Auth with magic links.
2. **Scoping to a funeral home** — right now all archives are visible on the dashboard. Add a `home_id` filter so each staff member sees only their home's archives.
3. **Stripe billing** — a subscription system so homes can self-serve sign up.
4. **Email invitations** — the family-side URL is generated but there's no automated "here's your family page" email. Add Resend or Postmark for transactional email.
5. **Voice recording in-browser** — the family view accepts voice file uploads but doesn't record live. Port the MediaRecorder code from the prototype.
6. **Slideshow rendering** — right now only text generations (obit, eulogy, thank-you) go through Claude. Slideshow is handed off as a shot list. Real video assembly is a separate build.
7. **Print-on-demand heirloom books** — v2 feature. Integrate with Lulu or Blurb.
8. **Terms of service and privacy policy** — required before charging money. Use a template from [terms.law](https://terms.law) or a legal service.

## Getting help

- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Anthropic Claude**: [docs.claude.com](https://docs.claude.com)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)

Each of those platforms has very good AI-assisted chat on their docs now. If you get stuck, paste the error into Claude.ai and it will almost certainly solve it.

## First action after setup

Once you have this running locally and deployed to Vercel with a real domain:

1. Create one test archive for a family member you know
2. Text them the family URL, ask them to add a memory
3. Watch it land
4. Generate the obituary — see how Claude handles their actual contribution
5. Take a screenshot of that flow
6. Send that screenshot, plus the `prototype/pitch/one-pager.pdf`, to the first five funeral homes on your list

You now have a real product. Time to find out if anyone wants it.
