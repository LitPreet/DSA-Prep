# Payment Checkout Widget (e.g. Razorpay Checkout / Stripe Checkout embedded on merchant sites)

> **Difficulty:** Medium-Hard · **Asked at:** payment companies (Razorpay, Juspay, PhonePe, Paytm, Cashfree), fintech (CRED, Groww), and any company with its own checkout (Swiggy, Zepto, MakeMyTrip, Cleartrip) · **Time in interview:** 45 min
> Not on GreatFrontEnd's list; matches the products of Indian product companies.

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Are we building the widget that merchants embed (like Razorpay), or the checkout page of one shop? → Assume: **the embeddable widget**. Thousands of merchant sites add our script.
- Which payment methods? → Assume: UPI (intent, collect, QR), cards, netbanking, wallets. UPI is the most used in India.
- Popup/modal on the merchant page, or full redirect to our hosted page? → Assume: **modal overlay (iframe)** by default, with a redirect mode as fallback.
- Who creates the order and the amount? → Assume: **merchant's server** calls our server API to create an order. The browser only gets an `orderId`.
- Devices? → Assume: 70%+ mobile web, many low-end Android phones on 3G/4G.
- Do we save cards? → Assume: yes, as tokens (RBI card-on-file tokenization). We never store raw card numbers on the client.
- How does the merchant know payment succeeded? → Assume: a JS callback with a signed response, plus a server webhook. The merchant must verify on its server.
- Do we need international cards / multi-currency? → Assume: INR only for this round.

## 1. Requirements

### Functional
- Merchant adds one `<script>` tag and calls `new Checkout({...}).open()`.
- A modal opens over the merchant page with order summary (merchant name, logo, amount).
- User picks a payment method: UPI, card, netbanking, or wallet.
- UPI intent (open GPay/PhonePe app on mobile), UPI collect (enter VPA like `name@okhdfc`), UPI QR (desktop).
- Card form with live validation (Luhn check, expiry, CVV), card network detection, saved cards.
- 3-D Secure / OTP step for cards, bank login page for netbanking.
- Show live status: "Waiting for payment in your UPI app" with a countdown.
- On success: show success screen, call merchant's `handler` with `paymentId`, `orderId`, `signature`.
- On failure: show reason and let the user retry with the same or a different method.
- User can close the modal; merchant gets `onDismiss`.

### Non-functional (performance, accessibility, devices, network)
- **Loader script** under **10 KB gzipped**. It must not slow down the merchant page.
- Checkout opens (first paint inside iframe) in **under 1 s on 4G**, under 2.5 s on slow 3G.
- Checkout iframe bundle: under **80 KB gzipped** for the first view. Lazy-load card and netbanking code.
- **Security first:** no card data ever touches merchant JS. Strict origin checks. PCI-DSS scope limited to our domain.
- **Reliability:** never charge twice. Always reach a final state (success / failed / timeout) even if network drops.
- Works on low-end Android (2 GB RAM), old Chrome WebView, Safari iOS 14+.
- Accessible: keyboard use, focus trapped inside the modal, screen reader labels, WCAG AA contrast.
- Style isolation: merchant CSS must not break our UI, and our CSS must not break theirs.

### Out of scope
- Merchant dashboard, refunds, settlements, payouts.
- Fraud/risk engine internals (we only show the result).
- Native mobile SDKs (Android/iOS) — mention only.
- Subscriptions / recurring mandates.

## 2. Architecture

```text
 Merchant site (shop.com)                         Our domains
 ┌───────────────────────────────────┐
 │  <script src="cdn.pay.com/v1/     │   1. load (async, cached)   ┌──────────────────┐
 │          checkout.js">  (LOADER)  │◄────────────────────────────│ CDN (versioned   │
 │                                   │                             │ loader + bundles)│
 │  new Checkout({key, orderId,      │                             └──────────────────┘
 │     handler, onDismiss}).open()   │
 │                │                  │
 │                ▼ creates          │
 │  ┌─────────────────────────────┐  │  2. iframe src=             ┌──────────────────┐
 │  │ <iframe src=                │  │  checkout.pay.com/?o=..     │ Checkout API     │
 │  │  checkout.pay.com>          │──┼────────────────────────────►│ (orders, payment │
 │  │  CHECKOUT APP (React)       │  │  3. REST: GET order,        │  attempts, status│
 │  │  - Method list              │  │     POST payment            │  SSE / polling)  │
 │  │  - Card form / UPI / NB     │  │                             └────────┬─────────┘
 │  │  - Status screen            │  │                                      │
 │  └──────────┬──────────────────┘  │                                      ▼
 │             │ postMessage         │                             ┌──────────────────┐
 │             │ (origin checked)    │                             │ Payment gateway, │
 │             ▼                     │                             │ NPCI (UPI),      │
 │  Loader receives: ready / resize /│                             │ card networks,   │
 │  success / failure / dismiss      │                             │ banks            │
 └───────────────────────────────────┘                             └──────────────────┘
         │                                                                  │
         ▼ handler(response)                                                │ webhook
 Merchant server verifies signature  ◄──────────────────────────────────────┘
```

