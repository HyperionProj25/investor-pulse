# Pitch Deck Feature - Setup & Usage Guide

## Overview

The pitch deck feature allows you to create a secure, personalized pitch deck presentation that can be shared with potential investors. It includes:

- **PIN-based authentication** (Profile: "PRE PITCH DECK", PIN: 2524)
- **Two display modes**: Vertical scroll or Carousel/Slideshow
- **Multiple content types**: Text slides, PDF embeds, and video embeds
- **Admin editing interface** with inline controls
- **Glass-themed design** with dark background and orange accents
- **Countdown timer** to launch milestone
- **Keyboard navigation** (arrow keys in carousel mode)
- **Markdown-style formatting** for text slides

---

## Database Setup

### Step 1: Run the Database Migrations

You need to run the SQL migration file to create the required database tables.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Open the migration file: `/supabase/migrations/20251205180000_create_pitch_deck_tables.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute the migration
7. Repeat the process for the updated investor seed data:
   - Open `/supabase/migrations/20251205174318_seed_baseline_data.sql`
   - This has been updated to include the "PRE PITCH DECK" investor profile

**Option B: Using Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db push
```

**What the migration creates:**

- `pitch_deck_state` table - Stores the current live pitch deck content
- `pitch_deck_update_history` table - Audit trail of all pitch deck updates
- Row Level Security (RLS) policies for secure access
- Initial seed data with a welcome slide

---

## Step 2: Update the Main Site Data

The "PRE PITCH DECK" investor profile has been added to the main investor data. To update your production database:

1. Go to your Supabase SQL Editor
2. Run the following SQL to add the new investor to your existing `site_state` record:

```sql
UPDATE site_state
SET payload = jsonb_set(
  payload,
  '{investors}',
  payload->'investors' || '[{
    "slug": "pre-pitch-deck",
    "name": "PRE PITCH DECK",
    "firm": "Baseline",
    "title": "Pitch Deck Viewer",
    "focusArea": "exploring Baseline''s vision and opportunity.",
    "welcomeNote": "Welcome to Baseline''s pitch deck. Explore our mission to build the performance data layer for baseball and softball.",
    "highlight": "Building the future of youth sports performance tracking.",
    "keyQuestions": [
      "What problem does Baseline solve?",
      "How big is the market opportunity?",
      "Why now, and why this team?"
    ],
    "nextStep": "Review the deck and reach out to discuss partnership opportunities.",
    "pixelAccent": "#cb6b1e",
    "pixelMuted": "#f6e1bd",
    "pin": "2524"
  }]'::jsonb
)
WHERE id = (SELECT id FROM site_state ORDER BY updated_at DESC LIMIT 1);
```

---

## Accessing the Pitch Deck

### For Viewers (Potential Investors)

1. Navigate to: `https://yoursite.com/pitch-deck`
2. Enter PIN: **2524**
3. Click "Access Deck"

### For Admins

1. Navigate to: `https://yoursite.com/pitch-deck`
2. Log in with viewer PIN: **2524**
3. Click the **"Admin"** button (bottom-right corner)
4. Enter your admin PIN (Chase: 9090 or Sheldon: 6677)
5. Click "Unlock" to enter edit mode

---

## Using the Pitch Deck

### Display Modes

**Vertical Scroll Mode** (Default)
- All slides displayed one after another
- Scroll down to view all content
- Best for comprehensive presentations

**Carousel/Slideshow Mode**
- One slide at a time
- Navigation buttons to move between slides
- Keyboard shortcuts: Left/Right arrow keys
- Slide indicators at the bottom
- Best for focused, step-by-step presentations

Toggle between modes using the buttons at the top of the page.

---

## Admin Features

### Adding Content

When in edit mode, you'll see an "Add Content" panel with three buttons:

1. **+ Text Slide** - Add a slide with formatted text
2. **+ PDF Slide** - Embed a PDF document (Google Slides export, etc.)
3. **+ Video** - Embed a video (YouTube or direct upload)

