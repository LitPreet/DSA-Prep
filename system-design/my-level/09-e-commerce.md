# E-commerce Marketplace (e.g. Amazon / Flipkart)

> **Difficulty:** Medium · **Asked at:** e-commerce and quick-commerce companies (Flipkart, Amazon, Myntra, Meesho, Nykaa, Zepto, Swiggy Instamart, Tata CLiQ) and many generalist product companies · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Which pages are in scope?
  → Assume: product listing (search/category), product detail page (PDP), cart, checkout. Account, orders, seller portal are out.
- Is SEO important?
  → Assume: yes, very. Most traffic comes from Google to listing and product pages.
- Who are the users and devices?
  → Assume: India, 70%+ mobile web, many on low/mid Android phones and patchy 4G.
- Can guests add to cart and check out?
  → Assume: guests can add to cart; must log in (OTP) at checkout. Cart merges after login.
- How big is the catalogue?
  → Assume: millions of products. A category can have 50k+ results with many filters.
- Payments?
  → Assume: UPI, cards, net banking, COD via a payment gateway (Razorpay-like). We don't build the gateway.
- Multiple sellers per product, prices changing often (sales)?
  → Assume: yes. Price and stock can change any minute, especially during sales like Big Billion Days.
- Multiple languages/currencies?
  → Assume: INR only, English + Hindi. Design so more can be added.

## 1. Requirements

### Functional
- **Listing page:** grid of products with image, title, price, discount, rating. Filters (brand, price range, size, rating), sort (relevance, price, newest), pagination.
- **Product page:** image gallery with zoom, title, price, offers, variants (size/colour), stock status, delivery date by pincode, reviews, "Add to cart" / "Buy now".
- **Cart:** add/remove/update quantity, see subtotal, discounts, delivery fee. Persist across sessions and devices.
- **Checkout:** login (OTP), choose address, see final price, choose payment, place order, show success/failure.

### Non-functional (performance, accessibility, devices, network)
- **Performance (Core Web Vitals, p75 on mobile):** LCP < 2.5s, INP < 200ms, CLS < 0.1. JS on listing/PDP under ~150KB gzipped. Every 100ms of delay costs conversion.
- **SEO:** listing and product pages server-rendered with correct titles, meta description, canonical URLs, structured data (`Product`, `Offer`, `AggregateRating` JSON-LD).
- **Accessibility:** WCAG 2.1 AA. Filters usable by keyboard and screen reader; price changes announced; form errors linked to fields.
- **Devices:** mobile-first; works on 360px wide screens and 2GB RAM phones.
- **Network:** good on slow 3G for browsing; clear errors and safe retry at checkout.
- **Security & correctness:** prices and totals always computed on the server; no double orders; card data never touches our servers.

### Out of scope
- Seller dashboard, order tracking, returns, recommendations engine, search ranking, reviews submission, wishlists (mention only).

## 2. Architecture

```text
                         +-------------------------+
                         |   CDN / Edge cache      |  static assets, images,
                         |   (HTML for SSG/ISR)    |  cached listing/PDP HTML
                         +-----------+-------------+
                                     |
                         +-----------v-------------+
                         |  Next.js server (SSR /  |
                         |  ISR / route handlers)  |  -- BFF: joins catalog,
                         +-----------+-------------+     price, stock, reviews
                                     |
     +---------------+---------------+--------------+----------------+
     v               v               v              v                v
 +--------+    +-----------+    +---------+    +---------+    +-------------+
 |Catalog |    |Search &   |    |Pricing &|    |Cart     |    |Order &      |
 |service |    |filters svc|    |Inventory|    |service  |    |Payment svc  |
 +--------+    +-----------+    +---------+    +---------+    +------+------+
                                                                     |
                                                            +--------v-------+
                                                            |Payment gateway |
                                                            |(hosted fields) |
                                                            +----------------+

 Browser (React):
 +--------------------------------------------------------------------+
 | ListingPage(SSR) | ProductPage(ISR+client islands) | Cart(CSR) |    |
 | Checkout(CSR, no cache)                                            |
 |  - URL holds filters/sort/page                                     |
 |  - Server state cache (React Query): cart, price/stock refresh     |
 |  - Small client store: cart count badge, user session              |
 +--------------------------------------------------------------------+
```

