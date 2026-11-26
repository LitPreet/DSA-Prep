# Chat Application (e.g. Messenger / WhatsApp Web)

> **Difficulty:** Hard · **Asked at:** product companies with real-time features (Meta, Microsoft Teams, Slack-like SaaS, Razorpay/Freshworks support chat, Swiggy/Zomato order chat, Atlassian) · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- One-to-one chat only, or group chats too?
  → Assume: both. Groups up to 256 members.
- Text only, or images/files too?
  → Assume: text + images. Files, voice and video calls are out of scope.
- Do we need read receipts, typing indicators and online status?
  → Assume: yes for receipts (sent / delivered / read) and typing. Online status as "nice to have".
- Is it web only? Multiple tabs/devices at once?
  → Assume: web app. Same user can be logged in on phone and 2 browser tabs. All must stay in sync.
- End-to-end encryption?
  → Assume: no E2E for this round (server can read messages). Mention it as a follow-up.
- Should it work offline?
  → Assume: user can read cached chats and queue messages while offline. They send when back online.
- How much history?
  → Assume: full history, loaded page by page when scrolling up.

## 1. Requirements

### Functional
- See a list of conversations, sorted by last message time, with unread count and last message preview.
- Open a conversation and see messages, newest at the bottom. Scroll up to load older ones.
- Send a message. It appears instantly (optimistic) with status: sending → sent → delivered → read.
- Receive new messages in real time in any open or closed conversation.
- Typing indicator ("Riya is typing…").
- Retry a failed message.
- Send images with preview.

### Non-functional (performance, accessibility, devices, network)
- **Latency:** message appears on the receiver's screen in < 500ms on a good network.
- **Performance:** open a chat in < 300ms from cache. Smooth scrolling in chats with 10,000+ messages.
- **Reliability:** no lost messages, no duplicates, correct order. Survives tab sleep, network switch (Wi-Fi → 4G), laptop lid close.
- **Accessibility:** new messages announced with an `aria-live="polite"` region. Full keyboard use (Up arrow to edit last, Enter to send, Shift+Enter for newline). Good contrast for status ticks.
- **Devices:** desktop-first two-pane layout; on small screens, list and conversation are separate views.
- **Network:** works on flaky networks. Auto reconnect. Offline read and queued send.

### Out of scope
- Voice/video calls, E2E encryption, message search, reactions, editing/deleting, bots, admin moderation, push notifications on mobile apps (we may use Web Push briefly).

## 2. Architecture

```text
+-------------------------------------------------------------------------+
|                         Browser (React app)                             |
|                                                                         |
|  +------------------+     +---------------------------------------+     |
|  | ConversationList |     |           ConversationView            |     |
|  |  (virtualized)   |     |  +---------------------------------+  |     |
|  +------------------+     |  |  MessageList (virtualized,      |  |     |
|           ^               |  |  bottom-anchored)               |  |     |
|           |               |  +---------------------------------+  |     |
|           |               |  |  Composer (input, attach, send) |  |     |
|           |               |  +---------------------------------+  |     |
|           |               +---------------------------------------+     |
|           |                       ^                  |                  |
|           |                       |                  v                  |
|  +-------------------------------------------------------------------+  |
|  |        Normalized Chat Store (Zustand / Redux Toolkit)            |  |
|  |  conversations | messages | users | outbox | sync cursors        |  |
|  +-------------------------------------------------------------------+  |
|        ^                 |                    ^              |          |
|        |                 v                    |              v          |
|  +---------------+  +----------------+   +------------------------+     |
|  | Realtime      |  | REST client    |   | Persistence (IndexedDB)|     |
|  | (WebSocket +  |  | (history,      |   | cached msgs + outbox   |     |
|  | reconnect)    |  |  uploads)      |   +------------------------+     |
|  +---------------+  +----------------+                                  |
|        |                  |                                             |
|  (SharedWorker / BroadcastChannel to share 1 socket across tabs)        |
+--------|------------------|---------------------------------------------+
         v                  v
  +---------------+   +---------------+     +-----------------+
  | WS Gateway    |   | REST API      |     | Media upload    |
  +---------------+   +---------------+     | (S3 signed URL) |
                                            +-----------------+
```

