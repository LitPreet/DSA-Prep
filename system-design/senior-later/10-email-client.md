# Email Client (e.g. Gmail / Outlook web)

> **Difficulty:** Hard · **Asked at:** Big tech (Google, Microsoft), product companies with heavy web apps (Atlassian, Zoho, Freshworks), SaaS unicorns · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Is this the full web app (inbox, read, compose) or only one part? → Assume: inbox list, reading a thread, and composing. Settings and filters are out.
- Do we group emails into conversations (threads) like Gmail, or show single messages? → Assume: threads, with a single-message view as a setting we will not build.
- How big is a typical mailbox? → Assume: 50,000+ emails, 100+ new emails per day for heavy users.
- Must it work offline? → Assume: yes, read recent mail and queue actions (archive, send) offline. This is a key part of the design.
- Do we need real-time new mail? → Assume: yes, new mail appears within a few seconds without refresh.
- Devices? → Assume: desktop first (keyboard power users), responsive down to mobile web.
- Is search done on the server? → Assume: server does full search; client does instant search over cached mail.
- Do we show HTML emails from any sender? → Assume: yes, so we must render untrusted HTML safely.

## 1. Requirements

### Functional

- Show folders/labels (Inbox, Sent, Drafts, Starred, custom labels) with unread counts.
- Inbox list: sender, subject, snippet, time, unread/starred state, attachment icon. Paginated / infinite scroll.
- Open a thread: show all messages in it, older ones collapsed.
- Actions on one or many threads: archive, delete, mark read/unread, star, move to label.
- Compose: new mail, reply, reply-all, forward. Rich text, attachments, autosave draft.
- Undo send (5–10 second window) and undo for archive/delete.
- Search with operators (`from:`, `has:attachment`).
- New mail arrives in real time.
- Keyboard shortcuts (`j`/`k`, `e` archive, `r` reply, `c` compose).

### Non-functional (performance, accessibility, devices, network)

- **Performance:** first inbox paint under 1.5s on a mid-range laptop; opening a cached thread under 100ms; scrolling at 60fps with 10,000 rows loaded.
- **Perceived speed:** every action (archive, star) feels instant — optimistic UI.
- **Offline / bad network:** read last ~30 days offline; queue writes and sync later.
- **Security:** email HTML is untrusted input. No script runs, no tracking pixels by default, no CSS leaking into our app.
- **Accessibility:** full keyboard use, screen reader announces list items and new mail, focus management when opening/closing a thread.
- **Devices:** desktop 3-pane layout; mobile shows list OR thread, not both.
- **Bundle:** inbox route JS under ~200KB gzipped; the rich text editor is lazy loaded on first compose.

### Out of scope

- Spam detection, mail server (SMTP/IMAP), backend storage.
- Calendar, chat, contacts management.
- Filters/rules settings, multi-account switching.

## 2. Architecture

```text
+-----------------------------------------------------------------------+
|                           Browser (React SPA)                          |
|                                                                        |
|  +-----------+   +-------------------+   +--------------------------+  |
|  | Sidebar   |   |  ThreadList       |   |  ThreadView              |  |
|  | (labels,  |   |  (virtualized)    |   |  MessageItem x N         |  |
|  |  counts)  |   |                   |   |   -> SafeEmailFrame      |  |
|  +-----------+   +-------------------+   +--------------------------+  |
|        |                 |                        |      ComposeDialog |
|        +-----------------+------------+-----------+   (lazy loaded)    |
|                                       v                                |
|                      +-------------------------------+                 |
|                      |  Mail Store (normalized)      |                 |
|                      |  threads, messages, labels    |                 |
|                      +-------------------------------+                 |
|                        |            |            |                     |
|               +--------+    +-------+------+   +-+----------------+    |
|               v             v              v   v                  |    |
|       +-------------+ +--------------+ +-------------------+      |    |
|       | API client  | | Sync engine  | | Outbox / Action   |      |    |
|       | (REST/fetch)| | (WS + delta) | | queue (IndexedDB) |      |    |
|       +-------------+ +--------------+ +-------------------+      |    |
|               |             |              |                      |    |
|               |       +-----+--------------+----+                 |    |
|               |       |  IndexedDB cache        |  Service Worker |    |
|               |       |  (threads, msgs, drafts)|  (app shell)    |    |
|               |       +-------------------------+                 |    |
+---------------|-------------|-----------------------------------------+
                v             v
          +-----------+  +-------------+       +------------------+
          | REST API  |  | WebSocket / |       | Image proxy      |
          |           |  | push server |       | (remote images)  |
          +-----------+  +-------------+       +------------------+
```

