# Notification System (toasts + notification inbox/bell, e.g. LinkedIn / Swiggy web)

> **Difficulty:** Medium · **Asked at:** most consumer product companies (Swiggy, Zepto, Flipkart, CRED, Groww order/price alerts) and fintech dashboards (Razorpay); often asked as "design a toast library" or "design the notification bell" · **Time in interview:** 45 min
> Not on GreatFrontEnd's list; common at Indian product companies.

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

---

## 0. Clarifying questions to ask first

- Which part do you want: the toast component, the inbox (bell), or the full system?
  → Assume: both. Toasts for short-lived feedback, inbox for stored notifications. Spend more time on the one the interviewer picks.
- Where do notifications come from? Only the user's own actions, or server events too ("Your order is out for delivery")?
  → Assume: both. Local actions → toast only. Server events → inbox + maybe a toast + maybe a browser push.
- Do we need real-time, and how fast?
  → Assume: yes, within ~2 s while the tab is open.
- Should notifications reach the user when the tab is closed?
  → Assume: yes, with browser push, only if the user allows.
- How many notifications per user?
  → Assume: up to ~100 per day for heavy users; inbox keeps 90 days.
- Multiple tabs open?
  → Assume: yes, unread count must match in all tabs.
- Notification types?
  → Assume: order updates, social (likes, comments), promos, security alerts. Users can turn types on/off.
- Devices?
  → Assume: desktop and mobile web.

## 1. Requirements

### Functional
**Toasts**
- Show success / error / info / warning toasts from anywhere: `toast.success('Saved')`.
- Auto-dismiss after 4 s (errors stay 8 s or until closed). Pause timer on hover/focus.
- Max 3 visible at a time; extra ones wait in a queue.
- Optional action button ("Undo", "Retry").
- Close button.

**Inbox**
- Bell icon with unread badge ("9+" above 9).
- Click opens a dropdown with latest notifications, newest first, infinite scroll.
- Click a notification → mark it read and go to its link.
- "Mark all as read".
- Filter tabs: All / Unread (nice to have).
- New notifications appear live, badge updates.
- Settings page: turn categories on/off per channel (in-app, push, email).

**Push**
- Browser push when tab is closed, for allowed categories.

### Non-functional (performance, accessibility, devices, network)
- **Performance:** bell + count must not block page load — fetch the count after first paint. Dropdown opens in under 100 ms (prefetch first page on hover/idle). The toast library adds under 5 KB gzipped.
- **Real-time:** under 2 s from server event to UI. One connection per browser, not per tab (nice to have).
- **Accessibility:** toasts are announced by screen readers (`aria-live`), don't steal focus, and stay long enough to read (WCAG 2.2.1 — pause on hover/focus). Bell dropdown is keyboard usable, Esc closes, focus returns to the bell.
- **Devices:** toasts at bottom-center on mobile (thumb area, above bottom nav), top-right on desktop. Dropdown becomes a full-screen sheet on mobile.
- **Network:** reconnect after drops without losing events. Show nothing broken when offline — just stale count.

### Out of scope
- Backend fan-out (how the server decides who gets what).
- Email/SMS delivery.
- Native mobile app push (FCM/APNs on app).
- Rich notification grouping like "Rahul and 20 others liked your post" — mention as follow-up.

## 2. Architecture

