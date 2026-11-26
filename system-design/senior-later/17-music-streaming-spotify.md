# Music Streaming (e.g. Spotify web player)

> **Difficulty:** Hard · **Asked at:** Product companies with media or consumer apps (Spotify-like startups, JioSaavn/Gaana-style Indian music apps, big tech consumer teams) · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Is this the web player only, or also mobile and desktop apps?
  → Assume: web player (desktop browser first, also works on mobile web).
- Which screens matter? Home, search, album/playlist page, library, now-playing bar?
  → Assume: home, search, playlist/album page, and a persistent player bar at the bottom.
- Do we need a queue with shuffle and repeat?
  → Assume: yes — queue, shuffle, repeat (off / all / one), and "previously played" history.
- Should playback continue while the user navigates between pages?
  → Assume: yes, this is a must. Music must never stop on a route change.
- Do we need to control playback on another device (phone controls laptop)?
  → Assume: yes, basic "Connect" — see and switch active device, play/pause remotely.
- Offline downloads?
  → Assume: not on web (premium apps do it on mobile). Only short-term caching.
- How big can a playlist be?
  → Assume: up to 10,000 tracks ("Liked Songs" can be huge).
- Free tier with ads?
  → Assume: out of scope, but the player design should allow inserting an "ad track".

## 1. Requirements

### Functional

- Browse home, open album / playlist / artist pages.
- Search tracks, albums, artists, playlists with instant results.
- Play a track; play a whole playlist from any position.
- Player bar: play/pause, next, previous, seek, volume, shuffle, repeat, current time.
- Queue: "Play next", "Add to queue", view and reorder the queue.
- Like a track, add to playlist.
- Playback continues across page navigation.
- Keyboard media keys and lock-screen controls work.
- See devices and transfer playback to another device.

### Non-functional (performance, accessibility, devices, network)

- **Performance:** track starts in < 300 ms after click (perceived). No gap between tracks (gapless for albums). Pages load fast (LCP < 2.5 s). Long playlists scroll at 60 fps.
- **Accessibility:** all player controls are real buttons with labels; slider for seek/volume works with arrow keys; screen readers announce track changes (politely).
- **Devices:** desktop browsers mainly; responsive layout for mobile web; touch-friendly seek bar.
- **Network:** handle slow 3G/4G — adapt audio quality, buffer ahead, recover from short drops without stopping music.
- **Reliability:** a JS error on one page should not kill playback (error boundaries around pages, not around the player).

### Out of scope

- Backend recommendation engine, royalties, uploading music.
- Podcasts and video.
- Full offline downloads.
- Ads system details.

## 2. Architecture

```text
+--------------------------------------------------------------------+
|                         App Shell (never unmounts)                 |
|                                                                    |
|  +-----------+   +---------------------------------------------+   |
|  |  Sidebar  |   |  Router outlet (pages change here)          |   |
|  | (library) |   |  Home | Search | Playlist | Album | Artist  |   |
|  +-----------+   +---------------------------------------------+   |
|                                   |  dispatch(play, queue...)      |
|                                   v                                |
|  +--------------------------------------------------------------+  |
|  |  Player Store (Zustand/Redux)  queue, index, status, shuffle |  |
|  +--------------------------------------------------------------+  |
|        |                    |                       |              |
|        v                    v                       v              |
|  +-------------+   +------------------+   +----------------------+ |
|  | Audio Engine|   | Media Session    |   | Connect Sync         | |
|  | (2x <audio> |   | (lock screen,    |   | (WebSocket to        | |
|  |  or MSE)    |   |  media keys)     |   |  device service)     | |
|  +-------------+   +------------------+   +----------------------+ |
|        |                                            |              |
|  +--------------------------------------------------------------+  |
|  |  Player Bar UI (bottom)   reads store, sends actions         |  |
|  +--------------------------------------------------------------+  |
+--------------------------------------------------------------------+
        |  HTTP (REST/GraphQL)        |  audio CDN         | WSS
        v                             v                    v
   API server                 Audio CDN (segments)   Device/Connect service
```

