# News Feed (e.g. Facebook)

> **Difficulty:** Medium · **Asked at:** Social and content product companies (Meta, LinkedIn, ShareChat, Dailyhunt, Twitter/X, Instagram-style startups), also common at general product companies as a "classic" round · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- What can a post contain? Text, images, video, links?
  → Assume: text + up to 4 images. Video and link previews are stretch goals.
- Which actions on a post? Like, comment, share?
  → Assume: like/unlike and comment count. Full comments UI is out of scope.
- Can the user create posts from the feed page?
  → Assume: yes, a simple composer at the top (text + images).
- How is the feed ordered? Time or ranking?
  → Assume: server decides the order (ranking). The client just shows what it gets.
- Do new posts appear in real time?
  → Assume: show a "New posts" pill at the top. Do not push them into the list automatically.
- Devices and network?
  → Assume: mobile web first. Many users on mid-range Android phones and 4G.
- How long do people scroll?
  → Assume: long sessions, hundreds of posts. So memory and DOM size matter.

## 1. Requirements

### Functional
- Show a list of posts from people/pages the user follows.
- Infinite scroll: load more posts when the user nears the bottom.
- Like/unlike a post. Count updates right away.
- Create a new post (text + images). It appears at the top of the feed.
- Show "N new posts" pill when new posts are available. Click to see them.
- Loading skeletons, empty state, and error state with retry.

### Non-functional (performance, accessibility, devices, network)
- **Performance:** first posts visible fast (target LCP under 2.5s on 4G). Scrolling at 60fps even after 500 posts.
- **Network:** small pages (10–20 posts). Images optimised and lazy-loaded. Works on flaky networks.
- **Accessibility:** feed uses the ARIA `feed` pattern. All actions reachable by keyboard. Images have alt text.
- **Devices:** mobile and desktop. Responsive layout. Low-end devices must not run out of memory.
- **Reliability:** failed actions (like, post) roll back with a clear message.

### Out of scope
- Ranking algorithm and fan-out on the backend.
- Full comments thread, stories, ads, chat.
- Login / auth flow.

## 2. Architecture

```text
+----------------------------------------------------------------+
|                         Feed Page                              |
|  +-------------+   +----------------------------------------+  |
|  |  Composer   |   |  NewPostsPill ("5 new posts")          |  |
|  +-------------+   +----------------------------------------+  |
|  +----------------------------------------------------------+  |
|  |  FeedList (virtualized)                                  |  |
|  |   PostCard | PostCard | PostCard | ... | Sentinel(load)  |  |
|  +----------------------------------------------------------+  |
+----------------------------------------------------------------+
           |  reads / writes                     ^
           v                                     | re-render
+----------------------------------------------------------------+
|        Client Store (normalized: posts by id, users by id,     |
|        feed = ordered list of post ids + nextCursor)           |
+----------------------------------------------------------------+
           |                                     ^
           v                                     |
+----------------------------+      +-----------------------------+
|  API client (fetch, retry) |      | Real-time client (SSE /     |
|                            |      | polling every 30-60s)       |
+----------------------------+      +-----------------------------+
           |                                     |
           v                                     v
+----------------------------------------------------------------+
|        Server: GET /feed, POST /posts, POST /posts/:id/like    |
|        CDN for images                                          |
+----------------------------------------------------------------+
```

| Component | Responsibility |
|---|---|
| Feed Page | Page shell. Wires the composer, pill and list together. |
| Composer | Text box + image picker. Sends new posts. Shows upload progress. |
| NewPostsPill | Shows when the server says new posts exist. On click, loads them and scrolls to top. |
| FeedList | Renders posts. Virtualized. Has a sentinel element at the bottom to trigger loading more. |
| PostCard | One post: author, time, text, images, like button, counts. |
| Client Store | Single source of truth. Normalized posts and users. Holds the cursor. |
| API client | Fetch calls, retries, error handling. |
| Real-time client | Asks the server "any new posts?" (SSE or polling). |

