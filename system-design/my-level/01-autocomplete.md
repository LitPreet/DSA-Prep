# Autocomplete / typeahead (e.g. Google search box)

> **Difficulty:** Medium · **Asked at:** Product companies (Flipkart, Swiggy, Atlassian, Uber, Google, Microsoft), startups building search or e-commerce · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Is this a generic reusable component (used in many places) or one search box for one product?
  → Assume: a reusable component. Search page, address picker, and user mention picker can all use it.
- What kind of results? Only text, or rich results (image, category, price)?
  → Assume: text by default, but the consumer can pass a custom render function for each item.
- Where does data come from? Server, local list, or both?
  → Assume: mostly server. Small static lists (like countries) can be passed in directly.
- How many results to show?
  → Assume: max 10 suggestions.
- What happens when the user selects a result? Go to a page, or fill the input?
  → Assume: the component calls `onSelect(item)`. The parent decides what to do.
- Which devices?
  → Assume: desktop and mobile web. Mobile users may be on slow 3G/4G.
- Do we need search history / recent searches when input is empty?
  → Assume: nice to have. Show recent searches from `localStorage` on focus.
- Do we need to support multiple languages / RTL?
  → Assume: yes, i18n-friendly, but not the main focus.

## 1. Requirements

### Functional
- User types in an input. After a short pause, we show a list of suggestions.
- Suggestions come from a server API based on the typed query.
- User can pick a suggestion with mouse, touch, or keyboard (Up/Down/Enter/Escape).
- Matching part of the text is highlighted (e.g. typing "iph" shows **iph**one 15).
- Show loading, empty ("No results"), and error states.
- On focus with empty input, show recent searches (optional).

### Non-functional (performance, accessibility, devices, network)
- **Performance:** suggestions should feel instant. Target under 100ms from response to paint. Do not call the API on every keystroke.
- **Network:** handle slow and flaky networks. Old responses must never overwrite new ones.
- **Accessibility:** full keyboard support. Works with screen readers using the WAI-ARIA combobox pattern.
- **Devices:** works on mobile (touch, small screens, on-screen keyboard covering half the page).
- **Customisable:** consumers can change how each item looks, and the debounce time, without forking.

### Out of scope
- How the server ranks results (search backend, trie, Elasticsearch).
- Spell correction logic on the server.
- Analytics pipeline (we will only fire an event).

## 2. Architecture

```text
+-----------------------------------------------------------+
|                    Autocomplete (Controller)              |
|  - holds query, results, highlightedIndex, isOpen         |
|  - debounce, cancel old requests, read/write cache        |
+-----------------------------------------------------------+
        |                    |                     |
        v                    v                     v
+---------------+   +------------------+   +------------------+
|  Input field  |   |  Results popup   |   |   Cache          |
| (role=combobox|   | (role=listbox)   |   | (in-memory Map,  |
|  typing, keys)|   |  - ResultItem x N|   |  query -> data)  |
+---------------+   +------------------+   +------------------+
                                                   |
                                                   v
                                          +------------------+
                                          |  API client      |
                                          | fetch + Abort    |
                                          +------------------+
                                                   |
                                                   v
                                          +------------------+
                                          |  Server          |
                                          | GET /suggestions |
                                          +------------------+
```

| Component | Responsibility |
|---|---|
| Autocomplete (Controller) | Owns all state. Decides when to fetch, when to show the popup, which item is highlighted. Connects all pieces. |
| Input field | Renders the text box. Sends typing and keyboard events to the controller. Has the ARIA combobox attributes. |
| Results popup | Shows the list of results, loading, empty, and error states. Positioned under the input. |
| ResultItem | One row. Highlights the matched text. Uses default render or the consumer's `renderItem`. |
| Cache | Stores past results by query so repeat queries are instant and do not hit the network. |
| API client | Makes the network call. Supports cancel via `AbortController`. |

**Data flow when the user types "iph":**
1. User types `i`, `p`, `h`. Input updates `query` state on each key (input stays responsive).
2. Controller waits 300ms after the last key (debounce). Then it uses query `"iph"`.
3. Controller checks cache. If `"iph"` is in cache and not expired, show results right away. Done.
4. If not, cancel any in-flight request and send `GET /suggestions?q=iph&limit=10`.
5. Response comes back. Controller checks it is still for the latest query, saves it to cache, and sets `results`.
6. Popup renders the list. Screen reader announces "10 results available".
7. User presses Down then Enter. Controller calls `onSelect(item)` and closes the popup.

## 3. Data model

