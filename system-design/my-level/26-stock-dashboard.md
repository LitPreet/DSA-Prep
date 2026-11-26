# Real-time Stock Dashboard / Trading Watchlist (e.g. Groww / Zerodha Kite web)

> **Difficulty:** Medium-Hard · **Asked at:** Indian fintech and broking companies (Groww, Zerodha, Upstox, CRED, INDmoney), and any company with real-time dashboards (crypto, sports scores) · **Time in interview:** 45 min
> Not on GreatFrontEnd's list; matches the products of Indian product companies.

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Which screens: watchlist only, or also chart and order placement? → Assume: watchlist (left panel), chart for the selected stock (right), and a buy/sell order form.
- How many stocks per watchlist, how many watchlists? → Assume: up to 50 stocks per list, up to 7 lists (like Kite).
- How often do prices change? → Assume: during market hours, popular stocks tick many times per second. Server may send 5–10 ticks/sec per symbol.
- Which markets? → Assume: NSE/BSE equities. Market open 9:15 AM – 3:30 PM IST, plus pre-open.
- Desktop or mobile web? → Assume: desktop web first (power users), responsive for mobile.
- Do we need order types like stop-loss, GTT? → Assume: market and limit orders only. Others out of scope.
- What chart features? → Assume: candlestick + line chart, timeframes 1D/1W/1M/1Y, no drawing tools.
- Is the user already logged in? → Assume: yes, but sessions expire; 2FA happens at login and maybe before some actions.

## 1. Requirements

### Functional

- Watchlist: list of stocks with last price (LTP), change, % change. Prices update live.
- Add, remove, and reorder stocks in a watchlist. Search to add.
- Click a stock to see its chart (candles) and details (open, high, low, volume).
- Buy/Sell order form: quantity, order type (market/limit), price for limit, confirm step, order status.
- Show market status: pre-open, open, closed, holiday.
- Show connection status: live, reconnecting, offline.

### Non-functional (performance, accessibility, devices, network)

- **Performance:** UI stays at 60 fps even with 50 rows each getting 5–10 ticks/sec (~500 updates/sec). Input (typing in order form) never lags.
- **Freshness:** price shown is less than ~1s old when connected. If not live, it must be clearly marked.
- **Correctness:** the order is never placed twice. The final price is decided by the exchange, not the client.
- **Devices:** works on mid-range laptops and Android phones; do not burn CPU when the tab is hidden.
- **Network:** handle disconnects (office Wi-Fi, mobile data) and resync quickly.
- **Accessibility:** keyboard-only trading (Kite users love shortcuts), screen-reader friendly, but don't announce every tick.
- **Security:** session timeout, re-auth for sensitive actions, no secrets in localStorage.

### Out of scope

- Options chain, F&O, portfolio/holdings page, P&L reports.
- Advanced charting (indicators, drawing tools).
- Backend matching engine and exchange connection.
- Payments / adding funds.

## 2. Architecture

```text
+-------------------------------------------------------------------------+
|                              App Shell                                  |
|  +------------------------+   +--------------------------------------+  |
|  | WatchlistPanel         |   | StockDetail                          |  |
|  |  - Tabs (list 1..7)    |   |  - PriceHeader (live)                |  |
|  |  - SearchToAdd         |   |  - ChartPanel (lazy, canvas)         |  |
|  |  - VirtualList         |   |  - OrderForm (modal/drawer)          |  |
|  |     - WatchlistRow x N |   +--------------------------------------+  |
|  +-----------+------------+                       |                     |
|              | useTicker(symbol)                  | useTicker(symbol)   |
|              v                                    v                     |
|  +-------------------------------------------------------------------+  |
|  |  Price Store (outside React): Map<symbol, Quote> + listeners      |  |
|  |  - tick buffer, flush once per requestAnimationFrame              |  |
|  +------------------------------+------------------------------------+  |
|                                 |                                       |
|  +------------------------------v------------------------------------+  |
|  |  Market Socket Client (WebSocket)                                 |  |
|  |  - subscribe/unsubscribe by ref count, heartbeat, reconnect       |  |
|  |  - snapshot resync after reconnect                                |  |
|  +------------------------------+------------------------------------+  |
|                                                                         |
|  Server-state cache (React Query): watchlists, history candles, orders  |
+-----------------+--------------------------+----------------------------+
                  | wss://stream              | HTTPS REST
                  v                           v
         +-----------------+        +------------------------+
         | Market data feed|        | Watchlist / Orders /   |
         | (ticks)         |        | History / Auth APIs    |
         +-----------------+        +------------------------+
```