**Data flow for infinite scroll (the main action):**
1. Page loads. Client calls `GET /feed?limit=20`. Store saves posts by id and the ordered id list, plus `nextCursor`.
2. FeedList renders the first 20 posts. A sentinel `<div>` sits after the last post.
3. User scrolls. When the sentinel comes within ~800px of the viewport, IntersectionObserver fires.
4. If not already loading and `nextCursor` is not null, call `GET /feed?cursor=abc&limit=20`.
5. Store appends new ids (skipping duplicates) and updates `nextCursor`.
6. FeedList re-renders. Virtualization keeps only visible posts (plus a buffer) in the DOM.
7. When `nextCursor` is null, show "You're all caught up".

## 3. Data model

```ts
type User = {
  id: string;
  name: string;
  avatarUrl: string;
};

type Media = {
  id: string;
  type: 'image';
  url: string;
  width: number;   // needed to reserve space and avoid layout shift
  height: number;
  alt: string;
  srcSet?: string;
};

type Post = {
  id: string;
  authorId: string;           // reference, not the full user (normalized)
  createdAt: string;          // ISO date
  text: string;
  media: Media[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type FeedState = {
  postIds: string[];          // order of posts in the feed
  nextCursor: string | null;
  status: 'idle' | 'loading' | 'error';
  newPostsCount: number;
};

type Store = {
  posts: Record<string, Post>;
  users: Record<string, User>;
  feed: FeedState;
};
```

Why **normalize**? The same user appears in many posts. The same post can appear in the feed and in a profile page. If the user likes it in one place, it should update everywhere. Storing by id means one update, one source of truth.

| Entity | Lives in | Why |
|---|---|---|
| Posts, users (source of truth) | Server | Shared between users and devices. |
| Posts, users (loaded copy) | Client store (normalized, e.g. Redux Toolkit / Zustand / React Query cache) | Reused across components and pages. One update reflects everywhere. |
| Feed order + `nextCursor` | Client store | Needed to load the next page and to restore scroll when coming back. |
| Composer draft text | Component state (and `sessionStorage` for safety) | Only the composer needs it. Do not lose it on accidental refresh. |
| "Is this image viewer open", menu open | Component state | Pure UI, short-lived. |
| Selected filter tab ("Top" / "Recent") | URL (`/feed?sort=recent`) | Shareable and survives refresh. |

## 4. Interface (API)

### Component API (props of the main component, with types and defaults)

```ts
type FeedProps = {
  feedType?: 'home' | 'profile' | 'group'; // default: 'home'
  ownerId?: string;                        // user/group id for profile/group feeds
  pageSize?: number;                       // default: 20
  loadMoreThresholdPx?: number;            // default: 800 (rootMargin for the observer)
  enableComposer?: boolean;                // default: true for 'home'
  newPostsPollMs?: number;                 // default: 60_000 (only if not using SSE)
  renderEmpty?: () => React.ReactNode;     // default: "Follow people to see posts"
};

type PostCardProps = {
  postId: string;              // card reads the rest from the store
  onLike: (postId: string) => void;
  onOpenComments: (postId: string) => void;
};
```

Passing `postId` (not the full post) to `PostCard` means a like on one post re-renders only that card.

### Server API (endpoints, method, params, example JSON response, pagination style and WHY that style)

**1. Get feed** — `GET /api/feed?cursor=<string>&limit=20`

```json
{
  "posts": [
    {
      "id": "p_9001",
      "authorId": "u_12",
      "createdAt": "2026-11-26T09:15:00Z",
      "text": "Shipped our new feature today!",
      "media": [{ "id": "m_1", "type": "image", "url": "https://cdn.example.com/m_1_800.webp",
                  "srcSet": "https://cdn.example.com/m_1_400.webp 400w, https://cdn.example.com/m_1_800.webp 800w",
                  "width": 1200, "height": 800, "alt": "Team photo" }],
      "likeCount": 42, "commentCount": 5, "likedByMe": false
    }
  ],
  "users": { "u_12": { "id": "u_12", "name": "Ananya", "avatarUrl": "https://cdn.example.com/u_12.webp" } },
  "nextCursor": "eyJ0IjoiMjAyNi0xMS0yNlQwOToxNTowMFoiLCJpZCI6InBfOTAwMSJ9"
}
```

