# Investor Experience Next Steps

## Goals
- Remove the hard requirement for title/firm while keeping a lightweight context field when it is useful.
- Let each investor share a common welcome narrative via groups, with optional per-investor overrides.
- Keep the admin workspace simple: toggle optional fields, manage groups, and preview what each persona sees.
- Preserve the existing PIN/session flow so auth stays unaffected by content changes.

## Prerequisites (must be answered before development)
1. Finalize the `WelcomeCopy` fields (exact list of text snippets, whether highlight/key questions are mandatory, any CTA/CTA-label needs).
2. Define the initial investor groups, their slugs/labels, and which existing investors map to each group.
3. Decide whether groups also control any other shared surface (snapshot selection, CTA bar text, etc.).
4. Clarify if we need tracking/analytics on which investors inherit vs override welcome content.
5. Determine how admins should preview shared experiences (per-investor preview vs single group preview) so the UI can be designed correctly.

## Current State (as of 2025-12-10)
- `InvestorPersona` in `lib/questionnaire.ts` requires `firm`, `title`, `focusArea`, `welcomeNote`, `highlight`, `keyQuestions`, and `nextStep`, so every editor and validator (`lib/investorValidation.ts`) enforces all of those.
- `/app/admin/investors/page.tsx` mirrors the strict schema: the add/edit form always shows firm/title inputs and saves the full `investors` array back to `site_state`.
- Viewer components (`components/PersonalizedWelcome.tsx`, hero cards, etc.) read those fields directly, so there is no abstraction for shared copy or overrides.

## Data Model Updates
1. Replace `firm` + `title` with optional context fields:
   - `companyName?: string`, `relationshipLabel?: string`.
   - `hideCompany?: boolean` and `hideRelationship?: boolean` flags back the proposed checkboxes.
2. Keep `focusArea` but move it into a `WelcomeCopy` object alongside `welcomeNote`, `highlight`, `keyQuestions`, and `nextStep`.
3. Introduce `InvestorGroup` objects: `{ slug, label, description?, defaultWelcome: WelcomeCopy }`.
4. Add `groupSlug?: string | null` to each investor plus `welcomeOverride?: Partial<WelcomeCopy>` for bespoke changes.
5. Extend the Supabase `site_state.payload` schema (and seed data) to include `investorGroups` and the new investor shape; plan a JSON migration/backfill for existing data.

## Admin UI + Validation Work
- Update `lib/investorValidation.ts` so only `slug`, `name`, `pin`, valid colors, and at least one welcome source (override or group default) are required. Allow empty company/relationship fields when their "hide" checkbox is selected.
- Redesign the form in `/app/admin/investors/page.tsx`:
  - Replace firm/title inputs with “Company / Org” and “Relationship” fields plus "Hide on card" checkboxes.
  - Add a “Group” selector (dropdown of `investorGroups` with a quick link to manage groups).
  - Add a “Customize welcome for this investor” toggle; when off, the preview/inputs show the inherited group copy; when on, show textareas for overrides.
  - Allow editing of key questions/highlights only when overriding, otherwise show them read-only from the group.
- Create a lightweight “Investor Groups” management surface (table or modal) for CRUD operations on group label + default welcome copy.

## Rendering Logic
- Build a helper (e.g., `resolveWelcomeContent(investor, groups)`) that merges `welcomeOverride`, the linked group’s `defaultWelcome`, and finally a global fallback so UI components stay simple.
- Update `components/PersonalizedWelcome.tsx` and any other sections that surface `focusArea`, `welcomeNote`, `keyQuestions`, or `nextStep` to rely on the helper and respect the hide-company / hide-relationship flags.
- Ensure grouping applies anywhere we show investor-specific context (CTA bars, recap cards, etc.), not just the hero block.

## API + Storage Changes
- Adjust `/api/site-state` reads and `/api/admin/update` writes to accept the expanded payload and persist `investorGroups`.
- Add a Supabase migration (or manual JSON update) that seeds the initial groups, moves today’s `firm/title` values into `companyName/relationshipLabel`, and assigns default groups (e.g., “Pitch Deck”, “Active Diligence”).
- Consider versioning the `site_state` payload so older deployments don’t break while the new schema rolls out.

## Rollout Checklist
1. Confirm the final `WelcomeCopy` fields (are highlight/key questions always needed, do we need separate CTA text?).
2. Decide the initial list of investor groups and how existing investors map to them.
3. Ship the schema + validation updates, migrate Supabase data, and expose the new form controls.
4. Implement the resolver helper and update all viewer components to consume it.
5. QA admin flows (add, edit, group switch, override toggle) and viewer flows (investor vs deck vs admin) before redeploying.
6. Document for future admins how to use groups vs overrides and when to hide company/relationship info.

## Open Questions
- Should groups control any other shared elements (e.g., snapshot selection, CTA button text)?
- Do we need analytics on which investors are inheriting vs overriding welcome copy?
- How should we surface a preview of what grouped investors see (per-investor preview vs group preview)?
