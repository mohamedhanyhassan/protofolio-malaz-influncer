# Malaz Campaign Portfolio — handoff notes for Claude

Read this file first. It explains what the project is, how it is built, the decisions already made, and what is still open.

## The user and the business
- The user runs **Malaz (ملاذ)**, an influencer-marketing agency for the Saudi market (formerly branded SYT / صيت, rebranded to Malaz, malaz-sa.com).
- The user writes in **Egyptian Arabic**, so reply in Egyptian Arabic. All UI text is Arabic and RTL.
- The site is a client-facing **portfolio of influencer campaigns**. Each campaign page reads like a cinematic campaign report that the agency sends to clients.
- **Brand identity:** off-white `#f6f4ef` / cream `#fbf8f1`, black `#0b0b0b`, gold `#ffb004`, green `#629e63`. The logo is the Arabic wordmark «مَلاذ», stored in `assets/malaz-{black,white,gold}.png` (transparent PNGs). Slogan: «ملاذك الآمن حين كثرت مشاكل التسويق». Preferred fonts are Thmanyah (headings) and 29LT Azer (body). They are not bundled: `fonts/` holds the files when the user adds them, and the site falls back to Alexandria and IBM Plex Sans Arabic from Google Fonts.
- **Design reference:** a report page the user liked (https://abdelrahmanyasser012345-ctrl.github.io/hlay-cafe-report/). The campaign page copies its structure and animations in Malaz colors.

## Hosting
- **Static site**, repo `mohamedhanyhassan/protofolio-malaz-influncer` (branch `main`), auto-deployed by Vercel project `protofolio-malaz-influncer` (https://protofolio-malaz-influncer.vercel.app). No build step. The user may also upload files through the GitHub web UI.
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

## Home page (`home()` in `app.js`, styles in the `v3 — Home` section of `style.css`)
Same visual language as the campaign report (`body.report homepg`): dark hero with the gold Malaz logo and a gold TOTAL VIEWS card (views, campaigns, coverages, creators), gold marquee of brand names, KPI row, a featured campaign (highest views), a card grid of all campaigns sorted by views (search + type chips; campaigns with no numbers show «الأرقام تُضاف قريبًا»), WHY MALAZ cards, and a dark CTA band.

### v7 home (Nov 18, inspired by a template the user liked; adapted, not copied)
Rounded hero card (`.h7card`, centered headline, pill buttons `.pbtn`), a 3D fan of 7 cards built from real data (`.fan .fc`, `--i` = -3..3, pointer parallax in `motion()`), a brand-logo strip (`.lstrip`), a centered «عن ملاذ» headline with inline icon dots (`.a7`), and a bento grid (`.bento`, grid-areas views/camps/covs/er/pool/quote; the quote is the featured campaign's first insight). Then featured campaign, all campaigns, why Malaz, CTA.

### v8 glass (Nov 18)
Hero `.h7card` is full width (no `.wrap`), min-height ~100vh, rounded only at the bottom. Glass cards: `--gl/--glb/--gls` tokens + `backdrop-filter`, over a fixed drifting gold/green backdrop (`body.report::before`). Gold and black cards are tinted glass gradients. Brand logos in `.lstrip` are always in full color (user asked).

### Light / dark theme
`html[data-theme]` set before paint by an inline script in `index.html` (saved `localStorage.mz_theme`, else the device setting). Header button `#thm` toggles and saves. Tokens `--pg --sf --sf2 --ln --tx --tx2 --mu`; all dark overrides are in the `v7 — Theme toggle + dark mode` block of `style.css`. Campaign heroes stay dark in both themes. The admin page is not themed.

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
   - Nov 2026: in the user's browser every player/v1 URL (even TikTok's own doc example) shows "Player authentication failed": TikTok's `player/api/v1/items` returns 403 with region=JP (user is likely behind a VPN). Not fixable in code. So TikTok cards keep our cover (`.ph`, z-index above the iframe, avatar + views + loading dots) until the player posts `onPlayerReady`/`onStateChange`/`onCurrentTime`; if nothing arrives in 8 s the iframe is removed and the cover shows a gold «شاهد الفيديو على تيك توك» button (`.ttfailed`). TikTok's error screen is never visible. oEmbed is still asked first for the player URL (it returns a plain player/v1 URL, no token).
   - Instagram: `https://www.instagram.com/p/{shortcode}/embed/`. It doesn't autoplay and has no sound control.
   - MP4 files (`video` field): a native `<video>` element.
   - Players are lazy-loaded and paused or played by an IntersectionObserver. Only one player has sound at a time.
7. **NEXT CAMPAIGNS:** insight cards (dark, gold, white).
8. **Dark footer band** with both logos and the ER methodology.

**Watch out:** the `.top` class is the sticky header. The bar-chart "top 5" class is `.hot`. A name clash between the two broke the chart once.

## Motion (`v4 — Motion` in `style.css`, `motion()` / `revealNew()` in `app.js`)
Route fade-in, gold scroll-progress bar, scroll reveals with stagger for campaign cards and coverage cards, pointer spotlight on the dark heroes, tilt + light sweep on the gold card, underline draw-in on gold title words and section headings, hover motion on cards and gold buttons. `prefers-reduced-motion` turns it off.

## v6 calm layout (Nov 18, user: "the design is full for nothing, I want clients to be wowed")
- Home: no KPI row under the hero (it repeated the hero numbers); campaign cards show logo, arrow, title, meta and one line of numbers (views · coverages · ER), no platform/type chips.
- Campaign page: hero pills = creators, city, start date only; marquee = hashtags/brand/city (no stats); no black views KPI card (the gold card holds views + coverage count + average); KPI row = likes, saves, comments, ER.
- Coverage cards: @creator + followers, one row of views · likes · ER, note clamped to 2 lines; comments/saves live in the table view and modal. Only the best 8 show first, then «عرض كل التغطيات (N)».
- Thmanyah: free for websites but only downloadable after giving an email on thmanyah.com, and the license forbids redistributing the files. Waiting for the user to send the font package; then convert to woff2 into `fonts/` and add @font-face for each weight (body text must not use the bold file).

## Admin (`admin.html`)
- **Draft storage:** edits autosave to localStorage under `malaz_portfolio_draft_v1`. The public `index.html` always shows the published `data.js`; the draft is shown only in preview (`index.html?draft=1`, the admin's «معاينة المسودة» button) with a yellow banner. The admin stores the signature of the published data when a draft starts (`malaz_portfolio_draft_base_v1`, `MZ.sig`); if the published data.js changes later, the admin shows a warning with «افتح النسخة المنشورة». "Export data.js" downloads the file.
- **Normal workflow now:** the user sends changes in chat, Claude edits `data.js`/assets in the repo and pushes to `main`; Vercel redeploys in about a minute and everyone with the link sees it.
- **Coverage table columns:** link, video status badge, username, followers, views, likes, comments, saves+shares, note. The user asked for the other columns to be removed.
- **Pasting links:** you can paste links in bulk. The admin cleans tracking params and auto-detects platform and username from the URL. Short TikTok links (`vt.tiktok.com`) are resolved through TikTok oEmbed (`embed_product_id`, `author_unique_id`) on a best-effort basis; if that fails, the row is flagged red.
- **Auto stats** come from Apify, called from the browser with the user's token. The token is stored in localStorage under `malaz_apify_token` and is **never exported**.
  - TikTok: actor `clockworks~tiktok-scraper` with input `{postURLs}`. Fields used: `playCount`, `diggCount`, `commentCount`, `collectCount` + `shareCount`, `authorMeta.name`, `authorMeta.fans`.
  - Instagram: actor `apify~instagram-scraper` with input `{directUrls, resultsType:"posts"}`. Fields used: `videoPlayCount`/`videoViewCount`, `likesCount`, `commentsCount`, `ownerUsername`. Followers come from `apify~instagram-profile-scraper` (`followersCount`). Instagram doesn't expose saves.
  - All calls use the endpoint `POST https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items?token=...`.

## Status / known gaps
- **Not tested against live services.** The build environment had no internet, so the TikTok and Instagram embeds and the Apify calls were only tested with mocks. Verify them live first.
- Hlay campaign: only 4 of its 50 creators are in `data.js`. Its insights text quotes the full-campaign numbers (16,030 of 20,226 likes, 5,039 saves).
- Coverage order on a campaign page defaults to TikTok first, then Instagram, then links with no player (Snapchat, stories), highest views first in each group.
- Brand logos live in `logos/` as files (umandi, binrushd, endorphins, basic, unknown). Logos that are white/transparent are placed on a black square so they read on gold and white backgrounds.
- Binrushd: 4 coverages still have no URL (abdullah_lara_official, ghada_elshahawy, zekra_mousa, vibes_with_anam). The Instagram link-to-creator matching was confirmed by Apify.
- 2026-11-17: numbers for every campaign were pulled live with the admin ⚡ (Apify, user's token) and merged into `data.js` (dataDate 2026-11-17). Unavailable (private/deleted) links: BASIC lina_esmail TikTok + IG DNqqOD5owWe; UNKNOWN kenz_3699, IG DKOsJNIson9, IG DLxLSZisoRB; Binrushd's 3 TikToks returned nothing (sheet numbers kept, no followers). Live views were lower than the user's sheet for ameera8855, mn_g73, hudavaiolet (Umandi) and alaa.alkazzaz (Binrushd); live values were used. Umandi insights were rewritten for the new numbers.
- The home hero uses a dark glass panel (`.hpanel`, `v5` CSS) with total views, 3 stats and a scrolling strip of brand logos; no big Malaz logo and no underline on the hero title (the user disliked both).
- A coverage with `hidden: true` is kept in data/admin but excluded from the site (`campStats` filters it). Used for 5 links that returned nothing from Apify (BASIC lina_esmail TikTok, IG DNqqOD5owWe; UNKNOWN kenz_3699, IG DKOsJNIson9, IG DLxLSZisoRB).
- When a coverage has no username, the campaign shows "N تغطية" instead of "N مؤثر".
- The Instagram post `DecemLlNIEI` belongs to Pharmafection (user confirmed); it was removed from Stepia.
- Menz (`menz`): 60 coverages from the user's sheet (visits «زيارة» + delivery «توصيل»), Jan–Jul 2026; 10 are pCloud links (shown as external cards) and 1 an IG highlight. Numbers pulled via admin ⚡ on 2026-11-17; 8 platform links returned nothing and are `hidden`. Brand = Manz (منز), Lebanese quick-service restaurant, Sulaimaniyah, Riyadh; logo `logos/manz.png`, IG manz_ksa.
- Brand facts from the user: Infinity Kits = DIY perfume and lip-gloss kits (you make your own); Nutrili = premium natural ingredients, founded and led by scientists, recycled packaging, ships worldwide; Stepia = Saudi online shoe store; Pharmafection = Korean skincare, Jeddah.
- `admin.html` has no password. It is harmless, because it only edits a local draft, but the user may want it removed from the public repo.

## Working conventions
- Keep the site static and dependency-free, keep RTL Arabic, and keep the Malaz colors.
- After a change, tell the user **exactly which files changed** so they can re-upload only those through the GitHub web UI. If `data.js` changed, warn them that uploading it overwrites their own exported data.
- Test with a local server (`python3 -m http.server`) and a headless browser before handing anything back.
