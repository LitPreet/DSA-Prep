# Live Order Tracking (e.g. Swiggy / Zepto / Blinkit order status page)

> **Difficulty:** Medium · **Asked at:** Indian food delivery and quick-commerce companies (Swiggy, Zepto, Blinkit), plus logistics and travel companies with "track your booking" pages · **Time in interview:** 45 min
> Not on GreatFrontEnd's list; matches the products of Indian product companies.

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Is this mobile web, desktop web, or inside a native app's WebView? → Assume: mobile web first (most users), desktop should also work.
- Which statuses exist? Can an order go backwards or skip steps? → Assume: placed → confirmed → packed → picked up → arriving → delivered. Also cancelled and delayed. No going backwards.
- Do we show the rider on a live map? → Assume: yes, once the rider has picked up the order.
- How fresh must the data be? → Assume: status within ~5 seconds, rider location within ~5 seconds is fine.
- How many people track at the same time? → Assume: lakhs of active orders at peak (dinner time, IPL nights). Server cost of each open connection matters.
- Do we need chat with the rider / call rider / tip? → Assume: show "Call rider" button only. Chat is out of scope.
- Should the user get notified if they leave the page? → Assume: yes, browser notification if permission is given, plus in-page toast.
- Can one user track many orders? → Assume: one order per page. A list page shows all active orders but is out of scope.

## 1. Requirements

### Functional

- Show the current order status with a step-by-step timeline (stepper).
- Update the status live without page refresh.
- After pickup, show the rider on a map moving towards the user's address, with ETA ("Arriving in 8 mins").
- Show order details: items, total, address, rider name and photo, call button.
- Show special states: cancelled (with reason and refund info), delayed (with new ETA and apology).
- Notify the user when the status changes (toast in page, browser notification if tab is hidden).

### Non-functional (performance, accessibility, devices, network)

- **Performance:** status visible in under 1.5s on a mid-range Android on 4G. First load JS for the page under ~100 KB gzipped; the map SDK (~200–300 KB) loads lazily.
- **Devices:** many users are on low-end Android phones (2–3 GB RAM, slow CPU). Animations must not drop frames or drain the battery.
- **Network:** 3G/4G with drops (lifts, basements, metro). The page must survive disconnects and show stale data clearly.
- **Real-time:** status lag under ~5s; location updates every 3–5s.
- **Accessibility:** status changes announced to screen readers; stepper readable without the map; color is never the only signal.
- **Battery and data:** slow down or stop updates when the tab is hidden.

### Out of scope

- Placing the order, payment, cart.
- Rider app and the routing/ETA algorithm (backend computes ETA).
- Chat with the rider or support.
- Order history page.

## 2. Architecture

```text
+---------------------------------------------------------------+
|                    OrderTrackingPage (route)                  |
|                                                               |
|  +--------------------+     +------------------------------+  |
|  | StatusHeader       |     | LiveMap (lazy loaded)        |  |
|  | "Arriving in 8 min"|     |  - RiderMarker (animated)    |  |
|  +--------------------+     |  - Home marker, route line   |  |
|  +--------------------+     +------------------------------+  |
|  | StatusStepper      |     +------------------------------+  |
|  | (aria-live region) |     | RiderCard / OrderSummary     |  |
|  +--------------------+     +------------------------------+  |
|  +--------------------+                                       |
|  | ConnectionBanner   |  (offline / stale / reconnecting)     |
|  +--------------------+                                       |
+-------------------------------+-------------------------------+
                                |  reads state
                                v
+---------------------------------------------------------------+
|         Order Tracking Store (reducer = state machine)        |
|   order, status, eta, riderLocation, connection, lastUpdated  |
+-------------------------------+-------------------------------+
                                |  events
                                v
+---------------------------------------------------------------+
|                    Realtime Client                            |
|   SSE (primary) -> polling with backoff (fallback)            |
|   Page Visibility handling, reconnect, resync                 |
+------------------+-------------------------+------------------+
                   |                         |
          GET /orders/:id (snapshot)   GET /orders/:id/stream (SSE)
                   |                         |
                   v                         v
+---------------------------------------------------------------+
|        Backend: Order service + Rider location service        |
+---------------------------------------------------------------+
```

