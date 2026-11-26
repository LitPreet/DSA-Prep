# Photo sharing feed with masonry layout (e.g. Pinterest)

> **Difficulty:** Medium · **Asked at:** product companies with image-heavy feeds (Pinterest, Meesho, Myntra, Swiggy/Zomato for menus, ShareChat), and GreatFrontEnd-style rounds at mid/large startups · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Is this only the home feed, or also pin detail, search and boards?
  → Assume: home feed + opening a pin in a modal. Search and boards are out of scope.
- Images only, or also videos/GIFs?
  → Assume: images only. Mention that videos would need autoplay-on-visible logic.
- Which devices? Desktop and mobile web?
  → Assume: both. Column count changes with screen width (2 on mobile, up to 6–7 on wide desktop).
- Is the feed personalised and endless?
  → Assume: yes, infinite scroll, ordered by the server's ranking. Client does not sort.
- Can the user interact with pins in the feed?
  → Assume: hover shows "Save" button and a link. Save is the main action.
- Is SEO needed?
  → Assume: logged-in home feed does not need SEO. Pin detail pages do (but out of scope here).
- How many pins could a user scroll through in one session?
  → Assume: power users scroll 500–1000+ pins. So memory and DOM size matter.

## 1. Requirements

### Functional
- Show a feed of image pins in a masonry layout (fixed column width, variable height).
- Load more pins when the user nears the bottom (infinite scroll).
- Each pin shows the image, optional title, and author avatar/name.
- Hover (desktop) or tap (mobile) shows actions: Save, Share, open link.
- Click a pin to open a detail view (modal on desktop, new page on mobile).
- Coming back from detail keeps the scroll position in the feed.

### Non-functional (performance, accessibility, devices, network)
- **Performance:** first pins visible in under 2.5s on a mid-range Android on 4G (LCP < 2.5s). No layout shift when images load (CLS < 0.1). Scrolling at 60fps even after 1000 pins.
- **Images:** serve the right size for the column width and device pixel ratio. Use modern formats (WebP/AVIF).
- **Accessibility:** every image has meaningful `alt` text. Feed is keyboard navigable. Use `role="feed"` with `aria-busy` while loading. Visible focus ring.
- **Devices:** responsive columns. Touch friendly targets (min 44×44px).
- **Network:** works on slow 3G with placeholders. Retry failed page loads. Show an error row with a "Retry" button.

### Out of scope
- Uploading/creating pins, boards, search, comments, notifications, recommendation algorithm, ads.

## 2. Architecture

```text
+------------------------------------------------------------------+
|                         Browser (React app)                      |
|                                                                  |
|  +-------------+    +----------------------------------------+   |
|  |   Router    |--->|              FeedPage                  |   |
|  +-------------+    |  +----------------------------------+  |   |
|                     |  |        MasonryGrid               |  |   |
|                     |  |  (layout engine + virtualizer)   |  |   |
|                     |  |   +--------+ +--------+          |  |   |
|                     |  |   |PinCard | |PinCard | ...      |  |   |
|                     |  |   +--------+ +--------+          |  |   |
|                     |  +----------------------------------+  |   |
|                     |  [ Sentinel -> IntersectionObserver ]  |   |
|                     +----------------------------------------+   |
|                                   |  ^                           |
|                                   v  |                           |
|                     +----------------------------+               |
|                     |  Feed Store (React Query / |               |
|                     |  useInfiniteQuery cache)   |               |
|                     +----------------------------+               |
|                                   |  ^                           |
+-----------------------------------|--|---------------------------+
                                    v  |
                    +------------------------------+     +-------------+
                    |   API server  /api/feed      |     |  Image CDN  |
                    +------------------------------+     | (resize,    |
                                                         |  WebP/AVIF) |
                                                         +-------------+
```

| Component | Responsibility |
|---|---|
| FeedPage | Page shell. Owns the infinite query. Renders grid, loader, error row. |
| MasonryGrid | Measures container width, decides column count, computes x/y of every pin, renders only visible pins. |
| PinCard | Renders one pin: image with placeholder, title, author, hover actions. |
| Sentinel + IntersectionObserver | Triggers `fetchNextPage()` when the user is ~1–2 screens from the bottom. |
| Feed Store (React Query) | Caches pages by cursor, dedupes requests, keeps data when user goes to detail and comes back. |
| Image CDN | Returns resized images by URL params (width, format). Long cache headers. |
| PinDetailModal | Opens on click, URL changes to `/pin/:id` so it can be shared and back button works. |