| Component | Responsibility |
|---|---|
| Loader script (`checkout.js`) | Tiny vanilla JS. Exposes `Checkout` class, creates overlay + iframe, listens to postMessage, calls merchant callbacks. No framework. |
| Checkout iframe app | React app on `checkout.pay.com`. Renders methods, forms, status. Talks to our API. Holds all sensitive input. |
| Payment state machine | Inside the iframe. Drives screens: method select → processing → pending → success / failed / timeout. |
| Status channel | SSE (or polling fallback) for UPI and async methods. |
| 3DS / bank redirect handler | Opens bank page in popup or redirects the iframe, then returns to a callback page on our domain. |
| Checkout API | Gets order (amount comes from server), creates payment attempts with idempotency keys, returns status. |
| Merchant server | Creates order before checkout. Verifies signature after. Listens to webhooks (source of truth). |

**Data flow for "pay with UPI intent on mobile":**
1. Merchant server calls `POST /v1/orders` with amount ₹499 and gets `order_abc`.
2. Merchant page calls `new Checkout({ key, orderId: 'order_abc', handler }).open()`.
3. Loader adds a full-screen overlay and an iframe pointing to `checkout.pay.com/?order=order_abc&key=...`.
4. Iframe calls `GET /orders/order_abc` → gets amount, merchant name, allowed methods. Sends `ready` via postMessage so the loader hides its spinner.
5. User taps "PhonePe". Iframe calls `POST /payments` with an `Idempotency-Key` → gets `paymentId` and a `upi://pay?...` intent URL.
6. Iframe opens the intent link → PhonePe app opens. Screen shows "Complete payment in PhonePe" with a 5-minute timer.
7. Iframe opens SSE `GET /payments/pay_123/events` (or polls every 2–3 s).
8. When the user returns and the server says `captured`, iframe shows success and sends `{type:'payment.success', paymentId, orderId, signature}` to the parent.
9. Loader checks the message origin, calls `handler(response)`, closes the modal. Merchant server verifies the signature and also gets a webhook.

## 3. Data model

```ts
// Comes from server. Client never decides the amount.
type Order = {
  id: string;                 // "order_abc"
  amount: number;             // in paise: 49900 = ₹499
  currency: 'INR';
  merchant: { name: string; logoUrl: string; themeColor?: string };
  allowedMethods: PaymentMethodType[];
  status: 'created' | 'attempted' | 'paid';
  expiresAt: string;          // ISO time
};

type PaymentMethodType = 'upi' | 'card' | 'netbanking' | 'wallet';

type UpiFlow = 'intent' | 'collect' | 'qr';

// One order can have many attempts (user retries).
type PaymentAttempt = {
  id: string;                 // "pay_123"
  orderId: string;
  method: PaymentMethodType;
  upiFlow?: UpiFlow;
  status: AttemptStatus;
  errorCode?: string;         // "BAD_REQUEST_CARD_DECLINED"
  errorReason?: string;       // "Your bank declined this card"
  nextAction?:
    | { type: 'redirect'; url: string }            // 3DS / netbanking
    | { type: 'upi_intent'; url: string }          // upi://pay?...
    | { type: 'upi_qr'; qrData: string }
    | { type: 'poll'; intervalMs: number; timeoutAt: string };
  createdAt: string;
};

type AttemptStatus =
  | 'created'
  | 'pending'        // waiting for user/bank
  | 'success'
  | 'failed'
  | 'timeout';

type SavedCard = {
  tokenId: string;            // network token, not the PAN
  last4: string;              // "4242"
  network: 'visa' | 'mastercard' | 'rupay' | 'amex';
  issuer: string;             // "HDFC"
};

// UI state inside the iframe
type CheckoutState =
  | { screen: 'loading' }
  | { screen: 'methods' }
  | { screen: 'form'; method: PaymentMethodType }
  | { screen: 'processing'; attemptId: string }
  | { screen: 'pending'; attemptId: string; timeoutAt: string }
  | { screen: 'success'; attemptId: string }
  | { screen: 'failed'; attemptId: string; reason: string; canRetry: boolean };

// Messages between iframe and parent
type ChildToParent =
  | { type: 'checkout.ready' }
  | { type: 'checkout.resize'; height: number }
  | { type: 'payment.success'; paymentId: string; orderId: string; signature: string }
  | { type: 'payment.failed'; code: string; description: string }
  | { type: 'checkout.dismiss' };

type ParentToChild =
  | { type: 'checkout.init'; options: { prefill?: { email?: string; contact?: string } } }
  | { type: 'checkout.close' };
```