| Component | Responsibility |
|---|---|
| CDN / Edge | Serves images (resized), JS/CSS, and cached HTML for listing/PDP. |
| Next.js server (BFF) | Renders pages on the server, calls backend services, shapes data for the UI, sets cache headers. |
| ListingPage | Reads filters/sort/page from URL, renders product grid + filter panel. Filter changes update the URL. |
| ProductPage | Static-ish shell (title, images, description) + client-fetched live price, stock, delivery estimate. |
| CartPage / MiniCart | Reads cart from server, optimistic quantity updates, shows server-computed totals. |
| Checkout | Step flow: login → address → summary → payment. Talks to order + payment APIs. |
| Payment gateway | Hosted card fields / UPI intent. Returns a payment token; we never see card numbers. |

**Main flow: user goes from Google to buying a product**
1. User clicks a Google result → `/p/boat-airdopes-141/itm123`. CDN returns cached HTML (ISR, rebuilt every few minutes). Page is visible fast and SEO-friendly.
2. React hydrates. The page fetches `/api/products/itm123/live?pincode=560001` for fresh price, stock and delivery date.
3. User picks a variant → URL updates `?variant=black` → "Add to cart" calls `POST /api/cart/items`. Badge updates optimistically.
4. User opens `/cart` (CSR, `no-store`). Server returns items with current prices and totals.
5. Checkout: login via OTP → cart merge → choose address → `POST /api/checkout/quote` returns final total.
6. `POST /api/orders` with an idempotency key creates the order and a payment session. Payment fields/UPI handled by the gateway.
7. Gateway redirects/calls back → server verifies payment (webhook + signature) → client polls `GET /api/orders/:id` → success page.

## 3. Data model

```ts
type Money = { amount: number; currency: 'INR' };   // amount in paise (integer) to avoid float bugs

type ProductSummary = {           // used on listing cards
  id: string;
  slug: string;
  title: string;
  image: { url: string; width: number; height: number; alt: string };
  price: Money;
  mrp: Money;
  rating?: { avg: number; count: number };
  badges?: string[];              // "Bestseller", "Assured"
};

type Variant = {
  id: string;                     // SKU
  attributes: Record<string, string>;   // { color: "Black", size: "M" }
  images: string[];
};

type ProductDetail = ProductSummary & {
  description: string;
  specs: { label: string; value: string }[];
  variants: Variant[];
  sellerId: string;
};

type LiveOffer = {                // fetched on client, short cache
  variantId: string;
  price: Money;
  mrp: Money;
  inStock: boolean;
  maxQty: number;
  deliveryBy?: string;            // ISO date for given pincode
  offers: string[];               // "10% off with HDFC card"
};

type CartItem = { variantId: string; quantity: number; product: ProductSummary; unitPrice: Money; available: boolean };

type Cart = {
  id: string;
  items: CartItem[];
  subtotal: Money;
  discount: Money;
  deliveryFee: Money;
  total: Money;                   // always computed by server
  version: number;                // for conflict detection across devices
};

type ListingQuery = {             // mirrors the URL
  q?: string;
  category?: string;
  filters: Record<string, string[]>;   // { brand: ["boat","jbl"], price: ["500-1000"] }
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  page: number;
};
```