| Component | Responsibility |
|---|---|
| Sidebar | Labels list, unread counts, compose button |
| ThreadList | Virtualized list of thread rows, selection, bulk actions |
| ThreadView | Shows messages of one thread, collapse/expand, reply box |
| SafeEmailFrame | Renders one message body in a sandboxed iframe after sanitizing |
| ComposeDialog | Rich text editor, recipients, attachments, autosave, undo send |
| Mail Store | Normalized in-memory data (threads by id, messages by id, label → thread ids) |
| API client | REST calls, retries, auth headers |
| Sync engine | Listens to WebSocket, pulls deltas with a `historyId`, writes into store + IndexedDB |
| Outbox / Action queue | Stores pending actions (send, archive) in IndexedDB, replays when online |
| IndexedDB cache | Recent threads/messages and drafts for instant load and offline |
| Service Worker | Caches app shell (HTML/JS/CSS) so app opens offline |
| Image proxy (server) | Fetches remote images for the user so the sender cannot see IP / open time |

**Main flow — user opens the app and archives a thread:**

1. Service Worker serves the app shell from cache. React mounts.
2. Mail Store hydrates from IndexedDB → inbox shows cached rows in ~200ms.
3. Sync engine calls `GET /sync?since=<historyId>` to get changes since last visit, merges them, updates IndexedDB.
4. WebSocket connects. New mail events push small "thread changed" messages.
5. User presses `e` on a thread. Store removes the thread from the Inbox label immediately (optimistic). A toast shows "Archived · Undo".
6. Action goes into the action queue → `POST /threads/batchModify`. On success, remove from queue. On failure, roll back and show an error.

## 3. Data model

```ts
type ThreadId = string;
type MessageId = string;

interface Participant {
  name: string;
  email: string;
}

interface Thread {
  id: ThreadId;
  subject: string;
  snippet: string;           // first ~120 chars of latest message, plain text
  participants: Participant[];
  messageIds: MessageId[];   // oldest -> newest
  labelIds: string[];        // 'INBOX', 'STARRED', 'UNREAD', custom ids
  lastMessageAt: number;     // epoch ms, used for sorting
  hasAttachments: boolean;
}

interface Message {
  id: MessageId;
  threadId: ThreadId;
  from: Participant;
  to: Participant[];
  cc: Participant[];
  sentAt: number;
  snippet: string;
  bodyHtml?: string;         // loaded lazily, can be large
  bodyText?: string;
  attachments: Attachment[];
  isRead: boolean;
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface Label {
  id: string;
  name: string;
  type: 'system' | 'user';
  unreadCount: number;
}

interface Draft {
  localId: string;           // created on client, works offline
  serverId?: string;
  threadId?: ThreadId;       // set for replies
  to: Participant[];
  subject: string;
  bodyHtml: string;
  updatedAt: number;
}

type PendingAction =
  | { id: string; type: 'modifyLabels'; threadIds: ThreadId[]; add: string[]; remove: string[] }
  | { id: string; type: 'send'; draftLocalId: string; sendAt: number };
```

Normalized store shape (like a small database in memory):

```ts
interface MailState {
  threads: Record<ThreadId, Thread>;
  messages: Record<MessageId, Message>;
  labels: Record<string, Label>;
  listByLabel: Record<string, { ids: ThreadId[]; nextCursor: string | null }>;
  historyId: string;         // last server change we have seen
}
```