| Component | Responsibility |
|---|---|
| ConversationList | Shows chats sorted by `lastMessageAt`, unread badges, preview. Virtualized for 1000s of chats. |
| ConversationView | Header (name, typing/online), MessageList, Composer. |
| MessageList | Bottom-anchored virtualized list. Loads older pages when scrolled to top. Sends "read" when messages are visible. |
| Composer | Text input, attach image, Enter to send, emits throttled `typing` events. |
| Chat Store | Single source of truth in the client. Normalized. All UI reads from here. |
| Realtime client | Owns the WebSocket: connect, heartbeat, reconnect with backoff, resync after reconnect. |
| REST client | Paginated history, conversation list, image upload URLs. |
| Persistence | IndexedDB cache for fast startup and offline reading; outbox for unsent messages. |
| Outbox | Queue of messages not yet acked by server. Retries in order. |

**Main flow: user sends "Hi" in a chat**
1. Composer calls `sendMessage(conversationId, "Hi")`.
2. Store creates a message with `clientId = uuid()`, `status: "pending"`, `createdAt = now`. It shows in the list immediately.
3. Message is added to the outbox (memory + IndexedDB).
4. Realtime client sends `{type: "message.send", clientId, conversationId, text}` over WebSocket.
5. Server saves it, assigns `id` and `seq` (sequence number per conversation), replies `message.ack {clientId, id, seq, createdAt}`.
6. Store replaces the pending message with the server version (matched by `clientId`), status → `sent`. Remove from outbox.
7. Server pushes `message.new` to other members. Their devices send `message.delivered`, later `message.read`, which come back to the sender as `receipt` events → ticks update.

## 3. Data model

```ts
type User = {
  id: string;
  name: string;
  avatarUrl: string;
  lastSeenAt?: string;
};

type Conversation = {
  id: string;
  type: 'direct' | 'group';
  title?: string;            // groups only; direct uses other user's name
  memberIds: string[];
  lastMessageId?: string;
  lastMessageAt: string;
  lastSeq: number;           // latest seq on server
  myLastReadSeq: number;     // what I have read
  unreadCount: number;       // derived: lastSeq - myLastReadSeq (server also sends it)
  muted: boolean;
};

type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

type Message = {
  id?: string;               // server id, missing while pending
  clientId: string;          // uuid created on the client, used to dedupe
  conversationId: string;
  senderId: string;
  seq?: number;              // server-assigned order inside conversation
  text?: string;
  attachments?: { url: string; width: number; height: number; mime: string }[];
  createdAt: string;         // client time while pending, server time after ack
  status: MessageStatus;
};
```

**Normalized store** (avoid nested arrays of objects — updates become simple and cheap):

```ts
type ChatState = {
  users: { byId: Record<string, User> };
  conversations: {
    byId: Record<string, Conversation>;
    orderedIds: string[];                      // sorted by lastMessageAt desc
  };
  messages: {
    byKey: Record<string, Message>;            // key = clientId (stable forever)
    idsByConversation: Record<string, string[]>; // clientIds sorted by seq
    hasMoreOlder: Record<string, boolean>;
    oldestCursor: Record<string, number | null>; // oldest seq loaded
  };
  typing: Record<string, { userId: string; until: number }[]>; // per conversation
  outbox: string[];                            // clientIds waiting for ack, in order
  connection: 'connecting' | 'online' | 'offline';
  lastSyncedAt: number;                        // for resync after reconnect
};
```

Why key by `clientId`? The message keeps the same key from "pending" to "read", so React doesn't unmount/remount the row when the server id arrives. Messages from other users also carry the `clientId` their sender created.

| Entity | Lives in | Why |
|---|---|---|
| Messages, conversations, users | Server (truth) → normalized client store → IndexedDB cache | Real-time updates touch many places; normalized makes each update O(1). IndexedDB gives instant startup + offline read. |
| Outbox (unsent messages) | Client store + IndexedDB | Must survive refresh and offline. |
| Active conversation id | URL (`/chat/:conversationId`) | Shareable, back button, deep links from notifications. |
| Composer draft text | Component state, saved to localStorage per conversation on blur | Draft survives switching chats; not important enough for server. |
| Typing indicators | Client store (ephemeral, with expiry) | Never persisted. Expire after 5s without update. |
| Connection status | Client store | Shown as a banner ("Connecting…"). |
| Scroll position / "is at bottom" | Component ref | Pure UI. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
type ConversationListProps = {
  conversationIds: string[];
  activeId?: string;
  onSelect: (id: string) => void;
};

