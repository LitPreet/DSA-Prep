# Poll Widget (embeddable on any website)

> **Difficulty:** Medium · **Asked at:** product companies with embeddable products (Razorpay, Freshworks, Zoho, Intercom-style SaaS), also general SDE-2 frontend rounds · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Who adds the widget to a page — a developer with a script tag, or a non-tech user with a CMS? → Assume: a site owner pastes one `<script>` tag (or uses an npm package).
- Single choice or multiple choice? → Assume: single choice by default, multiple choice as an option.
- Do users need to log in to vote? → Assume: no login. Anonymous votes, one vote per browser/device.
- When are results shown — after voting, always, or only after the poll closes? → Assume: after voting (configurable by poll owner).
- Do results need to update live? → Assume: "near live" is enough (a few seconds delay is OK).
- How much traffic? → Assume: one poll can be embedded on a popular news site — 100k+ views and spikes of thousands of votes per minute.
- Can the user change their vote? → Assume: no, for v1.
- Does the poll need to match the host site's look? → Assume: basic theming (colors, font, border radius) via config.

## 1. Requirements

### Functional
- Show a question with 2–10 options.
- User picks an option and submits a vote.
- After voting, show results: percentage bar and vote count per option, total votes.
- Remember that this user already voted (on reload, show results directly).
- Handle closed polls (show final results, no voting).
- Embed on any website with one script tag, many polls on one page possible.

### Non-functional (performance, accessibility, devices, network)
- **Performance:** tiny bundle (target < 15 KB gzipped). It must not slow down the host page. Load async, never block host rendering.
- **Isolation:** host site CSS must not break our widget, and our CSS must not leak into the host.
- **Accessibility:** options are a proper radio group, keyboard usable, results readable by screen readers (not only colored bars).
- **Devices:** responsive inside any container width (300px sidebar to full width), touch friendly.
- **Network:** works on slow 3G; show loading and error states; retry a failed vote.
- **Security:** host page can be any site; no access to host cookies; limit spam votes.

### Out of scope
- Poll creation dashboard (admin side).
- Login/identity-based voting.
- Analytics and export.
- Ranked-choice or free-text answers.

## 2. Architecture

```text
 Host website (news-site.com)
 ┌───────────────────────────────────────────────────────────┐
 │  <div data-poll-id="p_123"></div>                         │
 │  <script async src="cdn.poll.io/embed.js"></script>       │
 │                                                           │
 │   ┌──────────── embed.js (loader, ~2 KB) ─────────────┐   │
 │   │ finds [data-poll-id] nodes, creates Shadow DOM /  │   │
 │   │ iframe, lazy loads widget bundle when visible     │   │
 │   └───────────────────────┬───────────────────────────┘   │
 │                           │                               │
 │   ┌─────── Poll Widget (inside Shadow root) ──────────┐   │
 │   │  PollContainer (state + data fetching)            │   │
 │   │    ├── PollQuestion                               │   │
 │   │    ├── OptionList (radio group)  ── VoteButton    │   │
 │   │    └── ResultsView (bars, %)                      │   │
 │   │  ApiClient ── VoteStore (localStorage)            │   │
 │   └───────────────────────┬───────────────────────────┘   │
 └───────────────────────────┼───────────────────────────────┘
                             │ HTTPS (CORS)
                 ┌───────────▼───────────┐
                 │  CDN (GET poll, cache)│
                 └───────────┬───────────┘
                 ┌───────────▼───────────┐
                 │ Poll API server       │──── DB + Redis counters
                 └───────────────────────┘
```

| Component | Responsibility |
|---|---|
| `embed.js` loader | Tiny script. Finds mount nodes, sets up isolation, loads main bundle only when poll is near viewport. |
| `PollContainer` | Fetches poll, holds state (`idle / voting / voted / error`), decides which view to show. |
| `PollQuestion` | Renders the question text. |
| `OptionList` | Radio group (or checkboxes for multi-choice), keyboard support. |
| `VoteButton` | Submits vote, disabled while sending. |
| `ResultsView` | Bars with percentages and counts; accessible text. |
| `ApiClient` | `fetch` wrapper: timeouts, retry, idempotency key. |
| `VoteStore` | Saves "I voted option X in poll Y" in localStorage. |
| CDN + API | CDN caches poll definition and results for a few seconds; API records votes. |

**Main flow — user votes:**
1. Loader finds `<div data-poll-id="p_123">`, attaches a shadow root, renders a skeleton.
2. `PollContainer` checks `VoteStore`. If already voted, it goes straight to results.
3. It calls `GET /polls/p_123` (served by CDN) and renders options.
4. User selects option and clicks Vote. We optimistically update counts and show results.
5. `POST /polls/p_123/votes` with option id + idempotency key.
6. On success: save to `VoteStore`, replace counts with the server's fresh counts.
7. On failure: roll back to the option list, keep the selection, show "Could not submit, retry".