| Component | Responsibility |
| --- | --- |
| App Shell | Root layout. Holds sidebar, router outlet and player bar. Never unmounts, so audio keeps playing. |
| Router outlet / Pages | Home, Search, Playlist, Album, Artist. Fetch data with React Query. Only these change on navigation. |
| Player Store | Single source of truth for playback: queue, current index, status, shuffle, repeat, volume. |
| Audio Engine | Plain JS class (not a React component). Owns `<audio>` elements, loads, preloads, crossfades, reports time. |
| Player Bar UI | Shows current track, controls, seek bar. Reads from store, dispatches actions. |
| Media Session | Connects store to OS controls (lock screen, Bluetooth headphones, keyboard media keys). |
| Connect Sync | WebSocket client. Sends our state to other devices, receives remote commands. |
| Server cache (React Query) | Caches playlists, albums, search results. |

**Main flow — user clicks a track in a playlist:**

1. Playlist page calls `player.playContext({ contextUri: 'playlist:123', startIndex: 42 })`.
2. Store builds the queue from the playlist's track IDs (only IDs, not full objects), sets `currentIndex = 42`, `status = 'loading'`.
3. Audio Engine asks the server for a stream URL for that track (`/tracks/:id/stream`), gets a short-lived signed CDN URL.
4. Engine sets `audio.src`, calls `play()`. On `playing` event, store sets `status = 'playing'`.
5. Player bar re-renders (it subscribes to only the fields it needs). Media Session metadata updates.
6. Engine starts preloading track 43 in the second `<audio>` element.
7. Connect Sync sends `state_update` to the server so the user's phone shows "Playing on Chrome".

## 3. Data model

```ts
type TrackId = string;

interface Track {
  id: TrackId;
  title: string;
  durationMs: number;
  artists: { id: string; name: string }[];
  album: { id: string; name: string; coverUrl: string };
  explicit: boolean;
  isPlayable: boolean; // region / licence
}

interface Playlist {
  id: string;
  name: string;
  owner: { id: string; name: string };
  coverUrl: string;
  totalTracks: number;
  // tracks are paginated separately, not embedded
}

interface QueueItem {
  uid: string;          // unique per entry (same track can appear twice)
  trackId: TrackId;
  source: 'context' | 'user'; // 'user' = "Add to queue"
}

type RepeatMode = 'off' | 'all' | 'one';
type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerState {
  contextUri: string | null;      // 'playlist:123', 'album:9'
  contextItems: QueueItem[];      // original order
  order: number[];                // play order (shuffled or not) – indexes into contextItems
  position: number;               // index into `order`
  userQueue: QueueItem[];         // "Play next" items, played before context continues
  history: QueueItem[];           // for "previous"
  status: PlaybackStatus;
  positionMs: number;             // NOT stored in React state every frame — see 5.2
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;                 // 0..1
  activeDeviceId: string;
}

interface Device {
  id: string;
  name: string;                   // "Chrome on MacBook"
  type: 'web' | 'phone' | 'speaker' | 'desktop';
  isActive: boolean;
}
```

| Entity | Lives in | Why |
| --- | --- | --- |
| Track / Album / Playlist metadata | Server, cached in React Query (normalized by id) | Shared across pages; cache avoids refetch when going back. |
| Playlist track list pages | React Query infinite query | Big lists, loaded page by page. |
| Player state (queue, index, shuffle, repeat) | Client store (Zustand), persisted to localStorage | Global, used by many components; restore after refresh. |
| Current time / buffered | Audio element + ref, read via `requestAnimationFrame` | Changes many times per second; putting it in global state would re-render everything. |
| Volume | Client store + localStorage | User preference, survives reload. |
| Search query, current page | URL (`/search?q=arijit`, `/playlist/123`) | Shareable, back button works. |
| Seek drag value, hover state | Component state | Local, temporary. |
| Recently fetched audio segments | Browser HTTP cache / Service Worker cache (encrypted) | Faster replay, short-term only. |
| Devices list | Server, pushed via WebSocket into store | Changes from other devices. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
// Persistent bottom bar. No props for data — it reads from the store.
<PlayerBar />

// Track row used in playlist, album, search, queue
interface TrackRowProps {
  track: Track;
  index: number;               // display number
  isCurrent: boolean;          // highlight green
  isPlaying: boolean;          // show equalizer icon
  onPlay: (index: number) => void;
  onContextMenu?: (track: Track, e: React.MouseEvent) => void;
}