```ts
// One suggestion from the server
type Suggestion = {
  id: string;
  text: string;            // "iPhone 15"
  type?: 'query' | 'product' | 'category';
  imageUrl?: string;
  meta?: Record<string, string>; // extra data, e.g. price
};

// Server response
type SuggestionsResponse = {
  query: string;           // echo back the query (helps check for stale data)
  results: Suggestion[];
};

// Cache entry
type CacheEntry = {
  results: Suggestion[];
  createdAt: number;       // Date.now() when stored
};

// Controller state
type AutocompleteState = {
  query: string;
  results: Suggestion[];
  status: 'idle' | 'loading' | 'success' | 'error';
  isOpen: boolean;
  highlightedIndex: number; // -1 means nothing highlighted
};
```

| Entity | Lives in | Why |
|---|---|---|
| Suggestions (source data) | Server | Too big for the client. Ranking changes often. |
| Cached results | Client store (in-memory `Map` inside the component or a module-level singleton) | Fast repeat lookups. Shared across instances if module-level. |
| `query`, `status`, `isOpen`, `highlightedIndex` | Component state | Only this component needs them. Changes very often. |
| Recent searches | `localStorage` | Must survive page reload. Small (last 5–10 items). |
| Search page query (after submit) | URL (`/search?q=iphone`) | Shareable, back button works. Not the live typing value. |

## 4. Interface (API)

### Component API (props of the main component, with types and defaults)

```ts
type AutocompleteProps<T = Suggestion> = {
  fetchSuggestions?: (query: string, signal: AbortSignal) => Promise<T[]>; // server source
  staticItems?: T[];                 // local source (alternative to fetch)
  onSelect: (item: T) => void;
  renderItem?: (item: T, opts: { query: string; isHighlighted: boolean }) => React.ReactNode;
  getItemLabel?: (item: T) => string; // default: item.text
  placeholder?: string;               // default: "Search"
  debounceMs?: number;                // default: 300
  minQueryLength?: number;            // default: 1 (some products use 2 or 3)
  maxResults?: number;                // default: 10
  cacheTtlMs?: number;                // default: 5 * 60 * 1000 (5 min)
  showRecentOnFocus?: boolean;        // default: true
  emptyText?: string;                 // default: "No results"
  ariaLabel?: string;                 // required if there is no visible label
};
```

Why `fetchSuggestions` as a prop and not a URL? It keeps the component generic. The parent can add auth headers, change params, or mock it in tests.

### Server API (endpoints, method, params, example JSON response, pagination style and WHY that style)

`GET /api/suggestions?q=iph&limit=10&locale=en-IN`

| Param | Type | Notes |
|---|---|---|
| `q` | string | The typed query, URL-encoded. |
| `limit` | number | Default 10, max 20. |
| `locale` | string | For language-specific results. |

```json
{
  "query": "iph",
  "results": [
    { "id": "p_101", "text": "iPhone 15", "type": "product", "imageUrl": "https://cdn.example.com/ip15_64.webp" },
    { "id": "q_55", "text": "iphone 15 cover", "type": "query" },
    { "id": "c_9", "text": "iPhone accessories", "type": "category" }
  ]
}
```

**Pagination style: none (just `limit`).** Users almost never scroll through suggestions. They type more letters instead. So we return the top 10 and stop. Adding pagination would add complexity with no benefit. If a "See all results" link is needed, it goes to the full search page, which has its own paginated API.

**Caching headers:** server can send `Cache-Control: public, max-age=300` for popular queries so the browser/CDN can cache too.

## 5. Optimizations and deep dives

### 5.1 Debounce (do not call the API on every key)
Typing "iphone" is 6 keystrokes. Without debounce, that is 6 API calls, and 5 of them are useless. Debounce means: wait until the user stops typing for N ms, then call once.

- 300ms is a good default. 150–200ms feels faster but makes more calls. 500ms feels slow.
- Throttle is the other option (call at most once every N ms while typing). Throttle gives results *during* typing. Debounce gives results *after* a pause. For search, debounce is the normal choice.

```ts
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // new key press cancels the old timer
  }, [value, delay]);
  return debounced;
}
```

Important: the **input value** updates on every key (so typing is smooth). Only the **fetch** is debounced.

### 5.2 Race conditions (old response overwrites new one)
User types "ip", request A goes out. Then types "iph", request B goes out. If A is slow and comes back after B, the list shows results for "ip". This is a real bug.

Two fixes, use both:
1. **Cancel** the old request with `AbortController`. Saves bandwidth too.
2. **Check** the response matches the latest query before setting state.

```ts
useEffect(() => {
  if (debouncedQuery.length < minQueryLength) return;
  const cached = readCache(debouncedQuery);
  if (cached) { setResults(cached); return; }

  const controller = new AbortController();
  setStatus('loading');
  fetchSuggestions(debouncedQuery, controller.signal)
    .then((data) => {
      writeCache(debouncedQuery, data);
      setResults(data);
      setStatus('success');
    })
    .catch((err) => {
      if (err.name !== 'AbortError') setStatus('error');
    });
  return () => controller.abort(); // runs when query changes -> old request cancelled
}, [debouncedQuery]);
```