| Entity | Lives in | Why |
|---|---|---|
| Threads, messages (metadata) | Client store + IndexedDB | Shared by list and thread view; cached for instant load and offline |
| Message bodies | IndexedDB (recent only) + fetched on demand | Big; only keep last ~30 days to control storage |
| Labels + unread counts | Client store | Needed everywhere (sidebar, rows) |
| Current label, open thread id, search query | URL (`/inbox/t/abc123`, `?q=from:ravi`) | Shareable, back button works, refresh keeps place |
| Selected thread ids (checkboxes) | Component/store state | Temporary UI state, no need to persist |
| Drafts | IndexedDB + server | Never lose typed text, even if tab crashes |
| Pending actions (outbox) | IndexedDB | Survive reloads while offline |
| Compose open/minimized | Component state | Pure UI |

Why normalized: the same thread is in Inbox, Starred and a search result. If I star it once, all three lists update because they only hold ids.

## 4. Interface (API)

### Component API (props of the key components)

```ts
interface ThreadListProps {
  labelId: string;                   // or searchQuery
  searchQuery?: string;
  selectedIds: Set<ThreadId>;
  activeId?: ThreadId;               // keyboard cursor
  onOpen(id: ThreadId): void;
  onToggleSelect(id: ThreadId): void;
  onLoadMore(): void;
}

interface ThreadRowProps {
  thread: Thread;
  isSelected: boolean;
  isActive: boolean;
  style: React.CSSProperties;        // from the virtualizer
}

interface ThreadViewProps {
  threadId: ThreadId;
  onReply(messageId: MessageId, mode: 'reply' | 'replyAll' | 'forward'): void;
}

interface SafeEmailFrameProps {
  html: string;
  allowRemoteImages: boolean;
  onLoadRemoteImages(): void;        // user clicked "Show images"
}

interface ComposeDialogProps {
  draftLocalId: string;
  mode: 'new' | 'reply' | 'replyAll' | 'forward';
  onClose(): void;
}
```

### Server API (endpoints, method, params, example JSON response, pagination style and WHY; real-time channels where relevant)

| Endpoint | Method | Purpose |
|---|---|---|
| `/threads?labelId=INBOX&limit=50&cursor=...` | GET | Thread list page |
| `/threads/:id` | GET | Full thread with message bodies |
| `/threads/batchModify` | POST | Add/remove labels for many threads (archive = remove INBOX) |
| `/drafts` / `/drafts/:id` | POST / PUT | Create / autosave draft |
| `/messages/send` | POST | Send (with idempotency key) |
| `/attachments/upload` | POST | Returns upload URL (direct to storage) |
| `/search?q=...&cursor=...` | GET | Server search |
| `/sync?since=<historyId>` | GET | Changes since last historyId |

Example: `GET /threads?labelId=INBOX&limit=50`

```json
{
  "threads": [
    {
      "id": "t_9f2",
      "subject": "Offer letter - SDE 2",
      "snippet": "Hi Preet, please find attached...",
      "participants": [{ "name": "HR Team", "email": "hr@acme.com" }],
      "labelIds": ["INBOX", "UNREAD"],
      "lastMessageAt": 1764140400000,
      "hasAttachments": true,
      "messageCount": 3
    }
  ],
  "nextCursor": "eyJ0IjoxNzY0MTQwNDAwMDAwLCJpZCI6InRfOWYyIn0",
  "historyId": "88412"
}
```

**Pagination: cursor-based**, not offset. New mail keeps arriving at the top. With `offset=50`, a new email pushes everything down by one and you see a duplicate row. A cursor says "give me items older than (lastMessageAt, id)", so it is stable.

**Real-time:** one WebSocket per tab (or one shared via `BroadcastChannel`/SharedWorker across tabs). Server sends tiny events, not full data:

```json
{ "type": "mailbox_changed", "historyId": "88415" }
```

Client then calls `GET /sync?since=88412`, which returns `{ added: [...], modified: [...], deleted: [...], historyId: "88415" }`. Why this way: if the socket drops for 10 minutes, the same `/sync` call catches up everything. One code path for both live and reconnect.