| Entity | Lives in | Why |
|---|---|---|
| ProductSummary list, facets | Server; rendered in SSR HTML; React Query cache on client nav | SEO needs it in HTML. Cache for fast back navigation. |
| ProductDetail (static part) | Server, ISR HTML at CDN | Changes rarely. Cheap and fast to serve from cache. |
| LiveOffer (price/stock/delivery) | Server; client fetch with ~30–60s cache | Changes often. Must not be stale in cached HTML. |
| ListingQuery (filters/sort/page) | URL query params | Shareable, bookmarkable, back button works, crawlable. |
| Cart | Server (by user id or guest cart id cookie); React Query on client | Must work across devices; server computes totals. |
| Cart count badge | Derived from cart query | Avoid a second source of truth. |
| Selected variant | URL (`?variant=`) | Shareable link to the exact colour/size; separate canonical. |
| Pincode | Cookie/localStorage | Reused on every PDP for delivery estimates. |
| Checkout step, form inputs | Component state (+ URL for step) | Short-lived; step in URL so back button works. |
| Payment details | Payment gateway iframe only | PCI: never in our app state. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
type ProductGridProps = {
  products: ProductSummary[];
  priorityCount?: number;            // first N images eager (default 4)
  onProductClick?: (id: string, position: number) => void; // analytics
};

type FilterPanelProps = {
  facets: Facet[];                   // from server: { key, label, type, options[{value,label,count}] }
  selected: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void; // writes to URL
  variant: 'sidebar' | 'bottom-sheet';               // desktop vs mobile
};

type VariantPickerProps = {
  variants: Variant[];
  selectedId: string;
  isAvailable: (variantId: string) => boolean;
  onSelect: (variantId: string) => void;
};