| Entity | Lives in | Why |
|---|---|---|
| Order (amount, merchant) | Server; read-only copy in iframe state | Amount must never be set by the client. |
| PaymentAttempt + status | Server; mirrored in iframe state (React Query / reducer) | Server is source of truth. Client only shows it. |
| CheckoutState (screen) | Component state (`useReducer`) in iframe | Pure UI flow; resets on close. |
| Card number, CVV | Component state in iframe only, sent straight to our API | Never in storage, never in logs, never sent to parent. |
| Selected method, VPA draft | Component state | Short-lived. |
| Saved cards | Server; fetched after OTP login | Tokens only, tied to user. |
| Last used method ("Pay again with PhonePe") | localStorage on `checkout.pay.com` | Speeds up repeat checkouts. Not sensitive. (May be blocked in third-party iframes; treat as nice-to-have.) |
| `orderId`, `key` | iframe URL query params | Needed on first load; not secret. |
| Pending attempt id | sessionStorage in iframe | Recover status if the iframe reloads after a 3DS redirect. |

## 4. Interface (API)

### Component API

**Merchant-facing JS API (the loader):**

```ts
const checkout = new Checkout({
  key: 'pk_live_xxx',            // public key, safe in browser
  orderId: 'order_abc',          // created on merchant server
  prefill: { email: 'a@b.com', contact: '9876543210' },
  theme: { color: '#0F62FE' },
  methods: ['upi', 'card'],      // optional: limit methods
  mode: 'modal',                 // or 'redirect'
  callbackUrl: 'https://shop.com/payment/return', // used in redirect mode
  handler(res) {                 // success
    // res = { paymentId, orderId, signature }
    fetch('/api/verify', { method: 'POST', body: JSON.stringify(res) });
  },
  onFailure(err) {},             // { code, description, paymentId? }
  onDismiss() {},                // user closed the modal
});

checkout.open();
checkout.close();
checkout.on('payment.failed', fn);
```

**Inside the iframe (React):**

```tsx
<CheckoutApp order={Order} options={InitOptions} />

<MethodList
  methods={PaymentMethodType[]}
  lastUsed?: PaymentMethodType
  onSelect={(m: PaymentMethodType) => void}
/>

<UpiPanel
  isMobile={boolean}
  apps={UpiApp[]}              // detected / known apps
  onPayIntent={(app) => void}
  onPayCollect={(vpa: string) => void}
/>

<CardForm
  savedCards={SavedCard[]}
  onSubmit={(card: CardInput | { tokenId: string; cvv: string }) => void}
  disabled={boolean}           // true while submitting
/>

<PendingScreen attempt={PaymentAttempt} timeoutAt={string} onCancel={() => void} />
<ResultScreen status="success" | "failed" reason?={string} onRetry?={() => void} />
```

### Server API

