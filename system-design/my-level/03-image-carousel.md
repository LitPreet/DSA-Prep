# Image Carousel

> **Difficulty:** Easy · **Asked at:** E-commerce and content companies (Flipkart, Myntra, Meesho, Nykaa, Airbnb, MakeMyTrip), service companies and startups as a first frontend system design round · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Where is it used? Home page hero banner, product image gallery, or both?
  → Assume: a reusable component that works for both.
- How many images?
  → Assume: usually 3–10. Should still work with 50 (product gallery).
- One image per view, or several (like "3 cards visible")?
  → Assume: one per view by default. `slidesPerView` as a stretch goal.
- Which controls? Prev/next arrows, dots, thumbnails?
  → Assume: arrows + dots. Thumbnails optional.
- Autoplay? Loop?
  → Assume: autoplay is optional (off by default), loop is on.
- Touch swipe on mobile?
  → Assume: yes, must have.
- Fixed size or responsive?
  → Assume: responsive. Width fills container, height from aspect ratio (default 16:9).
- Can slides contain more than an image (text, a "Shop now" button)?
  → Assume: yes, a slide can have a caption and a link.

## 1. Requirements

### Functional
- Show one image at a time with smooth slide animation.
- Prev/next buttons. Dots to jump to any slide.
- Swipe left/right on touch devices. Drag with mouse is a nice-to-have.
- Keyboard: Left/Right arrows when the carousel has focus.
- Optional autoplay (e.g. every 5s) with a pause button.
- Optional loop (after last, go to first).
- Optional caption and link per slide.
- Fire `onChange(index)` so the parent can track the current slide.

### Non-functional (performance, accessibility, devices, network)
- **Performance:** animation at 60fps. Only load images that are needed. First image should be fast (it is often the LCP element).
- **Network:** responsive images so phones download small files. Do not download all 10 images on page load.
- **Accessibility:** follows the WAI-ARIA carousel pattern. Autoplay can be paused. Respects `prefers-reduced-motion`.
- **Devices:** desktop (mouse, keyboard), mobile (touch), different screen sizes and pixel densities.
- **No layout shift:** reserve the height before images load (CLS = 0).

### Out of scope
- Image upload / management (CMS).
- Zoom and full-screen lightbox (mention as follow-up).
- 3D or fade effects beyond a basic slide.

## 2. Architecture

```text
+-------------------------------------------------------------+
|                   Carousel (Controller)                     |
|  state: currentIndex, isPlaying, isDragging, dragOffset     |
|  logic: next/prev/goTo, autoplay timer, swipe handling      |
+-------------------------------------------------------------+
     |                |                 |               |
     v                v                 v               v
+-----------+  +---------------+  +-------------+  +-------------+
| Viewport  |  | Prev / Next   |  | Dots        |  | Play/Pause  |
| (overflow |  | buttons       |  | (goTo i)    |  | button      |
|  hidden)  |  +---------------+  +-------------+  +-------------+
|  +-----------------------------------------+
|  | Track (flex row, translateX(-i * 100%)) |
|  | [Slide 0][Slide 1][Slide 2] ... [Slide N]|
|  +-----------------------------------------+
+-----------+
     |
     v
+---------------------------+       +-------------------------+
| Slide -> <img srcset ...> | ----> | Image CDN (resized,     |
| lazy / preload neighbours |       | WebP/AVIF variants)     |
+---------------------------+       +-------------------------+
```

| Component | Responsibility |
|---|---|
| Carousel (Controller) | Owns state and logic. Exposes `next`, `prev`, `goTo`. Runs autoplay timer. Handles swipe. |
| Viewport | Fixed-size window with `overflow: hidden`. Sets the aspect ratio. |
| Track | A flex row of all slides. Moves with `transform: translateX(...)`. |
| Slide | One item: image + optional caption/link. Decides if its image should load. |
| Prev/Next buttons | Call `prev()` / `next()`. Disabled at the ends if `loop` is false. |
| Dots | One button per slide. Shows current slide. Calls `goTo(i)`. |
| Play/Pause | Toggles autoplay. Required for accessibility when autoplay is on. |
| Image CDN | Serves the same image in many widths and modern formats. |