| Component | Responsibility |
|---|---|
| OrderTrackingPage | Route `/orders/:id/track`. Fetches snapshot, starts realtime client, renders layout. |
| Order Tracking Store | Single source of truth. A reducer that only allows valid status transitions. |
| Realtime Client | Opens SSE, falls back to polling, handles visibility, reconnect, and resync. |
| StatusHeader | Big text: current status + ETA. The first thing the user sees. |
| StatusStepper | Timeline of steps with times. Has the `aria-live` region. |
| LiveMap | Lazy-loaded map SDK. Shows rider, home, and route. Only mounted after pickup. |
| RiderMarker | Animates smoothly between location points. |
| ConnectionBanner | Shows "You are offline" / "Last updated 2 min ago" / "Reconnecting...". |
| NotificationService | Toast when visible, browser Notification when tab is hidden. |

**Main flow: status changes from "packed" to "picked up"**

1. Page loads. We render the server-sent HTML shell, then call `GET /orders/:id` for a full snapshot.
2. The store is filled with the snapshot (status `packed`, version 4).
3. Realtime client opens SSE at `/orders/:id/stream?since=4`.
4. Rider picks up the order. Backend pushes `{ type: "status", status: "picked_up", version: 5 }`.
5. Store reducer checks: is `packed → picked_up` valid and is `version 5 > 4`? Yes, so it updates.
6. StatusStepper re-renders; the aria-live region says "Order picked up. Arriving in 12 minutes."
7. Because status is now `picked_up`, the page lazy-loads the map chunk and starts showing rider location events.
8. If the tab is hidden, NotificationService shows a browser notification instead of a toast.

## 3. Data model

```ts
type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "picked_up"
  | "arriving"
  | "delivered"
  | "cancelled";

type LatLng = { lat: number; lng: number };

type Order = {
  id: string;
  status: OrderStatus;
  version: number;              // increases on every server change; used to drop old events
  isDelayed: boolean;           // "delayed" is a flag, not a step (it can happen at any step)
  delayReason?: string;
  etaMinutes: number | null;
  etaUpdatedAt: string;         // ISO time
  timeline: { status: OrderStatus; at: string }[];
  items: { name: string; qty: number; price: number }[];
  totalPaise: number;           // money in paise to avoid float errors
  deliveryAddress: { text: string; location: LatLng };
  store: { name: string; location: LatLng };
  rider?: { id: string; name: string; photoUrl: string; maskedPhone: string };
  cancel?: { reason: string; refundStatus: "initiated" | "done" };
};

type RiderLocation = {
  lat: number;
  lng: number;
  heading: number;              // degrees, to rotate the bike icon
  at: number;                   // server timestamp (ms)
};

type ConnectionState =
  | { kind: "connecting" }
  | { kind: "live"; transport: "sse" | "polling" }
  | { kind: "reconnecting"; attempt: number }
  | { kind: "offline" };

type TrackingState = {
  order: Order | null;
  riderLocation: RiderLocation | null;
  connection: ConnectionState;
  lastUpdatedAt: number;        // client time of last good message, for "stale" banner
};
```

| Entity | Lives in | Why |
|---|---|---|
| Order (status, timeline, items) | Server (truth) + client store | Server owns it; client keeps a copy for rendering. |
| Order id | URL (`/orders/:id/track`) | Shareable, survives refresh, deep link from notification. |
| Rider location | Client store (memory only) | Changes every few seconds; no need to persist. |
| Animated marker position | Ref inside RiderMarker / map SDK | Changes 60 times/sec; must not go through React state. |
| Connection state, lastUpdatedAt | Client store | Drives banners across many components. |
| Notification permission asked? | localStorage | Don't ask the user again on every order. |
| Last known snapshot | sessionStorage (optional) | Instant render on refresh while fresh data loads. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
type StatusStepperProps = {
  status: OrderStatus;
  timeline: Order["timeline"];
  isDelayed: boolean;
  etaMinutes: number | null;
};

type LiveMapProps = {
  riderLocation: RiderLocation | null;
  destination: LatLng;
  origin: LatLng;                     // store location
  onMapError?: (e: Error) => void;    // fall back to stepper-only view
};