| Endpoint | Method | Who calls | Purpose |
|---|---|---|---|
| `/v1/orders` | POST | Merchant **server** (secret key) | Create order with amount. |
| `/checkout/orders/:id` | GET | Iframe (public key) | Get order details to show. |
| `/checkout/payments` | POST | Iframe | Create a payment attempt. Header `Idempotency-Key`. |
| `/checkout/payments/:id` | GET | Iframe | Poll status. |
| `/checkout/payments/:id/events` | GET (SSE) | Iframe | Push status changes. |
| `/checkout/payments/:id/cancel` | POST | Iframe | User cancels a pending UPI attempt. |
| `/checkout/validate/vpa` | POST | Iframe | Check VPA exists, return name ("Rahul K"). |
| `/checkout/bin/:first6` | GET | Iframe | Card network, issuer, is 3DS needed. |
| Webhook `payment.captured` | POST to merchant | Our server | Final truth for the merchant. |

```http
POST /checkout/payments
Idempotency-Key: 7f3c9a2e-1b4d-4c1e-9f0a-2d8e6b1c5a77
Content-Type: application/json

{ "orderId": "order_abc", "method": "upi", "upiFlow": "intent", "app": "phonepe" }
```

```json
{
  "id": "pay_123",
  "status": "pending",
  "nextAction": { "type": "upi_intent", "url": "upi://pay?pa=merchant@icici&am=499.00&tr=pay_123&..." },
  "poll": { "intervalMs": 2500, "timeoutAt": "2026-11-26T10:05:00Z" }
}
```

Note: the request has **no amount**. The server reads it from the order.

SSE events:

```text
event: status
data: {"id":"pay_123","status":"pending"}

event: status
data: {"id":"pay_123","status":"success","signature":"hmac_sha256..."}
```

## 5. Optimizations and deep dives

### 5.1 Embedding: loader script + iframe

The merchant adds:

```html
<link rel="preconnect" href="https://checkout.pay.com" />
<script src="https://cdn.pay.com/v1/checkout.js" async></script>
```

**Loader rules:**
- Vanilla JS, no React, **under 10 KB gzipped**. It only creates DOM and listens to messages.
- `async` so it never blocks the merchant's page render.
- **Versioned URL** (`/v1/`). Major version in the path so we never break merchants. Inside v1 we ship fixes with a short cache (`max-age=300`). The real app bundles are content-hashed with `max-age=31536000, immutable`.
- On `new Checkout()` (before `open()`), we can **pre-create a hidden iframe** so it is warm when the user clicks "Pay".
- Prefix all globals and CSS classes (`__pay_overlay`) so we do not clash with merchant code.

**Why an iframe and not just render React into the merchant page?**
1. **Security isolation:** same-origin policy means merchant JS (or a hacked analytics script on their page) cannot read the card input inside our iframe.
2. **PCI scope:** card data is entered only on our domain. The merchant stays out of PCI-DSS card-data scope (they only need the simplest self-assessment form).
3. **Style isolation:** merchant CSS like `input { border: none }` cannot break our form. Shadow DOM gives style isolation but **not** security isolation, so it is not enough.
4. **Independent deploys:** we can ship fixes to the checkout without merchants changing anything.

Cost: one more page load and cross-frame messaging. We reduce it with preconnect and pre-warming.

### 5.2 Parent ↔ iframe communication (postMessage)

Both sides must check **origin** and the **source window**. Never use `'*'` as target origin when sending sensitive data.

```js
// Loader (parent side)
const CHECKOUT_ORIGIN = 'https://checkout.pay.com';

window.addEventListener('message', (e) => {
  if (e.origin !== CHECKOUT_ORIGIN) return;           // 1. origin check
  if (e.source !== iframe.contentWindow) return;      // 2. it is OUR iframe
  const msg = e.data;
  if (!msg || typeof msg.type !== 'string') return;   // 3. shape check

  switch (msg.type) {
    case 'checkout.ready':   hideSpinner(); break;
    case 'checkout.resize':  iframe.style.height = msg.height + 'px'; break;
    case 'payment.success':  options.handler(pick(msg, ['paymentId','orderId','signature'])); close(); break;
    case 'payment.failed':   options.onFailure?.(msg); break;
    case 'checkout.dismiss': close(); options.onDismiss?.(); break;
  }
});

// Iframe side: send only to the parent origin we were told about at init
parent.postMessage({ type: 'payment.success', ... }, merchantOrigin);
```

- The iframe learns `merchantOrigin` from `document.referrer` / ancestor origins and checks it against the merchant's **registered domains** for that key on the server.
- Messages carry only safe data: ids and signature. **Never card data, never tokens.**
- The merchant **must not trust** the JS callback alone. A user could fake `handler()` from DevTools. The merchant verifies `HMAC(orderId|paymentId, secret) === signature` on its server, and the webhook is the final truth.