**Data flow when the user clicks "Next":**
1. Next button calls `next()`.
2. Controller computes `newIndex = (currentIndex + 1) % slides.length` (if loop) or clamps to the last.
3. Controller sets `currentIndex`. Calls `onChange(newIndex)`.
4. Track style becomes `transform: translateX(-200%)` (for index 2). CSS transition animates it on the GPU.
5. Slides at `newIndex ± 1` now get `loading="eager"` so the next swipe has an image ready.
6. Live region (only when not autoplaying) announces "Slide 3 of 5".
7. Autoplay timer (if running) resets so the user gets a full 5s on this slide.

## 3. Data model

```ts
type CarouselImage = {
  id: string;
  src: string;            // default URL (e.g. 800px wide)
  srcSet?: string;        // "img_400.webp 400w, img_800.webp 800w, img_1600.webp 1600w"
  alt: string;            // required, describes the image ("" only if purely decorative)
  width: number;          // intrinsic size, used for aspect ratio
  height: number;
  caption?: string;
  href?: string;          // optional link (e.g. banner -> sale page)
  placeholder?: string;   // tiny blurred data URL or dominant colour
};

type CarouselState = {
  currentIndex: number;
  isPlaying: boolean;     // autoplay running
  isPaused: boolean;      // temporarily paused by hover/focus
  isDragging: boolean;
  dragOffsetPx: number;   // how far the finger has moved during a swipe
};
```

| Entity | Lives in | Why |
|---|---|---|
| Image list (banners, product images) | Server (CMS / product API), passed as props | Content changes without a deploy. Carousel itself does not fetch. |
| `currentIndex` | Component state (or controlled by parent via props) | UI state. Parent may control it to sync with thumbnails. |
| `isPlaying`, `isPaused`, drag state | Component state | Short-lived UI state. Drag offset changes every frame, so keep it local (even in a `ref`). |
| Current slide for a product gallery | URL (`?image=3`) — optional | Only if users should share a link to a specific image. Usually not needed. |
| User's "stop autoplay" choice | `localStorage` — optional | Respect the choice on next visit. Small nice-to-have. |

## 4. Interface (API)

### Component API (props of the main component, with types and defaults)

```ts
type CarouselProps = {
  images: CarouselImage[];
  initialIndex?: number;            // default: 0
  index?: number;                   // controlled mode (optional)
  onChange?: (index: number) => void;
  loop?: boolean;                   // default: true
  autoplay?: boolean;               // default: false
  intervalMs?: number;              // default: 5000
  transitionMs?: number;            // default: 300
  aspectRatio?: string;             // default: "16 / 9"
  showArrows?: boolean;             // default: true
  showDots?: boolean;               // default: true
  preloadNeighbours?: number;       // default: 1 (load index-1 and index+1)
  swipeThresholdPx?: number;        // default: 50, or 20% of width
  ariaLabel: string;                // required, e.g. "Featured offers"
  renderSlide?: (img: CarouselImage, isActive: boolean) => React.ReactNode;
};
```

Support both **uncontrolled** (`initialIndex`) and **controlled** (`index` + `onChange`) modes, like `<input>`. Controlled mode lets a product page sync the carousel with a thumbnail strip.

Optionally expose an imperative handle via `ref`: `{ next(), prev(), goTo(i) }`.

### Server API (endpoints, method, params, example JSON response, pagination style and WHY that style)

The carousel is a UI component and does not need its own API. The data comes from the page's API. Example for a home page banner:

`GET /api/banners?placement=home_hero&locale=en-IN`

```json
{
  "items": [
    {
      "id": "b_1",
      "src": "https://cdn.example.com/b_1_w800.webp",
      "srcSet": "https://cdn.example.com/b_1_w400.webp 400w, https://cdn.example.com/b_1_w800.webp 800w, https://cdn.example.com/b_1_w1600.webp 1600w",
      "width": 1600, "height": 900,
      "alt": "Diwali sale: up to 60% off on electronics",
      "href": "/sale/diwali",
      "placeholder": "#c94f2a"
    }
  ]
}
```

**Pagination style: none.** Banners are few (under 10), so return them all in one call. Image bytes are the real cost, not JSON, and we solve that with lazy loading. If a gallery had hundreds of images (e.g. a hotel photo gallery), use **offset pagination** (`?offset=20&limit=20`) because the list is stable and users may jump to "photo 45 of 120". Cursor pagination is for lists that change often, which this is not.

**Image URLs** come from an image CDN that resizes on the fly: `https://cdn.example.com/b_1?w=800&fm=webp&q=75`. So the client can build its own `srcSet`.

## 5. Optimizations and deep dives

### 5.1 Lazy loading and preloading neighbours
Loading all 10 images at once wastes data and slows down the first image.