```text
 +------------------------------ Browser tab ------------------------------+
 |                                                                         |
 |  Any component --toast.success()--> +----------------+                  |
 |                                     |  Toast Store   |--> <ToastViewport>|
 |                                     | (queue, max 3) |    (portal,       |
 |                                     +----------------+     aria-live)    |
 |                                                                         |
 |  +-----------+    +--------------------------+     +-----------------+  |
 |  | <Bell/>   |<-->|  Notifications Store     |<--->|  API client     |  |
 |  | badge     |    |  items byId, order,      |     |  (REST)         |  |
 |  +-----------+    |  unreadCount, cursor     |     +-----------------+  |
 |  +-----------+    +-----^------------^-------+                          |
 |  | <Inbox    |          |            |                                  |
 |  | Dropdown/>|          |            | BroadcastChannel('notif')        |
 |  +-----------+          |            +-------> other tabs               |
 |                +--------+---------+                                     |
 |                | Realtime client  |  SSE (EventSource), reconnect       |
 |                | + de-dup by id   |  with Last-Event-ID                 |
 |                +--------+---------+                                     |
 +-------------------------|-----------------------------------------------+
                           |                       +----------------------+
                           v                       |  Service Worker      |
                 +--------------------+  push      |  'push' event ->     |
                 | Notification API   |----------->|  showNotification()  |
                 | server + SSE + Web |            |  'notificationclick' |
                 | Push (VAPID)       |            |  -> focus/open tab   |
                 +--------------------+            +----------------------+
```

| Component | Responsibility |
|---|---|
| Toast Store | Holds queue of toasts; exposes `toast.*()` imperative API; enforces max visible. |
| ToastViewport | Renders visible toasts in a portal; owns live regions; handles timers. |
| Notifications Store | Inbox items, unread count, cursor, optimistic read state. |
| Bell | Shows badge, opens dropdown, prefetches first page on hover. |
| InboxDropdown | List with infinite scroll, mark read, mark all read, empty/error states. |
| Realtime client | One SSE connection; pushes new items into store; de-dups; may also show a toast. |
| BroadcastChannel sync | Shares new items and read changes across tabs of the same site. |
| Service Worker | Receives push messages when the tab is closed; shows OS notifications; handles click. |
| Preferences page | Reads/writes per-category, per-channel settings. |

**Main flow — "Order out for delivery" arrives while the user is on the site:**
1. Server writes the notification to DB and sends an SSE event `notification.created` with `id: n_789`.
2. Realtime client receives it. If `n_789` is already in the store (seen before), ignore it.
3. Store adds it to the top of the list and does `unreadCount += 1`. The badge updates.
4. Because its priority is `high`, the realtime client also calls `toast.info('Your order is out for delivery', { action: 'Track' })`.
5. The tab posts `{ type: 'created', item }` on BroadcastChannel so other open tabs update without waiting for their own SSE.
6. User clicks the bell → dropdown shows it bold (unread). User clicks it → optimistic `read: true`, `unreadCount -= 1`, `POST /notifications/n_789/read`, navigate to `/orders/123`.
7. If the tab was closed, the server sends a Web Push instead; the Service Worker shows an OS notification. Clicking it opens `/orders/123`.

## 3. Data model

```ts
type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration: number;          // ms; Infinity = sticky
  action?: { label: string; onClick: () => void };
  dedupeKey?: string;        // same key replaces the old toast
  createdAt: number;
}

interface ToastState {
  visible: Toast[];          // max 3
  queue: Toast[];            // waiting
}
```

```ts
type NotificationCategory = 'order' | 'social' | 'promo' | 'security' | 'payment';

interface AppNotification {
  id: string;                // server id, used for de-dup
  category: NotificationCategory;
  priority: 'low' | 'normal' | 'high';
  title: string;
  body: string;
  imageUrl?: string;
  link: string;              // in-app route, e.g. /orders/123
  createdAt: string;         // ISO
  read: boolean;
  groupKey?: string;         // for "Rahul and 4 others liked..."
}

interface InboxState {
  byId: Record<string, AppNotification>;
  order: string[];           // newest first
  unreadCount: number;       // from server, adjusted optimistically
  cursor: string | null;
  status: 'idle' | 'loading' | 'error';
  lastEventId: string | null;
}

interface NotificationPreferences {
  // category -> channel -> on/off
  [category: string]: { inApp: boolean; push: boolean; email: boolean };
}
```

