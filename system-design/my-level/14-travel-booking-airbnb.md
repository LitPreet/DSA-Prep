# Travel Booking Site (e.g. Airbnb): search, listing page, map, booking

> **Difficulty:** Hard · **Asked at:** travel and marketplace companies (MakeMyTrip, Goibibo, OYO, Booking/Agoda-style), big tech product rounds, and any company with a search + map + checkout product (real estate like NoBroker, Housing.com) · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Which flows matter most: search, listing page, booking, host side? → Assume: guest side only — search results with map, listing detail page, and booking/checkout.
- Is SEO important? → Assume: yes, very. Listing pages and city search pages ("Stays in Goa") bring a lot of free Google traffic.
- Web only or also mobile? → Assume: responsive web, ~65% traffic on mobile.
- Do we support multiple countries, languages and currencies? → Assume: yes. Prices shown in the user's currency, a few languages including one RTL (Arabic).
- How fresh must availability and price be? → Assume: search results can be ~1 minute stale; the final price and availability must be checked by the server at booking time.
- Instant book or host approval? → Assume: instant book. Request-to-book is a follow-up.
- Payment provider? → Assume: third-party (Stripe/Razorpay) hosted fields. We never touch card numbers.
- How many results per search? → Assume: thousands per city; show 20 per page, up to ~300 pins on the map.

## 1. Requirements

### Functional

- **Search:** location, check-in/check-out dates, number of guests. Filters: price range, property type, rooms, amenities, instant book.
- **Results page:** list of listing cards (photo carousel, title, rating, price per night, total price) + interactive map with price pins. Moving the map updates results ("Search as I move the map").
- **Listing page:** photo gallery, description, amenities, host info, reviews, availability calendar, location map, sticky booking widget with price breakdown.
- **Booking:** pick dates and guests → review price → pay → confirmation.
- **Wishlist:** heart a listing (logged-in).

### Non-functional (performance, accessibility, devices, network)

- **SEO:** listing and city pages fully server-rendered with real HTML, title, meta, structured data (JSON-LD).
- **Performance:** listing page LCP under 2.5 s on 4G mobile (LCP is the hero photo). Search filter change → new results in under 1 s. Map pan stays 60 fps.
- **Correctness:** never double-book. Price shown at checkout must equal the price charged.
- **Accessibility:** date picker fully keyboard-usable; map has a list alternative; filters are real form controls; WCAG AA contrast.
- **i18n:** currency, date formats, number formats, RTL layout.
- **Devices:** mobile first. On mobile the map is a separate toggle view; on desktop list and map are side by side.

### Out of scope

- Host dashboard and listing creation.
- Messaging between guest and host.
- Search ranking algorithm.
- Reviews writing flow, cancellations and refunds.
- Experiences / flights.

## 2. Architecture

```text
                +-----------------------------------------+
                |              CDN / Edge                 |
                |  cached HTML for listing + city pages   |
                |  images (resized WebP/AVIF)             |
                +-------------------+---------------------+
                                    |
                +-------------------v---------------------+
                |   Next.js server (SSR / ISR)            |
                |   renders /s/:city, /rooms/:id          |
                +-------------------+---------------------+
                                    | hydrate
+-----------------------------------v----------------------------------+
|                          Browser (React)                             |
|                                                                      |
|  +---------------------+   +-------------------------------------+   |
|  | SearchBar           |   | Search Results Page                 |   |
|  | (location autocompl,|-->|  FiltersBar  <-> URL search params  |   |
|  |  DateRangePicker,   |   |  ResultsList (cards)  <-> MapView   |   |
|  |  GuestPicker)       |   |       (hover sync, bounds search)   |   |
|  +---------------------+   +-------------------------------------+   |
|                                                                      |
|  +-------------------------------+   +----------------------------+  |
|  | Listing Page                  |   | Checkout Page              |  |
|  |  Gallery, Amenities, Reviews  |-->|  PriceSummary (server)     |  |
|  |  AvailabilityCalendar         |   |  Payment iframe (Stripe)   |  |
|  |  BookingWidget (sticky)       |   |  Confirm -> poll status    |  |
|  +-------------------------------+   +----------------------------+  |
|                                                                      |
|   Client store: React Query (search results, listing, quote)         |
|   URL: all search + filter state                                     |
+-----------------------------------+----------------------------------+
                                    | REST/JSON
               +--------------------v----------------------+
               | API: search, listings, availability,     |
               | quote, holds, bookings, payments webhook |
               +-------------------------------------------+
```

