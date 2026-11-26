# Photo Sharing App (e.g. Instagram): feed, stories, upload

> **Difficulty:** Hard · **Asked at:** product companies with a social or media feed (Meta-style big tech, Indian consumer apps like ShareChat, Moj, Swiggy/Zomato for review photos), and generic SDE-2 frontend rounds · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Which parts should I focus on: feed, stories, upload, or all three? → Assume: all three, with the most depth on feed and upload.
- Web, mobile web, or native app? → Assume: responsive web app (React), mobile web is the main traffic.
- Photos only, or videos too? → Assume: photos only (max 10 per post as a carousel). Video is a follow-up.
- How big are the uploads? → Assume: phone photos, 3–12 MB each, up to 10 per post.
- Is the feed ranked or chronological? → Assume: ranked by the server. The client just shows what the server gives.
- Do we need real-time updates (new posts appear live)? → Assume: no live push for feed. Show a "New posts" pill after polling every 60 s.
- Do likes and comments need to update live for other users? → Assume: no, eventual consistency is fine.
- What network do users have? → Assume: many users on slow 3G/4G in India, so image size matters a lot.
- Is SEO needed? → Assume: only for public profile and single post pages, not for the logged-in feed.

## 1. Requirements

### Functional

- **Feed:** infinite scroll list of posts from people I follow. Each post has author, image(s), caption, like count, comment preview, timestamp.
- **Like / unlike** a post (also double-tap on image to like).
- **Comment** on a post, view comments.
- **Stories tray** at the top of the feed. Tap a user to open the full-screen story viewer. Auto-advance every 5 s, tap left/right to go back/forward, hold to pause, swipe to next user.
- **Upload:** pick 1–10 photos, crop, add caption, see progress, publish.

### Non-functional (performance, accessibility, devices, network)

- **Performance:** LCP under 2.5 s on a mid-range Android on 4G. First feed paint shows at least the first post image quickly. Scrolling stays at 60 fps even after 500+ posts.
- **Network:** images must be small. Serve WebP/AVIF, sized to the screen. Upload must survive a flaky connection (retry, resume).
- **Accessibility:** every image has alt text (user-written or auto-generated). Story viewer works with keyboard (left/right arrows, Space to pause, Esc to close). Like button is a real `<button>` with `aria-pressed`.
- **Devices:** mobile first (320 px wide and up), desktop shows a centered 470 px feed column.
- **Reliability:** like/comment feels instant (optimistic UI). A failed upload should not lose the user's caption and photos.

### Out of scope

- Video, Reels, live streaming.
- Direct messages, notifications.
- Feed ranking algorithm (server side).
- Image filters/editing beyond crop.
- Ads.

## 2. Architecture

```text
+--------------------------------------------------------------------+
|                         Browser (React SPA)                        |
|                                                                    |
|  +-----------+   +----------------+   +--------------------------+ |
|  | App Shell |   |  Feed Page     |   |  Upload Modal            | |
|  | (nav,     |-->|  StoriesTray   |   |  FilePicker -> Cropper   | |
|  |  router)  |   |  VirtualFeed   |   |  -> Caption -> Progress  | |
|  +-----------+   |   PostCard x N |   +------------+-------------+ |
|                  +-------+--------+                |               |
|                          |          +--------------v-------------+ |
|  +-------------------+   |          | Upload Manager             | |
|  | Story Viewer      |   |          | (resize in Web Worker,     | |
|  | (full screen,     |   |          |  queue, retry, progress)   | |
|  |  preloader)       |   |          +--------------+-------------+ |
|  +---------+---------+   |                         |               |
|            |             v                         |               |
|  +---------v-----------------------+               |               |
|  | Client Store (React Query cache)|               |               |
|  | feed pages, posts by id, stories|               |               |
|  +---------+-----------------------+               |               |
+------------|---------------------------------------|---------------+
             | REST/JSON                           | PUT file
             v                                     v
     +---------------+                    +------------------+
     |  API Server   |---presigned URL--->|  Object Storage  |
     |  (feed, like, |                    |  (S3)            |
     |  comment,     |<--upload done------+--------+---------+
     |  stories)     |                             |
     +---------------+                    +--------v---------+
                                          | Image CDN        |
                                          | (resize, WebP)   |
                                          +------------------+
```