**Main flow: user opens the feed and scrolls**
1. FeedPage mounts and calls `GET /api/feed?limit=30`.
2. Response has pins with `width` and `height` of each image. No need to wait for images.
3. MasonryGrid reads container width → picks column count (e.g. 5) → column width ~236px.
4. Layout engine places each pin in the shortest column and stores `{x, y, height}`.
5. Virtualizer renders only pins whose `y` range is within viewport ± 1 screen buffer.
6. Images load lazily. A dominant-colour or blur placeholder shows first.
7. When the sentinel comes near the viewport, fetch next page with `cursor`. New pins are appended to the layout (old positions do not change).

## 3. Data model

```ts
type Image = {
  url: string;            // base CDN URL, we add ?w=&fmt= ourselves
  width: number;          // original width in px
  height: number;         // original height in px
  dominantColor: string;  // "#d9c7b0" for placeholder background
  blurHash?: string;      // tiny encoded preview (~30 chars)
};

type Author = {
  id: string;
  name: string;
  avatarUrl: string;
};

type Pin = {
  id: string;
  title?: string;
  altText: string;
  image: Image;
  author: Author;
  link?: string;          // outbound URL
  isSaved: boolean;
};

type FeedPage = {
  pins: Pin[];
  nextCursor: string | null;   // null = no more pins
};

// Client-only: computed by layout engine, never sent to server
type PinPosition = {
  id: string;
  column: number;
  x: number;
  y: number;
  height: number;   // rendered height = colWidth * (h / w) + footer height
};
```

| Entity | Lives in | Why |
|---|---|---|
| Pin, Author, Image | Server; cached in client store (React Query pages) | Server is source of truth. Cache so back navigation is instant. |
| nextCursor | Client store (with the page) | Needed to fetch the next page. |
| PinPosition[] and column heights | Component state / ref inside MasonryGrid | Derived data. Depends on screen width. Recomputed on resize. |
| Scroll offset | Session storage / router state | Restore position when user comes back from a pin. |
| Open pin id | URL (`/pin/:id`) | Shareable, back button closes modal. |
| Hover state, image loaded flag | PinCard component state | Purely local UI. |
| isSaved | Server + optimistic update in client store | Fast feedback, rollback on error. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
type MasonryGridProps<T> = {
  items: T[];
  getItemHeight: (item: T, columnWidth: number) => number; // from width/height
  renderItem: (item: T, pos: PinPosition) => React.ReactNode;
  minColumnWidth?: number;     // default 236
  gap?: number;                // default 16
  overscanPx?: number;         // default 1 viewport height
  onNearEnd?: () => void;      // called when last rendered pin is close
};

type PinCardProps = {
  pin: Pin;
  width: number;               // column width, used for srcset sizes
  priority?: boolean;          // true for first ~6 pins (no lazy load)
  onOpen: (id: string) => void;
  onSave: (id: string) => void;
};
```

Keep `MasonryGrid` generic. It should not know what a "pin" is. That makes it reusable and easy to test.

### Server API (endpoints, method, params, example JSON response, pagination style and WHY)

**GET `/api/feed?cursor=<opaque>&limit=30`**

```json
{
  "pins": [
    {
      "id": "p_8823",
      "title": "Minimal living room",
      "altText": "White sofa with green plants near a window",
      "image": {
        "url": "https://img.cdn.com/p/8823.jpg",
        "width": 736,
        "height": 1104,
        "dominantColor": "#e4ddd3",
        "blurHash": "LKO2?U%2Tw=w]~RBVZRi};RPxuwH"
      },
      "author": { "id": "u_12", "name": "Riya", "avatarUrl": "https://img.cdn.com/u/12.jpg" },
      "link": "https://example.com/living-room",
      "isSaved": false
    }
  ],
  "nextCursor": "eyJzY29yZSI6MC44MiwiaWQiOiJwXzg4MjMifQ"
}
```

**Why cursor pagination, not offset?** The feed is ranked and changes all the time. With `?page=3`, if new pins are added at the top, the user sees duplicates or misses pins. A cursor says "give me items after this one", so it is stable. It is also faster on the database for deep pages.

**Why include width/height?** Without them we can't place the pin until the image downloads. That causes layout shift and jumping columns.

**POST `/api/pins/:id/save`** → body `{ "boardId": "b_1" }` → `200 { "isSaved": true }`
**DELETE `/api/pins/:id/save`** → `200 { "isSaved": false }`

**GET `/api/pins/:id`** → full pin detail (description, comments count, related pins cursor).

Image URLs: `https://img.cdn.com/p/8823.jpg?w=236&fmt=webp&q=75` — CDN resizes on the fly and caches the result.