| Component | Responsibility |
|---|---|
| CDN / Edge | Caches SSR HTML for public pages and all images. |
| Next.js server | SSR/ISR for SEO pages; streams HTML. |
| SearchBar | Location autocomplete, date range picker, guests. Pushes to URL. |
| FiltersBar | Price, type, amenities. Reads/writes URL params. |
| ResultsList | Paginated listing cards with photo carousel. |
| MapView | Price pins, clustering, emits bounds when moved. Lazy-loaded. |
| Listing Page | Gallery, details, reviews, availability calendar. |
| BookingWidget | Dates + guests + live price quote from server. |
| Checkout Page | Final quote, hold, payment, confirmation. |
| API | Search, availability, quote (price math), holds, bookings. |

**Main user action — search and filter:**

1. User lands on `/s/goa?checkin=2026-12-20&checkout=2026-12-23&guests=2`. Server renders the first 20 results + JSON for the map pins. CDN can cache this for logged-out users for ~60 s.
2. Browser hydrates. The map library loads lazily after first paint.
3. User changes a filter (e.g. "Price ≤ ₹5,000"). We update the URL with `router.replace` (no new history entry for every slider move).
4. React Query key = the URL params. A new key triggers `GET /search?...`. The old results stay on screen, slightly faded (`keepPreviousData`), until new ones arrive.
5. Response updates list and map pins together.
6. User drags the map → after 400 ms of no movement, we send the new map bounds as a filter → step 4 again.

## 3. Data model

```ts
type Money = { amountMinor: number; currency: string }; // 450000 + "INR" = ₹4,500.00. Integers, never floats.

type ListingSummary = {          // for cards and map pins
  id: string;
  title: string;
  photos: Photo[];               // first 5 only for carousel
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number;
  nightlyPrice: Money;
  totalPrice: Money | null;      // only if dates selected
  isSuperhost: boolean;
  isWishlisted: boolean;
};

type Photo = { url: string; width: number; height: number; alt: string; blurDataUrl: string };

type ListingDetail = ListingSummary & {
  description: string;
  amenities: { code: string; label: string }[];
  host: { id: string; name: string; avatarUrl: string; joinedYear: number };
  maxGuests: number;
  bedrooms: number;
  houseRules: string[];
  minNights: number;
  timezone: string;              // "Asia/Kolkata" - dates are in the listing's timezone
};

type Availability = {
  listingId: string;
  days: { date: string; available: boolean; price: Money; minNights?: number }[]; // "2026-12-20"
};

type SearchParams = {
  location: string;
  checkin?: string;              // ISO date only, no time
  checkout?: string;
  guests: number;
  priceMin?: number;
  priceMax?: number;
  types?: string[];
  amenities?: string[];
  bounds?: { ne: [number, number]; sw: [number, number] };
  cursor?: string;
};

type Quote = {
  quoteId: string;               // server-signed, expires in 15 min
  listingId: string;
  checkin: string;
  checkout: string;
  guests: number;
  lines: { label: string; amount: Money }[]; // "₹4,500 x 3 nights", "Cleaning fee", "Service fee", "Taxes"
  total: Money;
  expiresAt: string;
};

type Booking = {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'failed' | 'expired';
  quote: Quote;
};
```