| Component | Responsibility |
|---|---|
| App Shell | Top/bottom nav, routing, auth. Loads fast, cached by service worker. |
| StoriesTray | Horizontal list of story avatars with a "seen/unseen" ring. |
| VirtualFeed | Renders only visible PostCards. Asks for the next page when near the bottom. |
| PostCard | Header, image carousel, like/comment/share bar, caption, comment preview. |
| Story Viewer | Full-screen player: progress bars, timers, gestures, preloads next images. |
| Upload Modal | Pick files, crop, caption, show progress. |
| Upload Manager | Resizes/compresses images in a Web Worker, gets presigned URLs, uploads directly to S3 with retry, then calls "create post". |
| Client Store | React Query cache. Normalised posts so a like in the feed also updates the post detail page. |
| API Server | Feed, likes, comments, stories, presigned URLs. |
| Image CDN | Serves resized images in WebP/AVIF at different widths. |

**Main user action — scroll the feed:**

1. Page loads. App Shell renders from cache. React Query calls `GET /feed?limit=10`.
2. Server returns 10 posts and a `nextCursor`. The first image is marked `fetchpriority="high"`.
3. VirtualFeed renders PostCards. Images show a tiny blurred placeholder first, then the real image.
4. When the user is about 3 posts from the bottom, an IntersectionObserver sentinel triggers `GET /feed?cursor=abc&limit=10`.
5. New posts are appended. Posts far above the viewport are removed from the DOM (virtualization) so memory stays low.

## 3. Data model

```ts
type User = {
  id: string;
  username: string;
  avatarUrl: string;
  isVerified: boolean;
};

type ImageAsset = {
  id: string;
  url: string;            // base CDN URL, we add ?w=640 etc.
  width: number;          // original size, used for aspect ratio
  height: number;
  blurHash: string;       // ~30 chars, decoded to a tiny placeholder
  altText: string;
};

type Post = {
  id: string;
  author: User;
  images: ImageAsset[];   // 1–10, carousel
  caption: string;
  createdAt: string;      // ISO
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  topComments: Comment[]; // 2 comments for preview
};

type Comment = {
  id: string;
  postId: string;
  author: User;
  text: string;
  createdAt: string;
  pending?: boolean;      // client only: optimistic comment not yet saved
};

type FeedPage = {
  posts: Post[];
  nextCursor: string | null;
};

type StoryItem = { id: string; image: ImageAsset; createdAt: string; durationMs: number };
type StoryGroup = {
  user: User;
  items: StoryItem[];
  lastSeenItemId: string | null;  // so we resume where the user left off
};

type UploadDraft = {
  localId: string;
  files: { localId: string; blob: Blob; status: 'queued' | 'uploading' | 'done' | 'error'; progress: number; assetId?: string }[];
  caption: string;
};
```