## 5. Optimizations and deep dives

### 5.1 Masonry layout algorithm (shortest-column placement)

CSS-only options and why they fall short:
- **CSS columns** (`column-count`) fill top-to-bottom per column. Order goes down column 1, then column 2. Ranking order is broken, and adding a new page reshuffles everything.
- **CSS Grid `masonry`** is not supported in all browsers yet.
- **Flexbox** can't do it without fixed heights.

So we do it in JS with absolute positioning:

```ts
function layout(pins: Pin[], colCount: number, colWidth: number, gap: number) {
  const colHeights = new Array(colCount).fill(0);
  const positions: PinPosition[] = [];

  for (const pin of pins) {
    // pick the shortest column
    let col = 0;
    for (let i = 1; i < colCount; i++) {
      if (colHeights[i] < colHeights[col]) col = i;
    }
    const imgH = Math.round(colWidth * (pin.image.height / pin.image.width));
    const height = imgH + FOOTER_HEIGHT; // title + author row, fixed ~56px
    positions.push({ id: pin.id, column: col, x: col * (colWidth + gap), y: colHeights[col], height });
    colHeights[col] += height + gap;
  }
  return { positions, totalHeight: Math.max(...colHeights) };
}
```

Key points to say:
- It is O(n × columns). With 7 columns and 1000 pins that is 7000 steps — trivial.
- **Incremental:** when page 2 arrives, keep `colHeights` from page 1 and only place the new pins. Old pins never move.
- **Only recompute everything on resize** when column count changes. Debounce resize (~150ms) or use `ResizeObserver`.
- Column count: `colCount = Math.max(2, Math.floor((containerWidth + gap) / (minColWidth + gap)))`.
- Each card uses `position: absolute; transform: translate(x, y)`. Transform is cheaper than `top/left` and doesn't trigger layout for siblings.
- Footer with variable title length? Clamp title to 2 lines with `-webkit-line-clamp` so footer height is predictable. If it truly varies, measure once after render and re-layout only that column below it.

### 5.2 Avoiding layout shift (CLS)

- Server sends `width` and `height`. We know the box size before the image loads.
- Give the `<img>` `width` and `height` attributes, or a wrapper with `aspect-ratio: 736 / 1104`.
- Background of the box = `dominantColor`. The user sees coloured blocks right away, which feels fast.
- Never insert content above already-visible pins (e.g. "new pins" banner should be a floating pill, not pushing content).

### 5.3 Virtualization for masonry

After 1000 pins, rendering all means 1000+ DOM nodes with images. Memory grows and scroll gets janky on phones.

Normal list virtualizers (react-window) assume rows. Masonry is different: items are in columns with different y values. But since we already computed `{y, height}` for every pin, we can filter:

```ts
const visible = positions.filter(
  p => p.y + p.height > scrollTop - overscan && p.y < scrollTop + viewportH + overscan
);
```

- For speed, keep positions per column sorted by `y` (they already are) and binary search each column for the start index. Cost O(columns × log n).
- The container has `height: totalHeight` so the scrollbar is correct.
- Use window scroll (not an inner scroll div) so mobile browser chrome hides on scroll and native feel is kept.
- Throttle scroll handling with `requestAnimationFrame`.
- Overscan of ~1 viewport above and below so fast scroll doesn't show blanks.
- Libraries: `masonic` or TanStack Virtual with custom lanes. Good to mention, but show you understand the logic.