| Entity | Lives in | Why |
|---|---|---|
| SearchParams (location, dates, filters, bounds) | URL | Shareable, bookmarkable, back button works, SSR can read it, SEO for city pages. |
| Search results (ListingSummary[]) | Client store (React Query, key = params) | Server data; caching makes back/forward instant. |
| Hovered listing id (list ↔ map) | Component state (lifted to page or small Zustand store) | Pure UI, changes many times a second. |
| ListingDetail | Server (SSR) → client store | Rendered on server for SEO, then cached. |
| Availability | Client store, fetched per month | Changes often; not needed for first paint. |
| Quote | Client store, short-lived | Must come from server; client never calculates the final price. |
| Booking status | Server, polled by client | Source of truth is the payment webhook. |
| Selected currency / locale | Cookie + context | Needed by the server for SSR, and by every price formatter. |
| Wishlist ids | Client store | Optimistic toggle. |
| Recent searches | localStorage | Per-device convenience, small. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
type SearchResultsPageProps = {
  initialParams: SearchParams;   // parsed from URL on server
  initialResults: SearchResponse; // SSR data, hydrates React Query
};

type MapViewProps = {
  pins: { id: string; lat: number; lng: number; label: string }[]; // label = "₹4,500"
  hoveredId: string | null;
  selectedId: string | null;
  onBoundsChange: (bounds: SearchParams['bounds']) => void; // already debounced inside
  onPinClick: (id: string) => void;
  searchAsMove: boolean;
};

type ListingCardProps = {
  listing: ListingSummary;
  onHover: (id: string | null) => void;
  onWishlistToggle: (id: string) => void;
  priority?: boolean;            // first 2 cards: eager image
};

type DateRangePickerProps = {
  checkin: string | null;
  checkout: string | null;
  availability?: Availability;   // grey out blocked days
  minNights?: number;
  onChange: (range: { checkin: string | null; checkout: string | null }) => void;
  locale: string;                // week start day, month names
};

type BookingWidgetProps = {
  listing: ListingDetail;
  checkin: string | null;
  checkout: string | null;
  guests: number;
  onReserve: (quoteId: string) => void;
};
```

### Server API (endpoints, method, params, example JSON response, pagination style and WHY)

| Endpoint | Method | Params | Purpose |
|---|---|---|---|
| `/search` | GET | SearchParams, `limit=20`, `cursor?` | Results + pins |
| `/places/autocomplete` | GET | `q`, `locale` | Location suggestions |
| `/listings/:id` | GET | `currency`, `locale` | Detail |
| `/listings/:id/availability` | GET | `from`, `to` (2 months) | Calendar days |
| `/listings/:id/reviews` | GET | `cursor`, `limit=10` | Reviews |
| `/quotes` | POST | `{ listingId, checkin, checkout, guests, currency }` | Server price calc |
| `/bookings` | POST | `{ quoteId, idempotencyKey }` | Hold dates + create payment intent |
| `/bookings/:id` | GET | – | Poll status |
| `/wishlist/:listingId` | PUT / DELETE | – | Toggle heart |

Example `GET /search?location=goa&checkin=2026-12-20&checkout=2026-12-23&guests=2&limit=20`:

```json
{
  "results": [
    {
      "id": "l_771",
      "title": "Sea-view studio in Anjuna",
      "photos": [{ "url": "https://img.cdn.com/l_771/1", "width": 1600, "height": 1067, "alt": "Bedroom with sea view", "blurDataUrl": "data:image/jpeg;base64,/9j/4AAQ..." }],
      "lat": 15.5736, "lng": 73.7407,
      "rating": 4.87, "reviewCount": 213,
      "nightlyPrice": { "amountMinor": 450000, "currency": "INR" },
      "totalPrice": { "amountMinor": 1620000, "currency": "INR" },
      "isSuperhost": true, "isWishlisted": false
    }
  ],
  "totalCount": 1240,
  "mapPins": [{ "id": "l_771", "lat": 15.5736, "lng": 73.7407, "label": "₹4,500" }],
  "nextCursor": "c2VhcmNoOjIw"
}
```

**Pagination:** Airbnb shows numbered pages ("1 2 3 … 15") at the bottom of search, not infinite scroll. Why: the user compares listings, goes back and forth, and wants to share "page 3". Also the footer must be reachable, and SEO crawlers can follow `?page=2` links. So I use **page numbers in the URL** for the UI, with the server using a cursor/offset internally. Results here are a ranked snapshot, so small shifts between pages are OK. For **reviews** I use a cursor with "Show more" because they only grow.

**`/quotes` is POST and returns a signed `quoteId`.** The client sends that id to `/bookings`, not a price. The server ignores any price the client could send.

**`idempotencyKey`** (UUID made when checkout page loads): if the user double-clicks "Confirm and pay" or the network retries, the server returns the same booking, not two.

## 5. Optimizations and deep dives

### 5.1 Search page: all filters in the URL

The URL is the single source of truth for search. Components read from it and write to it. No duplicate state in Redux.

```ts
function useSearchParamsState() {
  const router = useRouter();
  const sp = useSearchParams();
  const params = parseSearchParams(sp);           // validate + defaults (zod)

  const update = (patch: Partial<SearchParams>, opts = { push: false }) => {
    const next = serializeSearchParams({ ...params, ...patch, cursor: undefined }); // filter change resets page
    opts.push ? router.push(`?${next}`) : router.replace(`?${next}`);
  };
  return [params, update] as const;
}