| Entity | Lives in | Why |
|---|---|---|
| FeedPage / Post | Client store (React Query infinite query) | Server data, needs caching, pagination, refetch. |
| Like state (`viewerHasLiked`, `likeCount`) | Client store, inside Post | Optimistic update edits the cached Post directly. |
| Comments list | Client store (per post query) | Loaded only when user opens comments. |
| StoryGroup list | Client store | Server data, refetched every few minutes. |
| Current story index, paused flag | Component state (StoryViewer) | Pure UI state, no one else needs it. |
| Open post / story user | URL (`/p/:id`, `/stories/:username`) | Shareable, back button works. |
| Feed scroll position | Session storage / router state | Restore position when user goes back from a post. |
| UploadDraft (blobs + caption) | IndexedDB | Survives refresh or tab crash. Blobs are too big for localStorage (5 MB limit). |
| Seen story ids (before sync) | Component state + batched to server | Server is the source of truth, but we batch writes. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
type VirtualFeedProps = {
  pages: FeedPage[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  estimateItemHeight?: number;   // default 600px, real height measured later
};

type PostCardProps = {
  post: Post;
  onLike: (postId: string, like: boolean) => void;
  onOpenComments: (postId: string) => void;
  priority?: boolean;            // true for the first post -> eager + fetchpriority high
};

type StoryViewerProps = {
  groups: StoryGroup[];
  startUserId: string;
  onClose: () => void;
  onSeen: (storyItemId: string) => void;
};

type UploadModalProps = {
  maxFiles?: number;             // default 10
  maxEdgePx?: number;            // default 1080
  onPublished: (post: Post) => void;
};
```

### Server API (endpoints, method, params, example JSON response, pagination style and WHY)

| Endpoint | Method | Params | Purpose |
|---|---|---|---|
| `/feed` | GET | `cursor?`, `limit=10` | Home feed page |
| `/posts/:id` | GET | – | Single post |
| `/posts/:id/like` | PUT / DELETE | – | Like / unlike (idempotent) |
| `/posts/:id/comments` | GET | `cursor?`, `limit=20` | Comments |
| `/posts/:id/comments` | POST | `{ text, clientId }` | Add comment |
| `/stories` | GET | – | Story groups for tray |
| `/stories/seen` | POST | `{ itemIds: [] }` | Batch mark as seen |
| `/uploads/presign` | POST | `{ files: [{ type, size }] }` | Get presigned S3 URLs |
| `/posts` | POST | `{ assetIds, caption, clientId }` | Create post after upload |

Example `GET /feed?limit=2`:

```json
{
  "posts": [
    {
      "id": "p_981",
      "author": { "id": "u_12", "username": "preet.codes", "avatarUrl": "https://cdn.x.com/a/u_12.jpg", "isVerified": false },
      "images": [
        { "id": "i_1", "url": "https://cdn.x.com/i/i_1", "width": 3024, "height": 4032,
          "blurHash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj", "altText": "Sunset at Marine Drive" }
      ],
      "caption": "Evening walk",
      "createdAt": "2026-11-25T18:20:00Z",
      "likeCount": 132,
      "commentCount": 8,
      "viewerHasLiked": false,
      "topComments": []
    }
  ],
  "nextCursor": "eyJ0cyI6MTczMjU1MjAwMCwiaWQiOiJwXzk4MSJ9"
}
```

**Pagination: cursor-based, not offset.** Why: the feed changes all the time. With `?page=2`, if 3 new posts arrive at the top, page 2 shifts and the user sees duplicates. A cursor ("give me posts after this one") is stable. It is also faster on the DB for deep pages. The cursor is opaque (base64) so the server can change its format later.

**Like is PUT/DELETE**, not a toggle POST. Why: idempotent. If the user taps fast or we retry, "like" twice is still "liked". A toggle could flip the wrong way on retry.

**`clientId` on comments and posts:** a UUID made on the client. If a request is retried, the server sees the same `clientId` and does not create a duplicate.

## 5. Optimizations and deep dives

### 5.1 Image upload flow

Goal: upload 10 photos of 8 MB each on a slow phone network, without freezing the UI and without losing work.

**Step 1 — Resize and compress on the client.** A 12 MP photo is 4032×3024 and maybe 8 MB. Instagram shows max 1080 px wide. Resizing to 1080 px and encoding as JPEG/WebP at quality 0.8 gives about 200–400 KB. That is **20× less data** to upload.

Do it in a Web Worker with `OffscreenCanvas` so the main thread does not freeze:

```ts
// resize.worker.ts
self.onmessage = async (e: MessageEvent<{ file: File; maxEdge: number }>) => {
  const { file, maxEdge } = e.data;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); // fixes EXIF rotation
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  self.postMessage({ blob, width: w, height: h });
};
```

Drawing to canvas also **removes EXIF data**, which includes GPS location. This is a privacy win.

**Step 2 — Presigned URL, upload directly to S3.** The client asks our API for a presigned URL (a temporary signed link, valid ~5 min, that allows one PUT to one S3 key). The file goes straight to S3, not through our API server. Why: our API servers do not have to handle big file bodies, and S3 is built for this.

**Step 3 — Progress.** `fetch` has no upload progress event, so use `XMLHttpRequest`:

```ts
function uploadWithProgress(url: string, blob: Blob, onProgress: (p: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', blob.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error('network'));
    signal.addEventListener('abort', () => xhr.abort());
    xhr.send(blob);
  });
}
```

Overall progress = average of each file's progress. Show one bar plus a small per-file status.

**Step 4 — Concurrency and retry.** Upload 2–3 files at a time, not all 10 (too many parallel uploads on 3G makes all of them slow). Retry each failed file up to 3 times with exponential backoff (1 s, 2 s, 4 s). If a presigned URL expired (403), ask for a new one.

**Step 5 — Create the post.** When all files are done, call `POST /posts { assetIds, caption, clientId }`. Server makes thumbnails (blurhash, sizes) async.

**Step 6 — Don't lose work.** Save the draft (resized blobs + caption) in IndexedDB. If the tab closes, offer "Continue your post?" next time. Large originals (>20 MB) or wrong types are rejected early with a clear message.

**Bonus:** start uploading as soon as the user picks photos, while they write the caption. By the time they hit "Share", most uploads are done. This makes publishing feel instant.

### 5.2 Feed: cursor pagination + virtualization

- Use React Query `useInfiniteQuery` with `getNextPageParam: (last) => last.nextCursor`.
- Trigger next page with an IntersectionObserver sentinel placed ~3 posts before the end (`rootMargin: '1500px'`), so the next page is loaded before the user reaches the bottom.
- **Virtualization:** after 200 posts, the DOM would have thousands of nodes and many decoded images (each 1080×1350 decoded image is ~5.8 MB in memory). On low-end phones, the tab crashes. Use `@tanstack/react-virtual` with dynamic measurement: render only visible posts + 3 above/below.
- **Avoid layout shift:** we know each image's `width/height`, so set `aspect-ratio` on the image box before the image loads. CLS stays near 0, and the virtualizer's height estimate is accurate.
- **Scroll restoration:** when the user opens a post and comes back, keep the React Query cache and save the scroll offset + first visible post id in `sessionStorage`.
- **New posts pill:** poll `/feed?since=<firstPostId>&countOnly=true` every 60 s. If count > 0, show "New posts" at the top. Do not insert posts automatically — content jumping under the user's finger is bad UX.

### 5.3 Stories: preloading, progress bar, gestures

**Preloading.** When a story opens, preload the next 2 items of the current user and the first item of the next user:

```ts
function preload(urls: string[]) {
  urls.forEach((src) => {
    const img = new Image();
    img.src = src;
    img.decode?.().catch(() => {}); // decode early so the swap is instant
  });
}
```

Also: when the stories tray is visible, preload just the first item of the first 3 unseen users at low priority.

**Progress bar timing.** Do not run `setInterval` and add 1% each tick — timers drift and pause in background tabs. Instead store `startTime` and compute progress from the clock in `requestAnimationFrame`. Even simpler: animate the bar with a CSS transition/animation of `durationMs`, and use `animation-play-state: paused` on hold. Listen to `animationend` to go to the next item. This is smooth and runs on the compositor.

- Start the timer only after the image has loaded (`onLoad`). Otherwise on slow networks the bar finishes before the user sees anything.
- Pause when the tab is hidden (`visibilitychange`).

**Gestures.**

| Gesture | Action |
|---|---|
| Tap left 1/3 of screen | Previous item |
| Tap right 2/3 | Next item |
| Press and hold (>200 ms) | Pause, hide UI |
| Swipe left/right | Next/previous user |
| Swipe down | Close |
| Keyboard ← → / Space / Esc | Prev / next / pause / close |

Use Pointer Events (`pointerdown`, `pointerup`) so mouse and touch share one code path. Hold vs tap: start a 200 ms timer on `pointerdown`; if `pointerup` comes before it fires, it is a tap.

**Seen state:** mark items seen locally right away (the tray ring turns grey), and batch-send ids to `POST /stories/seen` every 5 s or on close, using `navigator.sendBeacon` on page hide.

### 5.4 Like and comment: optimistic updates

User taps the heart → UI changes in under 16 ms, request runs in background, rollback if it fails.

```ts
const likeMutation = useMutation({
  mutationFn: ({ postId, like }: { postId: string; like: boolean }) =>
    like ? api.put(`/posts/${postId}/like`) : api.delete(`/posts/${postId}/like`),
  onMutate: async ({ postId, like }) => {
    await queryClient.cancelQueries({ queryKey: ['feed'] });
    const prev = queryClient.getQueryData(['feed']);
    queryClient.setQueryData(['feed'], (data: any) => updatePostInPages(data, postId, (p: Post) => ({
      ...p, viewerHasLiked: like, likeCount: p.likeCount + (like ? 1 : -1),
    })));
    return { prev };
  },
  onError: (_e, _v, ctx) => {
    queryClient.setQueryData(['feed'], ctx?.prev);
    toast('Could not like the post. Try again.');
  },
});
```

- **Fast double taps:** user likes, unlikes, likes in 1 s. Debounce the network call by ~300 ms and send only the final state. Because PUT/DELETE are idempotent, order problems are small.
- **Double-tap to like:** show the big heart animation; double tap only likes, never unlikes.
- **Comments:** add the comment to the list immediately with `pending: true` (lighter text). On success, replace with the server comment (same `clientId`). On failure, show "Failed. Tap to retry" on that comment — keep the text, do not make the user retype.

### 5.5 Responsive images and blur-up placeholders

Images are 90% of the bytes. This is where most performance wins come from.

```tsx
<div style={{ aspectRatio: `${img.width} / ${img.height}`, backgroundImage: `url(${blurDataUrl})`, backgroundSize: 'cover' }}>
  <img
    src={`${img.url}?w=640&fm=webp`}
    srcSet={[320, 480, 640, 1080].map((w) => `${img.url}?w=${w}&fm=webp ${w}w`).join(', ')}
    sizes="(min-width: 500px) 470px, 100vw"
    alt={img.altText}
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : 'auto'}
    decoding="async"
    onLoad={() => setLoaded(true)}
    style={{ opacity: loaded ? 1 : 0, transition: 'opacity 200ms' }}
  />