Trade-off: virtualized items are removed from the DOM, so Ctrl+F browser search and screen readers can't see off-screen pins. With `role="feed"` and `aria-setsize="-1"` (unknown total) plus `aria-posinset`, screen readers still get context.

### 5.4 Images: responsive, lazy and progressive

```tsx
<img
  src={`${url}?w=236&fmt=webp`}
  srcSet={`${url}?w=236&fmt=webp 236w, ${url}?w=474&fmt=webp 474w, ${url}?w=736&fmt=webp 736w`}
  sizes="(max-width: 600px) 50vw, 236px"
  width={pin.image.width}
  height={pin.image.height}
  alt={pin.altText}
  loading={priority ? 'eager' : 'lazy'}
  fetchPriority={priority ? 'high' : 'auto'}
  decoding="async"
/>
```

- `srcset` + `sizes` lets the browser pick 474w on a 2x screen, 236w on 1x. Saves 50–70% bytes vs sending 736w to everyone.
- Use `<picture>` with AVIF → WebP → JPEG fallback, or let the CDN choose by `Accept` header.
- **Blur-up:** show `dominantColor` instantly, then a decoded BlurHash (20×30 canvas), then fade in the real image on `onLoad` (200ms opacity transition).
- First 6–10 pins (above the fold): `loading="eager"` and `fetchPriority="high"` for good LCP. The rest lazy.
- `<link rel="preconnect" href="https://img.cdn.com">` in the HTML head saves ~100–300ms on the first image.
- CDN cache headers: `Cache-Control: public, max-age=31536000, immutable` since image URLs are content-addressed.

### 5.5 Infinite scroll and state restoration

```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam }) => getFeed(pageParam),
  getNextPageParam: last => last.nextCursor ?? undefined,
  staleTime: 5 * 60_000,
});

useEffect(() => {
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, { rootMargin: '1500px 0px' }); // start ~2 screens early
  if (sentinelRef.current) io.observe(sentinelRef.current);
  return () => io.disconnect();
}, [hasNextPage, isFetchingNextPage]);
```

- `rootMargin: 1500px` prefetches before the user hits the bottom. On slow networks, increase it.
- Guard against double fetch with `isFetchingNextPage`.
- Dedupe pins by id when merging pages (ranking may repeat a pin).
- **Back navigation:** pin detail opens as a modal on top of the feed (feed stays mounted), so scroll is untouched. On mobile where detail is a full page, cache pages in React Query and save `scrollY` in `sessionStorage`; restore after layout runs.
- Cap memory: if user has 2000+ pins, drop the oldest pages from the cache (keep positions as empty spacers).
- Error: show an inline "Couldn't load more. Retry" row. Don't wipe existing pins.

### 5.6 Save action (optimistic update)

- Click Save → immediately flip `isSaved` in the cache → send POST → on failure, revert and show a toast.
- Disable double clicks while pending (or make the API idempotent so double clicks are harmless).

### Also mention
- **Accessibility:** `role="feed"` container, each pin is an `<article>` with `aria-labelledby` title. Hover actions must also appear on keyboard focus (`:focus-within`). Modal traps focus and returns it to the pin on close. Respect `prefers-reduced-motion` for fade-ins.
- **Keyboard order vs visual order:** DOM order should follow the ranking order (not column order), so Tab goes in the "reading" order.
- **Security:** outbound `link` uses `rel="noopener noreferrer"`. Titles are text, never `dangerouslySetInnerHTML`.
- **Analytics:** impression tracking with IntersectionObserver (pin 50% visible for 1s), batched and sent with `navigator.sendBeacon`.
- **Data saver:** if `navigator.connection.saveData` is true, use lower quality images (`q=50`) and smaller prefetch margin.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Layout method | CSS columns | JS absolute positioning | JS. Keeps ranking order, stable on append, and gives us positions for virtualization. |
| Image size known | Measure after load | Width/height from API | API. Zero layout shift, layout can run before images load. |
| Pagination | Offset (`page=3`) | Cursor | Cursor. Feed changes constantly; offset gives duplicates/gaps. |
| Load more trigger | "Load more" button | Infinite scroll | Infinite scroll for discovery feeds. Add button fallback after errors. Footer links go in a menu since footer is unreachable. |
| Rendering | Render all pins | Virtualize | Virtualize once lists exceed ~200 pins. Costs a11y/Ctrl+F; handle with `role="feed"`. |
| Rendering strategy | SSR | CSR | CSR for logged-in feed (no SEO, personalised). Server-render the app shell only. SSR for public pin pages. |
| Placeholder | Dominant colour | BlurHash | Both: colour is free (1 field), BlurHash adds polish for ~30 bytes. |
| Pin detail | New page | Modal with URL change | Modal on desktop (keeps feed state), page on mobile. |