// results
const [params] = useSearchParamsState();
const { data, isFetching } = useQuery({
  queryKey: ['search', params],
  queryFn: ({ signal }) => api.search(params, { signal }),   // old request aborted automatically
  placeholderData: keepPreviousData,
  staleTime: 60_000,
});
```

- **push vs replace:** big changes (new location, new dates, "Apply filters") use `push` so Back works. Slider drags and map moves use `replace` so history isn't flooded.
- **Debounce** the price slider (300 ms) before writing the URL.
- **Race conditions:** React Query keys + `AbortSignal` cancel the old request, so a slow old response can't overwrite a newer one.
- **Stable serialization:** sort keys and arrays so `?a=1&b=2` and `?b=2&a=1` hit the same cache and CDN entry.
- **Mobile:** filters open in a full-screen sheet with "Show 1,240 stays" button. While editing, call a cheap `/search/count` to update the number, and only write to the URL when the user taps the button.

### 5.2 Map + list sync

**Map library:** Mapbox GL / Google Maps JS is ~200–300 KB. Load it with `next/dynamic` and `ssr: false` after the list is visible. On mobile, load only when the user taps "Map".

**Bounds search (debounced):**

```ts
map.on('moveend', debounce(() => {
  if (!searchAsMove) return;
  const b = map.getBounds();
  onBoundsChange({ ne: [b.getNorth(), b.getEast()], sw: [b.getSouth(), b.getWest()] });
}, 400));
```

- Use `moveend`, not `move` (which fires 60 times a second).
- Round coordinates to 4 decimals (~11 m) so tiny moves give the same cache key.
- Ignore `moveend` events caused by our own `fitBounds` call after a new location search (use a flag), otherwise we get a loop.
- Show a "Search this area" button when `searchAsMove` is off.

**Hover sync:** hovering a card highlights its pin (bigger, dark). Clicking a pin scrolls the list to the card and opens a small preview card on the map. Keep `hoveredId` in a tiny store and have each pin subscribe only to "am I hovered?" — otherwise one hover re-renders all 300 pins.

**Clustering:** with 300+ pins at zoom 10, pins overlap. Use `supercluster` (fast, runs in a Web Worker if needed) to group nearby pins into a circle "12". Click a cluster → zoom in. Price pins are HTML markers, which are slow above ~200; for more, use the map's native symbol layer (WebGL) instead of DOM markers.

**List and map pins can differ:** list shows 20 per page, map shows up to 300 pins for the same search. That's why the API returns `mapPins` separately (small objects, ~50 bytes each).

### 5.3 Date picker and availability

- **Dates are dates, not timestamps.** Store `"2026-12-20"` strings. Never `new Date("2026-12-20")` and then format — that parses as UTC and shows Dec 19 for users west of UTC. Use a small library (`date-fns`) and treat dates as plain calendar days in the listing's timezone.
- **Availability fetching:** load 2 months at a time (`from`/`to`). When the user goes to the next month, prefetch the month after.
- **Blocked days:** grey out unavailable days. If a user picks check-in, also block check-out days that would cross a booked night or break `minNights`.
- **Accessibility:** follow the WAI-ARIA date grid pattern. The calendar is a `role="grid"`; arrow keys move by day, PageUp/PageDown by month, Home/End to week start/end. Each day button has a full label: `aria-label="Saturday, 20 December 2026, available"`. Also allow typing the date in an input.
- **Mobile:** vertical scrolling list of months in a full-screen sheet instead of two side-by-side months.
- **Locale:** week starts Monday in India/Europe and Sunday in the US — use `Intl.Locale(...).weekInfo` or a locale table.

### 5.4 SSR/SSG for SEO on listing pages

| Page | Strategy | Why |
|---|---|---|
| City pages `/s/goa` (no dates) | ISR, revalidate every 1 h | High SEO value, same for everyone. |
| Listing `/rooms/l_771` | SSR at the edge, cached 5 min for logged-out users; ISR for top listings | SEO + fresh-ish price. Personal parts (wishlist heart) load on the client. |
| Search with dates/filters | SSR first page, then CSR | Fast first paint; not indexed (`noindex` for filter combos to avoid duplicate content). |
| Checkout, trips | CSR only, no cache | Private, per user. |

- Add `<title>`, `<meta description>`, `og:image`, canonical URL, and JSON-LD (`@type: LodgingBusiness` with `aggregateRating`, `address`).
- **Streaming SSR:** send the header, hero photo and title first. Reviews and the map (below the fold) stream later inside `<Suspense>`.
- Keep the HTML cacheable: don't put user-specific data in server HTML of public pages; fetch it on the client after hydration.
- **Hero image is the LCP:** `<link rel="preload" as="image" imagesrcset=...>` in the head, `fetchpriority="high"`.

### 5.5 Image gallery

- Listing page shows a 5-photo grid (1 big + 4 small). "Show all photos" opens a modal with all 30–60 photos.
- Use `srcset` + `sizes` and a CDN that serves WebP/AVIF. Grid thumbnails ~400 w, modal ~1200 w.
- Give every image `width`/`height` (or `aspect-ratio`) to avoid layout shift.
- Card carousels in search results: load only photo 1; load photo 2 when the user hovers the card or taps "next" (prefetch on hover). 20 cards × 5 photos = 100 images we don't need on first load.
- Full-screen viewer: preload next and previous photo; swipe on mobile; arrow keys + Esc on desktop; focus trap; "Photo 3 of 42" for screen readers.
- Lazy-load photos below the fold with `loading="lazy"`.

### 5.6 Booking flow: price on server, no double booking

```text
BookingWidget        API                     Payment (Stripe)
     |  POST /quotes   |                           |
     |---------------->|  calc nights, fees, tax   |
     |<-- quote(15min) |                           |
     | user clicks Reserve -> /checkout?quoteId=   |
     |  POST /bookings {quoteId, idempotencyKey}   |
     |---------------->| re-check availability     |
     |                 | place HOLD on dates (10m) |
     |                 | create payment intent --->|
     |<-- bookingId, clientSecret                  |
     | confirm card in Stripe iframe ------------->|
     |                 |<----- webhook: succeeded  |
     |                 | hold -> confirmed booking |
     | GET /bookings/:id (poll every 2s)           |
     |<-- confirmed    |                           |