</div>
```

- **srcset + sizes:** a 360 px phone at DPR 2 downloads the 640 w version (~60 KB), not 1080 w (~180 KB).
- **Format:** use `<picture>` with AVIF then WebP then JPEG, or let the CDN choose by the `Accept` header. AVIF is ~30% smaller than WebP.
- **Blur-up:** server sends a `blurHash` (~30 chars) or a 20 px base64 JPEG (~300 bytes). Show it instantly, fade in the real image. The user sees colour and shape, not a grey box.
- **LCP:** the first post image is eager + `fetchpriority="high"`; everything else lazy. Add `<link rel="preconnect">` to the CDN domain.
- **Carousel:** load only the visible slide and the next one.

### Also mention

- **Accessibility:** alt text field in upload (auto-suggest if empty); carousel has "Image 2 of 5" label; story viewer traps focus and respects `prefers-reduced-motion` (no auto-advance animation, show next button); like button `aria-pressed`, `aria-label="Like"`.
- **Security:** sanitize captions (render as text, never `dangerouslySetInnerHTML`); validate file type by magic bytes on server, not just extension; presigned URLs limited by size, content type, and short expiry; strip EXIF GPS.
- **Analytics:** log post impressions when 50% visible for 1 s (IntersectionObserver), batched with `sendBeacon`. Track upload success rate and time.
- **Offline/PWA:** service worker caches the app shell and last feed page, so the app opens offline with "You're offline" banner. Queue likes made offline and replay them.
- **Memory:** in story viewer, release object URLs (`URL.revokeObjectURL`) of previews after upload.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Pagination | Offset (`?page=2`) | Cursor (`?cursor=abc`) | Cursor. Feed changes often; offset causes duplicates and skips. |
| Upload path | Through our API server | Direct to S3 with presigned URL | Presigned. Less load on API, faster, resumable with multipart. |
| Resize where | Server only | Client first, server makes variants | Client first. 20× smaller upload on slow networks. Server still makes sizes. |
| Long list rendering | Render all | Virtualize | Virtualize after ~30 posts. Memory and DOM size matter on low-end phones. |
| Like UI | Wait for server | Optimistic | Optimistic. Likes rarely fail; instant feel is key. |
| Feed rendering | SSR | CSR with app shell | CSR + cached shell for logged-in feed (no SEO need, personalized). SSR only for public post/profile pages. |
| New posts | Auto-insert at top | "New posts" pill | Pill. No content jumping. |
| Story timer | `setInterval` counter | CSS animation / rAF with timestamps | CSS animation. Smooth, easy to pause, no drift. |

## 7. Likely follow-up questions

**Q1. How would you support video in the feed?**
Use HLS/DASH adaptive streaming, not one big MP4. Autoplay muted only when 50%+ visible (IntersectionObserver), pause when it leaves. Only one video plays at a time. Show a poster image first.

**Q2. The user uploads on a train and loses network at 70%. What happens?**
XHR fails → retry with backoff. For large files use S3 multipart upload (5 MB parts) so we only retry the failed part. Draft is in IndexedDB, so even a page reload can resume. Listen to `online` event to resume right away.

**Q3. How do you keep the like count in sync between feed and post detail page?**
Normalize: store posts by id in one cache, or use a helper that updates the post everywhere it appears in React Query caches (`setQueriesData` with a predicate). One source of truth per post.

**Q4. How do you measure performance in production?**
Use `web-vitals` library to send LCP, INP, CLS to analytics with device type and network (`navigator.connection.effectiveType`). Watch p75. Add custom marks like "time to first post image".

**Q5. How do you handle a user with 2,000 stories in the tray?**
Paginate the tray horizontally (load 20 users, more on scroll). Only fetch a user's story items when they are opened or next to open.

**Q6. Feed loads slowly in a new market. What do you check first?**
Image bytes per post (are we serving the right size?), CDN cache hit rate and edge location, JS bundle size (code-split upload and story viewer — they are not needed for first paint), and number of requests before the first image.

**Q7. How would you make the feed work offline?**
Service worker: cache-first for app shell, stale-while-revalidate for the last feed response, cache the images already seen (with a size limit, e.g. 50 MB, LRU). Mutations go into an outbox in IndexedDB and replay when online.

**Q8. Why not use WebSockets for likes?**
Live like counts are low value and expensive at scale (millions of open connections). Polling or refresh-on-focus is enough. WebSockets make sense for DMs and live comments on live streams.

**Q9. How do you prevent the same post appearing twice in the feed?**
Cursor pagination mostly avoids it. As a safety net, dedupe by post id when merging pages on the client.

## 8. If you only have 60 seconds

- React SPA with a cached app shell; React Query for server state; feed, stories, upload are separate code-split chunks.
- Feed uses cursor pagination (stable when new posts arrive) + IntersectionObserver prefetch + virtualization so 500 posts don't crash a phone.
- Images: srcset/sizes, WebP/AVIF from a CDN, aspect-ratio boxes for zero CLS, blurhash placeholders, first image `fetchpriority="high"`.
- Upload: resize to 1080 px in a Web Worker (8 MB → 300 KB, EXIF stripped), presigned URL straight to S3, XHR progress, 3 parallel uploads, retry with backoff, draft saved in IndexedDB.
- Stories: preload next items, CSS-animated progress bar that starts after image load, tap/hold/swipe with pointer events, keyboard support.
- Likes and comments are optimistic with rollback; APIs are idempotent (PUT/DELETE, clientId) so retries are safe.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarifying questions | Scope (feed/stories/upload), web vs mobile, photo only, network |
| 4–9 | Requirements | Functional list, perf numbers, a11y, out of scope |
| 9–16 | Architecture | Box diagram, component table, feed data flow |
| 16–21 | Data model | Post, ImageAsset, StoryGroup, UploadDraft; where each lives |
| 21–27 | API | Feed with cursor, like PUT/DELETE, presign, create post; component props |
| 27–40 | Deep dives | Upload flow (most time), feed virtualization + images, stories, optimistic likes |
| 40–45 | Trade-offs + wrap-up | 2–3 trade-offs, answer follow-ups |

## Common mistakes

- Jumping to components before defining data/entities — you can't talk about the feed until you have defined `Post`, `ImageAsset` and the cursor.
- Uploading the original 8 MB photo through your own API server. Mention client resize and presigned URLs.
- Using offset pagination for a feed that changes every second.
- Forgetting image dimensions in the API, which causes layout shift and breaks virtualization height estimates.
- Using `setInterval` for the story progress bar and starting it before the image has loaded.
- Talking only about the happy path — no retry, no rollback for likes, no draft saving for uploads.

## My mistakes

- [ ]