type AddToCartButtonProps = {
  variantId: string;
  disabled?: boolean;                // out of stock
  quantity?: number;
};
```

### Server API (endpoints, method, params, example JSON response, pagination style and WHY)

**GET `/api/search?category=headphones&brand=boat,jbl&price=500-1000&sort=price_asc&page=2&pageSize=24`**

```json
{
  "products": [
    { "id": "itm123", "slug": "boat-airdopes-141", "title": "boAt Airdopes 141",
      "image": { "url": "https://img.cdn.com/itm123.jpg", "width": 800, "height": 800, "alt": "Black earbuds with case" },
      "price": { "amount": 129900, "currency": "INR" }, "mrp": { "amount": 449000, "currency": "INR" },
      "rating": { "avg": 4.1, "count": 312000 } }
  ],
  "facets": [
    { "key": "brand", "label": "Brand", "type": "multi",
      "options": [{ "value": "boat", "label": "boAt", "count": 1832 }] }
  ],
  "page": 2, "pageSize": 24, "totalResults": 5432
}
```

**Why page numbers (offset) here, not a cursor?** Listing pages need SEO-friendly, shareable, crawlable URLs (`?page=3`), a "page 3 of 227" UI, and jumping between pages. Ranking is stable enough over a short session. On mobile we can still show "Load more"/infinite scroll that just requests the next page number, while keeping `?page=` links in the HTML for crawlers. (Cursor pagination is better for live feeds; this isn't one.)

**GET `/api/products/:id`** → `ProductDetail` (cached at CDN, revalidated on change).
**GET `/api/products/:id/live?variant=v1&pincode=560001`** → `LiveOffer` (`Cache-Control: max-age=30`).

**Cart** (cookie session identifies guest or user):
- `GET /api/cart` → `Cart`
- `POST /api/cart/items` body `{ "variantId": "v1", "quantity": 1 }` → updated `Cart`
- `PATCH /api/cart/items/:variantId` body `{ "quantity": 3, "cartVersion": 7 }` → updated `Cart` or `409` if version is old
- `DELETE /api/cart/items/:variantId` → updated `Cart`
- `POST /api/cart/merge` (after login) → merged `Cart`

Every cart response returns the full cart with server totals. The client never adds up prices itself.

**Checkout:**
- `POST /api/checkout/quote` body `{ "addressId": "a1", "coupon": "DIWALI10" }` → `{ "quoteId": "q_55", "items": [...], "total": {...}, "expiresAt": "…", "priceChanged": false }`
- `POST /api/orders` headers `Idempotency-Key: 6f1c…` body `{ "quoteId": "q_55", "paymentMethod": "upi" }` → `{ "orderId": "o_9", "status": "PAYMENT_PENDING", "paymentSession": { "gatewayOrderId": "rzp_…" } }`
- `GET /api/orders/:id` → `{ "status": "PAID" | "PAYMENT_PENDING" | "FAILED" }`

## 5. Optimizations and deep dives

### 5.1 Rendering choice per page

| Page | Strategy | Why |
|---|---|---|
| Home | SSG/ISR (revalidate ~60s) + client personalised strip | Mostly same for everyone; personal parts load after. |
| Category / search listing | SSR with CDN cache (`s-maxage=60, stale-while-revalidate=300`) keyed by URL | SEO, endless filter combos so can't pre-build all; cache popular ones at the edge. |
| Product page | ISR (pre-build top ~10k, others on first request; revalidate on product update) + client fetch for live price/stock | SEO + fast LCP from CDN; live data must be fresh. |
| Cart | CSR, `no-store` | Personal, no SEO, changes often. |
| Checkout | CSR, `no-store`, minimal third-party scripts | Personal, sensitive, must be correct. |

- Use **React Server Components / streaming** (Next.js App Router) for PDP: send the header and image first, stream reviews later with `<Suspense>`.
- **Islands:** most of PDP is static content. Only the variant picker, add-to-cart, pincode checker and gallery need JS. Less JS → better INP on cheap phones.
- **Don't cache personal data in shared HTML.** Price shown in cached HTML is a "starting" value; the live fetch confirms it. Avoid hydration mismatch by rendering the live part in a client component with a skeleton of fixed size.

### 5.2 Filters and sort in URL query params

The URL is the single source of truth for the listing:

```ts
// /c/headphones?brand=boat,jbl&price=500-1000&sort=price_asc&page=1
function useListingQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const query = parseListingQuery(params);             // URL -> object

  const update = (next: Partial<ListingQuery>) => {
    const merged = { ...query, ...next, page: next.page ?? 1 }; // reset page on filter change
    router.push(`?${serializeListingQuery(merged)}`, { scroll: false });
  };
  return { query, update };
}
```

- **Why URL:** shareable links, back/forward works, refresh keeps state, Google can crawl useful filtered pages (e.g. `/c/headphones?brand=boat`).
- **Canonical:** serialize in a fixed order (sorted keys and values) so `brand=jbl,boat` and `brand=boat,jbl` are one cache entry. Add `<link rel="canonical">`; mark deep filter combos `noindex` to avoid crawl explosion.
- **Reset page to 1** whenever a filter or sort changes.
- **Mobile:** filters in a bottom sheet; apply on "Apply" (one request), not on every tap. Desktop: apply instantly with ~300ms debounce for price slider.
- Keep previous results visible with a light overlay while new results load (`keepPreviousData` in React Query / `useTransition`), instead of flashing a spinner.
- Facet counts come from the server and update with each query.

### 5.3 Cart persistence and guest-to-logged-in merge

- **Guest:** server creates a cart and sets an HTTP-only cookie `cart_id`. Store cart on the server, not only in localStorage — so totals, stock and prices are validated, and it survives clearing JS state.
- **Logged in:** cart is linked to user id; same cart on phone and laptop.
- **Merge on login** (`POST /api/cart/merge`): for each guest item, if it is already in the user cart, take the max quantity (or sum, capped by `maxQty`) — say the rule out loud. Drop unavailable items with a message ("2 items were removed because they are out of stock").
- **Optimistic updates:** change quantity in the UI instantly, debounce rapid +/+/+ clicks (~400ms) into one PATCH, then replace with the server cart. On error, roll back and show a toast.
- **Multiple tabs/devices:** use `cartVersion`. If PATCH returns `409`, refetch the cart and re-apply. Refetch cart on window focus.
- **Price changed since adding:** server returns current price; show "Price dropped/increased by ₹200" note in cart.

### 5.4 Checkout security and correctness

- **Never trust client prices.** The client sends only variant ids, quantities, address id and coupon code. Server computes price, discounts, tax and delivery fee, and returns a **quote** with an expiry. The order is created from the `quoteId`, so the user pays exactly what they saw — or gets a clear "price changed" step.
- **PCI DSS:** card numbers must never touch our JS or servers. Use the gateway's hosted fields (iframes) or redirect/UPI intent. This also keeps us out of most PCI scope. Load the gateway script only on the payment step.
- **Idempotency keys:** generate a UUID when the user reaches the "Place order" step. Send it in `Idempotency-Key`. If the user double-clicks or the network retries, the server returns the same order instead of creating two. Also disable the button while the request is in flight.
- **Payment confirmation:** don't trust the browser redirect alone ("success" URL can be faked or lost when the user closes the tab). Server verifies via gateway webhook + signature. Client polls `GET /api/orders/:id` every 2s (max ~60s) and shows "Confirming your payment…".
- **Stock:** reserve inventory when the order is created (e.g. 10 min hold); release if payment fails.
- **CSRF:** cookies with `SameSite=Lax` + CSRF token on state-changing requests. **XSS:** strict Content Security Policy on checkout; limit third-party scripts (analytics tags are a common skimming attack vector — Magecart).

### 5.5 Core Web Vitals and image optimization

- **LCP** (usually the first product image or PDP hero image):
  - Serve from CDN with resizing: `?w=400&fmt=avif`. Use `srcset`/`sizes` (Next `<Image>` does this).
  - PDP hero and first 4 listing images: `fetchPriority="high"`, no lazy loading, `<link rel="preload" as="image">` with `imagesrcset`.
  - Everything else `loading="lazy"`.
  - Preconnect to the image CDN.
- **CLS:**
  - All images have width/height (API sends them) or `aspect-ratio`.
  - Reserve fixed space for the live price/stock block, offer banners and ads.
  - Use `font-display: optional` or `size-adjust` on web fonts to avoid text jumping.
- **INP:**
  - Keep hydration small: code-split reviews, image zoom, the filter bottom sheet (`next/dynamic`).
  - Third-party scripts (analytics, chat widget) with `strategy="lazyOnload"` or in a web worker (Partytown).
  - Use `useTransition` for filter updates so taps stay responsive.
- **Budget:** listing route JS < 150KB gzipped. Check with bundle analyzer in CI and track real-user metrics with `web-vitals` sent to analytics, split by page type and device.
- **Prefetch:** on listing, prefetch PDP data when a card enters the viewport or on hover/touchstart, so the click feels instant.

### Also mention
- **Accessibility:** product cards are links with the title as accessible name (one link per card, not three). Filter checkboxes are real `<input type="checkbox">` inside `<fieldset>/<legend>`. Announce result count changes via `aria-live="polite"` ("5,432 results"). Variant buttons use `aria-pressed`; out-of-stock is said in text, not just greyed. Checkout errors linked with `aria-describedby`.
- **i18n / currency:** store money as integer paise; format with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` → ₹1,29,900. Translations via message files; Hindi text is longer, so don't use fixed-width buttons.
- **Security:** CSP, `rel="noopener"` on seller links, sanitize review HTML on the server, rate-limit OTP.
- **Analytics:** impressions (card 50% visible), add-to-cart, checkout funnel steps; send with `sendBeacon`; respect consent.
- **Offline / bad network:** service worker caches the app shell and recently viewed products; cart actions show clear errors and retry; checkout never retries automatically without the same idempotency key.
- **Sale traffic spikes:** static/ISR pages from CDN take most load; queue page or "high demand" message for checkout.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Listing rendering | CSR | SSR + CDN cache | SSR + edge cache: SEO and fast LCP. CSR for later filter changes inside the session. |
| PDP rendering | SSR every request | ISR + client live price | ISR + live fetch: CDN-fast and cheap, while price/stock stay fresh. |
| Filter state | Component state / Redux | URL query params | URL: shareable, back button, crawlable, survives refresh. |
| Listing pagination | Infinite scroll | Numbered pages | Numbered pages (SEO, "where was I") on desktop; "Load more" on mobile backed by the same `?page=` URLs. |
| Guest cart storage | localStorage only | Server cart + cookie | Server cart: cross-device, server-validated prices. localStorage only as a fallback cache. |
| Totals | Calculate on client | Server quote | Server quote, always. Client only displays. |
| Card payment | Our own form | Gateway hosted fields | Hosted fields: PCI scope, security, built-in 3DS/UPI support. |
| State library | Redux for everything | React Query (server state) + URL + tiny store | Most state here is server state; React Query handles caching/refetch. Tiny store (or context) for session. |