type MessageListProps = {
  conversationId: string;
  messageKeys: string[];              // clientIds in order
  hasMoreOlder: boolean;
  onLoadOlder: () => Promise<void>;
  onVisibleMessages: (maxSeqVisible: number) => void; // to mark as read
  renderMessage: (key: string) => React.ReactNode;
};

type ComposerProps = {
  conversationId: string;
  disabled?: boolean;
  onSend: (text: string, files?: File[]) => void;
  onTyping: () => void;               // throttled inside to 1 per 3s
};

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;                // false when grouped with previous msg
  onRetry?: (clientId: string) => void;
};
```

### Server API (endpoints, method, params, example JSON response, pagination style and WHY)

**REST — for loading data that isn't "live":**

`GET /api/conversations?cursor=<opaque>&limit=30` — list sorted by last activity.
```json
{
  "conversations": [
    { "id": "c_9", "type": "direct", "memberIds": ["u_1", "u_7"], "lastSeq": 4821,
      "myLastReadSeq": 4818, "unreadCount": 3, "lastMessageAt": "2026-11-26T10:41:02Z",
      "lastMessage": { "clientId": "a1f…", "senderId": "u_7", "text": "See you at 6?" } }
  ],
  "users": { "u_7": { "id": "u_7", "name": "Riya", "avatarUrl": "…" } },
  "nextCursor": "eyJ0IjoiMjAyNi0xMS0yNlQxMDo0MSJ9"
}
```

`GET /api/conversations/:id/messages?beforeSeq=4801&limit=50` — older history.
```json
{
  "messages": [
    { "id": "m_771", "clientId": "5c2…", "conversationId": "c_9", "senderId": "u_1",
      "seq": 4800, "text": "Okay", "createdAt": "2026-11-26T09:12:44Z", "status": "read" }
  ],
  "hasMore": true
}
```

**Why cursor (`beforeSeq`) and not page numbers?** New messages keep arriving at the end. With `page=2` the window shifts and you get duplicates. A sequence number is stable and also tells us about gaps (if we have seq 4821 and 4825, we missed 3 messages).

`GET /api/sync?since=<lastEventId>` — after reconnect, returns all events (new messages, receipts) since the last one we saw. If the gap is too big (e.g. > 1000 events), server says `{"reset": true}` and the client refetches the conversation list.

`POST /api/uploads` → `{ uploadUrl, fileUrl }` (pre-signed S3 URL). Client uploads the image directly, then sends a message with `fileUrl`.

**WebSocket — `wss://chat.example.com/ws?token=…`** (all frames are JSON with a `type`)

Client → server:
```json
{ "type": "message.send", "clientId": "5c2e…", "conversationId": "c_9", "text": "Hi" }
{ "type": "typing", "conversationId": "c_9" }
{ "type": "read", "conversationId": "c_9", "seq": 4821 }
{ "type": "ping" }
```

Server → client:
```json
{ "type": "message.ack", "clientId": "5c2e…", "id": "m_900", "seq": 4822, "createdAt": "2026-11-26T10:42:00Z" }
{ "type": "message.new", "eventId": 99812, "message": { "id": "m_901", "clientId": "9ab…", "conversationId": "c_9", "senderId": "u_7", "seq": 4823, "text": "Yes!", "createdAt": "…" } }
{ "type": "receipt", "eventId": 99813, "conversationId": "c_9", "userId": "u_7", "kind": "read", "seq": 4822 }
{ "type": "typing", "conversationId": "c_9", "userId": "u_7" }
{ "type": "message.error", "clientId": "5c2e…", "code": "RATE_LIMITED", "retryAfterMs": 2000 }
{ "type": "pong" }
```