The effect cleanup aborts the old request, so its `.then` never runs. That is the "check" in React form.

### 5.3 Caching
- **Structure:** `Map<string, CacheEntry>`. Key is the normalised query (`query.trim().toLowerCase()`).
- **TTL:** 5 minutes for a search box. For static data (country list), cache forever for the session.
- **Size limit:** keep max ~100 entries. Remove the oldest when full (simple LRU: `Map` keeps insert order, so delete the first key).
- **Where:** module-level so two search boxes on the same page share it. For a long-lived SPA (like a mail app open all day), the size limit matters because memory grows.
- **Bonus — prefix filtering:** if we have results for "iph" and the user types "ipho", we can filter the "iph" results on the client and show them right away while the real request is in flight. Only good if the server returns enough results.
- Server-side, `Cache-Control` lets the browser HTTP cache help too.

```ts
const cache = new Map<string, CacheEntry>();
const MAX = 100, TTL = 5 * 60_000;

function readCache(q: string) {
  const e = cache.get(q);
  if (!e) return null;
  if (Date.now() - e.createdAt > TTL) { cache.delete(q); return null; }
  return e.results;
}
function writeCache(q: string, results: Suggestion[]) {
  if (cache.size >= MAX) cache.delete(cache.keys().next().value!);
  cache.set(q, { results, createdAt: Date.now() });
}
```

### 5.4 Keyboard and ARIA combobox pattern
This is where many candidates lose points. Follow the WAI-ARIA combobox pattern.

| Key | Action |
|---|---|
| Down / Up | Move highlight. Wrap from last to first. Open popup if closed. |
| Enter | Select highlighted item. If nothing highlighted, submit the typed text. |
| Escape | Close popup. Second Escape clears the input. |
| Tab | Close popup, move focus normally. Do not trap focus. |
| Home / End | Move cursor in the input (do not hijack). |

Focus **stays in the input** the whole time. We do not move real focus to list items. We use `aria-activedescendant` to tell the screen reader which item is "virtually" focused.

```tsx
<input
  role="combobox"
  aria-expanded={isOpen}
  aria-controls="ac-listbox"
  aria-autocomplete="list"
  aria-activedescendant={highlightedIndex >= 0 ? `ac-opt-${highlightedIndex}` : undefined}
  aria-label={ariaLabel}
/>
<ul role="listbox" id="ac-listbox">
  {results.map((r, i) => (
    <li id={`ac-opt-${i}`} role="option" aria-selected={i === highlightedIndex} key={r.id}
        onMouseDown={(e) => e.preventDefault() /* keep focus in input */}
        onClick={() => select(r)}>
      {renderItem(r)}
    </li>
  ))}
</ul>
<div aria-live="polite" className="sr-only">{results.length} results available</div>
```

Notes:
- `onMouseDown` + `preventDefault` stops the input from losing focus (blur) before the click registers. Otherwise the popup closes on blur and the click is lost.
- Scroll the highlighted item into view: `el.scrollIntoView({ block: 'nearest' })`.
- Live region announces result count. Debounce the announcement too, or it gets noisy.

### 5.5 Rendering performance and highlighting
- Max 10 items, so no virtualization needed. If the consumer shows 500 local items, then use virtualization (react-window).
- Highlight the match **safely**: split the string and wrap the match in `<mark>` or `<strong>`. Do not build an HTML string and use `dangerouslySetInnerHTML` — that is an XSS risk if the server returns `<img onerror=...>`.

```tsx
function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || i === -1) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
}
```

- Memoize `ResultItem` with `React.memo` so moving the highlight re-renders only 2 rows, not 10.

### 5.6 Mobile and network
- Use `<input type="search" inputMode="search" enterKeyHint="search">` so the phone keyboard shows a "Search" button.
- Turn off browser suggestions: `autoComplete="off"`, `autoCorrect="off"`, `spellCheck={false}`.
- On mobile, popup can go full screen so the on-screen keyboard does not hide results.
- Touch targets at least 44x44px.
- On slow network (`navigator.connection.effectiveType === '2g'`), increase debounce to 500ms and drop images from results.
- Show the loading spinner only if the request takes more than ~200ms, to avoid flicker.