// Virtualized list for playlists
interface TrackListProps {
  contextUri: string;          // 'playlist:123'
  totalCount: number;
  pages: Track[][];
  loadMore: () => void;
  hasMore: boolean;
  rowHeight?: number;          // default 56
}

// Seek bar
interface SeekBarProps {
  durationMs: number;
  getPositionMs: () => number; // pull, not push — avoids re-render per tick
  onSeek: (ms: number) => void;
}

// Player commands (hook)
interface PlayerApi {
  playContext(args: { contextUri: string; startIndex?: number; trackIds?: string[] }): void;
  togglePlay(): void;
  next(): void;
  previous(): void;
  seek(ms: number): void;
  setShuffle(on: boolean): void;
  setRepeat(mode: RepeatMode): void;
  addToQueue(trackId: string): void;
  transferTo(deviceId: string): void;
}
```

### Server API (endpoints, method, params, example JSON, pagination; real-time channels / signaling messages where relevant)

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/playlists/:id` | GET | Metadata only. |
| `/playlists/:id/tracks?cursor=&limit=100` | GET | Cursor pagination. |
| `/tracks/:id/stream?quality=high` | GET | Returns signed CDN URL / manifest + licence info. |
| `/search?q=&type=track,artist&limit=10` | GET | Debounced from client. |
| `/me/tracks/:id` | PUT / DELETE | Like / unlike. |
| `/me/player` | GET | Current playback state (for restore). |
| `/me/devices` | GET | List of devices. |

```json
// GET /playlists/123/tracks?limit=100
{
  "items": [
    { "uid": "p123-0", "track": { "id": "t1", "title": "Kesariya", "durationMs": 268000,
      "artists": [{ "id": "a1", "name": "Arijit Singh" }],
      "album": { "id": "al1", "name": "Brahmastra", "coverUrl": "https://cdn/..." } } }
  ],
  "nextCursor": "eyJvZmZzZXQiOjEwMH0=",
  "total": 4210
}
```

```json
// GET /tracks/t1/stream?quality=high
{
  "url": "https://audio-cdn.example.com/t1/320.mp4?sig=abc&exp=1732600000",
  "format": "mp4a",
  "bitrateKbps": 320,
  "expiresAt": 1732600000,
  "licenseUrl": "https://drm.example.com/license"
}
```

Cursor pagination is better than offset here because playlists change while you scroll (someone adds a song).

**Real-time channel (Connect):** `wss://connect.example.com/v1?token=...`

```json
// client -> server: our state changed
{ "type": "state_update", "deviceId": "web-abc", "trackId": "t1",
  "positionMs": 42000, "status": "playing", "ts": 1732599000123, "version": 57 }

// server -> client: someone pressed pause on the phone
{ "type": "command", "command": "pause", "targetDeviceId": "web-abc", "version": 58 }

// server -> client: playback moved to the phone
{ "type": "transfer", "toDeviceId": "phone-xyz", "positionMs": 42500 }
```

## 5. Optimizations and deep dives

### 5.1 Persistent player that survives navigation

The number one requirement. If the `<audio>` element lives inside a page component, navigating unmounts it and the music stops.

- Put the player in the **app shell**, outside the `<Routes>` / outlet. Only the outlet changes.
- Keep the audio engine as a **plain JS singleton**, not inside React. React only reads its state. This also survives React StrictMode double-mount.
- Never do full page reloads. All links are client-side (`<Link>`). For a Next.js app, put the player in the root `layout.tsx`, which persists across routes.

```tsx
function AppShell() {
  return (
    <div className="grid h-screen grid-rows-[1fr_auto] grid-cols-[280px_1fr]">
      <Sidebar />
      <main>
        <ErrorBoundary fallback={<PageError />}>   {/* page crash ≠ music stop */}
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <PlayerBar />   {/* outside the outlet, never unmounts */}
    </div>
  );
}
```

```ts
// audioEngine.ts — one instance for the whole app
class AudioEngine {
  private a = new Audio();
  private b = new Audio();         // for preload / gapless
  private active = this.a;
  onEnded?: () => void;
  constructor() {
    [this.a, this.b].forEach(el => {
      el.preload = 'auto';
      el.addEventListener('ended', () => el === this.active && this.onEnded?.());
    });
  }
  async play(url: string) { this.active.src = url; await this.active.play(); }
  get currentTime() { return this.active.currentTime; }
}
export const engine = new AudioEngine();
```