`eventId` is a per-user increasing number. The client stores the last one it processed, and uses it in `/api/sync` after reconnect.

## 5. Optimizations and deep dives

### 5.1 Real-time transport: WebSocket vs long polling vs SSE

| | Short polling | Long polling | SSE | WebSocket |
|---|---|---|---|---|
| Direction | client pulls | client pulls, server holds | server → client only | both ways |
| Latency | up to poll interval | low | low | lowest |
| Overhead | high (headers every few sec) | medium | low | very low (2–14 byte frames) |
| Proxies/firewalls | always works | always works | works (plain HTTP) | sometimes blocked by old corporate proxies |
| Reconnect | n/a | manual | built-in (`Last-Event-ID`) | manual |

**Pick WebSocket.** Chat is two-way and chatty (typing, receipts, sends). Keep **long polling as a fallback** if the WS handshake fails (libraries like Socket.IO do this). SSE + POST for sends is a fine alternative if the interviewer pushes on infra simplicity.

Share one socket across tabs: use a `SharedWorker` (or elect a leader tab with `BroadcastChannel` + Web Locks API) so 5 open tabs don't create 5 connections. Other tabs get events via `BroadcastChannel`.

### 5.2 Reconnection with backoff and fetching missed messages

```ts
function connect(attempt = 0) {
  const ws = new WebSocket(url);
  ws.onopen = async () => {
    attempt = 0;
    setStatus('online');
    await resync();          // 1. fetch what we missed
    flushOutbox();           // 2. then resend pending messages
  };
  ws.onclose = () => {
    setStatus('offline');
    const base = Math.min(30_000, 1000 * 2 ** attempt); // 1s,2s,4s… max 30s
    const delay = base / 2 + Math.random() * (base / 2); // jitter
    setTimeout(() => connect(attempt + 1), delay);
  };
}
```

- **Jitter** stops all clients reconnecting at the same second after a server restart (thundering herd).
- **Heartbeat:** send `ping` every 25s; if no `pong` in 10s, close and reconnect. A socket can look open but be dead (laptop sleep, NAT timeout).
- Listen to `online`/`offline` and `visibilitychange` events: reconnect immediately when the network comes back or the tab becomes visible, don't wait for the backoff timer.
- **Resync:** call `GET /api/sync?since=lastEventId`. Apply events in order. If the server says `reset`, refetch the conversation list and the open conversation's latest page.
- Gap detection: if a `message.new` arrives with `seq` = lastSeq + 3, we missed two. Fetch the missing range.

### 5.3 Message ordering and client-generated IDs

- **Never order by client time.** Clocks on devices are wrong by seconds or minutes. Server assigns a per-conversation `seq` (monotonic). Sort by `seq`.
- Pending messages (no `seq` yet) go at the bottom in the order they were sent.
- **Client ID (`clientId`, a UUID v4)** solves 3 problems:
  1. Match ack to the pending message.
  2. **Dedupe:** if we resend after a timeout but the first send actually reached the server, the server sees the same `clientId` and returns the existing message instead of creating a second one (idempotency).
  3. Stable React `key` from pending to read.
- When a `message.new` arrives with a `clientId` already in the store (e.g. our own message echoed from another tab/device), merge instead of adding.

```ts
function upsertMessage(state: ChatState, msg: Message) {
  const existing = state.messages.byKey[msg.clientId];
  state.messages.byKey[msg.clientId] = { ...existing, ...msg };
  if (!existing) insertSortedBySeq(state.messages.idsByConversation[msg.conversationId], msg);
}
```

### 5.4 Optimistic send with pending / failed states

- Show the message instantly with a clock icon (pending).
- If ack arrives → single tick (sent). Delivered receipt → double tick. Read receipt → blue double tick.
- If no ack in ~10s, or `message.error` arrives → mark `failed`, show red "!" with **Retry** and **Delete**.
- Outbox sends **in order** per conversation. If message 2 fails, don't send message 3 ahead of it — otherwise the receiver sees them out of order.
- Retry uses the same `clientId` so it is safe even if the first attempt actually reached the server.
- Image messages: show local preview from `URL.createObjectURL(file)` with an upload progress ring; send the message only after upload finishes.

