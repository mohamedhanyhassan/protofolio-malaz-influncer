# Malaz Campaign Portfolio — handoff notes for Claude

Read this file first. It explains what the project is, how it is built, the decisions already made, and what is still open.

## The user and the business
- The user runs **Malaz (ملاذ)**, an influencer-marketing agency for the Saudi market (formerly branded SYT / صيت, rebranded to Malaz, malaz-sa.com).
- The user writes in **Egyptian Arabic**, so reply in Egyptian Arabic. All UI text is Arabic and RTL.
- The site is a client-facing **portfolio of influencer campaigns**. Each campaign page reads like a cinematic campaign report that the agency sends to clients.
- **Brand identity:** off-white `#f6f4ef` / cream `#fbf8f1`, black `#0b0b0b`, gold `#ffb004`, green `#629e63`. The logo is the Arabic wordmark «مَلاذ», stored in `assets/malaz-{black,white,gold}.png` (transparent PNGs). Slogan: «ملاذك الآمن حين كثرت مشاكل التسويق». Preferred fonts are Thmanyah (headings) and 29LT Azer (body). They are not bundled: `fonts/` holds the files when the user adds them, and the site falls back to Alexandria and IBM Plex Sans Arabic from Google Fonts.
- **Design reference:** a report page the user liked (https://abdelrahmanyasser012345-ctrl.github.io/hlay-cafe-report/). The campaign page copies its structure and animations in Malaz colors.

## Hosting
- **Static site on GitHub Pages**, with no server and no build step. The user uploads files through the GitHub web UI (Add file → Upload files).
- Because of that, everything is plain HTML, CSS and vanilla JS. **Don't add a bundler, a framework or a backend** unless the user asks.

## Files
| File | Role |
|---|---|
| `index.html` | Public site shell: header, `#app` mount, video modal, footer. Loads `data.js` → `assets/core.js` → `assets/app.js`. |
| `assets/app.js` | Public site. Hash router: `#home` / `#campaigns` = home, `#c-<id>` = campaign page. Also the video players and the modal. |
| `assets/core.js` | Shared helpers (`window.MZ`): `parseLink`, `cov` (normalizes a coverage and derives ER and reach), `campStats` (auto totals), formatters, `safeUrl`, `loadData` (a localStorage draft overrides `data.js`). |
| `assets/style.css` | All styles. The v1 base styles come first; the `v2 — Campaign report layout` section near the end styles the campaign page. |
| `admin.html` | Editor UI with inline JS. The user adds and edits campaigns here and then **exports `data.js`**, which they re-upload to GitHub. |
| `data.js` | **All content** as `window.PORTFOLIO = {agency, campaigns:[...]}`. It is the only file that changes in normal use. |
| `README.md` | Instructions for the user, in Egyptian Arabic. |
| `logos/`, `videos/`, `fonts/` | Optional asset folders, empty for now (they contain only `.gitkeep`). |

## Data model (`data.js`)
```js
window.PORTFOLIO = {
  agency: { name, nameEn, site, slogan, influencersPool },
  campaigns: [{
    id,            // slug used in URL: #c-<id>
    brand, title,  // title supports *gold highlight* with asterisks
    type,          // e.g. "حملة مشاهير", "افتتاح فرع", "إطلاق منتج"
    logo,          // data:image/... (uploaded in admin, resized to 320px) or a path
    brandUrl, city, date, dataDate, description,
    hashtags: [],  // used in the gold marquee strip
    insights: [{title, body}], // "ما تعلمناه" cards; auto-generated from data when empty
    hidden,        // optional: hides the campaign from the site
    coverages: [{
      url, creator, followers, views, likes, comments, saves, // saves = saves + shares
      note, no,    // optional display number, e.g. #37
      platforms, formats, kind, location, video // legacy/optional; platform is derived from url
    }]
  }]
}
```
- **Totals are always computed** from the coverages in `MZ.campStats`. The user asked for this explicitly: there are no manual totals anymore, and `admin.html` deletes any legacy `totals` field on load.
- **ER** = (likes + comments + saves) ÷ views. **Reach** = views ÷ followers.

## Campaign page sections (`campaign()` in `app.js`)
The sections are built from the data, and each one is hidden when its data isn't there.
1. **Hero:** black background with falling diamond confetti; Malaz gold logo × brand logo; title; pills; a floating gold TOTAL VIEWS card with a count-up.
2. **Gold marquee:** hashtags plus stats.
3. **KPI row:** views (dark card), likes, saves, comments, ER (gold card).
4. **REACH VS ENGAGEMENT:** a ranked horizontal bar chart.
   - Metric tabs plus follower-tier filter chips.
   - When the campaign has 8 or more coverages with likes, the top 5 by likes are drawn in gold.
   - Hovering a row shows a tooltip; clicking it opens the video modal.
   - Rows are capped at 12, with a "show all" button.
5. **CREATOR TIERS:** tier cards with ER rings plus a donut of each tier's share of views. Shown only when at least 2 tiers have coverages that include follower counts.
6. **COVERAGE:** a grid of video cards (or a table view).
   - TikTok: embedded with `https://www.tiktok.com/player/v1/{id}`, autoplays muted, controlled by `postMessage({type:'mute'|'unMute'|'play'|'pause','x-tiktok-player':true})`. **Don't use `muted=1`**: it locks the volume.
   - Instagram: `https://www.instagram.com/p/{shortcode}/embed/`. It doesn't autoplay and has no sound control.
   - MP4 files (`video` field): a native `<video>` element.
   - Players are lazy-loaded and paused or played by an IntersectionObserver. Only one player has sound at a time.
7. **NEXT CAMPAIGNS:** insight cards (dark, gold, white).
8. **Dark footer band** with both logos and the ER methodology.

**Watch out:** the `.top` class is the sticky header. The bar-chart "top 5" class is `.hot`. A name clash between the two broke the chart once.

## Admin (`admin.html`)
- **Draft storage:** edits autosave to localStorage under `malaz_portfolio_draft_v1`. The public `index.html` shows this draft too, with a yellow banner, but only in the same browser. "Export data.js" downloads the file.
- **Coverage table columns:** link, video status badge, username, followers, views, likes, comments, saves+shares, note. The user asked for the other columns to be removed.
- **Pasting links:** you can paste links in bulk. The admin cleans tracking params and auto-detects platform and username from the URL. Short TikTok links (`vt.tiktok.com`) are resolved through TikTok oEmbed (`embed_product_id`, `author_unique_id`) on a best-effort basis; if that fails, the row is flagged red.
- **Auto stats** come from Apify, called from the browser with the user's token. The token is stored in localStorage under `malaz_apify_token` and is **never exported**.
  - TikTok: actor `clockworks~tiktok-scraper` with input `{postURLs}`. Fields used: `playCount`, `diggCount`, `commentCount`, `collectCount` + `shareCount`, `authorMeta.name`, `authorMeta.fans`.
  - Instagram: actor `apify~instagram-scraper` with input `{directUrls, resultsType:"posts"}`. Fields used: `videoPlayCount`/`videoViewCount`, `likesCount`, `commentsCount`, `ownerUsername`. Followers come from `apify~instagram-profile-scraper` (`followersCount`). Instagram doesn't expose saves.
  - All calls use the endpoint `POST https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items?token=...`.

## Status / known gaps
- **Not tested against live services.** The build environment had no internet, so the TikTok and Instagram embeds and the Apify calls were only tested with mocks. Verify them live first.
- Hlay campaign: only 4 of its 50 creators are in `data.js`. Its insights text quotes the full-campaign numbers (16,030 of 20,226 likes, 5,039 saves).
- The Binrushd Optical rows have numbers but no URLs. The Stepia, Pharmafection, Nutrili and Infinity Kits campaigns have URLs but no numbers or logos.
- The Instagram post `DecemLlNIEI` appears in both Stepia and Pharmafection. The admin flags it as a duplicate; the user needs to decide which campaign it belongs to.
- `admin.html` has no password. It is harmless, because it only edits a local draft, but the user may want it removed from the public repo.

## Working conventions
- Keep the site static and dependency-free, keep RTL Arabic, and keep the Malaz colors.
- After a change, tell the user **exactly which files changed** so they can re-upload only those through the GitHub web UI. If `data.js` changed, warn them that uploading it overwrites their own exported data.
- Test with a local server (`python3 -m http.server`) and a headless browser before handing anything back.