### 5.2 Global player state and queue model

Keep **track IDs** in the queue, not full track objects. Metadata comes from the React Query cache. This keeps the store small, even for a 10,000-track playlist.

Queue model has three parts:
1. **User queue** ("Play next" / "Add to queue") — played first.
2. **Context** (the playlist/album) with an `order` array.
3. **History** — what was played, for the Previous button.

**Shuffle:** do not shuffle the items. Shuffle the `order` array (Fisher–Yates), and keep the current track first. Turning shuffle off restores the original order and finds the current track's position in it. This is why we keep `contextItems` and `order` separate.

```ts
function shuffleOrder(length: number, currentIdx: number): number[] {
  const rest = [...Array(length).keys()].filter(i => i !== currentIdx);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [currentIdx, ...rest];
}

function getNext(s: PlayerState): { from: 'user' | 'context'; idx: number } | null {
  if (s.repeat === 'one') return { from: 'context', idx: s.position };
  if (s.userQueue.length) return { from: 'user', idx: 0 };
  if (s.position + 1 < s.order.length) return { from: 'context', idx: s.position + 1 };
  return s.repeat === 'all' ? { from: 'context', idx: 0 } : null;
}
```

**Previous button rule:** if current time > 3 seconds, restart the track. Otherwise go to the previous track. Users expect this.

**Current time is not global state.** Updating the store 4–60 times per second re-renders every subscriber. Instead the seek bar reads `engine.currentTime` inside `requestAnimationFrame` and writes directly to a DOM ref (or a CSS variable). Use Zustand selectors so the player bar only re-renders when `trackId` or `status` changes.

```tsx
function Progress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: number;
    const tick = () => {
      const pct = engine.currentTime / engine.duration || 0;
      barRef.current?.style.setProperty('--p', String(pct));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return <div ref={barRef} className="progress" />;
}
```

Persist the store (queue IDs, index, position, shuffle, repeat) to localStorage so after a refresh the user sees the same track paused at the same point. Browsers block autoplay, so we restore as "paused", never auto-play.

### 5.3 Gapless playback and preloading the next track

Albums like live concerts or DJ mixes must flow with no silence between tracks.

- **Preload:** when current track reaches ~70% (or the last 20–30 s), fetch the stream URL for the next track and load it into the second `<audio>` element (`preload="auto"`). When the first ends, swap and call `play()` on the second. This gives a near-zero gap on most browsers.
- **True gapless:** two `<audio>` tags still leave a tiny gap (~50 ms) because of encoder padding in MP3/AAC. For true gapless, use **Media Source Extensions (MSE)**: append segments of the next track into the same `SourceBuffer`, trimming encoder padding using metadata from the server. Or use **Web Audio API** and schedule the next buffer exactly at `startTime + duration`.
- **Crossfade:** with Web Audio, use two `GainNode`s and ramp one down while the other ramps up.
- **Preload the URL early, not just the audio:** signed URLs expire, so refresh them if close to expiry.
- **Preload rules:** only preload the next 1 track (data cost on mobile). If the user changes the queue, cancel and reload.
- **Adaptive quality:** music files are small (~3–10 MB), so we usually pick one bitrate per track based on network (`navigator.connection.effectiveType`) and user setting (96/160/320 kbps). Segment-based ABR like HLS/DASH is covered in `11-video-streaming.md`; for music it matters less but the same MSE pipeline can switch quality between segments.

### 5.4 Media Session API (lock screen, keyboard, headphones)

Without this, the user's keyboard play/pause key and lock-screen controls on Android Chrome do nothing (or control some other tab).

```ts
function syncMediaSession(track: Track, status: PlaybackStatus) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    artwork: [{ src: track.album.coverUrl, sizes: '512x512', type: 'image/jpeg' }],
  });
  navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : 'paused';
}

const ms = navigator.mediaSession;
ms.setActionHandler('play', () => player.togglePlay());
ms.setActionHandler('pause', () => player.togglePlay());
ms.setActionHandler('nexttrack', () => player.next());
ms.setActionHandler('previoustrack', () => player.previous());
ms.setActionHandler('seekto', d => d.seekTime != null && player.seek(d.seekTime * 1000));
```

Also call `setPositionState({ duration, position, playbackRate })` so the lock screen shows a correct progress bar. Also update `document.title` to "Song · Artist" so the browser tab shows what is playing.