**Send with idempotency:** `POST /messages/send` with header `Idempotency-Key: <draftLocalId>`. If the network fails after the server sent it and we retry, the server does not send twice.

## 5. Optimizations and deep dives

### 5.1 List virtualization

A heavy user scrolls through thousands of threads. 5,000 DOM rows with avatars and labels = slow scroll and high memory.

- Use `react-window` / `@tanstack/react-virtual`. Only render visible rows + overscan of ~10.
- Rows are fixed height (e.g. 40px compact, 56px default) — fixed height makes virtualization simple and fast.
- Infinite load: when the last visible index is within 20 of the end, call `onLoadMore()`.
- Keep the row component `React.memo` and pass only primitive props so starring one row does not re-render 30 rows.

```tsx
const virtualizer = useVirtualizer({
  count: ids.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 56,
  overscan: 10,
});
```

Accessibility catch: virtualized lists remove rows from the DOM. Use `role="grid"` / `role="row"` with `aria-rowcount={total}` and `aria-rowindex` on each row so screen readers know the real size.

### 5.2 Thread / conversation model

- Server groups messages into threads (using `In-Reply-To` / `References` headers and subject). The client just trusts `threadId`.
- List shows the thread, sorted by `lastMessageAt`. Unread if any message is unread.
- In ThreadView: show the latest message expanded, all unread ones expanded, older read ones collapsed as one line (sender + snippet). If more than ~4 collapsed, show "7 older messages" as one clickable bar.
- Only fetch bodies when the thread opens; prefetch the body of the thread under the keyboard cursor and the next one (`j`) so opening feels instant.
- Opening a thread marks it read optimistically after ~1s (avoid marking read when the user only passes through with `j j j`).

### 5.3 Rendering untrusted HTML email safely

This is the most important security topic. Email HTML comes from anyone on the internet.

Risks: XSS (script, `onerror=`, `javascript:` links), CSS leaking (`body { display:none }` breaks our app), phishing overlays (absolute-positioned fake login), tracking pixels (1×1 image tells the sender you opened it and your IP).

Defence in layers:

1. **Sanitize on server and again on client** with an allowlist (DOMPurify on client). Remove `<script>`, `<iframe>`, `<form>`, `on*` attributes, `javascript:` URLs, `<meta http-equiv>`.
2. **Render inside a sandboxed iframe** with `srcdoc`. No `allow-scripts`, no `allow-same-origin`. So even if sanitizing misses something, script cannot run and cannot touch our cookies or DOM. CSS stays inside the iframe.
3. **Block remote images by default** (or proxy them). Rewrite `<img src="https://tracker.com/p.gif">` to `data-src` and show a "Show images" bar. Gmail-style alternative: route all images through our proxy so the sender only sees the proxy's IP, and the proxy fetches on receive, not on open.
4. **Links:** add `target="_blank" rel="noopener noreferrer"`. Optionally show the real URL on hover to fight phishing.
5. **CSP** on the iframe content: `default-src 'none'; img-src data: https://proxy.mail.com; style-src 'unsafe-inline'`.

```tsx
function SafeEmailFrame({ html, allowRemoteImages }: SafeEmailFrameProps) {
  const clean = useMemo(() => {
    const safe = DOMPurify.sanitize(html, { FORBID_TAGS: ['style'], WHOLE_DOCUMENT: false });
    return allowRemoteImages ? safe : blockRemoteImages(safe); // src -> data-src
  }, [html, allowRemoteImages]);

  const srcDoc = `<!doctype html><meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src data: https://img-proxy.mail.com; style-src 'unsafe-inline'">
    <base target="_blank">${clean}`;

  return <iframe sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={srcDoc}
                 title="Email content" style={{ width: '100%', border: 0 }} />;
}
```

Iframe height is the tricky part. The iframe runs no scripts, and without `allow-same-origin` the parent cannot read its DOM, so it cannot measure the content height. Common fixes: (a) add `allow-same-origin` but still NOT `allow-scripts`, so the parent can read `contentDocument.body.scrollHeight` while scripts stay blocked (never use both flags together, because that lets the frame remove its own sandbox), or (b) render the sanitized HTML into a Shadow DOM instead. The trade-off: Shadow DOM makes height and text selection easy, while the iframe gives stronger isolation. For untrusted mail I would pick the iframe with option (a).