type RiderMarkerProps = {
  target: RiderLocation;              // the newest point; marker animates towards it
  animationMs?: number;               // default: time between updates (~4000)
};

type ConnectionBannerProps = {
  connection: ConnectionState;
  lastUpdatedAt: number;
  onRetry: () => void;
};
```

### Server API (endpoints, method, params, example JSON; real-time message formats)

**1. Snapshot** — `GET /api/orders/:id`

```json
{
  "id": "ord_81Kx",
  "status": "packed",
  "version": 4,
  "isDelayed": false,
  "etaMinutes": 14,
  "etaUpdatedAt": "2026-11-26T19:42:10Z",
  "timeline": [
    { "status": "placed", "at": "2026-11-26T19:35:00Z" },
    { "status": "confirmed", "at": "2026-11-26T19:35:20Z" },
    { "status": "packed", "at": "2026-11-26T19:39:02Z" }
  ],
  "rider": null
}
```

**2. Live stream (SSE)** — `GET /api/orders/:id/stream?since=4` with `Accept: text/event-stream`

```text
id: 5
event: status
data: {"status":"picked_up","version":5,"etaMinutes":12,"rider":{"id":"r_9","name":"Ramesh"}}

event: location
data: {"lat":12.9352,"lng":77.6245,"heading":80,"at":1764186130000}

event: eta
data: {"etaMinutes":9,"version":6}

: heartbeat
```

- `id:` lets the browser send `Last-Event-ID` on auto-reconnect, so the server can replay missed status events.
- Location events have no `id` (we only care about the latest, never replay old ones).
- Heartbeat comment every 15s so proxies don't close the connection and we can detect a dead stream.

**3. Polling fallback** — `GET /api/orders/:id/status?since=5`

```json
{ "changed": true, "order": { "...": "same shape as snapshot" }, "riderLocation": { "lat": 12.93, "lng": 77.62, "heading": 80, "at": 1764186130000 }, "nextPollMs": 5000 }
```

`nextPollMs` lets the server slow clients down during peak load.

## 5. Optimizations and deep dives

### 5.1 Order status as a finite state machine

A finite state machine (FSM) means: a fixed list of states and a fixed list of allowed moves between them. Anything else is ignored. This stops bugs like the UI jumping from "delivered" back to "packed" because an old event arrived late.

```ts
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  placed:    ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed:    ["picked_up", "cancelled"],
  picked_up: ["arriving", "delivered"],   // can skip "arriving" if very close
  arriving:  ["delivered"],
  delivered: [],                          // final
  cancelled: [],                          // final
};

function trackingReducer(state: TrackingState, ev: ServerEvent): TrackingState {
  if (!state.order) return state;
  if (ev.type === "status") {
    if (ev.version <= state.order.version) return state;          // old or duplicate
    const allowed = NEXT[state.order.status];
    const skipOk = rank(ev.status) > rank(state.order.status);    // missed a step
    if (!allowed.includes(ev.status) && !skipOk) return state;    // invalid -> resync
    return { ...state, order: { ...state.order, ...ev.patch, status: ev.status, version: ev.version } };
  }
  // ...location, eta, connection events
  return state;
}
```

Points to say:
- **Delayed is a flag, not a state.** An order can be delayed while packing or while on the way. Making it a state would double the number of states.
- **Final states** (`delivered`, `cancelled`) close the stream and stop polling.
- **Missed steps:** if we were offline and get `delivered` after `packed`, allow forward jumps (by rank) and fill the timeline from the snapshot.
- If an event is truly invalid, don't guess: refetch the snapshot.
- The UI derives everything from the state: `showMap = status in [picked_up, arriving]`, `canCancel = status in [placed, confirmed]`. No scattered boolean flags like `isPacked`, `isOnTheWay`.

### 5.2 Real-time updates: WebSocket vs SSE vs polling

| | Polling | SSE | WebSocket |
|---|---|---|---|
| Direction | Client asks | Server → client | Both ways |
| Complexity | Lowest | Low (plain HTTP) | Higher (own protocol, LB config) |
| Auto-reconnect | N/A | Built in (`EventSource`) | You write it |
| Works through corporate proxies | Yes | Mostly | Sometimes blocked |
| Cost per user | Request every N sec | One open HTTP connection | One open TCP connection |

**Why SSE is enough here:** data only flows one way (server → user). The user never sends anything in real time. Status changes maybe 6 times in 30 minutes; location every 4s. That is low traffic. SSE gives auto-reconnect and `Last-Event-ID` for free and works over normal HTTP/2.

**Why even polling can be enough:** a status change every few minutes does not need a push. Polling every 5s with a 304/`changed: false` response is cheap and easy to cache and scale. Many real apps poll. A good answer: "Polling for status is fine; I'd use SSE once we show the live map, because location every 4s by polling is a lot of requests."

**Fallback chain:**

```ts
function startRealtime(orderId: string, version: number) {
  if ("EventSource" in window) {
    const es = new EventSource(`/api/orders/${orderId}/stream?since=${version}`);
    let failures = 0;
    es.onerror = () => {
      failures++;
      if (failures >= 3) { es.close(); startPolling(orderId); }   // SSE keeps failing -> poll
    };
    es.onopen = () => { failures = 0; };
    return () => es.close();
  }
  return startPolling(orderId);
}