### 5.5 Unread counts and read receipts

- Each member has `lastReadSeq` per conversation. `unreadCount = conversation.lastSeq - myLastReadSeq` (minus my own messages; server can compute exactly).
- **When to mark as read:** only when the tab is visible (`document.visibilityState === 'visible'`), the conversation is open, and the message is actually on screen (IntersectionObserver on the last message).
- **Debounce** read events (e.g. 500ms) and send only the highest `seq`. One event `{read, seq: 4823}` covers everything before it.
- Server broadcasts the read to my other devices → their unread badges clear too.
- For groups: show "Read by 5" and store per-member `lastReadSeq`; compute ticks as "read by all" when min(lastReadSeq of others) ≥ message seq.
- Tab title: `(3) Chat` and favicon badge for total unread.

### 5.6 Offline queue in IndexedDB

- Cache the last ~200 messages per recent conversation and the conversation list in IndexedDB (via `idb` or Dexie). On startup, render from IndexedDB first (instant), then sync with the server.
- Outbox persisted to IndexedDB, so a message typed offline and then the tab refreshed is not lost.
- On reconnect: resync first, then flush the outbox in order.
- Optional: a Service Worker with Background Sync to send the outbox even if the tab is closed (Chrome only).
- Cap storage size and clear on logout (privacy on shared computers).

### 5.7 Virtualized message list that scrolls from the bottom

Chats are unusual: the list starts at the bottom and grows in both directions.

- Use a virtualizer that supports dynamic heights (TanStack Virtual, react-virtuoso). Messages have different heights (1 line vs 10 lines vs image).
- **Initial open:** scroll to the bottom (or to the first unread message with a "New messages" divider).
- **Load older on scroll to top:** prepending items would push the content down and the view jumps. Fix: remember `scrollHeight` before prepend, then set `scrollTop += newScrollHeight - oldScrollHeight` after. react-virtuoso does this with `firstItemIndex`. CSS `overflow-anchor` helps in non-virtualized lists.
- **New message arrives:** if the user is at the bottom (within ~100px), auto-scroll. If they scrolled up to read history, don't move them — show a "↓ 2 new messages" pill.
- Images: use width/height from the message to reserve space, so loading images don't shift the list.
- Alternative trick: `flex-direction: column-reverse` makes the browser anchor at the bottom for free. Works for small lists, harder with virtualization.

### Also mention
- **Accessibility:** message list has `role="log"` (implies `aria-live="polite"`) so screen readers announce new messages. Each message read as "Riya, 10:42, See you at 6". Status ticks need text labels ("Read") not just colour.
- **Security:** render message text as plain text (React escapes by default). Linkify safely with a parser, never `dangerouslySetInnerHTML`. Validate file type/size before upload. Auth token for WS sent in the first message or a short-lived ticket, not in a long-lived URL that shows in logs. Check `Origin` on the server.
- **Notifications:** Notification API + Web Push when the tab is hidden; respect "muted".
- **Performance:** memoize `MessageBubble` (`React.memo`) and select only its own message from the store, so a new message doesn't re-render all 50 rows.
- **i18n:** RTL support for Arabic/Urdu, relative timestamps with `Intl.RelativeTimeFormat`, emoji and grapheme-safe character counting.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Transport | Long polling | WebSocket | WebSocket for two-way low latency; long polling fallback for blocked networks. |
| Message order | Client timestamp | Server `seq` | Server `seq`. Client clocks are unreliable; seq also detects gaps. |
| Store shape | Nested (conversation.messages[]) | Normalized by id | Normalized. Receipts/updates touch one record, no deep copying. |
| Send UX | Wait for server | Optimistic with outbox | Optimistic. Chat must feel instant; clientId makes retries safe. |
| Missed messages | Refetch everything on reconnect | Sync since lastEventId | Sync since lastEventId, with a "reset" fallback for long gaps. |
| Offline storage | localStorage | IndexedDB | IndexedDB: async, large, structured. localStorage is sync, 5MB, strings only. |
| Multi-tab | One socket per tab | Shared socket (SharedWorker / leader tab) | Shared socket; fewer server connections and consistent state. Accept extra complexity. |
| Message list | Plain list | Virtualized | Virtualize; long chats have 10k+ messages. Handle prepend scroll anchoring. |