### Also mention
- **Network:** `limit` param keeps payload small (~2–5 KB). Gzip/Brotli on server. Retry once on network error, then show error.
- **Rendering:** popup positioned with CSS `position: absolute` under the input; for inputs inside scroll containers, use a portal + Floating UI.
- **Accessibility:** visible focus style on the highlighted item, colour contrast 4.5:1 for `<mark>`, label for input.
- **Security (XSS):** never inject server text as HTML. Encode the query in the URL (`encodeURIComponent`).
- **i18n:** case-folding with `toLocaleLowerCase`, RTL layout via `dir="auto"`. For Hindi/Japanese, handle IME composition: do not fetch while `compositionstart` is active, fetch on `compositionend`.
- **Offline:** show recent searches from `localStorage` and cached results; show "You are offline" instead of an error.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Limit API calls | Debounce | Throttle | Debounce 300ms. Users want results for what they finished typing, not partial words. |
| Data source | Fetch from server each time | Download all data once, filter on client | Server for big/changing data. Client for small fixed lists (< 1,000 items, e.g. countries). |
| Cache location | In-memory `Map` | `localStorage` / IndexedDB | In-memory. Results go stale fast; persistent cache adds complexity for small gain. |
| Stale response fix | Abort old request | Ignore old response by checking query | Both. Abort saves bandwidth; check is the safety net. |
| Focus handling | Move real focus to list items | Keep focus on input + `aria-activedescendant` | Keep focus on input. User can keep typing; it is the ARIA pattern. |
| Item rendering | Fixed design | `renderItem` prop | `renderItem` with a good default. Reusable across products. |
| Library vs build | Downshift / React Aria | Build my own | In real work, use a tested library. In the interview, show I know how to build it. |

## 7. Likely follow-up questions

1. **How do you make it work for 10 instances on one page?**
   Each instance has its own state and unique IDs (`useId()` in React 18) for ARIA. The cache is module-level and shared, which is a win.

2. **What if the server is slow (2 seconds)?**
   Show a spinner after 200ms. Keep showing old results (dimmed) instead of an empty list. Use prefix-filtered cached results as a placeholder. Abort if the user keeps typing.

3. **How would you test this?**
   Unit test the debounce and cache with fake timers. React Testing Library for keyboard flow (Down, Enter calls `onSelect`). A test for the race condition: resolve the second promise before the first. axe for accessibility checks.

4. **How do you handle the user typing very fast and then deleting everything?**
   When query is empty or below `minQueryLength`, abort in-flight requests, close the popup (or show recent searches), and do not fetch.

5. **Why not use `useMemo`/`useCallback` debounce from lodash?**
   You can, but the debounced function must be stable across renders (`useMemo` or `useRef`) and cancelled on unmount. The `useDebouncedValue` hook is simpler and has cleanup built in.

6. **How would you add recent searches?**
   Save selected items to `localStorage` (last 10, de-duplicated, newest first). Show them on focus when input is empty. Give each a delete "x" button. Wrap in try/catch because storage can fail in private mode.

7. **Could you use a trie on the client?**
   Yes, for a local list of a few thousand items. Build it once, prefix lookup is O(length of query). For server data, the trie lives on the server.

8. **How do you track analytics without slowing the UI?**
   Fire events with `navigator.sendBeacon` or a batched queue. Track query, position of clicked item, and time to select. Never block the selection on analytics.

9. **What about SSR?**
   The input can be server-rendered so it is visible fast. The popup is client-only. Make sure IDs match between server and client (`useId`).

## 8. If you only have 60 seconds

- It is a reusable component: an input with `role="combobox"` and a popup list with `role="listbox"`, controlled by one controller that owns state.
- Debounce fetches by 300ms; input value updates instantly.
- Cancel old requests with `AbortController` so stale responses never overwrite new ones.
- Cache results in an in-memory `Map` with 5-minute TTL and ~100 entry limit.
- Full keyboard support (Up/Down/Enter/Escape) with focus kept on input and `aria-activedescendant`.
- Highlight matches safely without `innerHTML` (XSS); handle loading, empty, and error states.
- API: `GET /suggestions?q=&limit=10`, no pagination because users type more instead of scrolling.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarifying questions + requirements | Generic vs specific, data source, devices, number of results. Write functional and non-functional lists. |
| 5–12 | Architecture | Draw controller, input, popup, cache, API client. Walk the "type iph" flow. |
| 12–17 | Data model | `Suggestion`, cache entry, component state. Where each lives. |
| 17–23 | Interface | Props (with defaults) and `GET /suggestions`. Explain why no pagination. |
| 23–40 | Deep dives | Debounce, race conditions, cache, keyboard + ARIA combobox. Mobile if time. |
| 40–45 | Trade-offs + wrap-up | Debounce vs throttle, server vs client filter. Answer follow-ups. |

## Common mistakes

- Jumping to components before defining data/entities and the API. Interviewer wants structure first.
- Forgetting race conditions. Saying "debounce" alone is not enough; slow old responses can still win.
- Debouncing the input value itself, so typing feels laggy. Only the fetch should be debounced.
- Ignoring accessibility, or moving real DOM focus into the list (breaks typing and screen readers).
- Using `dangerouslySetInnerHTML` to highlight matches (XSS).
- Closing the popup on input `blur` without handling `mousedown`, so clicks on items get lost.

## My mistakes
- [ ]