function nextDelay(attempt: number) {
  const base = Math.min(30_000, 2_000 * 2 ** attempt);   // 2s, 4s, 8s ... max 30s
  return base / 2 + Math.random() * (base / 2);          // jitter: avoid all clients retrying together
}
```

Jitter matters: if the server restarts during IPL dinner peak, lakhs of clients reconnecting at the same second will knock it down again ("thundering herd").

### 5.3 Live rider location on the map

**Throttling.** The rider app may send GPS every 1s. The backend should forward to customers only every 3–5s. On the client, also ignore points that are older than the current one (`at` timestamp) and points that moved less than ~5 metres (GPS jitter while waiting at a signal).

**Smooth animation.** If we just set the marker to the new point, it jumps 30–50 metres every 4 seconds. Instead, animate from the current position to the new one over roughly the gap between updates.

```ts
function animateMarker(marker: MapMarker, from: LatLng, to: LatLng, durationMs = 4000) {
  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    marker.setPosition({
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    });
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);   // cancel when the next point arrives
}
```

- Run this **outside React state**. Store the marker in a `useRef` and call the map SDK directly. 60 `setState` calls per second on a low-end phone will lag.
- When a new point arrives mid-animation, start the next animation from the marker's **current** position, not the old target.
- If the gap is huge (we were offline 2 minutes), **jump** instead of animating across the city.
- Rotate the bike icon using `heading`. Use CSS `transform: rotate()` on the marker element (GPU-friendly).
- Linear interpolation of lat/lng is fine for short distances (a few hundred metres).

**ETA display.** Backend computes ETA (it knows roads and traffic). Client only shows it. Show "Arriving in 8 mins", not "8.4 min". Don't let the ETA go up and down every 4 seconds; only show changes of 1+ minute. When ETA is under 1 minute: "Arriving now". If ETA is past and not delivered: switch to the delayed message rather than "-2 mins".

### 5.4 Background tabs, mobile web and resilience

**Page Visibility API** tells us when the tab is hidden (user switched apps, locked phone).

```ts
useEffect(() => {
  const onChange = () => {
    if (document.visibilityState === "hidden") {
      realtime.pauseLocation();          // stop location stream / slow polling to 30s
    } else {
      realtime.resyncNow();              // fetch snapshot immediately, then resume
    }
  };
  document.addEventListener("visibilitychange", onChange);
  window.addEventListener("online", realtime.resyncNow);
  window.addEventListener("offline", realtime.markOffline);
  return () => { /* remove all three listeners */ };
}, []);
```

- Mobile browsers freeze hidden tabs anyway; SSE connections often die silently. So on return to the tab, **always refetch the snapshot** instead of trusting that the stream is alive.
- While hidden, still keep status updates (slow poll every 30s) so we can show a browser notification for "Out for delivery" / "Delivered".
- Detect a dead stream with the heartbeat: if no message (data or heartbeat) for 30s, treat as disconnected and reconnect.

**Resilience UI:**
- **Offline banner:** "You're offline. Showing last known status." from `navigator.onLine` + failed requests.
- **Stale indicator:** if `now - lastUpdatedAt > 60s`, show "Last updated 2 mins ago" and grey out the rider marker. Never show a confident ETA from old data.
- **Retry button** in the banner, plus automatic retry with backoff.
- **Map fails to load** (SDK blocked, slow network): show the stepper and a static "Rider is 1.2 km away" text. The page must still work without the map.

### 5.5 Performance on low-end Android and slow networks

- **Lazy-load the map SDK.** Google Maps / Mapbox JS is 200 KB+ and heavy to start. The user doesn't need it until pickup. Use `React.lazy(() => import("./LiveMap"))` and only render it when `status` is `picked_up` or `arriving`. Show a static placeholder image of the area (cheap static map image, ~30 KB) while it loads.
- **Preload smartly:** when status becomes `packed`, start `import("./LiveMap")` in idle time (`requestIdleCallback`) so it's ready at pickup.
- **SSR or a light shell** for the status header, so the most important text ("Arriving in 8 mins") paints first.
- **Small payloads:** location events are ~80 bytes. Don't send the full order on every location tick.
- **Limit re-renders:** split the store so location updates re-render only the map, not the stepper and order summary. Use a selector (`useStore(s => s.riderLocation)`) or separate contexts.
- **Battery:** stop all animations and location updates when hidden; use `rAF` (paused in background automatically) instead of `setInterval` for animation.
- **Rider photo:** small, lazy, WebP, with fixed width/height to avoid layout shift.

### 5.6 Notifications and accessibility

**Notifications:**
- Tab visible → in-page toast + update stepper.
- Tab hidden → `new Notification("Your order is out for delivery", { tag: orderId })`. `tag` makes the new notification replace the old one instead of stacking.
- Ask permission only after a user action (e.g. a "Notify me" button), never on page load; browsers block or users deny pop-up prompts.
- For real push when the page is closed, use Web Push + Service Worker (mention, but the native app usually handles this).
- Notify only for important changes: picked up, arriving, delivered, cancelled, delayed. Not for ETA changes.

**Accessibility:**

```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  Order picked up by Ramesh. Arriving in 12 minutes.
</div>
<ol aria-label="Order progress">
  <li aria-current="step">Picked up, 7:48 PM</li>
  ...