| Entity | Lives in | Why |
|---|---|---|
| Toasts (visible + queue) | Client store (module-level store / context) | Short-lived UI; never sent to server. |
| Toast timer remaining | Component state (ref) | Only that toast needs it; pause/resume per toast. |
| Inbox items | Server (truth) + client store (cache, e.g. React Query infinite query) | Paged, shared between bell and full page. |
| Unread count | Server + client store | Must be correct across devices; client adjusts optimistically. |
| Dropdown open/closed | Component state | Pure UI. |
| Full inbox page filter (`?tab=unread`) | URL | Shareable, back button works. |
| Last seen event ID | Client store (+ sessionStorage) | Replay missed events after reconnect. |
| Push subscription | Server (+ browser PushManager) | Server needs the endpoint to send pushes. |
| "Asked for push permission at" | localStorage | Don't nag; ask again only after 30 days. |
| Preferences | Server | Same settings on all devices; server uses them to filter. |

## 4. Interface (API)

### Component API

```tsx
// Mount once at the app root
<Toaster position="top-right" maxVisible={3} defaultDuration={4000} />

// Imperative API usable anywhere (even outside React, e.g. in an axios interceptor)
toast.success('Address saved');
toast.error('Payment failed', { duration: 8000, action: { label: 'Retry', onClick: retry } });
const id = toast.loading('Uploading...');
toast.update(id, { type: 'success', message: 'Uploaded', duration: 3000 });
toast.dismiss(id);
toast.promise(saveProfile(), { loading: 'Saving...', success: 'Saved', error: 'Could not save' });

// Bell + inbox
<NotificationBell
  maxBadge={9}                    // shows "9+"
  onOpen={() => void}
/>
<NotificationList
  variant="dropdown" | "page"
  filter="all" | "unread"
  pageSize={20}
  onItemClick={(n: AppNotification) => void}
/>
```

### Server API

**1. List** — `GET /notifications?limit=20&cursor=<opaque>&filter=unread`

```json
{
  "items": [
    { "id": "n_789", "category": "order", "priority": "high",
      "title": "Out for delivery", "body": "Ravi is on the way with your order",
      "link": "/orders/123", "createdAt": "2026-11-26T12:01:00Z", "read": false }
  ],
  "nextCursor": "eyJ0IjoiMjAyNi0xMS0yNlQxMjowMTowMFoiLCJpZCI6Im5fNzg5In0",
  "unreadCount": 4
}
```

**Why cursor?** New notifications arrive at the top all the time. With `offset=20`, one new item shifts the list and page 2 repeats an item. A cursor `(createdAt, id)` means "older than this one", which stays stable.

**2. Unread count only** — `GET /notifications/unread-count` → `{ "count": 4 }`. Small and cheap; called on page load and on reconnect.

**3. Mark one read** — `POST /notifications/:id/read` → `204`. Idempotent.

**4. Mark all read** — `POST /notifications/read-all` with `{ "before": "2026-11-26T12:01:00Z" }`.
The `before` timestamp matters: a notification that arrived *after* the user clicked must stay unread.

**5. Preferences** — `GET /notification-preferences`, `PUT /notification-preferences` with the full object.

**6. Push subscription** — `POST /push-subscriptions` with the `PushSubscription` JSON (`endpoint`, `keys.p256dh`, `keys.auth`). `DELETE` on logout.

**7. Real-time** — `GET /notifications/stream` (SSE, cookie auth)

```text
id: 1048
event: notification.created
data: {"id":"n_789","category":"order","priority":"high","title":"Out for delivery", "...": "..."}

id: 1049
event: notification.read
data: {"ids":["n_789"]}           // read on another device

id: 1050
event: unread.count
data: {"count":3}

: heartbeat every 25s (comment line, keeps proxies from closing the connection)
```

On reconnect, the browser sends `Last-Event-ID: 1050` automatically; the server replays anything after it.

## 5. Optimizations and deep dives

### 5.1 Toast component: queue, stacking, timers, imperative API