| Component | Responsibility |
|---|---|
| Market Socket Client | One WebSocket for the whole app. Sends subscribe/unsubscribe, heartbeat, reconnect with backoff. |
| Price Store | Holds latest quote per symbol outside React. Buffers ticks and notifies only the listeners of changed symbols, once per frame. |
| useTicker(symbol) | Hook built on `useSyncExternalStore`. Subscribes the component to one symbol and ref-counts the socket subscription. |
| WatchlistPanel / VirtualList | Renders rows; only visible rows mount, so only visible symbols are subscribed. |
| WatchlistRow | Memoized row. Re-renders only when its own symbol changes. Flashes green/red. |
| ChartPanel | Lazy-loaded canvas chart. Loads history via REST, appends live ticks to the last candle. |
| OrderForm | Validation, confirm step, idempotency key, shows order status. |
| React Query cache | Watchlists, candles, orders, user profile. Handles optimistic updates and refetching. |
| MarketStatus / ConnectionBadge | Shows open/closed and live/reconnecting. |

**Main flow: user opens the watchlist and sees live prices**

1. App loads; React Query fetches `GET /watchlists` (the symbols in each list).
2. VirtualList mounts only the ~15 rows visible on screen.
3. Each row calls `useTicker("RELIANCE")`. The ref count goes 0 → 1, so the socket client sends `{ "action": "subscribe", "symbols": ["RELIANCE", ...] }` (batched in one message per frame).
4. Server sends a snapshot for each newly subscribed symbol, then ticks.
5. Ticks go into the price store's buffer. Once per animation frame, the store merges the buffer and notifies only listeners for symbols that changed.
6. Only those rows re-render and flash green or red.
7. User scrolls: rows unmount → ref count drops to 0 → after a short delay (~2s, to avoid churn) the client sends `unsubscribe`.

## 3. Data model

```ts
type Exchange = "NSE" | "BSE";

type Instrument = {
  token: number;            // numeric id used on the socket (smaller than a string)
  symbol: string;           // "RELIANCE"
  exchange: Exchange;
  name: string;             // "Reliance Industries Ltd"
  tickSize: number;         // 0.05 -> limit price must be a multiple of this
  lotSize: number;          // 1 for equity
};

type Quote = {
  token: number;
  ltp: number;              // last traded price
  prevClose: number;        // to compute change and % change
  open: number;
  high: number;
  low: number;
  volume: number;
  ts: number;               // exchange timestamp (ms); drop older ticks
  seq: number;              // sequence number per stream, to detect gaps
};

type Watchlist = {
  id: string;
  name: string;
  tokens: number[];         // order matters (user can reorder)
  version: number;          // for conflict detection when two devices edit
};

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

type OrderRequest = {
  idempotencyKey: string;   // uuid created when the form opens
  token: number;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  qty: number;
  limitPrice?: number;      // only for LIMIT
  product: "CNC" | "MIS";   // delivery or intraday
};

type Order = OrderRequest & {
  id: string;
  status: "PENDING" | "OPEN" | "COMPLETE" | "REJECTED" | "CANCELLED";
  avgPrice?: number;        // filled by the exchange, not the client
  rejectReason?: string;
};

type MarketStatus = "PRE_OPEN" | "OPEN" | "CLOSED" | "HOLIDAY";
```

| Entity | Lives in | Why |
|---|---|---|
| Live quotes | Client price store (outside React, memory) | Updates hundreds of times/sec; must not trigger app-wide renders. |
| Instruments master (symbol → token) | IndexedDB (cached daily) | ~80k+ instruments; too big to refetch every load; used by search. |
| Watchlists | Server + React Query cache | Synced across devices; optimistic updates on edit. |
| Selected stock, timeframe | URL (`/stock/NSE/RELIANCE?tf=1D`) | Shareable, back button works, survives refresh. |
| Historical candles | React Query cache (memory) | Re-requested per timeframe; fine to cache for a few minutes. |
| Order form inputs | Component state | Local, short-lived. |
| Orders | Server (truth) + React Query | Status changes come from the exchange via server. |
| Active watchlist tab, theme | localStorage | Small UI preference. |
| Auth token | httpOnly cookie | Not readable by JS, so XSS can't steal it. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
type WatchlistPanelProps = {
  watchlistId: string;
  onSelect: (token: number) => void;
  selectedToken?: number;
};