</ol>
```

- `aria-live="polite"` announces status changes without interrupting. Use `assertive` only for cancelled.
- Announce **status changes only**, never location ticks or every ETA change.
- The stepper is an `<ol>` with `aria-current="step"`. Done/current/pending shown with icons + text, not only color.
- The map is decorative for screen readers (`aria-hidden`), with a text alternative: "Rider is 1.2 km away".
- Respect `prefers-reduced-motion`: jump the marker instead of animating, no pulsing dots.

### Also mention

- **Analytics:** time-to-first-status, SSE failure rate, % users on polling fallback.
- **Security:** order id in URL is not enough; the endpoint checks the logged-in user owns the order. Rider phone is masked (call goes via a proxy number).
- **Multiple tabs:** use `BroadcastChannel` so only one tab holds the stream (nice-to-have).
- **i18n:** Hindi and regional languages; times in the user's locale (`7:48 PM`).
- **Feature flag** to switch everyone to polling if the SSE servers are struggling.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Transport | WebSocket | SSE / polling | SSE with polling fallback. Data is one-way; SSE has built-in reconnect and is plain HTTP. |
| Status updates only (no map) | SSE | Polling every 5–10s | Polling is fine. Rare changes; simpler to scale and cache. |
| Location frequency | Every 1s | Every 3–5s | 3–5s. Smooth animation hides the gap; 4x less data and battery. |
| Marker movement | Jump to new point | Animate between points | Animate with rAF in a ref; jump if the gap is very large or reduced motion is on. |
| Delayed | Separate state | Flag on any state | Flag. Delay can happen at any step; keeps the FSM small. |
| Map loading | In main bundle | Lazy load at pickup | Lazy. Most of the order time is before pickup; saves 200 KB+ on first load. |
| ETA computing | On client from distance | From server | Server. It knows roads and traffic; client just displays. |
| Reconnect | Trust stream replay | Refetch snapshot | Both: `Last-Event-ID` replay, plus snapshot on focus/online as the safe default. |

## 7. Likely follow-up questions

**Q1. How do you handle events arriving out of order?**
Every status event has a `version`. The reducer drops any event with version ≤ current. Location events have a timestamp `at`; drop any point older than the current one.

**Q2. What happens if the user is offline for 5 minutes and comes back?**
`online` / `visibilitychange` triggers a snapshot refetch. We replace the store with the snapshot, jump (not animate) the marker, and reopen SSE with `since=<version>`. The stale banner disappears.

**Q3. How would you scale this for lakhs of concurrent users?**
That is mostly backend, but frontend helps: jittered backoff, server-controlled `nextPollMs`, heartbeat every 15s (not every 1s), pause location when hidden, and a feature flag to fall back to polling. SSE over HTTP/2 shares one connection per origin.

**Q4. Why not use WebSocket?**
We don't need client → server messages. WebSocket needs custom reconnect, custom resume logic, and sticky load-balancer setup. SSE gives this for free. If later we add rider chat, I'd reconsider.

**Q5. How do you test the state machine?**
Unit test the reducer: every valid transition, every invalid one is ignored, duplicate versions ignored, forward jumps allowed. It's a pure function, so tests are easy and fast.

**Q6. How do you stop the map from killing performance on cheap phones?**
Lazy load it, mount only after pickup, animate the marker with rAF directly on the SDK object (no React re-renders), keep only 2 markers + 1 polyline, and unmount the map when the order is delivered.

**Q7. How would you make the ETA trustworthy?**
Show it only from fresh data. If data is older than 60s, hide the number and show "Updating...". Round to whole minutes, avoid small flips, and switch to the delay message when the ETA has passed.

**Q8. The user opens the same order in two tabs. Problem?**
Works, but doubles connections. Use `BroadcastChannel` + a simple leader election (first tab holds the stream and broadcasts updates). Optional.

**Q9. How does the notification deep-link work?**
`notification.onclick = () => { window.focus(); }` and the URL already has the order id. With a Service Worker push, `clients.openWindow("/orders/ord_81Kx/track")`.

## 8. If you only have 60 seconds

- Model the order status as a finite state machine with versioned events, so old or invalid events can never move the UI backwards.
- Start with a REST snapshot, then SSE for live updates; fall back to polling with exponential backoff and jitter.
- Rider location every 3–5s, animated smoothly with requestAnimationFrame on a ref, never through React state.
- Lazy-load the heavy map only after pickup; the stepper and ETA text work without it.
- Page Visibility: slow down when hidden, refetch the snapshot when the user comes back or goes online.
- Clear stale/offline banners; never show a confident ETA from old data.
- aria-live for status changes only, browser notifications when the tab is hidden.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarify + requirements | Platform, statuses, map or not, freshness, scale, out of scope. |
| 5–12 | Architecture | Box diagram: page, store, realtime client, backend. Main flow of one status change. |
| 12–18 | Data model + API | Order type, FSM states, version field; snapshot + SSE message formats. |
| 18–38 | Deep dives | FSM reducer (5 min), SSE vs polling + fallback (5 min), map animation + throttling (5 min), visibility/offline/stale (5 min). |
| 38–43 | Performance + a11y | Lazy map, low-end Android, aria-live, notifications. |
| 43–45 | Trade-offs + wrap up | Say the 60-second summary. |

## Common mistakes

- Jumping to components before defining data/entities (statuses, versions, location shape).
- Saying "use WebSocket" without explaining why, or without a fallback and reconnect plan.
- Putting rider location animation into React state, causing re-renders 60 times a second.
- Using many booleans (`isPacked`, `isOnTheWay`) instead of one status field with allowed transitions.
- Forgetting that mobile tabs get frozen in the background; not resyncing on focus.
- Showing an old ETA as if it were live; no stale or offline indicator.

## My mistakes

- [ ]
