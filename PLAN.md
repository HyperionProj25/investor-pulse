## Next Steps for Investor Pulse

### 1. Supabase Setup (blocking step)
- Create the two tables described earlier: `site_state` (single row with JSON payload) and `update_history`.
- Enable Row Level Security and basic policies (public read for `site_state`, admin-only write; admin-only for `update_history`).
- Seed `site_state.payload` with the current `BASELINE_UPDATE` object, and store the same JSON in `update_history`.
- Confirm environment variables locally: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Data Layer Integration
- Install `@supabase/supabase-js` in the Next.js project.
- Create a `/lib/supabaseClient.ts` helper that exports both the public client (for read-only fetches) and a server-side client using the service role key.
- Replace the static `BASELINE_UPDATE` import with a fetch to `site_state` (server component or `getServerSideProps` equivalent for the app router).
- Add error/loading states for when Supabase is unreachable.

### 3. Admin Authentication & Routing
- Introduce an “admin” login flow separate from investor PINs (minimal viable approach: special PINs that unlock the admin view).
- After admin auth, expose a link/button to the questionnaire page.
- Protect the new questionnaire route so only authenticated admins can reach it.

### 4. Questionnaire UI & API
- Build `/admin/questionnaire` (or similar) with a multi-section form pre-filled from the latest `site_state.payload`.
- Add client-side validation (numbers for metrics, date strings, etc.).
- On submit:
  1. Insert a new row into `update_history`.
  2. Update `site_state` with the new payload (increment version, set `updated_by`).
- Surface confirmation/errors and maybe a “Preview” link to the investor view.

### 5. Timeline / History View
- Optionally add an `/admin/history` page listing past submissions from `update_history` (date, author, summary) with ability to rehydrate an older payload.

### 6. Cleanup & Deployment
- Remove the static questionnaire JSON once the Supabase fetch is stable.
- Update environment variable documentation (README).
- Smoke-test investor logins, Tom’s animation, and admin questionnaire end-to-end before deployment.