**Imperative API without passing context everywhere.** Use a tiny module-level store (event-emitter style) that React subscribes to with `useSyncExternalStore`. This lets you call `toast()` from anywhere, including non-React code like an API interceptor.

```ts
type Listener = () => void;
let state: ToastState = { visible: [], queue: [] };
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
const MAX = 3;

function add(t: Omit<Toast, 'id' | 'createdAt'>) {
  const toast = { ...t, id: crypto.randomUUID(), createdAt: Date.now() };
  // de-dup: same key replaces the existing toast instead of stacking
  if (t.dedupeKey) {
    const i = state.visible.findIndex((x) => x.dedupeKey === t.dedupeKey);
    if (i >= 0) { state = { ...state, visible: state.visible.with(i, toast) }; emit(); return toast.id; }
  }
  state = state.visible.length < MAX
    ? { ...state, visible: [...state.visible, toast] }
    : { ...state, queue: [...state.queue, toast] };
  emit();
  return toast.id;
}

function dismiss(id: string) {
  const visible = state.visible.filter((t) => t.id !== id);
  const [next, ...rest] = state.queue;
  state = { visible: next ? [...visible, next] : visible, queue: rest };
  emit();
}

export const toast = Object.assign((m: string) => add({ type: 'info', message: m, duration: 4000 }), {
  success: (m: string, o = {}) => add({ type: 'success', message: m, duration: 4000, ...o }),
  error:   (m: string, o = {}) => add({ type: 'error', message: m, duration: 8000, ...o }),
  dismiss,
});

export const useToasts = () =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state);
```

The context-based alternative (`<ToastProvider>` + `useToast()`) works too but only inside React components. Many libraries (react-hot-toast, sonner) use the store approach.

**Auto-dismiss with pause on hover/focus.** Track remaining time, not just a `setTimeout`:

```ts
function useAutoDismiss(id: string, duration: number, paused: boolean) {
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  useEffect(() => {
    if (paused || duration === Infinity) return;
    startedAt.current = Date.now();
    const t = setTimeout(() => toast.dismiss(id), remaining.current);
    return () => {                    // runs on pause or unmount
      clearTimeout(t);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, id, duration]);
}
```

- Pause when: mouse over the viewport (pause all — the user is reading), any toast has focus, or the tab is hidden (`visibilitychange`) — otherwise toasts vanish while the user is in another tab.
- Stacking: 3 visible. Newest on top (desktop) or bottom (mobile). Collapsed "stack" look (sonner style) expands on hover.
- **Portal:** render `<ToastViewport>` with `createPortal(..., document.body)` so `overflow: hidden` or `z-index` of a parent can't clip it. Put it above modals (`z-index` higher than the modal layer).
- Animations: CSS transform + opacity only (GPU friendly). Respect `prefers-reduced-motion`.
- Swipe to dismiss on mobile (pointer events, dismiss if dragged > 50% width).

### 5.2 Toast accessibility

- Keep **two live regions always in the DOM** (create them at mount, empty). Screen readers often ignore live regions that are added together with their content.
  - `role="status"` / `aria-live="polite"` for success/info — read when the user is idle.
  - `role="alert"` / `aria-live="assertive"` for errors — interrupts.
- Don't move focus to a toast. It would break what the user was doing.
- A toast with an action ("Undo") must be reachable: give a keyboard shortcut (e.g. F8 jumps to the toast region, like Radix) and keep it open while it has focus.
- Don't put critical info only in a toast. If payment failed, show it on the page too.
- Error toasts: 8 s minimum or sticky. Rule of thumb: ~1 s per 15 words + 2 s.

### 5.3 Inbox: bell, list, pagination, optimistic read

- **Load order:** page shell renders the bell without a badge. After first paint (or `requestIdleCallback`), fetch `unread-count` (a tiny request). Fetch the list only when the user hovers or opens the bell (prefetch on hover saves ~200 ms).
- **List:** React Query `useInfiniteQuery` with `nextCursor`. `IntersectionObserver` sentinel loads the next 20. Inside a dropdown the list is small (max-height 480 px), so virtualization only matters on the full `/notifications` page with hundreds of items.
- **Mark one read (optimistic):**