### Managing Slides

Each slide in edit mode has controls:

- **↑ / ↓ buttons** - Reorder slides
- **Delete button** - Remove the slide

### Text Slide Formatting

Text slides support basic markdown-style formatting:

```
# Large Header
## Medium Header
### Small Header

**Bold text**
*Italic text*

Regular paragraph text
```

### PDF Slides

For PDF slides, you have two options:

**Option 1: Google Slides (Recommended)**
1. In Google Slides, go to File > Share > Publish to web
2. Choose "Embed" and copy the iframe URL
3. Paste the URL into the "PDF URL" field

**Option 2: Direct PDF Upload**
1. Upload your PDF to a hosting service (Supabase Storage, Cloudinary, etc.)
2. Get the public URL
3. Paste it into the "PDF URL" field

### Video Embeds

**YouTube Videos:**
1. Go to your YouTube video
2. Click "Share" > "Embed"
3. Copy the embed URL (e.g., `https://www.youtube.com/embed/VIDEO_ID`)
4. Paste into the "Video URL" field

**Direct Upload Videos:**
1. Upload your video file to a hosting service
2. Get the public URL
3. Select "Direct Upload" from the dropdown
4. Paste the URL

### Saving Changes

1. Make all your edits
2. Click **"Save Changes"** (bottom-right corner)
3. Wait for "Saved!" confirmation
4. Changes are immediately live for all viewers

---

## Countdown Timer

The countdown timer in the top-right corner shows time remaining until your launch milestone.

To update it:
1. Enter edit mode
2. The countdown configuration is part of the pitch deck content
3. Currently set to: March 1, 2026
4. Edit in the database or add UI controls as needed

---

## Design & Styling

The pitch deck uses a **glass morphism design** with:

- Dark background (#0A0A0A)
- Frosted glass cards (white/10% opacity with backdrop blur)
- Orange accent color (#cb6b1e) for CTAs and highlights
- Cream/tan text (#f6e1bd) for primary content
- Responsive layout (works on desktop and mobile)

---

## File Structure

```
/app/pitch-deck/
  └── page.tsx              # Main pitch deck page component

/lib/
  └── pitchDeck.ts          # Data models and helper functions

/app/api/pitch-deck/
  └── route.ts              # API endpoints (GET/POST)

/supabase/migrations/
  └── 20251205180000_create_pitch_deck_tables.sql
```

---

## Troubleshooting

**Issue: "No pitch deck content available"**
- Ensure the database migration has been run
- Check that `pitch_deck_state` table exists and has data
- Verify your `.env.local` has correct Supabase credentials

**Issue: Admin button doesn't unlock**
- Verify you're using a valid admin PIN (9090 or 6677)
- Check that the admin slugs are properly configured in `/lib/adminUsers.ts`

**Issue: PDF/Videos not showing**
- Ensure URLs are publicly accessible
- Check browser console for CORS errors
- For Google Slides, make sure "Publish to web" is enabled

**Issue: Changes not saving**
- Check browser console for API errors
- Verify Supabase service role key is in `.env.local`
- Ensure you have write permissions on the database

---

## Next Steps

1. Run the database migrations
2. Access `/pitch-deck` and test authentication
3. Enter admin mode and add your first slides
4. Customize the countdown timer date
5. Share the link with potential investors (with PIN: 2524)

---

## Security Notes

- The viewer PIN (2524) is shared with all pitch deck viewers
- Admin PINs (9090, 6677) should be kept private
- All changes are logged in `pitch_deck_update_history` for audit trail
- Consider rotating PINs periodically for security

---

## Future Enhancements

Potential features to add:

- File upload directly in the UI (instead of URL paste)
- Countdown timer editor in the UI
- Analytics (track who viewed which slides)
- PDF annotations/highlights
- Slide transitions and animations
- Export pitch deck to PDF
- Comments/feedback from viewers