## 7. Likely follow-up questions

**Q: What happens when the window is resized?**
Use `ResizeObserver` on the container. If column count stays the same, scale x positions only. If it changes, re-run full layout (cheap, ~1ms for 1000 pins). Keep the pin that was at the top of the viewport in view after re-layout.

**Q: The title length varies. How do you know card height?**
Clamp to 2 lines, so footer is one of 2–3 known heights. Calculate from character count, or render off-screen once and measure. Worst case, measure after mount and re-layout only items below in that column.

**Q: How would you support videos?**
API sends video width/height and poster image. Render poster first. Autoplay muted only when ≥50% visible (IntersectionObserver), pause when not. Only one or two videos play at once to save CPU and data.

**Q: How do you avoid fetching the same page twice?**
React Query dedupes by key. The IntersectionObserver callback checks `isFetchingNextPage`. Pins are also deduped by id when merging.

**Q: How do you measure if this is fast?**
Real user monitoring with `web-vitals` lib: LCP, CLS, INP. Custom metric: time to first 10 images loaded. Track long tasks during scroll. Lab tests in Lighthouse with 4x CPU throttle.

**Q: Why not just use `react-window`?**
It is built for rows/grids with uniform row structure. Masonry needs per-column positions. You can use TanStack Virtual "lanes" or `masonic`, or write the small filter shown above.

**Q: How would you make the first load faster?**
Server-render the shell and inline the first page of pin data in the HTML (or stream it). Preconnect to CDN. Eager-load the first ~6 images with `fetchPriority="high"`. Code-split the modal and everything not needed on first paint.

**Q: How does the feed behave offline?**
Show cached pages from React Query (persisted to IndexedDB if needed) and a "You're offline" banner. Stop infinite scroll, retry when the `online` event fires.

## 8. If you only have 60 seconds

- Cursor-paginated feed API that returns image width, height and dominant colour for each pin.
- JS masonry: place each pin in the shortest column, absolute positions with `transform`. Incremental on new pages, full re-layout only when column count changes.
- Because we know every position, virtualize by y-range so 1000+ pins stay smooth.
- Images: CDN resize, `srcset`/`sizes`, WebP/AVIF, lazy below the fold, eager + high priority above it, colour/blur placeholder → zero CLS.
- Infinite scroll with IntersectionObserver and a 1–2 screen prefetch margin; dedupe and retry row on error.
- Pin detail as a modal with its own URL so the feed stays mounted and scroll is kept.
- A11y: `role="feed"`, alt text, actions visible on focus, DOM order = ranking order.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Scope (feed + detail), devices, images vs video, scale of scrolling |
| 4–8 | Requirements | Functional list, CLS/LCP targets, a11y, out of scope |
| 8–14 | Architecture | Box diagram, component table, main flow |
| 14–19 | Data model + API | Pin type with width/height, cursor pagination and why |
| 19–38 | Deep dives | Masonry algorithm (code), virtualization, images, infinite scroll |
| 38–43 | Trade-offs | CSS columns vs JS, cursor vs offset, virtualize or not |
| 43–45 | Wrap-up | 60-second summary, mention a11y and analytics |

## Common mistakes

- Jumping to components before defining data/entities — especially forgetting that the API must send image dimensions.
- Using CSS `column-count` and not noticing it breaks ranking order and reshuffles on append.
- Measuring images after they load, which causes columns to jump (bad CLS).
- Saying "I'll use infinite scroll" without talking about DOM size, memory and virtualization.
- Sending one large image to every device instead of `srcset` + CDN resizing.
- Forgetting scroll restoration when the user comes back from a pin.

## My mistakes
- [ ]