## 7. Likely follow-up questions

**Q: Price in the cached PDP HTML is stale during a flash sale. What do you do?**
Treat HTML price as a placeholder: fetch live price on hydrate (short 30s cache) and render it in a fixed-size slot. On product price change, the backend triggers on-demand revalidation of that page. The checkout quote is the final truth.

**Q: Two users try to buy the last item at the same time?**
Server handles it: inventory reservation at order creation is atomic; the second user gets an "out of stock" error. Frontend shows a clear message and suggests similar items. Never rely on the stock flag shown on the page.

**Q: How do you make search suggestions fast?**
Debounced (~200ms) typeahead calling a lightweight `/api/suggest?q=`. Cache results per prefix in memory, cancel old requests with `AbortController`, show recent searches from localStorage instantly, keyboard navigation with `role="combobox"`.

**Q: How do you handle the user pressing back during payment?**
Order stays `PAYMENT_PENDING`; on return we check order status. If paid (webhook arrived) → success page. If not → offer "Retry payment" for the same order (same order id), not a new order.

**Q: How would you A/B test the product page layout?**
Assign the variant at the edge (cookie) so SSR/ISR output can be cached per variant (cache key includes variant). Avoid client-side flicker experiments on LCP elements. Track conversion per variant.

**Q: How do you keep the cart badge in sync across tabs?**
Cart is a React Query query; refetch on window focus. Optionally `BroadcastChannel` to tell other tabs to invalidate when one tab changes the cart.