**Pagination style: cursor-based.** Why not offset (`?page=3`)?
- Feeds change all the time. New posts are added at the top. With offset, page 2 shifts down and you see **duplicates** (or miss posts if some are deleted).
- Cursor says "give me posts after this one". New posts at the top do not affect it.
- Offset also gets slow on the database for big offsets. Cursor uses an index.
- Downside: you cannot jump to "page 50". A feed never needs that.

**2. Create post** — `POST /api/posts` body `{ text, mediaIds: [] }` → returns the full `Post`.
Images are uploaded first: `POST /api/media` (multipart) → `{ id, url }`. Or get a pre-signed URL and upload directly to storage.
Send an `Idempotency-Key` header so a retry does not create the post twice.

**3. Like / unlike** — `POST /api/posts/:id/like` and `DELETE /api/posts/:id/like` → `{ likeCount, likedByMe }`.
Two clear endpoints are safer than one "toggle" (toggle sent twice = wrong state).

**4. New posts check** — `GET /api/feed/new-count?since=<newestPostId>` → `{ count: 5 }`, or an SSE stream `GET /api/feed/stream` that sends `{ type: "new_posts", count: 5 }`.

## 5. Optimizations and deep dives

### 5.1 Infinite scroll with IntersectionObserver
Do not listen to the `scroll` event and measure positions. It fires very often and causes layout work on the main thread. Use IntersectionObserver on a sentinel element.

```tsx
function useLoadMore(onLoadMore: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { rootMargin: '800px 0px' } // start loading ~1-2 screens before the end
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onLoadMore, enabled]);
  return ref;
}
```

- Guard against double loads: do not fetch if `status === 'loading'` or `nextCursor === null`.
- De-duplicate by id when appending (ranking can return the same post twice).
- On error, show an inline "Couldn't load more. Retry" button at the bottom, not a full-page error.
- Accessibility: infinite scroll traps keyboard users from reaching the footer. Give a "Load more" button as fallback, or keep footer links elsewhere.

### 5.2 Virtualization (keep the DOM small)
After 500 posts with images, the DOM has thousands of nodes and the phone slows down or crashes.

- Render only posts in or near the viewport (e.g. visible + 5 above + 5 below). Others are replaced by empty space of the same height.
- Post heights are **different** (text length, images), so use a library that measures dynamic heights: `react-virtuoso` or `@tanstack/react-virtual` with `measureElement`.
- Reserve image height from `width/height` in the data so measured heights are correct early.
- Cheaper alternative: CSS `content-visibility: auto; contain-intrinsic-size: 600px;` on each post. Browser skips rendering offscreen posts. No library, but DOM nodes still exist.
- Trade-off: virtualization breaks browser "Find in page" (Ctrl+F) for offscreen posts, and screen readers only see rendered posts. Use `aria-setsize` / `aria-posinset` to help.

### 5.3 Optimistic updates (likes)
Users expect the heart to turn red instantly. Do not wait for the server.

```ts
async function toggleLike(postId: string) {
  const post = store.posts[postId];
  const prev = { likedByMe: post.likedByMe, likeCount: post.likeCount };
  // 1. Update UI right away
  updatePost(postId, {
    likedByMe: !prev.likedByMe,
    likeCount: prev.likeCount + (prev.likedByMe ? -1 : 1),
  });
  try {
    // 2. Tell the server
    const res = prev.likedByMe ? await api.unlike(postId) : await api.like(postId);
    updatePost(postId, res); // 3. Use real server numbers
  } catch {
    updatePost(postId, prev); // 4. Roll back
    showToast('Could not like the post. Try again.');
  }
}
```