## 7. Likely follow-up questions

**Q: The user sends a message, the network drops before the ack. What happens?**
Message stays `pending` in the outbox (IndexedDB). On reconnect we resync and then resend with the same `clientId`. If the server already saved it, it returns the existing message (idempotent) — no duplicate.

**Q: How do you keep two tabs in sync?**
One shared WebSocket via SharedWorker or a leader tab; events are broadcast to all tabs via `BroadcastChannel`. Each tab applies the same events to its store. Read actions in one tab clear badges in others.

**Q: How do typing indicators work without spamming the server?**
Send `typing` at most once every 3s while the user types. Receiver shows "typing…" and hides it after 5s with no new event, or when a message from that user arrives.

**Q: How would you add end-to-end encryption?**
Keys are generated on the device (Web Crypto API); private keys stored in IndexedDB as non-extractable. Messages encrypted per recipient device (Signal protocol). Server only routes ciphertext, so server-side search and previews in push notifications are lost.

**Q: How do you handle a group with 256 people reading?**
Don't send one receipt event per user per message to everyone. Server aggregates and sends "read up to seq X by user Y" debounced. UI shows counts and a details popover loaded on demand.

**Q: How do you show the conversation list in the right order when messages arrive?**
On `message.new`, update that conversation's `lastMessageAt` and move its id to the top of `orderedIds` (O(n) splice, fine for a few thousand). Increment unread unless it is the open, visible chat.

**Q: How would you implement message search?**
Server-side search endpoint (Elasticsearch). Client has a debounced search box, results list, and "jump to message" which loads a window of messages around that `seq` (`around=seq`) — the list must support loading in both directions.

**Q: What if the server sends events out of order?**
Use `eventId`/`seq`. Buffer an event if its predecessor is missing for a short time, then fetch the gap. Receipts are safe to apply in any order because we keep `max(seq)`.

**Q: How do you test this?**
Unit-test the reducer (upsert, ack, dedupe). Mock WebSocket server in integration tests to simulate drops, duplicates and out-of-order delivery. Playwright with network offline toggling.

## 8. If you only have 60 seconds

- REST for history and conversation list (cursor by `seq`), WebSocket for live events; long polling fallback.
- Normalized client store keyed by a client-generated UUID; server assigns `seq` for ordering.
- Optimistic send with an outbox persisted in IndexedDB: pending → sent → delivered → read, or failed with retry. Same `clientId` makes retries idempotent.
- Reconnect with exponential backoff + jitter and heartbeats; on reconnect, sync events since `lastEventId`, then flush the outbox in order.
- Unread = lastSeq − myLastReadSeq; mark read only when visible, debounced, sending only the highest seq.
- Bottom-anchored virtualized message list with scroll anchoring on prepend and a "new messages" pill.
- `role="log"` for screen readers, plain text rendering to avoid XSS, one shared socket across tabs.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | 1:1 vs group, media, receipts, multi-device, offline |
| 4–8 | Requirements | Functional list, latency/reliability goals, out of scope |
| 8–14 | Architecture | Diagram with store, realtime client, outbox, IndexedDB; send flow steps |
| 14–21 | Data model + API | Normalized store, Message with clientId/seq, REST + WS event formats |
| 21–38 | Deep dives | Transport choice, reconnect + resync, ordering/dedupe, optimistic send, receipts, list scrolling |
| 38–43 | Trade-offs | Table, multi-tab, IndexedDB vs localStorage |
| 43–45 | Wrap-up | 60-second summary |

## Common mistakes

- Jumping to components before defining data/entities — the `clientId` + `seq` design is the heart of this question.
- Saying "use WebSockets" and stopping there: no reconnect, no heartbeat, no plan for missed messages.
- Sorting messages by the client's clock.
- No idempotency, so a retry creates duplicate messages.
- Marking messages read as soon as they arrive, even when the tab is in the background.
- Forgetting scroll behaviour: jumping when older messages load, or yanking the user to the bottom while they read history.

## My mistakes
- [ ]