type WatchlistRowProps = {
  token: number;            // the row reads its own quote via useTicker(token)
  isSelected: boolean;
  onSelect: (token: number) => void;   // stable (useCallback) so memo works
  onBuy: (token: number) => void;
  onSell: (token: number) => void;
};

type ChartPanelProps = {
  token: number;
  timeframe: "1D" | "1W" | "1M" | "1Y";
  chartType: "candle" | "line";
};

type OrderFormProps = {
  token: number;
  side: "BUY" | "SELL";
  defaultQty?: number;
  onPlaced: (order: Order) => void;
  onClose: () => void;
};

// Hook
function useTicker(token: number): Quote | undefined;
```

### Server API (endpoints, method, params, example JSON; real-time message formats)

**REST**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/watchlists` | All lists with tokens. |
| POST | `/api/watchlists/:id/items` | Add `{ token }`. |
| DELETE | `/api/watchlists/:id/items/:token` | Remove. |
| PUT | `/api/watchlists/:id/order` | Reorder `{ tokens: [...], version }`. |
| GET | `/api/quotes?tokens=738561,2885` | Snapshot of quotes (used after reconnect). |
| GET | `/api/history/:token?tf=1D&from=...&to=...` | Candles. |
| POST | `/api/orders` | Place order (header `Idempotency-Key`). |
| GET | `/api/market-status` | Open/closed + next session time. |

```json
// POST /api/orders   Idempotency-Key: 3f1c...-9a
{ "token": 738561, "side": "BUY", "type": "LIMIT", "qty": 10, "limitPrice": 2450.05, "product": "CNC" }

// 201
{ "id": "ord_240", "status": "OPEN", "qty": 10, "limitPrice": 2450.05 }

// 422
{ "error": "INSUFFICIENT_FUNDS", "message": "Required ₹24,500.50, available ₹12,000.00" }
```

**WebSocket** — `wss://stream.example.com/v1?session=...`

```json
// client -> server
{ "action": "subscribe",   "tokens": [738561, 2885], "mode": "quote" }
{ "action": "unsubscribe", "tokens": [2885] }
{ "action": "ping" }

// server -> client
{ "type": "snapshot", "data": [{ "token": 738561, "ltp": 2451.3, "prevClose": 2430.0, "seq": 9001, "ts": 1764141000123 }] }
{ "type": "tick", "d": [[738561, 2451.35, 1764141000456, 9002], [2885, 812.1, 1764141000460, 4410]] }
{ "type": "market_status", "status": "CLOSED" }
{ "type": "pong" }
```

Ticks are arrays (`[token, ltp, ts, seq]`), not objects, to save bytes. Real brokers often use binary frames for the same reason. `mode` can be `ltp` (just price, smallest), `quote`, or `full` (with market depth) — subscribe the chart's stock to `full`, watchlist rows to `ltp`/`quote`.

## 5. Optimizations and deep dives

### 5.1 Subscribe only to what is visible

The server sends data only for subscribed tokens. So the cheapest tick is one we never receive.

- Watchlist uses a **virtual list** (e.g. `react-window`): with 50 stocks and ~15 visible, we subscribe to ~15, not 50.
- Each `useTicker(token)` call increments a **ref count** for that token. The same stock can be in the row and in the chart header; it's subscribed once.
- When the count hits 0, wait ~2s before unsubscribing (user may scroll back).
- Batch subscribe/unsubscribe messages: collect for one frame, send one message.
- Tab hidden (`visibilitychange`) → unsubscribe all or switch to `ltp` mode; on visible → resubscribe and fetch a snapshot.