- Slide 0: load eagerly with `fetchPriority="high"`. It is often the LCP element. Consider `<link rel="preload" as="image" imagesrcset=... imagesizes=...>` in the page head.
- Slides `current ± 1`: load now, so next/prev feels instant.
- All other slides: do not load yet. Note: native `loading="lazy"` does not work well here, because offscreen slides are hidden **horizontally** inside an `overflow: hidden` box and browsers may still load them or never load them. Control it ourselves.

```tsx
function shouldLoad(i: number, current: number, total: number, loop: boolean, n = 1) {
  const dist = Math.abs(i - current);
  const loopDist = loop ? total - dist : Infinity;
  return Math.min(dist, loopDist) <= n;
}

// In Slide: once loaded, keep it loaded (do not unload on navigate away)
const [hasLoaded, setHasLoaded] = useState(false);
useEffect(() => { if (shouldLoad(...)) setHasLoaded(true); }, [current]);

<img src={hasLoaded ? img.src : undefined} srcSet={hasLoaded ? img.srcSet : undefined} ... />
```

- Also start loading the carousel only when it is near the viewport (IntersectionObserver on the whole carousel) if it is far down the page.
- Show `placeholder` colour/blur until the image loads.

### 5.2 Transform-based animation
Animate with `transform`, not `left` or `margin-left`.

- `left` changes layout. The browser must recalculate layout and repaint every frame. Janky on phones.
- `transform` runs on the compositor (GPU). No layout, no paint. Smooth 60fps.

```css
.viewport { overflow: hidden; aspect-ratio: 16 / 9; position: relative; }
.track {
  display: flex;
  height: 100%;
  transition: transform 300ms ease-out;
  will-change: transform;           /* hint, only on the track */
}
.slide { flex: 0 0 100%; }          /* each slide = full viewport width */
.track.dragging { transition: none; } /* follow the finger directly */

@media (prefers-reduced-motion: reduce) {
  .track { transition: none; }      /* jump, no slide */
}
```

```tsx
<div className="track" style={{ transform: `translateX(calc(${-current * 100}% + ${dragOffsetPx}px))` }}>
```

Using `%` means it works at any width without measuring. Alternative: CSS **scroll-snap** (`overflow-x: auto; scroll-snap-type: x mandatory`). Native swipe and momentum for free, very little JS. Downside: harder to do infinite loop and exact autoplay control. Good choice for a product gallery on mobile.

**Infinite loop:** simplest is to animate from last back to first (rewind). For a seamless loop, clone the first slide at the end (and last at the start). After the transition ends on a clone, turn off the transition and jump to the real slide. Mention it, do not code it fully unless asked.

### 5.3 Touch swipe
Use **Pointer Events** (one API for mouse, touch, pen).

```tsx
const startX = useRef(0);
const startY = useRef(0);

function onPointerDown(e: React.PointerEvent) {
  startX.current = e.clientX; startY.current = e.clientY;
  setDragging(true);
  e.currentTarget.setPointerCapture(e.pointerId); // keep getting events outside the element
}
function onPointerMove(e: React.PointerEvent) {
  if (!dragging) return;
  setDragOffset(e.clientX - startX.current); // track follows the finger
}
function onPointerUp(e: React.PointerEvent) {
  const dx = e.clientX - startX.current;
  const threshold = Math.min(50, viewportWidth * 0.2);
  if (dx < -threshold) next();
  else if (dx > threshold) prev();
  setDragOffset(0); setDragging(false); // snap to the slide
}
```

Details that matter:
- `touch-action: pan-y` on the viewport. Browser handles vertical scroll; we handle horizontal. Without it, the page cannot scroll when the finger starts on the carousel.
- Decide direction in the first ~10px: if `|dy| > |dx|`, it is a page scroll, ignore it.
- Also use **velocity**: a quick flick of 20px should still change slide.
- Add resistance at the ends when `loop` is false (move only 30% of the drag).
- Block the click on a link slide if the user dragged more than 5px (otherwise a swipe opens the link).
- Drag offset updates every frame. Use a `ref` + `requestAnimationFrame` and write `style.transform` directly to avoid a React re-render on every move.

### 5.4 Autoplay and pause rules
Autoplay is a common accessibility failure. WCAG 2.2.2 says moving content that lasts more than 5s must have a way to pause it.