### 5.4 Offline + IndexedDB sync

- **Read path:** on first load, store the last ~30 days (or last 2,000 threads) of metadata and bodies in IndexedDB (via Dexie or idb). Next launch reads from IndexedDB first, then syncs deltas. This is "stale-while-revalidate" for the whole mailbox.
- **Write path:** every action becomes a `PendingAction` in an IndexedDB outbox. The UI updates from local state. A queue worker replays actions in order when `navigator.onLine` and the socket are up.
- **Conflicts:** label changes are mostly safe to replay (add/remove are idempotent). If a thread was deleted on another device, server returns 404 → drop the action and refresh that thread.
- **Storage limits:** ask `navigator.storage.persist()`; evict oldest bodies first (LRU) when above ~200MB. Keep metadata longer than bodies.
- **Multiple tabs:** use `BroadcastChannel` so tabs share updates; only one tab (leader, via Web Locks API) runs the sync engine to avoid duplicate work.
- **Logout:** clear IndexedDB fully. Shared computers are a real risk.

### 5.5 Optimistic actions and undo send

Archive/star/delete:

```ts
function archive(ids: ThreadId[]) {
  const snapshot = ids.map(id => store.threads[id]);
  store.removeLabel(ids, 'INBOX');                 // UI updates now
  const actionId = outbox.add({ type: 'modifyLabels', threadIds: ids, add: [], remove: ['INBOX'] });
  toast.show('Conversation archived', {
    action: { label: 'Undo', onClick: () => { outbox.cancel(actionId); store.restore(snapshot); } },
  });
}
```

Undo send is a **delay**, not a recall. Email cannot be unsent once it leaves the server.

- On Send: close compose, show "Sending… Undo" for N seconds (user setting: 5/10/30s).
- Option A (client delay): keep the send in the outbox with `sendAt = now + 10s`; only call the API after the timer. Risk: user closes the tab → mail is not sent until they come back.
- Option B (server delay, better): call `POST /messages/send` with `sendAt`. Server holds it. Undo calls `POST /messages/:id/cancel`. Works even if the tab closes.
- I'd pick B, with the outbox only for offline.

### 5.6 Keyboard shortcuts and search

- One global `keydown` listener (not one per row). Ignore when focus is in an input/editor or `contenteditable`.
- Keep a "keyboard cursor" (`activeId`) separate from "selected" checkboxes. `j/k` moves cursor and scrolls virtualizer `scrollToIndex`.
- Support chords like `g i` (go to inbox) with a 1s timeout.
- `?` opens a shortcut help dialog. Shortcuts must be disable-able (WCAG 2.1.4 single-character shortcuts).
- **Search:** debounce typing 250ms; show instant local results from IndexedDB (subject/from match) while the server request runs; cancel old requests with `AbortController`. Put the query in the URL (`/search?q=...`) so back button works.

### Also mention

- **Security:** CSRF tokens on mutating calls, short-lived auth tokens, attachment downloads from a separate sandbox domain (`mail-attachments.com`) so a malicious HTML attachment cannot read our cookies.
- **Compose editor:** lazy-load the rich text editor (TipTap/Lexical) on first compose; autosave draft every 2–3s after typing stops.
- **Attachments:** upload direct to storage with a signed URL, show progress, allow send only when upload finishes.
- **i18n:** RTL support for Arabic/Hebrew mail (`dir="auto"` on bodies), relative times with `Intl.RelativeTimeFormat`.
- **Accessibility:** `aria-live="polite"` for "3 new messages", focus moves to thread heading when opened and back to the row when closed.
- **Analytics:** time-to-inbox, time-to-open-thread, send failure rate.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Real-time updates | Polling every 30s | WebSocket + delta sync | WebSocket + `/sync` delta. Faster and less load; polling as fallback if socket fails |
| Pagination | Offset | Cursor | Cursor — new mail at top breaks offset |
| Email body render | Shadow DOM | Sandboxed iframe | Iframe — strongest isolation for untrusted HTML |
| Remote images | Load directly | Block / proxy | Proxy by default; prevents tracking and IP leak |
| Undo send | Client-side timer | Server-side scheduled send | Server — works if tab closes |
| State management | React Query per screen | Normalized store (Redux Toolkit / Zustand) + IndexedDB | Normalized store — same thread appears in many lists; offline needs a local database anyway |
| Offline scope | Full mailbox | Last 30 days | Last 30 days — storage quotas and first sync time |