**Q: Images make up most of the page weight. What else can you do?**
AVIF/WebP via CDN, correct `sizes`, lower quality (q=70) for thumbnails, blur placeholders, lazy load below the fold, avoid carousels loading all slides at once (load only the first, others on interaction).

**Q: How do you support Hindi and future languages?**
Locale in the URL path (`/hi/...`) for SEO with `hreflang` tags, translations loaded per route, `Intl` APIs for numbers/dates/currency, and product content coming translated from the catalogue API.

## 8. If you only have 60 seconds

- Pick rendering per page: SSR/ISR + CDN for listing and product pages (SEO, fast LCP), CSR with `no-store` for cart and checkout.
- Static product content is cached; live price, stock and delivery date are fetched on the client and fixed by a server quote at checkout.
- Filters, sort and page live in the URL — shareable, crawlable, back button works; canonical ordering for caching.
- Server-side cart with a guest cookie; merge into the user cart on login with clear rules; optimistic updates with version checks.
- Checkout: server computes all prices, gateway hosted fields for PCI, idempotency key on "Place order", payment confirmed by webhook not redirect.
- Core Web Vitals: CDN images with srcset/AVIF, prioritized LCP image, reserved space for everything, small JS with code-splitting and lazy third-party scripts.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Pages in scope, SEO, mobile India users, guest checkout, payments |
| 4–8 | Requirements | Functional per page, CWV numbers, security/correctness |
| 8–14 | Architecture | CDN + Next.js BFF + services diagram, Google → order flow |
| 14–20 | Data model + API | Money in paise, ListingQuery = URL, Cart with server totals, quote + idempotent order |
| 20–38 | Deep dives | Rendering per page, URL filters, cart merge, checkout security, CWV/images |
| 38–43 | Trade-offs | Table; pagination and state library choices |
| 43–45 | Wrap-up | 60-second summary |

## Common mistakes

- Jumping to components before defining data/entities — e.g. not deciding where price, cart and filter state live.
- Using one rendering mode (all CSR or all SSR) instead of choosing per page.
- Keeping filters in Redux/component state, so links can't be shared and back button breaks.
- Calculating cart totals on the client and sending the total to the server.
- Forgetting idempotency on "Place order" — double click means double charge.
- Ignoring images and third-party scripts when talking about performance; they are usually the biggest cost.

## My mistakes
- [ ]
