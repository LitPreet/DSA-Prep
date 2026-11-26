# Video Streaming (e.g. Netflix / YouTube): browse page and video player

> **Difficulty:** Hard · **Asked at:** Big tech and media/OTT companies (Netflix, Google/YouTube, Amazon Prime Video, Hotstar/JioCinema, Zee5, Sony LIV) · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Netflix-style (curated catalogue, rows of titles) or YouTube-style (user uploads, feed)? → Assume: Netflix-style browse page with horizontal rows + a full-screen player.
- Do we design upload/encoding? → Assume: no. Videos are already encoded into many qualities and stored on a CDN.
- Which devices? → Assume: desktop and mobile web browsers. Smart TV apps are out, but mention that TV needs D-pad focus navigation.
- Network conditions? → Assume: Indian users, many on 4G that changes speed often. Smooth playback matters more than max quality.
- Paid content? → Assume: yes, so DRM is needed (brief).
- Live streaming (cricket)? → Assume: on-demand only; mention live as a follow-up.
- Profiles and "Continue watching"? → Assume: yes, resume where you left off across devices.
- Hover previews (trailer plays on hover)? → Assume: yes on desktop.

## 1. Requirements

### Functional

- **Browse page:** hero banner (featured title, autoplay trailer muted), then 20–40 horizontal rows ("Continue watching", "Trending", "Because you watched X"). Each row has 20–75 titles.
- Hover/focus a tile → expand with a short preview video and details.
- Title details: description, episodes list, play button.
- **Player:** play/pause, seek bar with thumbnail preview, volume, quality selector (Auto/1080p/720p...), subtitles/audio language, fullscreen, picture-in-picture, skip intro, next episode.
- Resume: start from last watched position, on any device.
- Search titles.

### Non-functional (performance, accessibility, devices, network)

- **Startup time:** video starts in under 2 seconds after pressing Play on 4G.
- **Rebuffering:** under 1% of watch time spent buffering. This is the key quality metric.
- **Browse page:** LCP under 2.5s; first row images visible fast; smooth 60fps horizontal scroll.
- **Adaptive quality:** switch quality based on bandwidth without stopping playback.
- **Data saving:** let users cap quality on mobile data.
- **Accessibility:** captions, keyboard control of player, screen reader labels, respect `prefers-reduced-motion` (no autoplay previews).
- **Devices:** desktop, mobile, tablet; touch and mouse and keyboard.

### Out of scope

- Upload, transcoding pipeline, recommendation algorithm.
- Payments/subscriptions, account management.
- Native TV / mobile apps.

## 2. Architecture

```text
+---------------------------------------------------------------------------+
|                              Browser (React)                              |
|                                                                           |
|  Browse route                              Watch route (/watch/:id)       |
|  +------------------------------+          +----------------------------+ |
|  | HeroBanner (muted trailer)   |          | PlayerContainer            | |
|  | RowList (vertical, lazy)     |          |  +----------------------+  | |
|  |   Row (horizontal, virtual)  |          |  | <video> element      |  | |
|  |     TitleCard -> HoverPreview|          |  +----------+-----------+  | |
|  +---------------+--------------+          |             ^ MSE buffers   | |
|                  |                          |  +----------+-----------+  | |
|                  |                          |  | ABR player engine    |  | |
|                  |                          |  | (hls.js / Shaka)     |  | |
|                  |                          |  +----------+-----------+  | |
|                  |                          |  Controls | Captions | EME | |
|                  v                          +-------------+--------------+ |
|        +--------------------+   +-------------------+     |               |
|        | Data cache         |   | Progress tracker  |<----+               |
|        | (React Query)      |   | (heartbeat 10s)   |                     |
|        +---------+----------+   +---------+---------+                     |
+------------------|------------------------|------------|------------------+
                   v                        v            v
          +----------------+     +----------------+   +------------------+
          | Catalogue /    |     | Playback API   |   | CDN (manifests,  |
          | Browse API     |     | (manifest URL, |   |  video/audio     |
          | (rows, titles) |     |  progress, DRM)|   |  segments, imgs) |
          +----------------+     +--------+-------+   +------------------+
                                          |
                                   +------+------+
                                   | DRM license |
                                   |  server     |
                                   +-------------+
```