### 5.3 Payment-attempt state machine

```text
          ┌──────────┐ POST /payments  ┌──────────┐
 methods ─┤ created  ├────────────────►│ pending  │──── server: captured ───► success
          └──────────┘                 └────┬─────┘
                                            │ server: failed  ───────────► failed ──► retry → methods
                                            │ timer hits timeoutAt ──────► timeout ─► check status once more
                                            │ user cancels ──────────────► failed (USER_CANCELLED)
```

Implement with `useReducer` (or XState if the team uses it). Rules:
- `success` and `failed` are **terminal** for an attempt. Ignore late events after a terminal state (e.g. a stale poll response).
- **`timeout` is not "failed".** Money may already be debited. Before showing "timed out", do one final `GET /payments/:id`. If still unknown, show: "We have not got a confirmation yet. If money was deducted, it will be refunded in 5–7 days." Merchant gets `payment.failed` with code `TIMEOUT`, but the webhook may later say `captured`. That is why the webhook is the source of truth.
- A retry creates a **new attempt** on the same order. The order becomes `paid` only once, so the server blocks a second capture.

```ts
function reducer(state: CheckoutState, ev: Event): CheckoutState {
  if ((state.screen === 'success' || state.screen === 'failed') && ev.type === 'STATUS') return state;
  switch (ev.type) {
    case 'SUBMIT':   return { screen: 'processing', attemptId: ev.attemptId };
    case 'PENDING':  return { screen: 'pending', attemptId: ev.attemptId, timeoutAt: ev.timeoutAt };
    case 'STATUS':
      if (ev.status === 'success') return { screen: 'success', attemptId: ev.attemptId };
      if (ev.status === 'failed')  return { screen: 'failed', attemptId: ev.attemptId, reason: ev.reason, canRetry: true };
      return state;
    case 'RETRY':    return { screen: 'methods' };
    default:         return state;
  }
}
```

### 5.4 UPI flows and status updates (SSE vs polling)

| Flow | Where | How it works |
|---|---|---|
| Intent | Mobile | Open `upi://pay?...` (or app-specific link like `phonepe://`). User pays in app, comes back. |
| Collect | Desktop + mobile | User types VPA. We validate it (show "Rahul K"). Bank sends a request to their app. |
| QR | Desktop | Show QR from `qrData`. User scans with phone. |

After the attempt is `pending`, we need the status:
- **SSE first** (`EventSource`): one HTTP connection, server pushes. Simple, auto-reconnects, works through most proxies.
- **Polling fallback** every **2–3 s**, with backoff to 5 s after 1 minute, stop at `timeoutAt` (5 min for collect, ~10 min for QR).
- **Pause when hidden?** No. On mobile the user is in the UPI app, so our tab is hidden. Keep polling, but on `visibilitychange` → visible, **poll immediately**. That gives instant success when the user comes back.
- WebSocket is overkill here: one-way, short-lived updates.

```ts
useEffect(() => {
  const onVisible = () => document.visibilityState === 'visible' && refetchStatus();
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}, []);
```

### 5.5 Idempotency, server-side amount, double-click

- **Amount comes from the order** created by the merchant server with a secret key. The browser sends only `orderId`. If a user edits the JS to send `amount: 1`, nothing changes.
- **Idempotency key:** the iframe makes a UUID (`crypto.randomUUID()`) **once per user submit** and reuses it on retries of the *same request* (network timeout, 502). The server stores key → response for 24 h. Same key = same response, no second attempt.
- **Double-click:** disable the Pay button on first click (`disabled` + `aria-busy`), and guard in code with a ref, because React state updates are async and two fast taps can both pass a state check.

```ts
const inFlight = useRef(false);
const keyRef = useRef<string | null>(null);

async function pay(input: PayInput) {
  if (inFlight.current) return;
  inFlight.current = true;
  keyRef.current ??= crypto.randomUUID();
  try {
    const attempt = await postWithRetry('/checkout/payments', input, { idempotencyKey: keyRef.current });
    dispatch({ type: 'PENDING', attemptId: attempt.id, timeoutAt: attempt.poll.timeoutAt });
  } finally {
    inFlight.current = false;
  }
}
// After a terminal result, reset keyRef so the next "Retry" is a new attempt.
```