```

- **Price recalculation on server.** The client shows a *preview* price, but the final number always comes from `POST /quotes`. Nights × nightly rate (rate can differ per night — weekends cost more), cleaning fee, service fee, taxes (GST in India depends on price slab), currency conversion. The client only formats it.
- When dates or guests change in the widget, debounce 300 ms and request a new quote. Show a skeleton on the total, not a stale number.
- If the quote expires (15 min) or the price changed, show: "The price changed from ₹16,200 to ₹17,100" and ask the user to confirm again. Never charge a different amount silently.
- **Double-booking prevention is a server job.** Two users can click "Reserve" on the same dates at the same second. The server places a **hold** with a DB unique constraint/transaction on (listing, date). The second request fails with `409 Conflict`. The frontend's job: handle 409 nicely — "Sorry, these dates were just booked" + show the calendar again with fresh availability.
- **Idempotency key** stops double charges from double clicks or retries. Also disable the button and show a spinner while submitting.
- **Payment confirmation is async.** The webhook is the source of truth, not the browser redirect. The client polls `GET /bookings/:id` every 2 s (max ~60 s), then shows "We're confirming your booking — we'll email you" if still pending.
- Card data only goes into Stripe/Razorpay iframes, so our page never sees card numbers (smaller PCI scope).

### 5.7 i18n and currency

- Format with `Intl.NumberFormat(locale, { style: 'currency', currency })`. `₹4,500` in en-IN, `$54` in en-US. Indian grouping (`1,00,000`) comes for free with `en-IN`.
- Money is integer minor units from the server. Currency conversion is done on the server with a daily rate; we show "Charged in INR" if the payment currency differs.
- Dates with `Intl.DateTimeFormat`. Texts via `react-intl`/`i18next` with ICU plurals ("1 night" / "3 nights").
- **RTL:** set `<html dir="rtl">` and use CSS logical properties (`margin-inline-start`, not `margin-left`). Carousel arrows flip.
- Locale and currency come from a cookie, so the SSR HTML is already in the right language. Cache key at the CDN must vary by locale/currency (or put locale in the path: `/en-in/rooms/...`).

### Also mention

- **Accessibility:** map is not usable by screen readers → the list is the accessible equivalent, and the map has `aria-hidden` pins with a "Skip map" link. Filters are fieldsets with legends. Announce result count changes with `aria-live="polite"` ("1,240 stays found").
- **Security:** never trust client price; CSRF protection on booking POSTs; sanitize host-written descriptions; rate-limit autocomplete and search.
- **Analytics:** search → listing view → reserve click → payment success funnel. Log which filters are used. Track LCP for listing pages by country.
- **Performance budget:** listing page JS < 170 KB gzip on first load; map, gallery modal, and reviews are lazy chunks.
- **Offline:** not critical, but cache trip confirmation pages so users can see booking details at the airport with no network.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Search state | Redux/Zustand store | URL params | URL. Shareable, back button, SSR, SEO. Store only UI state like hover. |
| Results pagination | Infinite scroll | Numbered pages | Numbered pages. Users compare, share, and come back; footer reachable; crawlable. |
| Listing page render | CSR | SSR/ISR | SSR/ISR. SEO and LCP. Personal bits on client. |
| Map loading | In main bundle | Lazy after list paint | Lazy. Map is ~250 KB and not the LCP. |
| Map markers | DOM/HTML markers | WebGL symbol layer + clustering | HTML markers for < 200 pins (easy styling); WebGL + clustering beyond that. |
| Price calculation | Client computes | Server quote | Server quote. Taxes, fees, per-night rates, and trust. Client only previews/format. |
| Map move search | Auto search on move | "Search this area" button | Auto with 400 ms debounce on desktop (with a toggle); button on mobile where accidental drags are common. |
| Booking status | Trust redirect after payment | Webhook + polling | Webhook + polling. Redirects can fail; webhook is reliable. |

## 7. Likely follow-up questions

**Q1. User shares a search URL with a friend in the US. What do they see?**
Same location, dates and filters (all in URL), but prices in the friend's currency and language because those come from their own cookie/locale, not the URL. Map bounds in URL restore the same area.

**Q2. Two tabs are open on the checkout page. User pays in one. What happens in the other?**
The second tab uses the same idempotency key only if it's the same checkout session; otherwise the server sees the dates are held/booked by this user and returns the existing booking or a 409. Show "You already booked this" with a link to the trip.

**Q3. Search is slow in a city with 20,000 listings. How do you help from the frontend?**
Keep previous results visible while loading, show skeletons only on first load, abort stale requests, cache by normalized params, and prefetch page 2 when the user scrolls to the bottom of page 1. Ask backend to return pins with lighter payload.

**Q4. How do you avoid a CLS jump when the price loads late?**
Reserve space for the price line with a fixed-height skeleton, and use `font-variant-numeric: tabular-nums` so digits don't shift width.

**Q5. How do you test the date picker?**
Unit tests for date math (min nights, blocked ranges, month boundaries, DST, leap years). Testing Library tests for keyboard navigation and ARIA labels. Run in different `TZ` env values in CI to catch timezone bugs.

**Q6. Host blocks dates while a guest is on the listing page. What happens?**
The calendar may be stale. That's OK: the quote and the booking hold re-check on the server. If the quote fails, refetch availability and show "These dates are no longer available."

**Q7. How would you build "Request to book" instead of instant book?**
Booking status gets `pending_host_approval`. Card is authorized, not captured. Frontend shows a status page with a 24 h countdown and sends notifications. Same idempotency and hold logic.

**Q8. How do you handle a slow map on low-end Android?**
Don't load it by default on mobile (list first, "Map" toggle). Use WebGL layers instead of DOM markers, cap pins at ~150, cluster, and reduce map tile quality on `saveData`.

**Q9. Why not put the price filter in local state and only sync to URL on submit?**
On desktop we update live, so URL is fine (with debounce + replace). On mobile, the filter sheet does keep local draft state and writes to the URL on "Show stays" — that's the one place a temporary local copy makes sense.

## 8. If you only have 60 seconds

- Next.js with SSR/ISR for listing and city pages (SEO + fast LCP), CDN-cached; checkout is CSR.
- All search state (location, dates, guests, filters, map bounds, page) lives in the URL; React Query caches results keyed by those params with abort + keep previous data.
- Map is lazy-loaded; map moves trigger a 400 ms debounced bounds search; hover syncs card ↔ pin; clustering above ~200 pins.
- Date picker uses plain date strings in the listing's timezone, loads availability per 2 months, blocks invalid ranges, full ARIA grid keyboard support.
- Price is always calculated on the server as a signed, expiring quote; the client only formats it with `Intl.NumberFormat`.
- Booking: server hold on dates + DB constraint prevents double booking (frontend handles 409), idempotency key prevents double charge, payment confirmed by webhook and client polls.
- i18n: locale/currency cookie for SSR, ICU plurals, RTL with logical CSS properties.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarifying questions | Flows in scope, SEO, currencies, instant book, freshness |
| 4–9 | Requirements | Functional list, SEO + LCP numbers, no double booking, i18n, a11y |
| 9–16 | Architecture | Box diagram with CDN + SSR, component table, search data flow |
| 16–21 | Data model | ListingSummary, Availability, Quote, Money; URL as state home |
| 21–27 | API | `/search`, availability, `/quotes`, `/bookings` + idempotency; pagination choice |
| 27–40 | Deep dives | URL filters, map + list sync, booking flow (most important), SSR/SEO, date picker |
| 40–45 | Trade-offs + wrap-up | 2–3 trade-offs, follow-ups |

## Common mistakes

- Jumping to components before defining data/entities — especially `Money`, `Quote` and `Availability`, which drive the booking flow.
- Keeping filters in component state or Redux instead of the URL — breaks sharing, back button and SSR.
- Calculating the final price on the client, or saying "frontend prevents double booking". Frontend only handles the 409; the server guarantees it.
- Using `new Date("2026-12-20")` for check-in dates and getting off-by-one-day bugs across timezones.
- Firing a search on every map `move` event (60/s) instead of debounced `moveend`.
- Forgetting SEO entirely, or rendering the whole app client-side for a site that lives on Google traffic.

## My mistakes

- [ ]