```ts
const markRead = useMutation({
  mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
  onMutate: async (id) => {
    const prev = snapshot();                 // items + count
    setItem(id, { read: true });
    setUnread((c) => Math.max(0, c - 1));
    channel.postMessage({ type: 'read', ids: [id] });
    return { prev };
  },
  onError: (_e, _id, ctx) => restore(ctx!.prev),
});
```

- **Mark all read:** set every loaded item to read and `unreadCount = 0` at once. Send `before = newest createdAt we have`. If it fails, restore and show `toast.error`.
- Decrement only if the item was unread — clicking an already-read item must not reduce the count.
- When the dropdown opens, some apps (LinkedIn) reset the **badge** to 0 ("seen") but keep items bold ("unread"). That's two flags: `seen` and `read`. Mention it — it's a good detail.

### 5.4 Real-time delivery: WebSocket vs SSE vs polling

| | Polling (every 30 s) | SSE | WebSocket |
|---|---|---|---|
| Direction | Client asks | Server → client | Both ways |
| Latency | Up to 30 s | ~instant | ~instant |
| Setup | Easiest | Plain HTTP, `EventSource` built in | Needs WS server, sticky sessions |
| Reconnect | N/A | Automatic + `Last-Event-ID` replay | Write it yourself |
| Cost | Many empty requests | One open HTTP connection | One open TCP connection |

**Pick SSE.** Notifications are one-way. The client's actions (mark read) are normal REST calls. SSE gives automatic reconnect and replay with `Last-Event-ID` for free, and works through most proxies over HTTP/2.

Notes to mention:
- On HTTP/1.1 the browser allows only 6 connections per domain, and each tab's SSE uses one. Over HTTP/2 this isn't a problem. Or use one connection for all tabs (see 5.5).
- Fallback: if SSE keeps failing (corporate proxy), fall back to polling `unread-count` every 60 s.
- When the tab is hidden for > 5 min, close SSE to save server resources; on `visibilitychange` back, reconnect and fetch `unread-count`.
- If the app already has a WebSocket (e.g. chat), reuse it — don't open a second connection.

### 5.5 Syncing across tabs (BroadcastChannel)

Problem: user has 3 tabs. Reads a notification in tab A. Tabs B and C still show the badge "4".

```ts
const channel = new BroadcastChannel('notifications');

channel.onmessage = ({ data }) => {
  if (data.type === 'created') addIfMissing(data.item);   // de-dup by id
  if (data.type === 'read') data.ids.forEach((id) => setItem(id, { read: true }));
  if (data.type === 'count') setUnread(data.count);
};
```

- Every change a tab makes (read, read-all) is broadcast. Other tabs apply it without a network call.
- **One SSE connection for all tabs (leader election):** use the Web Locks API — `navigator.locks.request('notif-leader', () => new Promise(() => {}))`. The tab that gets the lock opens SSE and rebroadcasts events. When that tab closes, the lock is released and another tab takes over. Cuts server connections by 3–5× for heavy users. Alternative: a SharedWorker (not supported on all mobile browsers).
- Toasts: only the **visible/focused** tab shows a toast for a new notification, otherwise the user sees it 3 times when they switch tabs.

### 5.6 Browser push notifications (Push API + Service Worker)

Flow:
1. Register a service worker `sw.js`.
2. Ask permission: `Notification.requestPermission()`.
3. Subscribe: `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`.
4. Send the subscription to `POST /push-subscriptions`.
5. Server sends a push through the browser vendor's push service (FCM for Chrome, Mozilla's for Firefox, Apple's for Safari).
6. Service worker:

```js
self.addEventListener('push', (e) => {
  const n = e.data.json();
  e.waitUntil((async () => {
    const tabs = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (tabs.some((t) => t.visibilityState === 'visible')) return; // app is open → in-app UI handles it
    await self.registration.showNotification(n.title, {
      body: n.body, icon: '/icon-192.png', tag: n.groupKey ?? n.id, // tag replaces same-group notification
      data: { link: n.link, id: n.id },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.link)); // or focus an existing tab
});
```

(Chrome may show a generic "site updated in background" message if you skip `showNotification` too often, so in practice the server should not push when it knows the user has an active SSE connection.)

**Permission UX — ask at the right moment:**
- **Never** ask on first page load. Users block it, and once blocked you can't ask again from JS.
- Ask after a moment of clear value: right after placing an order — "Get notified when your order is out for delivery?" with our own soft prompt first. Only if they click "Yes" do we call the browser's `requestPermission()`. This "double opt-in" keeps the real prompt for people who will say yes.
- If they say "Not now", store the time in localStorage and don't ask for 30 days.
- If permission is `denied`, show a small help text in settings on how to re-enable it in browser settings.
- iOS Safari supports web push only for sites added to the home screen (PWA). Mention it.

### 5.7 De-duplication

Duplicates can come from: SSE replay after reconnect, the same event via SSE and BroadcastChannel, a page fetch overlapping with a live event, or the server retrying.
- Every notification has a stable server `id`. The store keeps `byId`; `addIfMissing` ignores known IDs.
- Unread count: don't blindly `+1` on every event. Prefer the server's `unread.count` event, or `+1` only when the item was actually new.
- Toasts: `dedupeKey` so 5 "Network error" toasts become one.
- Push: `tag` in `showNotification` replaces older notifications of the same group instead of stacking 10 OS popups.

### 5.8 Notification preferences

- Settings page: rows = categories (Orders, Payments, Social, Offers), columns = channels (In-app, Push, Email). Security/payment alerts cannot be turned off (disabled toggle with a reason).
- Save each toggle optimistically with a small debounce (500 ms) and one `PUT` of the full object. Rollback + error toast on failure.
- The **server** filters by preferences before sending — the client must not get promo events and hide them, which wastes bandwidth and leaks data.
- Also "Quiet hours" (e.g. 10 PM–8 AM no push) — nice extra.

**Also mention**
- Grouping: "Rahul and 4 others liked your post" — server groups by `groupKey`; client shows stacked avatars.
- Relative time ("2m ago") with one shared timer.
- Title badge: `document.title = '(3) Swiggy'` and favicon dot for unread when the tab is in background.
- Sound only for high-priority, with a user setting, and only after a user gesture (autoplay rules).
- Respect `prefers-reduced-motion` for the bell shake animation.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Toast API | Context + `useToast()` hook | Module store + `useSyncExternalStore` | **B.** Works outside React (interceptors, utils); no provider prop drilling. |
| Too many toasts | Show all stacked | Max 3 + queue | **Queue.** Screen stays usable; nothing is lost. |
| Real-time transport | Polling | SSE / WebSocket | **SSE.** One-way, auto-reconnect, replay with `Last-Event-ID`. Polling as fallback. |
| Multi-tab | One SSE per tab | Leader tab + BroadcastChannel | **Per-tab first** (simple, HTTP/2), leader election when connections cost money. Always sync reads via BroadcastChannel. |
| Mark read | Wait for server | Optimistic + rollback | **Optimistic.** Failure is rare; UX feels instant. |
| Inbox pagination | Offset | Cursor `(createdAt, id)` | **Cursor.** New items at top don't shift pages. |
| Push permission | Ask on load | Soft prompt after a valuable action | **Soft prompt later.** Higher allow rate; avoids permanent block. |
| Preference filtering | Client hides | Server filters | **Server.** Saves bandwidth, single source of truth across devices. |

## 7. Likely follow-up questions

**Q1. How does `toast.success()` work when it's called outside a component?**
It writes to a module-level store and notifies listeners. `<Toaster>` subscribes with `useSyncExternalStore` and re-renders. No React context needed to call it.