- Network retry only for safe cases: timeouts and 5xx, max 3 times with backoff (500 ms, 1 s, 2 s). Never retry 4xx like "card declined".

### 5.6 3-D Secure and bank redirects

Card 3DS and netbanking need the bank's page. Options:
1. **Redirect inside the iframe** to the bank URL. Bank posts back to `checkout.pay.com/return?payment=pay_123`. That page reads the result from our API and continues. We keep `attemptId` in sessionStorage so state survives the reload. Some banks block being framed (`X-Frame-Options`), so:
2. **Popup window** for those banks (opened directly in the click handler so popup blockers allow it). Popup posts back to the iframe when done.
3. **Full-page redirect mode** (`mode: 'redirect'`): the whole merchant tab goes to our hosted page, then to the bank, then back to the merchant's `callbackUrl` with `paymentId`, `orderId`, `signature`. Best on iOS Safari and in-app webviews where popups and third-party cookies are unreliable.

Always: if the user closes the bank page, go back to `pending` and check status. Do not assume failure.

### 5.7 Security checklist

- **CSP on the checkout iframe:** `script-src 'self' cdn.pay.com` (no inline scripts, no third-party tags inside checkout), `connect-src api.pay.com`.
- **Clickjacking:** our checkout must be framable only by registered merchant domains. Set `Content-Security-Policy: frame-ancestors https://shop.com` per merchant (server builds it from the key's allowed domains). Our own login/OTP pages use `frame-ancestors 'self'`.
- **No card data on the merchant side:** card fields live only in our iframe. No analytics or session-replay tools inside the card form.
- Card number masking in UI; `autocomplete="cc-number"` so browsers can autofill safely.
- Subresource Integrity is hard for a loader that updates, so we rely on CDN + HTTPS; merchants who want SRI can pin a hashed build.
- Signature verification + webhooks on the merchant server.

### Also mention
- **Mobile / low-end:** `inputmode="numeric"` for card and OTP, big tap targets (48 px), no heavy animations, card brand icons as one SVG sprite, avoid moment-like libraries. Test on a ₹8,000 Android phone. UPI intent first on Android.
- **Accessibility:** `role="dialog"` + `aria-modal="true"`, focus trap, Esc to close (with "Are you sure?" if a payment is pending), `aria-live="polite"` for "Waiting for payment…", errors linked with `aria-describedby`, return focus to merchant's Pay button on close.
- **Analytics funnel:** `checkout_opened → method_selected → payment_submitted → pending → success/failed`, with method, bank, error code, device, and time per step. Send with `navigator.sendBeacon` so events survive the tab closing. Watch success rate per bank/UPI app; use it to sort methods ("Recommended").
- **Performance:** preconnect, pre-warm hidden iframe, code-split card/netbanking, inline critical CSS, skeleton for method list.
- **Feature flags / kill switch** per method: if a bank is down, hide it from the server config.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Embed method | Iframe | Render into merchant DOM (Shadow DOM) | **Iframe.** Only iframe gives security isolation and keeps merchants out of PCI scope. |
| Default UX | Modal over merchant page | Full redirect to hosted page | **Modal**, better conversion (user stays on the shop). Redirect mode for iOS webviews and banks that block framing. |
| UPI status | SSE | Polling | **SSE with polling fallback.** SSE is instant; polling works everywhere. |
| Loader tech | Vanilla JS | Small framework (Preact) | **Vanilla.** Loader does tiny DOM work; every KB slows merchants. React lives only in the iframe. |
| Checkout app framework | React | Preact / Svelte | **Preact with compat** if bundle is tight (3 KB vs ~45 KB), else React. Big gain on low-end devices. |
| Loader caching | Versioned path, short TTL | Hashed URL, merchants update | **Versioned path** (`/v1/`), short TTL. Merchants never need to change their tag. |
| Timeout result | Report as failed | Report as unknown | **Unknown/pending to the user, `TIMEOUT` to merchant,** final truth by webhook. Avoids telling a user "failed" when money was taken. |
| Card 3DS | Redirect in iframe | Popup | **In-iframe** by default, **popup** for banks that block framing. |

## 7. Likely follow-up questions

**Q: How does the merchant know the `handler` result is real?**
The response includes `signature = HMAC_SHA256(orderId + "|" + paymentId, merchantSecret)`. The merchant server recomputes and compares. Plus the server webhook. Never mark an order paid only from browser JS.

**Q: What if the user closes the tab while UPI is pending and then pays in the app?**
Server still gets the success from NPCI and sends the webhook. Merchant marks the order paid. Next time the user opens the order page, the merchant shows "Paid". That is why the webhook matters.

**Q: Why not let the merchant pass the amount in `new Checkout({ amount })`?**
Anyone can change client JS. Amount must come from a server-created order. Some older APIs allowed client amount; it causes underpayment fraud.

**Q: Third-party cookies are blocked in Safari. Does that break us?**
Our iframe is third-party on the merchant page, so its cookies and localStorage may be partitioned or blocked. So we do not depend on cookies: auth is the public key + order id in the URL, and saved-card login uses OTP with a short-lived token in memory. Storage Access API or redirect mode for "remember me".

**Q: How do you make the checkout open fast?**
Preconnect to our domain, pre-create the iframe hidden on `new Checkout()`, tiny first bundle (method list only), fetch order data in parallel with JS (inline the order JSON via server render if possible), skeleton UI. Target: interactive in under 1 s on 4G.

**Q: How do you show only the UPI apps installed on the phone?**
Browsers can't list installed apps. On Android we show a generic "Pay by any UPI app" intent (`upi://pay`) that opens the system chooser, plus top apps as shortcuts. In the native SDK we can query installed apps.

**Q: A user double-taps Pay on a slow network. What happens?**
Button disables on first tap; a ref guard blocks the second call; even if two requests go out, they share the same idempotency key, so the server returns the same attempt.

**Q: How do you version and roll out a new checkout UI safely?**
Iframe app behind feature flags, rolled out 1% → 10% → 100% by merchant. Watch success rate and error rate per version. The loader API (`/v1/`) stays stable; breaking changes go to `/v2/`.

**Q: How do you test this?**
Unit tests for the reducer (every transition). Integration tests with a mock gateway (test cards that succeed, fail, need 3DS). E2E (Playwright) across a test merchant page with strict CSP. Device lab for low-end Android and iOS Safari.

## 8. If you only have 60 seconds

- A tiny async **loader script** (<10 KB) on the merchant page opens our **iframe-hosted React checkout**. Iframe gives security isolation, PCI scope reduction, and style isolation.
- Parent and iframe talk with **postMessage**, with strict `origin` and `source` checks; only ids and a signature cross the boundary.
- **Order and amount are created server-side**; the client sends only `orderId`. Every submit has an **idempotency key**, and the Pay button is guarded against double taps.
- A **state machine** per attempt: created → pending → success / failed / timeout. Timeout is "unknown", not "failed".
- UPI status via **SSE with polling fallback**, and an immediate re-check on `visibilitychange` when the user returns from the UPI app.
- 3DS/netbanking via in-iframe redirect, popup, or full redirect mode, always returning to our callback page.
- Merchant verifies the **signature on its server**, and the **webhook** is the final source of truth. Plus CSP, `frame-ancestors`, a11y dialog, and a funnel per step.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Embeddable vs own page, methods, who creates the order, devices. |
| 4–9 | Requirements | Functional list, loader size, open time, never double charge, PCI. |
| 9–18 | Architecture | Loader + iframe + API + merchant server + webhook diagram. Walk the UPI flow. |
| 18–23 | Data model | Order, PaymentAttempt, status enum, postMessage message types. |
| 23–28 | API | Merchant JS API, `/payments` with idempotency key, status SSE. |
| 28–40 | Deep dives | Why iframe, postMessage security, state machine + timeout, idempotency/double-click, 3DS. |
| 40–45 | Wrap up | Trade-offs, perf on low-end, a11y, funnel analytics. |

## Common mistakes

- Jumping to components (card form, method list) before defining data/entities like Order, PaymentAttempt, and the status enum.
- Rendering the checkout directly in the merchant's DOM, or using Shadow DOM and calling it "secure".
- Sending the amount from the client, or trusting the JS `handler` callback without server-side signature verification.
- Using `postMessage(data, '*')` or not checking `event.origin` in the listener.
- Treating timeout as failure and telling the user "Payment failed" when money may be debited.
- Forgetting that the tab is hidden while the user is in the UPI app (pausing polling and never re-checking on return).

## My mistakes

- [ ]