```ts
class SubscriptionManager {
  private counts = new Map<number, number>();
  private pendingSub = new Set<number>();
  private pendingUnsub = new Set<number>();

  add(token: number) {
    const n = (this.counts.get(token) ?? 0) + 1;
    this.counts.set(token, n);
    if (n === 1) { this.pendingUnsub.delete(token); this.pendingSub.add(token); this.schedule(); }
  }
  remove(token: number) {
    const n = (this.counts.get(token) ?? 1) - 1;
    this.counts.set(token, n);
    if (n === 0) setTimeout(() => {
      if (this.counts.get(token) === 0) { this.pendingUnsub.add(token); this.schedule(); }
    }, 2000);
  }
  // schedule(): on next frame send one subscribe + one unsubscribe message
}
```

### 5.2 Batch ticks and flush once per frame

The screen repaints at most 60 times/sec. If we get 500 ticks/sec and call `setState` for each, React does 500 renders/sec and the UI freezes. Instead:

1. On each WebSocket message, write the tick into a plain `Map` buffer (newer tick for the same token overwrites the older one).
2. Schedule **one** `requestAnimationFrame`.
3. In the frame callback, copy buffer into the store, collect the changed tokens, and notify only their listeners.

```ts
const quotes = new Map<number, Quote>();
const buffer = new Map<number, Partial<Quote>>();
const listeners = new Map<number, Set<() => void>>();
let scheduled = false;

export function onTick(token: number, ltp: number, ts: number, seq: number) {
  const prev = buffer.get(token);
  if (prev && prev.ts! > ts) return;          // older tick, ignore
  buffer.set(token, { ltp, ts, seq });
  if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
}

function flush() {
  scheduled = false;
  buffer.forEach((patch, token) => {
    const old = quotes.get(token);
    quotes.set(token, { ...old!, ...patch });   // new object -> new snapshot for useSyncExternalStore
    listeners.get(token)?.forEach((l) => l());
  });
  buffer.clear();
}
```