Rules:
- Off by default. If on, interval 5–7s.
- Show a visible **Pause/Play** button. It is the first control in tab order.
- **Pause** on mouse hover, on keyboard focus inside the carousel, and while the user is swiping.
- **Stop permanently** (until Play is pressed) once the user clicks arrows/dots — they took control.
- Pause when the tab is hidden (`visibilitychange`) and when the carousel is offscreen (IntersectionObserver).
- No autoplay if `prefers-reduced-motion: reduce`.
- Reset the timer after any manual change.

```tsx
useEffect(() => {
  if (!isPlaying || isPaused || reducedMotion) return;
  const id = setTimeout(next, intervalMs); // setTimeout, re-armed on each index change
  return () => clearTimeout(id);
}, [isPlaying, isPaused, currentIndex, intervalMs]);
```

Using `setTimeout` keyed on `currentIndex` (not `setInterval`) means every slide change resets the timer automatically.

### 5.5 ARIA carousel pattern
```tsx
<section aria-roledescription="carousel" aria-label="Featured offers">
  <button onClick={togglePlay} aria-label={isPlaying ? 'Stop slide rotation' : 'Start slide rotation'} />
  <button onClick={prev} aria-label="Previous slide" />
  <button onClick={next} aria-label="Next slide" />

  <div aria-live={isPlaying ? 'off' : 'polite'}> {/* do not announce during autoplay */}
    {images.map((img, i) => (
      <div key={img.id} role="group" aria-roledescription="slide"
           aria-label={`${i + 1} of ${images.length}`}
           aria-hidden={i !== current} inert={i !== current ? '' : undefined}>
        <img alt={img.alt} ... />
      </div>
    ))}
  </div>

  <div role="tablist" aria-label="Choose slide">
    {images.map((_, i) => (
      <button key={i} role="tab" aria-selected={i === current}
              aria-label={`Slide ${i + 1}`} onClick={() => goTo(i)} />
    ))}
  </div>
</section>
```

- Hidden slides get `aria-hidden` and `inert` so links inside them are not tabbable.
- Keyboard: Left/Right arrows when focus is on the carousel (or on the dots tablist). Buttons work with Enter/Space natively because they are real `<button>`s.
- Visible focus ring on all controls. Arrows at least 44x44px. Good contrast over images (add a semi-transparent background).

### 5.6 Responsive images (srcset)
```tsx
<img
  src={img.src}
  srcSet={img.srcSet}
  sizes="(max-width: 768px) 100vw, 800px"
  width={img.width}
  height={img.height}
  alt={img.alt}
  decoding="async"
  draggable={false}   // stop the browser's native image drag during swipe
/>
```

- `srcSet` lists widths (400w, 800w, 1600w). `sizes` tells the browser how wide the image will show. Browser picks the best file, considering pixel density (a 2x phone at 375px picks 800w).
- Use `<picture>` for **art direction**: a different crop for mobile (square) vs desktop (wide banner).
- Serve AVIF/WebP with JPEG fallback (via `<picture>` or CDN `Accept` header).
- `width`/`height` or CSS `aspect-ratio` reserve space: no layout shift.
- Compress: quality ~75. A 1600px hero should be under ~200 KB.

### Also mention
- **Network:** image CDN with resizing and caching (`Cache-Control: max-age=31536000, immutable` with hashed URLs). Respect `navigator.connection.saveData`: preload 0 neighbours, lower quality.
- **Rendering:** for 50+ images, render only `current ± 2` slides in the DOM (virtual track). `React.memo` on Slide so changing index re-renders only affected slides.
- **Accessibility:** meaningful `alt` text from the CMS (required field); captions as real text, not baked into the image (so screen readers and translation work).
- **Security (XSS):** captions and `href` come from a CMS. Render caption as text. Allow only `http(s)` or relative URLs in `href` (block `javascript:`).
- **i18n:** in RTL (`dir="rtl"`), "next" goes left: flip the translate sign and the arrow icons, and swap arrow key meaning. Labels ("Slide 1 of 5") translated.
- **Offline:** not usually needed. A Service Worker can cache the hero images for repeat visits.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Animation | `transform: translateX` + JS state | CSS scroll-snap | Transform for a banner with autoplay and loop (full control). Scroll-snap for a simple mobile product gallery (native feel, less JS). |
| Loading images | Load all upfront | Load current ± 1, rest on demand | Current ± 1. Saves data, makes first image faster; neighbours keep navigation instant. |
| Loop | Rewind (last → first animates back) | Clone slides for seamless loop | Rewind for MVP (simple, no duplicate content for screen readers). Clones if design needs seamless. |
| Autoplay | On by default | Off by default | Off. Better accessibility and users miss content anyway. If business needs it, add pause rules. |
| State control | Uncontrolled only | Controlled + uncontrolled | Both. Uncontrolled is easy; controlled lets parent sync thumbnails. |
| Swipe events | Touch events | Pointer events | Pointer events: one code path for mouse, touch, pen. |
| Build vs library | Swiper / Embla | Build own | Library (Embla is small and accessible) in real work; build own in the interview to show understanding. |