- If the user taps like 5 times fast, either disable the button while pending, or send only the final state (debounce 300ms).
- Same pattern for new posts: add a temporary post with `id: 'temp_123'` and `status: 'sending'` at the top. Replace with the real post when the server replies. On failure, show "Failed. Retry" on the card.
- React Query's `onMutate` / `onError` / `onSettled` handles this pattern well.

### 5.4 New posts notification
Do not insert new posts at the top while the user is reading. The content jumps and they lose their place.

- Get the count via **polling** (`GET /feed/new-count` every 60s) or **SSE** (server pushes). WebSocket is overkill unless the app already has one for chat.
- Polling is simpler and fine for a feed. Pause polling when the tab is hidden (`document.visibilityState === 'hidden'`) to save battery and server load.
- Show a pill "5 new posts ↑". On click: fetch new posts, prepend them, scroll to top smoothly.
- If the user is already at the very top, you can insert silently.

### 5.5 Image loading and layout shift
Images are the heaviest part of a feed.

```tsx
<img
  src={media.url}
  srcSet={media.srcSet}
  sizes="(max-width: 600px) 100vw, 600px"
  width={media.width}
  height={media.height}      // browser reserves space -> no layout shift (CLS)
  loading={index < 2 ? 'eager' : 'lazy'}
  fetchPriority={index === 0 ? 'high' : 'auto'} // first image is likely the LCP element
  decoding="async"
  alt={media.alt}
/>
```

- `srcSet` + `sizes`: phone downloads a 400px image, not a 1200px one.
- Use WebP/AVIF from the CDN.
- Show a blur placeholder or dominant colour while loading (server can send a tiny `blurhash` or colour).
- Avatars: tiny (40px), served at 2x for retina = 80px.

### 5.6 Initial load and rendering
- **SSR or streaming SSR** the first 5–10 posts so content appears before JS loads. Hydrate after.
- Show **skeleton cards** (same shape as posts) while loading, not a spinner. Feels faster and avoids layout shift.
- Code-split heavy parts: composer image editor, video player, comments panel. Load on demand.
- **Scroll restoration:** when the user opens a post and comes back, restore scroll position and do not refetch. Keep feed state in the store (or React Query cache with `staleTime` ~5 min) and save `scrollY` in `sessionStorage`.

### Also mention
- **Network:** gzip/Brotli, HTTP/2, CDN for images. Retry with exponential backoff (1s, 2s, 4s) for GET. Prefetch next page when idle.
- **Rendering:** `React.memo` on `PostCard`; select only the one post from the store so a like re-renders one card. Format times with a shared `Intl.RelativeTimeFormat` instance.
- **Accessibility:** wrap list in `role="feed"` with each post as `<article aria-posinset aria-setsize>`; `aria-busy="true"` on the feed while loading; like button is a real `<button aria-pressed>`; announce "Post published" via a live region.
- **Security (XSS):** post text is user content. Render as text, never `innerHTML`. If links/mentions are supported, parse into React elements and allow only `http/https` links with `rel="noopener noreferrer"`. Sanitize any rich text with DOMPurify. CSRF token for POST requests.
- **i18n:** relative times ("2h ago") via `Intl`, number formatting ("1.2K" vs "1.2 हज़ार"), RTL support with logical CSS (`margin-inline-start`).
- **Offline:** cache the last feed in IndexedDB so the app opens with something. Queue likes and posts while offline and send when back online (Service Worker / Background Sync).

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Pagination | Offset (`?page=2`) | Cursor (`?cursor=abc`) | Cursor. Feed changes constantly; offset gives duplicates and missed posts. |
| Loading more | Infinite scroll | "Load more" button | Infinite scroll for engagement, plus a button fallback on error and for keyboard users. |
| Long lists | Virtualization library | `content-visibility: auto` | Virtualization for long sessions on low-end phones. `content-visibility` if the feed is short or for an MVP. |
| New posts | Polling every 60s | SSE / WebSocket | Polling first (simple, cacheable). SSE if near real-time matters. WebSocket only if already used. |
| Likes | Wait for server | Optimistic update | Optimistic with rollback. Fast feel, failure is rare. |
| State shape | Nested (posts contain users) | Normalized by id | Normalized. One update reflects everywhere, no stale copies. |
| First render | Client-side only | SSR first page | SSR the first page for faster LCP and better perceived speed; client-render the rest. |