- rAF does not run in hidden tabs, so the buffer just keeps the latest values (it's a Map, so it doesn't grow per tick).
- For even lower CPU, throttle to 4–5 flushes/sec for the watchlist (humans can't read 60 price changes/sec). Keep 60 fps only for the selected stock.
- Heavy parsing (binary frames) can move to a **Web Worker** that posts batched updates every ~100ms. Mention this as a next step if profiling shows the main thread is busy.

### 5.3 Re-render only the row that changed

Bad: one big `useState({ [symbol]: quote })` at the top. Every tick re-renders all 50 rows and the chart.

Good: an external store + `useSyncExternalStore`, one subscription per row.

```tsx
export function useTicker(token: number) {
  useEffect(() => { subs.add(token); return () => subs.remove(token); }, [token]);
  return useSyncExternalStore(
    (cb) => {
      let set = listeners.get(token);
      if (!set) listeners.set(token, (set = new Set()));
      set.add(cb);
      return () => set!.delete(cb);
    },
    () => quotes.get(token),          // must return the same object if nothing changed
  );
}

const WatchlistRow = memo(function WatchlistRow({ token, isSelected, onSelect }: WatchlistRowProps) {
  const q = useTicker(token);
  if (!q) return <RowSkeleton />;
  const change = q.ltp - q.prevClose;
  return (
    <div role="row" aria-selected={isSelected} onClick={() => onSelect(token)}>
      <PriceCell value={q.ltp} />
      <span className={change >= 0 ? "up" : "down"}>{formatPct(change / q.prevClose)}</span>
    </div>
  );
});
```

- `React.memo` on the row stops re-renders from the parent; `useSyncExternalStore` makes the row re-render only for its own token.
- Pass stable callbacks (`useCallback`) and primitive props (`token`, not the whole quote object) so `memo` works.
- `useSyncExternalStore` is safe with React 18 concurrent rendering (no "tearing": two rows showing data from different moments).
- Zustand / Jotai with selectors do the same thing; say "I'd use Zustand with a per-token selector, or this small custom store."
- Even simpler extreme: update the price text via a ref (`el.textContent = ...`) and skip React. Mention as an option for very hot paths.

### 5.4 Price flash animation (green/red)

When the price goes up, flash the cell green for ~300ms; down, red.

```tsx
function PriceCell({ value }: { value: number }) {
  const prev = useRef(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || value === prev.current) return;
    el.classList.remove("flash-up", "flash-down");
    void el.offsetWidth;                              // restart the CSS animation
    el.classList.add(value > prev.current ? "flash-up" : "flash-down");
    prev.current = value;
  }, [value]);
  return <span ref={ref} className="price">{formatINR(value)}</span>;
}
```

```css
.price { font-variant-numeric: tabular-nums; }   /* digits same width -> no jiggle */
@keyframes up   { from { background: rgb(0 180 90 / .35); } to { background: transparent; } }
@keyframes down { from { background: rgb(230 50 50 / .35); } to { background: transparent; } }
.flash-up   { animation: up 300ms ease-out; }
.flash-down { animation: down 300ms ease-out; }
@media (prefers-reduced-motion: reduce) { .flash-up, .flash-down { animation: none; } }
```

- Animate only `background-color`/`opacity`; never width/height (causes layout).
- `tabular-nums` stops the row from shifting as digits change.
- Color is not the only signal: show `▲ +1.25%` / `▼ -0.80%` with an arrow and sign.

### 5.5 Charts

- **Use a canvas-based chart library** (e.g. TradingView Lightweight Charts, ~45 KB). SVG creates one DOM node per candle; with thousands of candles plus live updates, canvas is much faster.
- **Lazy-load** the chart: `const ChartPanel = lazy(() => import("./ChartPanel"))`. The watchlist is useful before the chart loads.
- **Downsampling:** a 1Y chart of 1-minute candles is ~90k points. The screen is ~1000 px wide, so request the right interval from the server: 1D → 1-min candles (~375), 1W → 5-min, 1M → 30-min/1-hour, 1Y → daily (~250). The server does the aggregation. On the client, if needed, merge candles into buckets (o = first, h = max, l = min, c = last).
- **Live update:** each tick updates the last candle (`c = ltp`, `h = max(h, ltp)`, `l = min(l, ltp)`). When the minute changes, push a new candle. Use the library's `series.update()` (redraws only the last bar), not `setData()` for the whole array.
- **Pan back in time:** load older candles on demand (`from`/`to` paging) when the user scrolls left.
- Cache history per `(token, timeframe)` in React Query with `staleTime` ~1 min so switching tabs is instant.

### 5.6 Watchlist CRUD with optimistic updates

The user adds a stock → it should appear instantly, not after a 300ms request.

```ts
const addItem = useMutation({
  mutationFn: (token: number) => api.post(`/watchlists/${id}/items`, { token }),
  onMutate: async (token) => {
    await qc.cancelQueries({ queryKey: ["watchlists"] });
    const prev = qc.getQueryData<Watchlist[]>(["watchlists"]);
    qc.setQueryData<Watchlist[]>(["watchlists"], (lists) =>
      lists!.map((l) => (l.id === id ? { ...l, tokens: [...l.tokens, token] } : l)));
    return { prev };
  },
  onError: (_e, _t, ctx) => { qc.setQueryData(["watchlists"], ctx!.prev); toast("Couldn't add. Try again."); },
  onSettled: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
});
```

- Client-side checks first: max 50 per list, no duplicates.
- Reorder (drag and drop) sends the full token order + `version`; on `409 Conflict` (edited from phone), refetch and show the server order.
- **Never** use optimistic updates for placing orders (see next).

### 5.7 Order placement form

- **Validation (client, for fast feedback):** qty > 0 and an integer multiple of lot size; limit price > 0 and a multiple of tick size (₹0.05); limit price within the day's circuit band; show "Approx. margin required ₹24,505" and available funds.
- **Never trust the client price.** The client shows LTP only as a hint. For a market order the exchange decides the price. The server re-validates everything (funds, circuit limits, market open). The client never sends "I want it at the price I saw" for a market order.
- **Confirm step:** "Buy 10 RELIANCE @ ₹2,450.05 LIMIT. Confirm?" Optional for power users (setting), but on by default.
- **Idempotency:** generate an `idempotencyKey` (uuid) when the form opens. Send it in the `Idempotency-Key` header. If the user double-clicks or the request times out and we retry, the server returns the same order instead of creating a second one. Also disable the button while submitting.
- **Status after submit:** show "Order placed (OPEN)" then update to COMPLETE/REJECTED through an `order_update` socket message. Show the reject reason in plain words.
- **Market closed:** allow AMO (after-market order) with a clear label, or disable the button with the reason.

### 5.8 Reconnect, snapshot resync, and market states

- Heartbeat: send `ping` every 10s; if no message for ~20s, treat the socket as dead (mobile networks often drop it silently).
- Reconnect with exponential backoff + jitter: 1s, 2s, 4s ... max 30s.
- After reconnect: (1) re-send subscribe for all tokens with count > 0, (2) the server sends a fresh **snapshot**, which replaces stored quotes, (3) only then apply new ticks. Without the snapshot, prices would stay wrong until the next tick, which for illiquid stocks can be minutes.
- Use `seq` to detect gaps: if a token's seq jumps, request a snapshot for it.
- While reconnecting, grey out prices and show "Reconnecting..." badge. Never show old prices as live.
- **Market closed:** don't open the socket at all (or keep it idle); show last close prices with a "Market closed · Opens Mon 9:15 AM" label. Switch states from the server's `market_status` message, not the client clock (holidays, special sessions like Muhurat trading).

### 5.9 INR number formatting

Indian grouping is 1,00,000 (lakh) and 1,00,00,000 (crore), not 100,000.

```ts
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
inr.format(1234567.5);   // "₹12,34,567.50"

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 2 });
compact.format(1.25e7);  // "1.25Cr"  (volume, market cap)
```

- Create formatters **once** at module level; making a new `Intl.NumberFormat` on every tick is slow.
- Prices always 2 decimals. Percent with sign: `+1.25%`.
- Money in orders: send as strings or in paise to avoid float issues (`0.1 + 0.2`).

### 5.10 Security and accessibility

**Security:**
- Auth token in an **httpOnly, Secure, SameSite** cookie; CSRF token for POSTs.
- WebSocket auth with a short-lived token fetched over HTTPS (not the main session token in the URL).
- **Session timeout:** brokers log you out daily (SEBI rules). Show a warning ~2 min before, then a re-login modal. Don't lose form state.
- **2FA prompts:** TOTP at login; re-ask for sensitive actions (adding bank account, large orders, changing settings).
- Strict CSP, no third-party scripts on the trading page, sanitize the stock search input.
- Log out from all tabs via `BroadcastChannel` / `storage` event.

**Accessibility:**
- **Don't announce every tick.** No `aria-live` on price cells, or screen readers will talk non-stop.
- Use `aria-live="polite"` only for user-triggered events: "Order placed", "Order rejected: insufficient funds", "Connection lost".
- Give an on-demand way to hear a price: focusing a row reads "Reliance, 2,451.35, up 0.88 percent".
- Watchlist as a `grid` with arrow-key navigation; shortcuts like `B` (buy) and `S` (sell) on the focused row, with a visible shortcut help (`?`).
- Up/down shown with arrows and signs, not only green/red (color blindness).

### Also mention

- Dark mode (traders use it a lot); theme via CSS variables.
- Multiple tabs: use a `SharedWorker` to hold one WebSocket for all tabs.
- Monitoring: frame drops (Long Tasks API), socket reconnect count, order failure rate.
- Error boundary around the chart so a chart crash does not kill the order form.
- Instruments search: cached master list in IndexedDB + fuzzy search in a Web Worker.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Transport | WebSocket | SSE / polling | WebSocket. Client sends subscribe/unsubscribe often; very high message rate. |
| Price state | React state / Context | External store + `useSyncExternalStore` | External store. Per-row updates, no tree-wide re-render, safe in concurrent React. |
| Update rate to UI | Every tick | Batched per frame (or 4–5/sec for list) | Batched. Users can't read faster; saves CPU on low-end devices. |
| Subscriptions | Whole watchlist | Only visible rows (ref-counted) | Visible only. Less bandwidth and work; 2s delay to avoid churn on scroll. |
| Chart rendering | SVG | Canvas | Canvas. Thousands of candles + live updates; SVG DOM gets too heavy. |
| Watchlist edits | Wait for server | Optimistic | Optimistic, with rollback. Low risk and feels instant. |
| Order placement | Optimistic | Wait for server + idempotency key | Wait for server. Money is involved; show a spinner, never fake success. |
| Wire format | JSON objects | Arrays / binary | Compact arrays (binary later). Ticks are the biggest traffic. |
| Market closed | Keep socket open | Close socket, show last close | Close or idle. No ticks to send; saves server connections. |

## 7. Likely follow-up questions

**Q1. 200 symbols each ticking 10 times a second. Will React keep up?**
We never render 2000 times/sec. Ticks go into a buffer Map (latest wins), flushed once per frame. Only visible rows (~15) are subscribed and only changed ones re-render. That's at most ~15 small row renders per frame.

**Q2. Why `useSyncExternalStore` and not Context?**
Context re-renders every consumer when the value changes, so one tick re-renders all rows. `useSyncExternalStore` lets each row subscribe to just its own token and avoids tearing in concurrent mode.

**Q3. What happens when the socket drops for 30 seconds?**
Badge shows "Reconnecting", prices are greyed. On reconnect: resubscribe active tokens, receive a snapshot, replace quotes, then resume ticks. If the order form is open, the "approx. price" is refreshed before confirm.

**Q4. User clicks Buy twice quickly. What happens?**
The button is disabled after the first click, and both requests carry the same idempotency key, so the server creates only one order. If the response is lost, the retry with the same key returns the existing order.

**Q5. How do you make sure the user doesn't buy at a wrong price shown on screen?**
The client price is only a hint. Market orders are filled by the exchange. Limit orders use the price the user typed. The server checks funds and circuit limits. If data is stale, show a warning on the confirm step.

**Q6. How do you show a 5-year chart quickly?**
Ask the server for weekly candles (~260 points), not minute data. Canvas library, lazy-loaded. Cache by `(token, timeframe)`. Load more on pan.

**Q7. How would you test this?**
Unit test the store (buffering, older-tick drop, ref counting). Mock WebSocket server that replays recorded ticks at 10x speed for performance tests; check with React Profiler and Chrome Performance panel that there are no long tasks > 50ms. E2E for order placement and the double-click case.

**Q8. Two tabs open — two sockets?**
By default yes. Improve with a `SharedWorker` that owns one socket and forwards ticks to tabs, or a `BroadcastChannel` leader tab. Also helps the broker's connection limits per user.

**Q9. How do you handle market open at 9:15 exactly?**
The server pushes `market_status: OPEN`. The client doesn't trust its own clock (could be wrong, and there are holidays). Before open, show pre-open prices with a label.

**Q10. Where would a Web Worker help?**
Parsing binary tick frames and merging them off the main thread, then posting batched updates ~10 times/sec. Also fuzzy search over the instruments list.

## 8. If you only have 60 seconds

- One WebSocket for the app; subscribe only to visible symbols with ref counting; resubscribe and fetch a snapshot after reconnect.
- Ticks go into a buffer outside React and flush once per animation frame; never setState per tick.
- Each row reads its own symbol with `useSyncExternalStore` + `React.memo`, so only changed rows re-render.
- Price flash with CSS keyframes on background color, tabular numbers, arrows plus color.
- Canvas chart, lazy-loaded, server-side downsampling by timeframe, update only the last candle.
- Watchlist edits are optimistic; orders are not: validation, confirm step, idempotency key, server decides the price.
- INR with `Intl.NumberFormat("en-IN")`, session timeout + 2FA, and no aria-live on ticks.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarify + requirements | Screens, list size, tick rate, market hours, order types, out of scope. |
| 5–12 | Architecture | Socket client, price store, React tree, REST cache. Flow of one tick to one row. |
| 12–18 | Data model + API | Quote, Watchlist, OrderRequest with idempotency key; subscribe/tick messages; REST table. |
| 18–35 | Deep dives | Visible-only subscriptions (3 min), batching per frame (4 min), per-row store (4 min), reconnect + snapshot (3 min), chart (3 min). |
| 35–41 | Orders + security | Validation, confirm, idempotency, server-side price; session timeout, 2FA. |
| 41–45 | Trade-offs + wrap up | INR formatting, a11y, then the 60-second summary. |

## Common mistakes

- Jumping to components before defining data/entities (quote shape, tokens, watchlist, order with idempotency key).
- Keeping all prices in one top-level React state or Context, so every tick re-renders the whole page.
- Subscribing to every symbol in every watchlist instead of only the visible ones.
- Forgetting the snapshot after reconnect, so the UI shows old prices as if they were live.
- Treating order placement like a normal form: no idempotency, no confirm, trusting the client price, or optimistic "success".
- Putting `aria-live` on price cells, making screen readers unusable.

## My mistakes

- [ ]