## 7. Likely follow-up questions

1. **How would you show 3 slides at once on desktop and 1 on mobile?**
   `slidesPerView` prop driven by a media query or `ResizeObserver`. Slide width = `100% / slidesPerView`, translate by `-(current * 100 / slidesPerView)%`. Dots count = `ceil(total / slidesPerView)` if moving by a page.

2. **How do you add thumbnails below a product gallery?**
   Use controlled mode: parent holds `index`, passes it to both carousel and thumbnail strip. Thumbnails are tiny images (`?w=100`), and the active one scrolls into view with `scrollIntoView({ inline: 'nearest' })`.

3. **How would you add a full-screen zoom view?**
   Open a modal (`<dialog>`) with the same carousel in controlled mode. Load the high-res image only when opened. Support pinch zoom via `touch-action` and pointer events, or a library. Trap focus inside and restore on close.

4. **Why not use `left` for animation?**
   `left` triggers layout + paint every frame. `transform` is handled by the compositor, so it stays at 60fps even on weak phones.

5. **The first banner image is slow. How do you fix LCP?**
   `fetchPriority="high"`, preload in `<head>` with `imagesrcset`, right-sized via `srcSet`, AVIF/WebP, served from CDN, and SSR the first slide so the `<img>` is in the HTML. Do not lazy-load it. Do not hide it behind JS hydration.

6. **How do you test it?**
   Unit: `next/prev/goTo` with loop on/off, autoplay with fake timers (pauses on hover/focus). RTL tests: buttons have labels, hidden slides not focusable. Playwright for swipe. Lighthouse/axe for a11y and CLS.

7. **What happens if an image fails to load?**
   `onError` → show a placeholder with the alt text, keep the slide so the count is correct. Optionally retry once.

8. **How do you handle window resize?**
   With `%`-based transforms there is nothing to recompute. If using pixel values, recompute on `ResizeObserver` and disable the transition during resize so it does not animate.

## 8. If you only have 60 seconds

- Reusable component: viewport with `overflow: hidden`, a flex track moved with `translateX(-index * 100%)`, arrows, dots, and optional play/pause.
- Animate with `transform` (GPU, 60fps), not `left`; respect `prefers-reduced-motion`.
- Load first image eagerly with high priority (LCP), preload neighbours, load the rest on demand.
- Responsive images with `srcSet` + `sizes` and width/height for zero layout shift.
- Swipe with pointer events, `touch-action: pan-y`, a 50px/20% threshold plus velocity.
- Autoplay off by default; if on, 5s interval, pause on hover/focus/hidden tab, and a visible pause button.
- ARIA carousel pattern: `aria-roledescription`, labelled slides, hidden slides `inert`, live region off during autoplay.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarifying questions + requirements | Use cases, image count, controls, autoplay/loop, touch. Write functional and non-functional lists. |
| 5–12 | Architecture | Draw controller, viewport, track, slides, controls, CDN. Walk the "Next" click flow. |
| 12–16 | Data model | `CarouselImage` with width/height/alt/srcSet; component state. Where each lives. |
| 16–22 | Interface | Props with defaults, controlled vs uncontrolled. Banners API and why no pagination. |
| 22–40 | Deep dives | Lazy load + preload, transform animation, swipe, autoplay rules, ARIA, srcset. |
| 40–45 | Trade-offs + wrap-up | Transform vs scroll-snap, loop approach, library vs build. Follow-ups. |

## Common mistakes

- Jumping to components before defining data/entities (forgetting `alt`, `width`, `height` on the image model).
- Animating `left`/`margin-left` instead of `transform`, causing jank.
- Loading all images upfront, or lazy-loading the first image (hurts LCP).
- Autoplay with no pause button and no pause on hover/focus (WCAG failure).
- Forgetting `touch-action: pan-y`, so users cannot scroll the page when their finger starts on the carousel.
- Leaving hidden slides focusable, so Tab jumps into invisible links.

## My mistakes
- [ ]