## 7. Likely follow-up questions

**Q: How do you keep unread counts correct with optimistic updates?**
Update the count locally in the same reducer as the label change. On each `/sync`, server sends true counts for labels and we overwrite. Local is a guess, server is the truth.

**Q: Two tabs open — user archives in one. What happens in the other?**
BroadcastChannel message updates the other tab's store instantly. Even without it, the server's socket event triggers `/sync` in both tabs.

**Q: A thread has 200 messages. How do you render it?**
Collapse all read older messages into "195 older messages". Fetch bodies only for expanded ones. Render each body in its own iframe only when visible (IntersectionObserver).

**Q: How would you make opening a thread instant?**
Prefetch the thread under the cursor and on hover (after 100ms), keep recent bodies in IndexedDB, show metadata (subject, senders) immediately and stream bodies after.

**Q: How do you handle a very long email with huge HTML (e.g. 2MB newsletter)?**
Server sends a truncated version with "View entire message" link (Gmail clips at ~102KB). Sanitize in a Web Worker so the main thread doesn't freeze.

**Q: What if the send API fails while offline?**
The send stays in the IndexedDB outbox with status "queued". Show it in Outbox with "Will send when online". Retry with exponential backoff; idempotency key prevents duplicates.

**Q: How do you test the HTML sanitizer?**
Unit tests with a corpus of known XSS payloads (OWASP cheat sheet), plus a check that the iframe has no `allow-scripts`. Add CSP violation reporting in production.

**Q: How would you render the mobile layout?**
Same store and components; layout changes. On mobile, routes switch between list and thread full-screen. Swipe to archive with the same optimistic action.

## 8. If you only have 60 seconds

- Three panes: labels, virtualized thread list, thread view; compose is a lazy-loaded dialog.
- Normalized store (threads, messages, labels) backed by IndexedDB, so the inbox paints from cache and works offline.
- Sync with a WebSocket "something changed" ping + `/sync?since=historyId` delta — the same path handles reconnect.
- Cursor pagination because new mail at the top breaks offsets.
- Every action is optimistic with undo; writes go through an IndexedDB outbox with idempotency keys.
- Email HTML is untrusted: sanitize with DOMPurify, render in a sandboxed iframe, block or proxy remote images.
- Keyboard first: one global shortcut handler, `j/k` cursor, accessible grid with `aria-rowcount`.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Threads vs messages, offline, real-time, mailbox size |
| 4–9 | Requirements | Functional list, perf numbers, security of HTML, out of scope |
| 9–17 | Architecture | Diagram: store, sync engine, outbox, IndexedDB, SW |
| 17–22 | Data model | Thread/Message/Label types, normalized store, where each lives |
| 22–27 | API | Thread list with cursor, batchModify, send with idempotency, socket + /sync |
| 27–40 | Deep dives | Safe HTML rendering, virtualization, optimistic + undo send, offline sync |
| 40–45 | Trade-offs + wrap up | Iframe vs Shadow DOM, server vs client undo send, summary |

## Common mistakes

- Jumping to components before defining data/entities — you can't explain caching or optimistic updates without a Thread/Message model.
- Using `dangerouslySetInnerHTML` for email bodies directly. This is an instant red flag.
- Offset pagination on a list where new items arrive at the top.
- Forgetting tracking pixels and remote images — interviewers love this privacy point.
- Saying "undo send recalls the email". It only delays sending.
- Not virtualizing the list, or virtualizing without thinking about keyboard navigation and screen readers.

## My mistakes

- [ ]
