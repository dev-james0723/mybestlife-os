This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Cursor’s built-in browser:** use **[http://127.0.0.1:3000](http://127.0.0.1:3000)** (same port as `npm run dev`). Next.js dev cross-origin checks use the hostname without a port; `next.config.ts` allowlists `127.0.0.1` / `::1` so `/_next` assets and HMR are not blocked.

If port 3000 is busy, run `npm run dev:cursor` from `app` (or repo root) and open **[http://127.0.0.1:3490](http://127.0.0.1:3490)**, or use the task **“My Life OS: Dev (Cursor — 127.0.0.1:3490)”**.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Knowledge Base Social Embeds

Knowledge Base social URL ingestion uses official oEmbed where possible:

- X/Twitter: no key required.
- Threads: no key required for public post oEmbed.
- Instagram posts/Reels and Facebook posts/videos: requires `META_OEMBED_ACCESS_TOKEN` from a Meta Developer app with Meta oEmbed Read enabled/approved.
- Optional fallback: set `IFRAMELY_API_KEY` to use Iframely when an official embed is unavailable.

Only public, unrestricted posts can be embedded reliably. Private, deleted, age-restricted, geo-gated, or login-only posts fall back to metadata/summary when available.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This repo keeps the Next.js app in the **`app/`** directory (not the repository root). On Vercel, set **Root Directory** to **`app`** so installs and `next build` run in the right place. `next.config.ts` already sets `outputFileTracingRoot` to the monorepo parent so serverless traces resolve correctly from that layout.

### One-time setup

1. Push the repository to GitHub (or GitLab / Bitbucket).
2. [Import the project](https://vercel.com/new) on Vercel and choose the repo.
3. **Settings → General → Root Directory** → set to **`app`** (required).
4. **Settings → Environment Variables** — add at least the Supabase client vars (same names as local `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` **or** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Optional but common for production: `NEXT_PUBLIC_APP_URL` (canonical site URL), AI keys (`GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`), `NEXT_PUBLIC_OPENWEATHER_API_KEY`, `META_OEMBED_ACCESS_TOKEN` / `IFRAMELY_API_KEY` for social embeds (see **Knowledge Base Social Embeds** above). For production, set `NEXT_PUBLIC_HIDE_DEV_LOGIN_BYPASS=true` if you rely on dev-login bypass flags locally.
6. Deploy. Vercel will run `npm install` and `npm run build` inside **`app/`** (Node **≥ 20.9** per `package.json` `engines`).

### CLI from your machine

From the **repository root** (parent of `app/`):

```bash
npm run vercel:prod
```

That runs `vercel deploy --prod --yes` (see root `package.json`). Ensure the Vercel project’s **Root Directory** is **`app`**, or link/deploy from the `app` folder with `vercel` after `cd app`.

More detail: [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs).