### 5.5 Syncing playback across devices ("Connect")

- Each logged-in tab/device opens a WebSocket and registers as a device.
- Only **one device is active** (actually playing). Others show "Playing on X" and act as remote controls.
- When the user presses pause on the phone, the phone sends `command: pause` to the server. Server forwards it to the active device. The active device pauses and sends `state_update`. All devices update their UI from that state update — **the active device is the source of truth**.
- **Position sync:** we don't stream position every second. We send `positionMs` + `ts` (timestamp) + `status`. Other devices compute `position = positionMs + (now - ts)` while playing. Correct for clock skew using server time offset.
- **Conflicts:** use a `version` number. Ignore updates with an older version.
- **Multiple tabs on same computer:** use `BroadcastChannel` so a second Spotify tab doesn't also play. The newest tab that presses play becomes active; the others pause.
- **Reconnect:** exponential backoff with jitter; on reconnect, fetch `/me/player` to get fresh state.
- Transfer: `transfer` message carries the position so the new device starts at the same second.

### 5.6 Large playlists, search, caching and DRM

**Virtualization:** a 10,000-row playlist cannot render 10,000 DOM rows. Use `@tanstack/react-virtual` with a fixed row height (56 px), overscan ~10 rows. Load pages of 100 with cursor pagination; when the user scrolls near an unloaded range, fetch it and show skeleton rows meanwhile. Because we know `total`, the scrollbar is the correct size from the start. Keep `aria-rowcount` and `aria-rowindex` so screen readers know the real size.

"Play" on track 8,000 should not need all 8,000 loaded first — the server can accept `playContext(playlist:123, startIndex: 7999)` and return the next page of IDs, or the client asks for a lightweight **ID-only list** (`/playlists/:id/track-ids`, ~10k ids ≈ 200 KB gzipped is ok).

**Search:**
- Debounce input 200–300 ms. Cancel old requests with `AbortController` so a slow old response doesn't overwrite a newer one.
- Cache results by query in React Query (`staleTime` few minutes) — typing back "arij" is instant.
- Put the query in the URL (`/search?q=`). Show top result, songs, artists, albums in sections.
- Recent searches in localStorage.

**Caching / offline:**
- Metadata: React Query cache + HTTP caching (ETag). Images: CDN with `srcset` sizes (64px for row, 300px for header), lazy-load.
- Audio: segments come from CDN with cache headers; a Service Worker can keep the last few tracks for quick replay. Full offline downloads are not on web, because storage is limited and protecting content in the browser is harder.

**DRM (brief):** Labels require content protection. Use **Encrypted Media Extensions (EME)** with Widevine (Chrome/Firefox/Android) and FairPlay (Safari). The browser's CDM decrypts audio; the app fetches a licence from the licence server. Plus short-lived signed URLs so links can't be shared. Note: DRM forces MSE path, not a plain `audio.src`.

### Also mention

- **Accessibility:** seek and volume are `role="slider"` with `aria-valuenow`, `aria-valuetext="1 minute 20 seconds of 4 minutes"`; arrow keys move 5 s. Space = play/pause shortcut (but not when typing in search). `aria-live="polite"` for "Now playing". Respect `prefers-reduced-motion` for the equalizer animation.
- **Autoplay policy:** browsers need a user gesture before audio plays. Always start playback from a click.
- **Analytics:** report "stream counted" after 30 s of play (royalties), plus skip rate, buffering time, time-to-first-audio. Send with `navigator.sendBeacon` on page hide.
- **Error handling:** track not available in region → skip with toast. Network error → retry with backoff, keep the buffered audio playing.
- **Browser support:** Safari needs FairPlay and has stricter autoplay; test MSE on iOS (Managed Media Source on newer iOS).

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
| --- | --- | --- | --- |
| Where the audio lives | Inside a page component | Singleton engine in app shell | **B.** Music must survive navigation and React re-mounts. |
| Global state | React Context | Zustand / Redux with selectors | **Zustand.** Context re-renders all consumers on every change; selectors avoid that. |
| Current time | In global store | Read from audio element via rAF + refs | **rAF + refs.** Too frequent for React state. |
| Queue contents | Full track objects | Track IDs + metadata cache | **IDs.** Small, no duplication, easy to persist. |
| Playback tech | `<audio src>` | MSE / Web Audio | **MSE** when DRM and gapless are required; `<audio>` is fine for an MVP. |
| Pagination | Offset | Cursor | **Cursor.** Stable when the playlist changes. |
| Cross-device sync | Polling every few seconds | WebSocket push | **WebSocket.** Remote pause must feel instant. |
| Shuffle | Shuffle the array in place | Separate `order` array | **Separate order.** Can turn shuffle off and get the original order back. |