## 7. Likely follow-up questions

1. **How do you avoid duplicate posts when loading more?**
   Use cursor pagination. Also de-duplicate on the client: keep a `Set` of ids and skip ones already in `postIds`.

2. **User likes a post, goes offline, and the request fails. What happens?**
   Roll back and show a toast. Better: queue the action in IndexedDB and replay when `online` event fires. Keep the optimistic state while queued.

3. **How do you restore scroll position after visiting a post and pressing Back?**
   Keep feed data in the store/cache (do not refetch on mount). Save scroll offset (or the first visible post id for virtualized lists) in `sessionStorage`, and restore after render.

4. **How would you support video posts?**
   Autoplay muted only when ≥50% visible (IntersectionObserver with `threshold: 0.5`). Pause when out of view. Only one video plays at a time. Use `preload="none"` and a poster image. Respect `prefers-reduced-motion` and data saver.

5. **How do you measure if the feed is fast?**
   Core Web Vitals (LCP, INP, CLS) via `web-vitals` library sent to analytics. Custom metrics: time to first post, long tasks during scroll, memory on low-end devices.

6. **How do you handle a post being edited or deleted after it is loaded?**
   Server events (SSE) or refetch on focus. Since the store is normalized, updating `posts[id]` updates every place it appears. For delete, remove from `postIds` and show "This post was removed".

7. **Why not WebSocket for new posts?**
   It is two-way, needs connection management, and is harder to scale. Feed updates are one-way and not urgent. Polling or SSE is enough.

8. **How do you upload images in the composer?**
   Compress/resize on the client (canvas, max 2048px) to save upload time. Upload in parallel to a pre-signed URL, show progress per image, allow cancel. Post is created only after uploads finish.

9. **How would you test infinite scroll?**
   Mock IntersectionObserver in Jest. Test: sentinel visible → fetch called once; no fetch while loading; no fetch when `nextCursor` is null. E2E with Playwright scrolling a real page.

## 8. If you only have 60 seconds

- Feed page = composer, new-posts pill, virtualized list of post cards, backed by a normalized client store.
- `GET /feed?cursor=&limit=20` with cursor pagination, because the feed changes and offset causes duplicates.
- Infinite scroll with IntersectionObserver on a sentinel, 800px `rootMargin`, guarded against double loads.
- Virtualize the list (dynamic heights) so the DOM stays small in long sessions on low-end phones.
- Optimistic likes and posts with rollback on failure.
- New posts via polling/SSE shown as a pill, never auto-inserted while the user reads.
- Images with `srcSet`, width/height to avoid CLS, lazy load below the fold; user text rendered as text to avoid XSS.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarifying questions + requirements | Post types, actions, real-time, devices. Write functional and non-functional lists. |
| 5–12 | Architecture | Draw page, composer, list, store, API client, real-time client. Walk the infinite scroll flow. |
| 12–18 | Data model | `Post`, `User`, `Media`, `FeedState`. Explain normalization. Where each lives. |
| 18–24 | Interface | `GET /feed` with example JSON; cursor vs offset; like and create endpoints. Feed props. |
| 24–40 | Deep dives | Infinite scroll, virtualization, optimistic updates, new posts pill, images. |
| 40–45 | Trade-offs + wrap-up | Polling vs SSE, virtualization vs `content-visibility`. Take follow-ups. |

## Common mistakes

- Jumping to components before defining data/entities and the API shape.
- Using offset pagination for a feed and not seeing the duplicate-posts problem.
- Using the `scroll` event for infinite scroll instead of IntersectionObserver, and not guarding against double fetches.
- Forgetting the DOM grows forever; no virtualization or `content-visibility` plan.
- Auto-inserting new posts at the top so the content jumps while the user reads.
- Storing posts nested inside users (or vice versa), so a like in one place does not update another.

## My mistakes
- [ ]