**Q2. What if 20 toasts fire in 1 second (e.g. bulk upload errors)?**
Max 3 visible, rest queued. Same `dedupeKey` merges them. Better: one summary toast — "12 files failed. View details".

**Q3. User clicks "Mark all as read" and a new notification arrives at the same moment. What happens?**
We send `before = newest createdAt` we have. The server marks only older ones. The new one stays unread, and its SSE event increments the count after.

**Q4. The SSE connection drops for 2 minutes. Do we lose notifications?**
No. `EventSource` reconnects automatically and sends `Last-Event-ID`; the server replays missed events. As a safety net, refetch `unread-count` and the first page on reconnect, de-duped by ID.

**Q5. Why not WebSocket?**
We don't need client → server messages on that channel; reads go over REST. SSE is simpler, works over HTTP/2, has built-in reconnect. If the app already uses a WebSocket for chat, I'd reuse it.

**Q6. How do you keep unread count in sync across 3 tabs and the phone app?**
Tabs: BroadcastChannel for instant local sync. Other devices: server sends `notification.read` / `unread.count` events over SSE. Server is the source of truth.

**Q7. Toast vs inbox — when do you use which?**
Toast: short feedback for the user's own action, or an urgent live event. Inbox: anything the user may want to see later. A server event can do both: stored in inbox + toast if high priority and tab visible.

**Q8. How do you test the toast timer logic?**
Jest fake timers: `toast.success()`, advance 3,999 ms → still there, 1 ms more → gone. Hover → advance 10 s → still there. React Testing Library + `findByRole('status')` for a11y.

**Q9. What happens if the user is logged out in one tab?**
Broadcast `logout` on the channel; all tabs clear the store, close SSE, and unsubscribe push (`DELETE /push-subscriptions`) so the next user on a shared computer doesn't get the previous user's notifications.

## 8. If you only have 60 seconds

- Two parts: **toasts** (short-lived, client only) and **inbox** (stored on server, bell + list).
- Toasts: module store + `useSyncExternalStore` for `toast.success()` anywhere; **max 3 + queue**; auto-dismiss with **pause on hover/focus/hidden tab**; **portal**; `aria-live` polite for info, assertive for errors.
- Inbox: unread count fetched after first paint; list with **cursor pagination**; **optimistic** mark read / mark all read (with a `before` timestamp).
- Real-time with **SSE** — one-way, auto-reconnect, `Last-Event-ID` replay; polling as fallback.
- **BroadcastChannel** syncs read state across tabs; optional leader tab owns the single connection.
- **Web Push** via Service Worker when the tab is closed; ask permission only after a valuable action, with a soft prompt first.
- **De-dup** by server ID everywhere; **preferences** filtered on the server.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Toast vs inbox vs both, sources, real-time, tabs, push. |
| 4–8 | Requirements | Functional for both parts, a11y, perf, out of scope. |
| 8–14 | Architecture | Diagram: toast store, inbox store, SSE, BroadcastChannel, SW. Main flow. |
| 14–19 | Data model | Toast, AppNotification, InboxState, preferences; where each lives. |
| 19–25 | API | Toast API, list with cursor, read / read-all with `before`, SSE events. |
| 25–40 | Deep dives | Toast queue + timers + a11y; optimistic read; SSE vs WS vs polling; tabs; push permission UX. |
| 40–45 | Trade-offs + wrap | Table, follow-ups, 60-second summary. |

## Common mistakes

- Jumping to components before defining data/entities — e.g. drawing the bell before deciding what a notification object and unread count look like.
- Using `setTimeout` for auto-dismiss with no pause on hover/focus — fails WCAG and annoys users.
- Adding the `aria-live` region at the same time as the toast text, so screen readers never announce it.
- Picking WebSocket by default without explaining why one-way SSE is enough.
- Asking for push permission on page load.
- Forgetting multiple tabs: stale badges and the same toast shown in every tab.

## My mistakes

- [ ]