| Component | Responsibility |
|---|---|
| HeroBanner | Featured title, muted autoplay trailer, Play / More info |
| RowList | Vertical list of rows; loads row data in pages as user scrolls down |
| Row | One horizontal row; virtualized horizontally; arrows/keys to slide |
| TitleCard | Poster image; on hover (after delay) shows HoverPreview |
| HoverPreview | Plays a short low-bitrate preview clip, shows details |
| PlayerContainer | Owns player state machine, layout, fullscreen, keyboard shortcuts |
| ABR player engine | Fetches manifest, picks quality, downloads segments, feeds MSE |
| Controls | Seek bar with thumbnails, volume, quality, subtitles, next episode |
| Progress tracker | Saves watch position to server every 10s and on pause/exit |
| Data cache | Caches browse/title data (React Query), dedupes requests |
| CDN | Serves manifests, segments, images close to the user |
| DRM license server | Gives decryption keys to the browser's CDM (Widevine/FairPlay/PlayReady) |

**Main flow — user presses Play on a title:**

1. Router navigates to `/watch/80100172`. Player chunk is already prefetched (we preloaded it on hover of Play).
2. `GET /playback/80100172` returns manifest URL, resume position (e.g. 1,284s), subtitle tracks, DRM license URL.
3. Player engine downloads the master manifest (`.m3u8` or `.mpd`) from the CDN.
4. Engine picks a starting quality from a bandwidth estimate (last session's value or a safe default like 480p), and fetches the first segments starting at 1,284s.
5. Segments are appended to `SourceBuffer` (MSE). If DRM, browser asks the license server for a key via EME.
6. Once ~2s of video is buffered, playback starts. Engine keeps measuring download speed and switches quality up/down.
7. Progress tracker sends position every 10s and on pause/tab hide (`sendBeacon`).

## 3. Data model

```ts
interface Title {
  id: string;
  type: 'movie' | 'series';
  name: string;
  synopsis: string;
  maturityRating: string;        // 'U/A 13+'
  year: number;
  durationSec?: number;          // movies only
  genres: string[];
  artwork: {
    posterUrl: string;           // 2:3, used in rows
    boxartUrl: string;           // 16:9
    blurHash?: string;           // tiny placeholder while loading
  };
  previewClipUrl?: string;       // short HLS clip for hover
}

interface Row {
  id: string;
  title: string;                 // 'Trending in India'
  kind: 'continueWatching' | 'top10' | 'standard';
  titleIds: string[];
  nextCursor: string | null;     // more titles in this row
}

interface BrowsePage {
  rows: Row[];
  nextRowCursor: string | null;  // more rows below
  titles: Record<string, Title>; // normalized
}

interface Episode {
  id: string;
  seriesId: string;
  season: number;
  number: number;
  name: string;
  durationSec: number;
  thumbnailUrl: string;
}

interface PlaybackInfo {
  titleId: string;
  manifestUrl: string;           // HLS or DASH master manifest
  drm?: { licenseUrl: string; keySystem: 'widevine' | 'fairplay' | 'playready' };
  resumeAtSec: number;
  subtitles: { lang: string; label: string; url: string }[];  // WebVTT
  audioTracks: { lang: string; label: string }[];
  markers: { introStart?: number; introEnd?: number; creditsStart?: number };
  thumbnailsSpriteUrl: string;   // seek-bar preview sprite
  nextEpisodeId?: string;
}

interface WatchProgress {
  profileId: string;
  titleId: string;
  episodeId?: string;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'seeking' | 'ended' | 'error';
```

| Entity | Lives in | Why |
|---|---|---|
| Browse rows, titles | Server + client cache (React Query) | Read-heavy, cacheable, shared between browse and details |
| Title details modal open (`?jbv=123`) | URL | Shareable link, back button closes modal |
| Current video id | URL (`/watch/:id`) | Refresh and share work |
| Player state (playing, buffering, time) | Component state / reducer inside player | Changes many times per second; keep it local, not global |
| Current time | `ref` + `requestAnimationFrame` for UI | Avoid React re-render 60x/sec across the tree |
| Watch progress | Server (source of truth) + localStorage backup | Resume across devices; local backup if beacon fails |
| User settings (volume, subtitle language, data saver) | localStorage + server profile | Remember next time |
| Bandwidth estimate | localStorage | Better starting quality next session |
| Video segments | Browser memory (MSE buffer), CDN cache | Not stored by us long-term (DRM rules) |

## 4. Interface (API)

### Component API (props of the key components)

```ts
interface RowProps {
  row: Row;
  titles: Record<string, Title>;
  onTitleFocus(titleId: string): void;   // for prefetching
  onLoadMore(rowId: string): void;
}

interface TitleCardProps {
  title: Title;
  progress?: number;                     // 0..1 for Continue Watching bar
  isEager: boolean;                      // first visible cards: eager image load
  onOpenDetails(id: string): void;
}

interface VideoPlayerProps {
  playback: PlaybackInfo;
  autoPlay?: boolean;
  startAtSec?: number;
  preferredSubtitleLang?: string;
  maxQuality?: '480p' | '720p' | '1080p' | 'auto';
  onProgress(positionSec: number): void; // throttled
  onEnded(): void;
}
```

### Server API (endpoints, method, params, example JSON response, pagination style and WHY; real-time channels where relevant)

| Endpoint | Method | Purpose |
|---|---|---|
| `/browse?profileId=p1&rowCursor=...&rows=6` | GET | Rows for browse page (first 6 rows, 10 titles each) |
| `/rows/:rowId?cursor=...&limit=20` | GET | More titles for one row |
| `/titles/:id` | GET | Details, episodes |
| `/playback/:titleId` | GET | `PlaybackInfo` (signed manifest URL, DRM, resume point) |
| `/progress` | POST | Save watch position (also via `sendBeacon`) |
| `/search?q=...&cursor=...` | GET | Search titles |
| CDN `/.../master.m3u8`, `/.../seg_1080p_00042.m4s` | GET | Manifests and segments |

Example: `GET /browse?profileId=p1&rows=6`

```json
{
  "rows": [
    {
      "id": "cw",
      "title": "Continue Watching for Preet",
      "kind": "continueWatching",
      "titleIds": ["80100172", "81234567"],
      "nextCursor": null
    },
    {
      "id": "trending_in",
      "title": "Trending Now",
      "kind": "standard",
      "titleIds": ["70143836", "80057281", "80192098"],
      "nextCursor": "c_10"
    }
  ],
  "titles": {
    "80100172": {
      "id": "80100172", "type": "series", "name": "Sacred Games",
      "artwork": { "posterUrl": "https://img.cdn.example/80100172_342w.webp", "blurHash": "LEHV6nWB2y" }
    }
  },
  "progress": { "80100172": 0.42 },
  "nextRowCursor": "r_6"
}
```

**Pagination: cursor-based, two levels.** Rows load vertically in pages of ~6 rows; titles inside a row load in pages of ~20. Why cursor: recommendations are personalized and can change between requests; a cursor (opaque server token) keeps the order stable for this session. Offset would show duplicates if the list is re-ranked.

**Why one `/browse` call returns rows + titles together:** one round trip for the first screen (no waterfall of 6 requests). Could also use GraphQL to fetch exactly the fields the cards need. Server-render the first 2–3 rows for faster LCP.

**Playback URLs are signed** (short-lived token in URL or cookie) so people cannot hotlink the CDN.

**Real-time:** not needed for browse. Progress uses plain POST every 10s (no socket needed). For "watching on another device" limits, server checks a concurrent-stream count when `/playback` is called.

## 5. Optimizations and deep dives

### 5.1 Adaptive bitrate streaming (HLS/DASH + MSE)

**Why not a single MP4 with `<video src="movie.mp4">`?**
- One quality for everyone. On slow 4G a 1080p file buffers forever; on fast Wi-Fi 480p looks bad.
- Can't switch quality mid-way without restarting.
- Seeking to minute 90 needs range requests into one huge file; no clean way to add multiple audio languages or DRM per segment.

**How ABR works:**
1. Server encodes each video into a **ladder** of qualities, e.g. 240p @ 300 kbps, 480p @ 1 Mbps, 720p @ 3 Mbps, 1080p @ 5.8 Mbps, 4K @ 15 Mbps.
2. Each quality is cut into small **segments** of 2–6 seconds (`.ts` or fragmented `.m4s`). Segments at the same index line up exactly in time, so switching is seamless.
3. A **manifest** lists the qualities and the segment URLs. HLS uses `.m3u8` (Apple, works natively in Safari). DASH uses `.mpd` (XML, open standard). Many services use CMAF segments so one set of files serves both.
4. The player downloads segment by segment. After each one, it measures throughput and buffer level and picks the quality for the next segment.

```text
master.m3u8
  #EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480
  480p/index.m3u8        ->  seg_000.m4s, seg_001.m4s, ...
  #EXT-X-STREAM-INF:BANDWIDTH=5800000,RESOLUTION=1920x1080
  1080p/index.m3u8       ->  seg_000.m4s, seg_001.m4s, ...
```

**Media Source Extensions (MSE):** a browser API that lets JavaScript feed bytes into a `<video>` element. Instead of `src="file.mp4"`, we create a `MediaSource`, attach it, and `appendBuffer()` each downloaded segment. This is what lets JS choose quality per segment. Libraries: **hls.js** (HLS), **Shaka Player** or **dash.js** (DASH). I would not write the ABR engine myself in an interview — I'd use Shaka/hls.js and explain what it does.

```ts
const video = videoRef.current!;
const ms = new MediaSource();
video.src = URL.createObjectURL(ms);
ms.addEventListener('sourceopen', async () => {
  const sb = ms.addSourceBuffer('video/mp4; codecs="avc1.640028"');
  for (const url of nextSegmentUrls()) {          // chosen by ABR logic
    const buf = await fetch(url).then(r => r.arrayBuffer());
    sb.appendBuffer(buf);
    await once(sb, 'updateend');
  }
});
```

**ABR rules (simple version):**
- **Throughput-based:** pick the highest bitrate below ~80% of measured bandwidth (use a moving average, ignore one-off spikes).
- **Buffer-based:** if buffer < 10s, go down; if buffer > 30s, it's safe to go up.
- Go **down fast, up slow** — a rebuffer hurts more than a few seconds of lower quality.
- **Start low** (e.g. 480p) for fast startup, then climb. Use last session's bandwidth from localStorage.
- Cap by screen size: no point downloading 4K into a 400px-wide player.
- Data saver cap on mobile data (`navigator.connection.saveData`).
- Buffer target ~30s ahead; don't download the whole movie (wastes data if the user quits).

### 5.2 Player controls and buffering states

Model the player as a **state machine**, not a bunch of booleans like `isLoading && !isPaused`.

```text
idle -> loading -> playing <-> paused
                     |   ^
          (buffer empty) | (buffer refilled)
                     v   |
                  buffering
playing/paused -> seeking -> playing/paused
any -> error (retry button) ; playing -> ended (next episode countdown)
```

- Drive state from real `<video>` events: `waiting` → buffering, `playing` → playing, `seeking`/`seeked`, `ended`, `error`.
- Show the spinner only if buffering lasts > 300ms (avoid flicker on tiny stalls).
- **Don't re-render React on every `timeupdate`.** Update the seek bar via a ref + `requestAnimationFrame`, or throttle state updates to 4x/sec.
- Controls auto-hide after 3s of no mouse movement; always visible when paused or when focus is inside the controls.
- **Seek bar thumbnails:** server makes a sprite image (e.g. 10×10 grid of 160×90 frames, one every 10s). On hover at time t, show the tile at index `floor(t/10)` using `background-position`. One image request instead of hundreds.
- Skip intro / next episode use the `markers` from `PlaybackInfo`. Next episode: 10s countdown at `creditsStart`; prefetch next episode's manifest and first segment at that time.
- Errors: network error → auto-retry segment 3 times with backoff, then show "Retry"; DRM/license error → clear message; never a blank black screen.

### 5.3 Browse page rows (lazy loading, horizontal virtualization)

The page can have 40 rows × 75 titles = 3,000 cards. Rendering them all = huge DOM and thousands of image requests.

- **Vertical lazy loading:** render/fetch the first ~6 rows. Use `IntersectionObserver` on a sentinel near the bottom (with `rootMargin: '800px'`) to fetch the next 6.
- **Horizontal virtualization:** each row renders only visible cards + one page on each side. Rows move by "pages" (e.g. 6 cards at a time on desktop) with CSS `transform: translateX()` — GPU friendly, no layout. Number of cards per page comes from container width (ResizeObserver).
- **Images:** responsive `srcset` (WebP/AVIF, 200w/342w/500w), `loading="lazy"` for everything below the first row, `fetchpriority="high"` for the hero image. BlurHash/dominant color placeholder with fixed aspect ratio → no layout shift (CLS ~0).
- **Rows not in view** can unmount their cards but keep their height (placeholder) so scroll position doesn't jump.
- **SSR** the shell + hero + first two rows for good LCP; hydrate the rest.
- Keyboard/TV: arrow keys move focus between cards and rows (roving `tabindex`), focused row slides to keep card visible.

### 5.4 Preloading and hover previews

- **Hover preview:** start only after ~400–500ms of hover (intent), so moving the mouse across the page doesn't start 20 videos. Cancel the timer on mouse leave.
- Preview uses a **separate small clip** (low bitrate 480p, ~30s) so it's cheap. Muted (browsers block autoplay with sound). One preview at a time — a global "active preview" so the old one is destroyed (free the MediaSource).
- **Prefetching for Play:** on hover of a card or the Play button, prefetch: the player JS chunk (`import('./Player')`), `/playback/:id`, and the manifest. When the user clicks, we save ~500ms–1s.
- Don't prefetch video segments on hover for everyone — wastes data. Maybe only for the hero title or on fast Wi-Fi (`navigator.connection.effectiveType === '4g'` and not `saveData`).
- Respect `prefers-reduced-motion` and data saver: no autoplay previews.

### 5.5 Resume watching and progress sync

- While playing, save position every **10s** (throttled) with `POST /progress`.
- Also save on `pause`, on `seeked`, and on `visibilitychange` → hidden / `pagehide` using `navigator.sendBeacon` (works even when the tab is closing).
- Keep the last position in localStorage too; if the server is behind (beacon lost), use the newer `updatedAt`.
- Server keeps the latest by `updatedAt` per profile+title (last write wins). Two devices at once is rare; last write wins is fine.
- Mark as "watched" when > 95% or credits started; then Continue Watching shows the next episode.
- On another device, `/playback` returns `resumeAtSec`; show "Resume from 21:24" or "Start over".

```ts
useEffect(() => {
  const save = () => navigator.sendBeacon('/progress',
    JSON.stringify({ titleId, positionSec: Math.floor(video.currentTime), updatedAt: Date.now() }));
  const id = setInterval(() => !video.paused && save(), 10_000);
  const onHide = () => document.visibilityState === 'hidden' && save();
  document.addEventListener('visibilitychange', onHide);
  video.addEventListener('pause', save);
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); video.removeEventListener('pause', save); };
}, [titleId]);
```

### 5.6 DRM (brief) and accessibility

**DRM:** segments are encrypted (AES, Common Encryption). The browser has a built-in **CDM** (Content Decryption Module): Widevine in Chrome/Firefox/Android, FairPlay in Safari, PlayReady in Edge. **EME** (Encrypted Media Extensions) is the JS API: the player gets a "license request" from the CDM, sends it to our license server with the user's auth, gets a key back, and hands it to the CDM. JS never sees the key. Higher qualities (1080p/4K) often need hardware-level DRM, so the browser may be capped at 720p. Screenshots of DRM video show black.

**Accessibility:**
- Captions in **WebVTT** via `<track kind="subtitles">` or rendered by the player; user can change size, color, background.
- Keyboard: `Space`/`K` play-pause, `←/→` seek 10s, `↑/↓` volume, `F` fullscreen, `M` mute, `C` captions. Only when the player has focus.
- All controls are real `<button>`s with `aria-label` ("Pause", "Seek forward 10 seconds"); seek bar is `role="slider"` with `aria-valuetext="21 minutes 24 seconds of 48 minutes"`.
- Audio description tracks as an audio language option.
- Visible focus rings even on dark UI; don't trap focus in fullscreen.

### Also mention

- **Performance:** player JS (Shaka ~ 100KB+ gzip) is lazy loaded only on the watch route or on Play hover.
- **Analytics / QoE:** startup time, rebuffer ratio, average bitrate, quality switches, playback errors by device/ISP. Send in batches.
- **Security:** signed short-lived CDN URLs, DRM, concurrent stream limits per account.
- **i18n:** multiple audio and subtitle languages, RTL subtitles, localized artwork and titles.
- **Picture-in-picture** with `video.requestPictureInPicture()`, and Media Session API so phone lock screen shows title and controls.
- **Live streaming follow-up:** shorter segments (2s), low-latency HLS, a "Live" button that jumps to edge, smaller buffer target.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Video delivery | Single MP4 progressive download | ABR (HLS/DASH segments + MSE) | ABR — adapts to changing 4G speed, quick start, DRM, multi-audio |
| Protocol | HLS | DASH | Both via CMAF segments; HLS for Safari/iOS (native), DASH + Shaka elsewhere |
| Player engine | Build own ABR | hls.js / Shaka Player | Library — years of edge cases solved; I'd tune ABR settings |
| Starting quality | Highest possible | Low then climb | Start low — startup time matters more than first 5s of quality |
| Current time in UI | React state on every `timeupdate` | Ref + rAF / throttled state | Ref + rAF — avoids 60 re-renders/sec |
| Browse rendering | CSR only | SSR first rows + CSR rest | SSR first rows — faster LCP, SEO for public title pages |
| Hover preview | Start immediately | Start after 400–500ms | Delay — saves data and CPU, respects intent |
| Progress save | Every second | Every 10s + on pause/hide (beacon) | 10s + beacon — low load, lose at most ~10s |

## 7. Likely follow-up questions

**Q: Why are segments 2–6 seconds and not 1 or 30?**
Shorter segments = faster quality switching and startup, but more requests and manifest size, and worse compression. Longer = fewer requests but slow adaptation. 4–6s is common for VOD, 2s for live.

**Q: The user seeks to minute 90. What happens?**
Player clears/keeps the buffer, finds the segment that contains 90:00 from the manifest, downloads it (often at lower quality first for a fast start), and plays. Seek bar thumbnails come from the sprite so the user sees where they're going before releasing.

**Q: How do you measure if playback is good in production?**
Track QoE metrics: time to first frame, rebuffer ratio, rebuffer count, average bitrate, quality switches per minute, exit before video start. Dashboard by device, browser, ISP, region.

**Q: How do you avoid many hover previews playing at once?**
A single "preview controller" (context or store) that owns one video element. New hover destroys the old preview. Start only after hover delay, stop on mouse leave or scroll.

**Q: How would this work on a smart TV?**
No mouse — spatial navigation with D-pad (focus management library), bigger focus states, lower memory so virtualize more aggressively, fewer animations, hardware decoding limits.

**Q: How do you prevent the browse page images from causing layout shift?**
Fixed aspect ratio boxes (`aspect-ratio: 2/3`), placeholder colour/BlurHash, and width/height attributes on `<img>`.

**Q: User has a slow network — what do you change?**
Lower starting bitrate, smaller buffer goal before start, no hover previews, smaller image sizes, show quality badge so they know why it's blurry. Optional "download for offline" is native-app territory.

**Q: Why not keep player state in Redux?**
It changes many times per second and only the player cares. Keep it inside the player (reducer + refs). Only push meaningful events (started, ended, progress every 10s) outside.

## 8. If you only have 60 seconds

- Two routes: browse (hero + lazy vertical rows, each horizontally virtualized) and watch (player).
- Video uses adaptive bitrate streaming: HLS/DASH manifest, 4–6s segments in many qualities, fed into `<video>` via Media Source Extensions with Shaka/hls.js.
- ABR picks quality per segment from throughput and buffer level; start low, drop fast, climb slow; goal is under 2s startup and under 1% rebuffering.
- Player is a state machine driven by video events; current time updates via refs, not re-renders.
- Hover previews start after ~500ms, one at a time, low bitrate; prefetch player chunk and manifest on hover of Play.
- Resume: save position every 10s and on pause/hide with `sendBeacon`; server returns resume point.
- DRM through EME + CDM; captions via WebVTT; full keyboard control and labelled buttons.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Netflix vs YouTube, devices, network, DRM, live or not |
| 4–8 | Requirements | Startup < 2s, rebuffer < 1%, rows, player features |
| 8–15 | Architecture | Browse vs watch route, ABR engine, CDN, license server, progress tracker |
| 15–20 | Data model | Title, Row, PlaybackInfo, WatchProgress, where each lives |
| 20–25 | API | `/browse` with 2-level cursor, `/playback`, `/progress`, CDN manifests |
| 25–40 | Deep dives | ABR + MSE (most important), player state machine, rows virtualization + images, hover preview |
| 40–45 | Trade-offs + wrap up | MP4 vs ABR, library vs own engine, resume sync, summary |

## Common mistakes

- Jumping to components before defining data/entities — define Title, Row, PlaybackInfo first.
- Saying "just use `<video src='movie.mp4'>`" and not knowing about segments, manifests and MSE.
- Storing `currentTime` in React state at 60fps and re-rendering the whole player tree.
- Rendering all rows and all cards at once, and loading all poster images eagerly.
- Forgetting the user's network (India, 4G) — no talk of startup time, rebuffering or data saving.
- Ignoring accessibility in a media product: captions and keyboard controls are must-haves.

## My mistakes

- [ ]