## 3. Data model

```ts
type PollStatus = 'open' | 'closed';

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  showResults: 'after_vote' | 'always' | 'after_close';
  status: PollStatus;
  closesAt?: string; // ISO date
  totalVotes: number;
}

interface PollOption {
  id: string;
  label: string;
  votes: number; // may be hidden (0) if showResults rules say so
}

// Saved in localStorage under "poll:v1:<pollId>"
interface LocalVoteRecord {
  pollId: string;
  optionIds: string[];
  votedAt: number;
}

// Widget UI state
type WidgetState =
  | { kind: 'loading' }
  | { kind: 'ready'; selected: string[] }
  | { kind: 'submitting'; selected: string[]; snapshot: Poll }
  | { kind: 'voted'; myOptionIds: string[] }
  | { kind: 'error'; message: string; retry: () => void };

// Config passed via data-attributes or JS API
interface WidgetConfig {
  pollId: string;
  theme?: Partial<ThemeTokens>;
  locale?: string;
}

interface ThemeTokens {
  primaryColor: string;
  fontFamily: string;
  radius: string;
  mode: 'light' | 'dark' | 'auto';
}
```

| Entity | Lives in | Why |
|---|---|---|
| `Poll`, `PollOption` (with counts) | Server (cached on CDN), copy in component state | Server is source of truth; counts change often. |
| `LocalVoteRecord` | Client `localStorage` | Remember vote across reloads without login. |
| `WidgetState` | Component state (`useReducer`) | Only this widget instance cares; clear state machine. |
| `WidgetConfig` / theme | Host page (data-attributes / JS init call) | The host site owner controls it. |
| Voter identity (cookie/fingerprint) | Server (hashed) | Real double-vote check must be on server. |

No URL state — we do not own the host URL and must not change it.

## 4. Interface (API)

### Component API

Script tag embed (main way):

```html
<div data-poll-id="p_123" data-theme-primary="#e11d48" data-locale="en"></div>
<script async src="https://cdn.poll.io/embed.v1.js"></script>
```

JS API for single-page apps (host renders the div later):

```js
window.PollWidget.mount(element, { pollId: 'p_123', theme: { mode: 'dark' } });
window.PollWidget.unmount(element);
window.PollWidget.on('vote', (e) => console.log(e.pollId, e.optionIds));
```

React package for customers who use React:

```tsx
interface PollWidgetProps {
  pollId: string;
  theme?: Partial<ThemeTokens>;       // default: light theme
  locale?: string;                    // default: navigator.language
  onVote?: (optionIds: string[]) => void;
  onError?: (err: Error) => void;
}

<PollWidget pollId="p_123" onVote={(ids) => track('poll_vote', ids)} />
```

### Server API

`GET /v1/polls/:pollId` — cached on CDN for ~5 seconds (`Cache-Control: public, max-age=5, stale-while-revalidate=30`).

```json
{
  "id": "p_123",
  "question": "Who will win the IPL this year?",
  "allowMultiple": false,
  "showResults": "after_vote",
  "status": "open",
  "totalVotes": 18234,
  "options": [
    { "id": "o1", "label": "CSK", "votes": 7120 },
    { "id": "o2", "label": "MI", "votes": 6011 },
    { "id": "o3", "label": "RCB", "votes": 5103 }
  ]
}
```

`POST /v1/polls/:pollId/votes`

```json
// request  (header: Idempotency-Key: 7f9c...)
{ "optionIds": ["o2"], "voterToken": "anon_ab12..." }

// 200 response — fresh counts so the client can reconcile
{ "accepted": true, "totalVotes": 18235, "options": [{ "id": "o1", "votes": 7120 }, { "id": "o2", "votes": 6012 }, { "id": "o3", "votes": 5103 }] }

// 409 — already voted
{ "accepted": false, "reason": "ALREADY_VOTED", "myOptionIds": ["o1"] }
```

`GET /v1/polls/:pollId/results/stream` — optional SSE stream for live counts.

Errors: `404` poll not found, `410` poll closed, `429` rate limited.

## 5. Optimizations and deep dives

### 5.1 Embedding: script + Shadow DOM vs iframe