## 7. Likely follow-up questions

1. **User navigates while music plays — how do you guarantee no break?**
   Audio element is owned by a singleton outside React, player bar is in the shell outside the router outlet, links are client-side. Even a page crash is caught by an error boundary around the outlet only.

2. **How do you show the progress bar without re-rendering 60 times a second?**
   Read `currentTime` in `requestAnimationFrame` and set a CSS variable on a ref. React state only stores the track and status.

3. **User refreshes the page — what happens?**
   Store is persisted to localStorage (and server `/me/player`). We restore the track and position as paused, because autoplay without a gesture is blocked.

4. **How does shuffle work with "Add to queue"?**
   User queue is separate and always plays next, in the order added. Shuffle only affects the context `order` array.

5. **Two tabs open — both playing?**
   `BroadcastChannel('player')`: when one tab starts playing it broadcasts "I'm active"; others pause and become remote controls. Same rule as cross-device Connect.

6. **How do you handle a signed URL expiring mid-playlist?**
   Store `expiresAt`; refetch stream URL before preload if it's close to expiry. If a 403 comes, refetch once and resume at the same position.

7. **How would you implement crossfade?**
   Web Audio API: two sources each through a `GainNode`; in the last N seconds, `linearRampToValueAtTime` one to 0 and the other to 1.

8. **How do you make a 10k-track playlist fast?**
   Virtualized list, fixed row height, cursor pages of 100, skeleton rows, known total for the scrollbar, ID-only list for playback.

9. **How do you protect the audio?**
   EME with Widevine/FairPlay, encrypted segments, short-lived signed CDN URLs, licence server checks subscription. No perfect protection on the web — goal is to make it hard.

10. **Lyrics synced to the song?**
    Fetch timed lyrics (`[{ timeMs, line }]`), in rAF find the current line with binary search, scroll it into view; only update state when the line index changes.

## 8. If you only have 60 seconds

- Player lives in the app shell, outside the router, with a singleton audio engine — music never stops on navigation.
- One global player store (Zustand) with queue as IDs: user queue + context order + history; shuffle is a separate order array.
- Current time is read from the audio element with rAF, not kept in React state.
- Two audio elements (or MSE) to preload the next track for gapless playback; DRM through EME.
- Media Session API for lock screen and media keys; `document.title` shows the song.
- WebSocket "Connect" channel: one active device is source of truth, others send commands; BroadcastChannel for tabs.
- Virtualized playlists with cursor pagination; debounced, cancellable, cached search.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
| --- | --- | --- |
| 0–4 | Clarify | Web only, queue/shuffle/repeat, persist across navigation, Connect, playlist size. |
| 4–9 | Requirements | Functional list, non-functional (start time, gapless, a11y, network). |
| 9–17 | Architecture | Shell + outlet + player store + audio engine + media session + WebSocket. Walk through "click track". |
| 17–23 | Data model | Track, Playlist, PlayerState with queue model; where each lives. |
| 23–28 | API | Player hook API, TrackList props, paginated endpoints, stream URL, Connect messages. |
| 28–42 | Deep dives | Persistent player, queue/shuffle, gapless preload, Media Session, Connect sync, virtualization. |
| 42–45 | Wrap up | Trade-offs, a11y, analytics, DRM in one line each. |

## Common mistakes

- Jumping to components before defining data/entities — the queue model (context vs user queue vs history) is the heart of this question.
- Putting `<audio>` inside a page or a component that can unmount, so music stops on navigation.
- Storing `currentTime` in React state or Context, causing the whole app to re-render every tick.
- Shuffling the playlist array in place, then being unable to turn shuffle off correctly.
- Rendering full 10k-row playlists with no virtualization or pagination.
- Spending 10 minutes on HLS/DASH like a video question, and forgetting music-specific parts (gapless, media keys, Connect).

## My mistakes

- [ ]
