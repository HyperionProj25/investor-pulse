This project is a [Next.js](https://nextjs.org) app that powers the Baseline Investor Pulse + pitch deck experiences.

## Local development

```bash
npm install
npm run dev
```

Environment variables expected in `.env.local` (or your shell):

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Deploying on Netlify

Netlify detects the included `netlify.toml` and runs the Next.js runtime automatically.

1. Add the same Supabase variables inside your Netlify site settings (`Site configuration > Environment variables`). Remember only the `NEXT_PUBLIC_*` keys are exposed to the browser; the `SUPABASE_SERVICE_ROLE_KEY` must **not** be prefixed so it stays server-only.
2. Trigger a build (`npm run build` is already configured). Netlify will deploy the rendered pages plus the serverless API routes under `app/api/**`.
3. Ensure your Supabase tables (`site_state`, `pitch_deck_state`, etc.) are seeded so the site has content on first render.

For local parity you can run `netlify dev` (after installing `@netlify/cli`) to emulate the serverless functions.

## Useful scripts

| Command        | Description                     |
| -------------- | -------------------------------- |
| `npm run dev`  | Start the Next.js dev server     |
| `npm run lint` | Run ESLint across the codebase   |
| `npm run build`| Production build (used by Netlify) |