| | Script + Shadow DOM | iframe |
|---|---|---|
| Style isolation | Good (host CSS can't reach in, except inherited props like `font`, `color`) | Perfect |
| Auto height | Natural, it is in the page flow | Need `postMessage` to resize |
| Host page access | Our JS runs in host page (trust issue for host) | Fully sandboxed |
| Cookies | Host's origin — no third-party cookie problem for our API (we use tokens) | Third-party cookies blocked in Safari / Chrome |
| Performance | Lighter, no extra document | Extra document, heavier |
| SEO / host theming | Easy to theme with CSS variables | Must pass theme via URL params |

I'd pick **script + Shadow DOM** for a small widget, and offer an **iframe** fallback for very strict hosts.

```js
// embed.js (simplified)
function mount(el) {
  const root = el.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = WIDGET_CSS; // inlined at build time
  root.append(style, document.createElement('div'));
  // :host { all: initial; } in WIDGET_CSS resets inherited styles
  renderPoll(root.lastChild, readConfig(el));
}
document.querySelectorAll('[data-poll-id]').forEach(mount);
```

Notes:
- Use `:host { all: initial; }` so inherited host fonts/line-height do not leak in.
- Theme through CSS custom properties — they do pass through Shadow DOM, which is what we want: `--poll-primary`.
- Use a `MutationObserver` so polls added later by an SPA host also get mounted.

### 5.2 Preventing double votes

Client-side checks are only for UX; a determined user can clear storage. Layers:
1. **Client:** `localStorage` record → show results instead of options. Disable button while submitting.
2. **Idempotency key:** generated per click attempt; retries with the same key are counted once.
3. **Server:** anonymous voter token (random id stored in localStorage, sent with the vote) + hash of IP + user agent. Store `(pollId, voterHash)` with unique index.
4. **Rate limit** per IP and per poll; add CAPTCHA/Turnstile only when spam is detected.

Say clearly in the interview: "Without login, we cannot 100% stop double votes. We make it hard and good enough for opinion polls."

### 5.3 Optimistic vote + rollback

```ts
async function submitVote(optionIds: string[]) {
  const snapshot = poll;                          // keep for rollback
  setPoll(applyVote(poll, optionIds));            // +1 locally
  setState({ kind: 'voted', myOptionIds: optionIds });
  try {
    const res = await api.vote(poll.id, optionIds, idempotencyKey);
    if (res.accepted) {
      setPoll((p) => mergeCounts(p, res.options)); // server is truth
      voteStore.save(poll.id, optionIds);
    } else if (res.reason === 'ALREADY_VOTED') {
      voteStore.save(poll.id, res.myOptionIds);
      setState({ kind: 'voted', myOptionIds: res.myOptionIds });
    }
  } catch {
    setPoll(snapshot);                             // rollback
    setState({ kind: 'error', message: 'Vote failed', retry: () => submitVote(optionIds) });
  }
}
```

Why optimistic: voting feels instant even on slow mobile. Risk is low because failure is rare and rollback is simple.

### 5.4 Live results: polling vs SSE vs WebSocket

- **Short polling** every 5–10s: simplest, works through CDN cache (cheap!). Only poll while the widget is visible (`IntersectionObserver`) and the tab is active (`document.visibilityState`).
- **SSE:** one-way server → client, auto reconnect, plain HTTP. Good if real-time matters (live TV event polls).
- **WebSocket:** two-way; overkill — voting is a single POST.

My pick: polling with CDN cache by default; SSE as an opt-in for "live event" polls. With 100k viewers, 100k open SSE connections is costly; 100k polls hitting the CDN is almost free.

Also: **animate** bar width changes with CSS `transition: width 300ms` and respect `prefers-reduced-motion`.

### 5.5 Bundle size and loading

- Loader is ~2 KB and `async` — never blocks host rendering.
- Main bundle: use **Preact** (3 KB) or vanilla JS instead of React (~45 KB). Host may already have React but we can't rely on its version.
- Inline CSS into JS, no external font — inherit or use system fonts.
- Lazy-load the main bundle when the poll is within 200px of viewport (`IntersectionObserver` with `rootMargin`).
- Version in URL (`embed.v1.js`) with long cache; loader can be short-cached so we can ship fixes.
- Reserve height with a skeleton to avoid layout shift (CLS) on the host page — host owners care about Core Web Vitals.

### 5.6 Accessibility

```html
<fieldset>
  <legend>Who will win the IPL this year?</legend>
  <label><input type="radio" name="p_123" value="o1" /> CSK</label>
  ...
</fieldset>
<button type="submit">Vote</button>

<!-- results -->
<ul aria-label="Results, 18,235 votes">
  <li>MI <span aria-hidden="true" class="bar" style="--w:33%"></span> 33% (6,012 votes)</li>
</ul>
<div role="status" aria-live="polite">Thanks, your vote was counted.</div>
```

- Use native radios — free keyboard support (arrow keys).
- Show numbers as text, not only bar length or color.
- After voting, move focus to the results heading so screen reader users know the view changed.

### Also mention
- **Theming:** CSS variables (`--poll-primary`, `--poll-radius`), dark mode via `prefers-color-scheme` or config.
- **i18n / RTL:** strings from a small locale map; `dir="rtl"` support; `Intl.NumberFormat` for counts ("18,235" vs "18.235").
- **Security:** never use `innerHTML` with poll text (XSS on host page!). Render as text. Use CSP-friendly code (no `eval`).
- **Errors:** widget errors must never crash the host page — wrap in try/catch and an error boundary.
- **Testing:** unit tests for reducer, Playwright tests on a sample host page with aggressive global CSS.
- **Monitoring:** send widget errors to our own endpoint, not to host's Sentry.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Embedding | Script + Shadow DOM | iframe | Shadow DOM: lighter, auto height, easy theming. iframe as fallback for strict CSP hosts. |
| UI library | React | Preact / vanilla | Preact: React-like code, 10x smaller. |
| Vote update | Optimistic | Wait for server | Optimistic: instant feel, failure rare, rollback simple. |
| Live results | Polling (CDN cached) | SSE / WebSocket | Polling by default: cheap at scale; SSE only for live events. |
| Double vote check | localStorage only | Server token + IP hash | Both: client for UX, server for real enforcement. |
| Results data | Exact counts | Rounded percentages | Show both counts and % (rounded, make sure they sum to ~100%). |
| Bundle loading | Load immediately | Lazy load when visible | Lazy: polls are often below the fold. |

## 7. Likely follow-up questions

**Q: How do you make sure percentages add up to 100%?**
Simple rounding can give 99% or 101%. Use the "largest remainder" method: floor all, then give +1 to options with largest decimal parts until the sum is 100.

**Q: The host site has a strict CSP. What breaks?**
Our script must be allowed in `script-src`, our API in `connect-src`. Inline `<style>` in Shadow DOM may need `style-src 'unsafe-inline'` — use constructable stylesheets (`adoptedStyleSheets`) or offer the iframe version.

**Q: How do you handle 10 polls on one page?**
One loader, one shared bundle, one API client. Batch initial fetch: `GET /polls?ids=a,b,c`. Each poll mounts in its own shadow root.

**Q: What if the poll closes while the user is looking at it?**
Server returns `410` on vote. Show "This poll has closed" and switch to final results. Polling also updates `status`.

**Q: How do you ship a new version without breaking customers?**
Versioned URLs (`v1`, `v2`). Within `v1` only backward-compatible changes. Loader can be short-cached for urgent fixes; canary release by percent of polls.

**Q: Third-party cookies are blocked. How do you identify voters?**
We don't use cookies. Generate a random voter token in localStorage (per host origin — it is partitioned, which is fine) and send it in the body. Server combines it with IP hash.

**Q: Very high traffic spike — 50k votes per minute on one poll?**
API writes to Redis `INCR` counters and a queue; DB updated in batches. Reads served from CDN with 5s cache, so read traffic barely reaches origin.

**Q: How would SSR / React Server Components hosts use it?**
Mount only on the client. The React package uses `useEffect` to mount, and checks `typeof window`. Skeleton can be server-rendered with fixed height.

## 8. If you only have 60 seconds

- Tiny async loader script finds `data-poll-id` divs and mounts a Preact widget inside Shadow DOM for style isolation; iframe fallback.
- Poll data from `GET /polls/:id` cached on CDN for a few seconds; vote via `POST` with an idempotency key.
- Optimistic vote: show results instantly, roll back on failure, then sync with server counts.
- Double votes: localStorage for UX, server checks voter token + IP hash, plus rate limiting.
- Live results with visibility-aware polling (cheap via CDN); SSE only for live events.
- Accessible: native radio group in a fieldset, results as text, `aria-live` status.
- Never hurt the host: < 15 KB, lazy loaded, reserved height (no CLS), no `innerHTML`, errors contained.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarify | Login or not, results timing, live updates, traffic, theming. |
| 5–10 | Requirements | Functional list + non-functional: isolation, bundle size, a11y. |
| 10–18 | Architecture | Loader → Shadow root → components → CDN/API diagram; vote flow steps. |
| 18–23 | Data model | `Poll`, `PollOption`, local vote record, widget state machine. |
| 23–28 | API | Embed snippet + JS API, GET poll, POST vote with example JSON. |
| 28–40 | Deep dives | Shadow DOM vs iframe, double votes, optimistic update, live results, bundle size. |
| 40–45 | Trade-offs + wrap | Trade-off table summary, a11y, security, questions for them. |

## Common mistakes

- Jumping to components before defining data/entities and the embed model — the "embeddable" part is the whole question.
- Using React + a CSS framework and ending with a 150 KB widget that slows the host page.
- Forgetting style isolation — host CSS like `button { all: unset }` breaks your UI.
- Trusting localStorage to stop double votes and not mentioning server-side checks.
- Using `innerHTML` with poll text (XSS on someone else's site).
- Forgetting accessibility and keyboard support — clickable `div`s instead of radio inputs, results only as colored bars.

## My mistakes

- [ ]
