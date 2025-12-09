# Google Slides Embed Guide (View-Only, Presentation Mode)

## How to Embed Google Slides in Your Pitch Deck (No Editing, View-Only)

### Step-by-Step Instructions:

#### 1. Open Your Google Slides Presentation
- Go to your Google Slides deck
- Make sure all slides are finalized and ready to present

#### 2. Publish to Web
1. Click **File** → **Share** → **Publish to web**
2. In the dialog that opens, click the **Embed** tab
3. Configure these settings:

**Slide Settings:**
- **Auto-advance slides**: Off (or set to desired timing)
- **Start slideshow as soon as the player loads**: Check this
- **Restart the slideshow after the last slide**: Optional

4. Click **Publish**
5. Click **OK** to confirm

#### 3. Get the Embed Code
You'll see an `<iframe>` code like this:

```html
<iframe src="https://docs.google.com/presentation/d/e/2PACX-XXXXX/embed?start=true&loop=false&delayms=3000" frameborder="0" width="960" height="569" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>
```

#### 4. Copy the URL ONLY
From the iframe code above, copy **ONLY the URL** between the quotes in `src="..."`

Example:
```
https://docs.google.com/presentation/d/e/2PACX-XXXXX/embed?start=true&loop=false&delayms=3000
```

#### 5. Paste in Pitch Deck Editor
1. Go to your pitch deck admin mode
2. Click **+ PDF Slide**
3. Paste the URL in the input field
4. Click **Preview** to verify it works
5. Click **Save Changes**

---

## URL Parameters Explained:

The embed URL includes these parameters that control behavior:

| Parameter | What it Does | Options |
|-----------|--------------|---------|
| `start=true` | Starts in presentation mode immediately | `true` or `false` |
| `loop=false` | Whether to loop back to start after last slide | `true` or `false` |
| `delayms=3000` | Auto-advance delay (milliseconds) | Number (e.g., `3000` = 3 seconds) |

### Recommended Settings for Investor Pitch Deck:

```
start=true&loop=false&delayms=0
```

This means:
- ✅ Starts in presentation mode
- ✅ Doesn't loop (investors control navigation)
- ✅ No auto-advance (investors control pace)

---

## Example URLs:

### Manual Navigation (Recommended for Investors):
```
https://docs.google.com/presentation/d/e/2PACX-XXXXX/embed?start=true&loop=false&delayms=0
```

### Auto-Play (5 seconds per slide):
```
https://docs.google.com/presentation/d/e/2PACX-XXXXX/embed?start=true&loop=false&delayms=5000
```

### Looping (for background display):
```
https://docs.google.com/presentation/d/e/2PACX-XXXXX/embed?start=true&loop=true&delayms=3000
```

---

## What Viewers Can Do:

When embedded this way, viewers can:
- ✅ Navigate slides (arrow keys, click navigation)
- ✅ View in fullscreen
- ✅ Download (if you enable it in sharing settings)
- ✅ Print (if you enable it in sharing settings)

Viewers **CANNOT**:
- ❌ Edit slides
- ❌ Comment
- ❌ See speaker notes
- ❌ Access the editing interface

---

## Troubleshooting:

### "This presentation is private"
**Solution:** Go to Google Slides → File → Share → Publish to web → Click Publish

### Slides show with editing toolbar
**Solution:** Make sure you're using the `/embed` URL, not the regular `/edit` URL

### Wrong URL format error
**Solution:** The URL should start with:
```
https://docs.google.com/presentation/d/e/2PACX-
```
NOT:
```
https://docs.google.com/presentation/d/1ABC123/edit
```

### Slides don't appear
**Solution:**
1. Check that the presentation is "Published to web"
2. Make sure the URL includes `?start=true`
3. Try opening the URL directly in a new browser tab to test

---

## Advanced: Custom Sizing

If you want to customize the aspect ratio or size, you can edit the URL parameters:

Add `rm=minimal` to hide navigation controls:
```
https://docs.google.com/presentation/d/e/2PACX-XXXXX/embed?start=true&loop=false&delayms=0&rm=minimal
```

---

## Security & Privacy:

**Important:**
- Published presentations are **PUBLIC** - anyone with the link can view
- Don't include sensitive information you wouldn't want public
- For truly private investor decks, use PDF upload instead
- You can unpublish anytime via File → Share → Publish to web → Published content & settings → Stop publishing

---

## Best Practices:

1. **Test First**: Always paste the URL in a new browser tab to verify it works
2. **Presentation Mode**: Use `start=true` to ensure it opens in presentation view
3. **No Auto-Advance**: Set `delayms=0` so investors control the pace
4. **No Looping**: Set `loop=false` for investor presentations
5. **Clean Design**: Use the minimal theme (`rm=minimal`) for a cleaner look

---

## Quick Checklist:

- [ ] Presentation is finalized
- [ ] File → Share → Publish to web → Embed tab
- [ ] Settings configured (start=true, loop=false, delayms=0)
- [ ] Clicked "Publish"
- [ ] Copied URL from src="..." attribute
- [ ] Pasted in pitch deck PDF slide field
- [ ] Clicked Preview to test
- [ ] Saved changes

---

Your Google Slides will now appear embedded in the pitch deck, in presentation mode, with no editing capabilities for viewers!
