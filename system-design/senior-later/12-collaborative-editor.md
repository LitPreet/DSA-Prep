# Collaborative Document Editor (e.g. Google Docs)

> **Difficulty:** Hard · **Asked at:** Big tech (Google, Microsoft), collaboration SaaS (Notion, Atlassian/Confluence, Figma, Zoho, Canva), senior-leaning frontend rounds · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- What content types? Plain text, rich text, tables, images? → Assume: rich text (headings, bold/italic, lists, links), images, simple tables later.
- How many people edit one doc at the same time? → Assume: usually 2–10, up to ~50 editors and more viewers.
- How big can a doc get? → Assume: up to ~200 pages (~100k words).
- Real-time or "save and refresh"? → Assume: real-time, other people's typing appears within ~200ms.
- Offline editing? → Assume: yes, edit offline and merge on reconnect.
- Comments, suggestions mode, version history? → Assume: comments and version history yes (briefly); suggestion mode out of scope.
- Permissions? → Assume: owner / editor / commenter / viewer, checked by server.
- Devices? → Assume: desktop first, mobile web for reading and light editing.

## 1. Requirements

### Functional

- Create, open, and edit a document with rich text formatting.
- Many users edit at the same time; everyone ends up with the **same** document (convergence).
- See who is in the doc (avatars) and their cursors/selections in different colours.
- Edits save automatically; show "Saving… / All changes saved / Offline".
- Undo/redo that only undoes **my** changes.
- Offline editing; changes merge when back online.
- Comments anchored to text ranges.
- Version history: see and restore older versions.

### Non-functional (performance, accessibility, devices, network)

- **Latency:** my keystroke shows on my screen in under 16ms (one frame) — never wait for the server. Remote edits appear within 100–300ms.
- **Large docs:** open a 200-page doc in under 2s; typing stays smooth (no input lag) at that size.
- **Reliability:** never lose typed text — survive tab crash, network drop, laptop sleep.
- **Consistency:** all clients converge to the same content, even if edits arrive in different orders.
- **Accessibility:** works with screen readers (real text in the DOM, ARIA for toolbar), full keyboard shortcuts, announce collaborator joins politely.
- **Network:** handle flaky connections, reconnect with backoff, resend unacknowledged changes.

### Out of scope

- Suggestion (track changes) mode, spreadsheets/slides.
- Backend storage design, search across docs.
- Export to PDF/Word (mention only).

## 2. Architecture

```text
+------------------------------------------------------------------------+
|                           Browser (React)                              |
|                                                                        |
|  +------------+  +---------------------------------+  +--------------+ |
|  | Toolbar    |  | EditorView (ProseMirror/Lexical |  | Comments     | |
|  | (format)   |  |  renders doc model -> DOM)      |  | sidebar      | |
|  +-----+------+  +----------------+----------------+  +------+-------+ |
|        |                          | user input                 |         |
|        v                          v                            |         |
|  +------------------------------------------------------+      |         |
|  |  Document model (tree of blocks/nodes)               |<-----+         |
|  |  + CRDT doc (Yjs) or OT client state                 |                |
|  +-----------+-------------------------+----------------+                |
|              |                         |                                 |
|   +----------v---------+    +----------v-----------+   +--------------+  |
|   | Undo manager       |    | Sync provider        |   | Presence     |  |
|   | (local origin only)|    | (send/recv updates,  |   | (awareness:  |  |
|   +--------------------+    |  pending queue, ack) |   |  cursors)    |  |
|                             +----+-----------+-----+   +------+-------+  |
|                                  |           |                |          |
|                       +----------v--+   +----v------------+   |          |
|                       | IndexedDB   |   | WebSocket       |<--+          |
|                       | (local copy |   | connection      |              |
|                       |  + pending) |   +--------+--------+              |
|                       +-------------+            |                       |
+--------------------------------------------------|-----------------------+
                                                   v
                         +-------------------------------------------+
                         | Collaboration server (per-doc room)       |
                         |  - auth / permission check                |
                         |  - relays updates + presence              |
                         |  - (OT: transforms & orders ops)          |
                         +--------------+----------------------------+
                                        v
                         +-------------------------------+
                         | Storage: snapshots + update log|
                         +-------------------------------+
```

| Component | Responsibility |
|---|---|
| EditorView | Uses an editor framework (ProseMirror/TipTap/Lexical) to turn the doc model into DOM and DOM events into model changes |
| Toolbar | Formatting commands (bold, heading, list), reflects current selection marks |
| Document model | Structured tree (paragraphs, headings, lists, text with marks) — single source of truth |
| CRDT doc / OT client | Turns local edits into operations, merges remote operations |
| Undo manager | Tracks only local-origin changes so undo doesn't remove others' work |
| Sync provider | Sends local updates, applies remote ones, keeps a pending queue until acked, resyncs on reconnect |
| Presence (awareness) | Shares cursor position, selection, name, colour; not stored permanently |
| IndexedDB | Local copy of the doc and unsent updates for offline and crash safety |
| Comments sidebar | Comments anchored to positions that move with the text |
| Collaboration server | One "room" per doc; checks permissions, broadcasts updates, persists them |
| Storage | Periodic snapshots + append-only update log (also powers version history) |

**Main flow — user types the letter "a":**

1. Browser fires `beforeinput`. Editor framework turns it into a model transaction "insert 'a' at position 42".
2. Model updates and EditorView re-renders only the changed paragraph. User sees "a" in the same frame.
3. The CRDT (or OT client) records the change as an operation and puts it in the pending queue; also writes it to IndexedDB.
4. Sync provider batches changes for ~50ms and sends them over the WebSocket.
5. Server checks the user can edit, appends to the doc's update log, and broadcasts to other clients in the room. Sends an ack to the sender.
6. Other clients apply the update to their model; their editor re-renders that paragraph. Remote cursors shift correctly.
7. Sender gets the ack → removes from pending → status shows "All changes saved".

## 3. Data model

The document is a **tree of nodes**, not a raw HTML string. HTML from `contenteditable` is messy (browsers produce different markup) and you can't merge two HTML strings safely.

```ts
type Mark =
  | { type: 'bold' } | { type: 'italic' } | { type: 'code' }
  | { type: 'link'; href: string }
  | { type: 'comment'; commentId: string };

type InlineNode =
  | { type: 'text'; text: string; marks?: Mark[] }
  | { type: 'image'; src: string; alt: string; width?: number }
  | { type: 'mention'; userId: string };

type BlockNode =
  | { id: string; type: 'paragraph'; content: InlineNode[] }
  | { id: string; type: 'heading'; level: 1 | 2 | 3; content: InlineNode[] }
  | { id: string; type: 'bulletList' | 'orderedList'; items: BlockNode[] }
  | { id: string; type: 'codeBlock'; language: string; text: string };

interface DocumentContent {
  type: 'doc';
  blocks: BlockNode[];
}

interface DocMeta {
  id: string;
  title: string;
  ownerId: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';  // for current user
  updatedAt: number;
}
```

Operations (OT style, easy to explain):

```ts
type Op =
  | { type: 'insert'; pos: number; text: string; marks?: Mark[] }
  | { type: 'delete'; pos: number; length: number }
  | { type: 'format'; from: number; to: number; mark: Mark; add: boolean };

interface ClientUpdate {
  docId: string;
  clientId: string;
  baseVersion: number;   // OT: server version this op was based on
  ops: Op[];
}
```

Presence (temporary, not saved):

```ts
interface PresenceState {
  clientId: string;
  user: { id: string; name: string; color: string; avatarUrl: string };
  cursor: { anchor: RelativePosition; head: RelativePosition } | null;
  lastActiveAt: number;
}
```

`RelativePosition` = "right after character X (by its id)" instead of "index 42". It stays correct when others insert text before it.

```ts
interface Comment {
  id: string;
  docId: string;
  anchor: { from: RelativePosition; to: RelativePosition };
  authorId: string;
  body: string;
  resolved: boolean;
  replies: { authorId: string; body: string; createdAt: number }[];
}
```

| Entity | Lives in | Why |
|---|---|---|
| Document content (CRDT / model) | Server (truth) + client memory + IndexedDB | Editing needs it in memory; IndexedDB for offline and crash safety |
| Pending (unacked) updates | Client memory + IndexedDB | Must survive reload until server confirms |
| Doc meta (title, role) | Server + client cache (React Query) | Rarely changes, needed for toolbar/permissions |
| Presence / cursors | Server memory (room) + client memory only | Short-lived; no need to store |
| Comments | Server + client store | Shared, need notifications |
| Current doc id | URL (`/document/d/abc123/edit`) | Shareable link |
| Selection, open menus, toolbar state | Component/editor state | Local UI only |
| Undo/redo stack | Client memory (per tab) | Personal, per session |
| Version snapshots | Server | Big, used rarely |

## 4. Interface (API)

### Component API (props of the key components)

```ts
interface CollaborativeEditorProps {
  docId: string;
  user: { id: string; name: string; color: string };
  readOnly: boolean;                         // viewer/commenter
  onStatusChange(s: 'saving' | 'saved' | 'offline' | 'error'): void;
}

interface ToolbarProps {
  activeMarks: Set<Mark['type']>;
  blockType: 'paragraph' | 'heading1' | 'heading2' | 'bulletList';
  canUndo: boolean;
  canRedo: boolean;
  onCommand(cmd: EditorCommand): void;
}

interface PresenceBarProps {
  collaborators: PresenceState[];
  onJumpToUser(clientId: string): void;      // scroll to their cursor
}

interface RemoteCursorProps {
  name: string;
  color: string;
  rect: DOMRect;                             // computed from position
}
```

### Server API (endpoints, method, params, example JSON response, pagination style and WHY; real-time channels where relevant)

| Endpoint | Method | Purpose |
|---|---|---|
| `/docs/:id` | GET | Meta + latest snapshot (or CRDT state) + version |
| `/docs` | POST | Create doc |
| `/docs/:id/versions?cursor=...&limit=20` | GET | Version history list (cursor pagination, newest first) |
| `/docs/:id/versions/:versionId` | GET | Snapshot of an old version |
| `/docs/:id/versions/:versionId/restore` | POST | Restore (creates a new version, doesn't delete history) |
| `/docs/:id/comments` | GET / POST | Comments |
| `wss://collab.example.com/docs/:id` | WebSocket | Real-time edits + presence |

Example: `GET /docs/abc123`

```json
{
  "id": "abc123",
  "title": "Q4 Planning",
  "role": "editor",
  "version": 1842,
  "snapshot": "AQLN8Z...base64 CRDT state or JSON doc...",
  "updatedAt": 1764140400000
}
```

**WebSocket messages:**

```json
// client -> server: my edits (OT version)
{ "type": "ops", "clientId": "c7", "baseVersion": 1842, "ops": [{ "type": "insert", "pos": 42, "text": "a" }] }

// server -> sender: accepted
{ "type": "ack", "version": 1843 }

// server -> others: someone's edits
{ "type": "ops", "clientId": "c7", "version": 1843, "ops": [{ "type": "insert", "pos": 42, "text": "a" }] }

// presence, both ways, throttled to ~10/sec
{ "type": "presence", "clientId": "c7", "cursor": { "anchor": "...", "head": "..." } }

// on reconnect: client says what it has, server sends what's missing
{ "type": "sync", "version": 1830 }
```

**Why WebSocket:** two-way, low latency, many small messages per second. SSE is server→client only; polling is too slow for typing. Fallback to long-polling if WebSockets are blocked (corporate proxies).

**Why cursor pagination for versions:** new versions keep getting added at the top; same reason as any live feed.

**Why the initial load uses HTTP, not the socket:** the snapshot can be big (MBs) and HTTP gives caching, compression and CDN-friendly behaviour; the socket then only sends small deltas from `version` onward.

## 5. Optimizations and deep dives

### 5.1 OT vs CRDT explained simply

The core problem: two people edit at the same time, starting from the same text. Their edits arrive at each other in a different order. Without care, they end up with different documents.

**Tiny example.** Doc is `"cat"`.
- Alice inserts `"s"` at position 3 → wants `"cats"`.
- Bob, at the same time, inserts `"a "` at position 0 → wants `"a cat"`.
- Alice receives Bob's op `insert(0, "a ")` → `"a cats"`. Correct.
- Bob receives Alice's op `insert(3, "s")` as-is → `"a cat"` → insert at 3 → `"a csat"`. Wrong!

**OT (Operational Transformation):** before applying a remote op, **transform** it against the ops that happened concurrently. Bob sees that his own insert of length 2 happened before position 3, so he shifts Alice's op: `insert(3 + 2, "s")` → `"a cats"`. Both converge.

```ts
// transform op A so it can apply after op B (both inserts)
function transformInsert(a: InsertOp, b: InsertOp): InsertOp {
  if (b.pos < a.pos || (b.pos === a.pos && b.clientId < a.clientId)) {
    return { ...a, pos: a.pos + b.text.length };
  }
  return a;
}
```

- Usually needs a **central server** that decides one order of ops (Google Docs works this way). Clients send ops with `baseVersion`; server transforms them against anything newer and assigns the next version number.
- Transform functions for every pair of op types (insert/delete/format/split block...) get complex for rich text.

**CRDT (Conflict-free Replicated Data Type):** give **every character a unique id** (e.g. `clientId + counter`) and describe inserts as "put X after character with id Y", not "at index 3". Since ids never change, the order of arrival doesn't matter — everyone sorts the same way and gets the same result. Deletes mark a character as deleted (a "tombstone").

```text
"cat" = c(A1) a(A2) t(A3)
Alice: insert "s" after A3          -> id A4
Bob:   insert "a " after START       -> ids B1, B2
Any order of applying -> START B1 B2 A1 A2 A3 A4 -> "a cats"
```

- No central transform needed; works peer-to-peer and **offline** naturally.
- Cost: extra metadata (ids, tombstones) → more memory. Modern libraries (**Yjs**, **Automerge**) compress this well; Yjs handles docs with 100k+ characters fine.

**What I'd pick:** for a new product, **CRDT with Yjs** + ProseMirror/TipTap binding (`y-prosemirror`). It's battle-tested, gives offline, undo manager, and presence (awareness) out of the box. A server is still used to relay, persist and check permissions. If the company already has a central OT server (like Google), OT is fine — I'd explain both.

### 5.2 Document model (blocks/nodes, not raw HTML)

- `contenteditable` alone produces inconsistent HTML across browsers (`<b>` vs `<strong>`, `<div>` vs `<p>`). Never treat the DOM as the source of truth.
- Use an editor framework: it keeps a **schema-based model** (like the `BlockNode` types above) and renders it to DOM. Input events (`beforeinput`) are converted into model transactions.
- **Schema** says what's allowed (a heading can't contain a list). Pasted HTML from Word/websites is parsed **through the schema**, which also sanitizes it (drops `<script>`, unknown styles).
- Each block has a stable `id` → useful for comments, links to headings, and rendering only changed blocks (React key / memo).
- Marks (bold, link) are attributes on text ranges, not nested tags — makes merging formatting easier.

### 5.3 WebSocket sync with local-first edits

**Local-first:** apply every edit to the local model immediately; the network is only for sharing. The user never waits for the server to see their own typing.

Client sync loop (OT style; Yjs does similar internally):

```ts
class SyncClient {
  version = 0;              // last server version we applied
  inflight: Op[] | null = null;   // sent, waiting for ack (only one batch at a time)
  pending: Op[] = [];       // local ops not yet sent

  onLocalOp(op: Op) {
    applyToModel(op);       // instant
    this.pending.push(op);
    saveToIndexedDB(op);
    this.flushSoon();       // debounce ~50ms to batch keystrokes
  }

  flush() {
    if (this.inflight || this.pending.length === 0 || !socket.isOpen) return;
    this.inflight = this.pending; this.pending = [];
    socket.send({ type: 'ops', baseVersion: this.version, ops: this.inflight });
  }

  onAck(version: number) { this.version = version; this.inflight = null; this.flush(); }

  onRemote(ops: Op[], version: number) {
    // transform remote ops against my inflight + pending so they apply on my current doc
    const [remote2, inflight2, pending2] = transformAll(ops, this.inflight, this.pending);
    applyToModel(remote2);
    this.inflight = inflight2; this.pending = pending2;
    this.version = version;
  }
}
```

- **Batching:** send at most every ~50ms. Typing 10 chars/sec becomes ~5 small messages, not 10.
- **Reconnect:** exponential backoff (1s, 2s, 4s… max 30s) with jitter. On reconnect, send `{ type: 'sync', version }`; server replies with missed ops; then resend inflight/pending.
- **Save status:** "Saving…" while inflight/pending non-empty, "All changes saved" when empty, "Offline — changes saved on this device" when socket is down.
- **Warn on close:** `beforeunload` prompt if pending is non-empty (and IndexedDB already has them anyway).
- **Server side note:** one room per doc on one server instance (sticky routing by docId) so ordering is simple. Snapshot every ~100 ops so new joiners don't replay the full history.

### 5.4 Presence and remote cursors

- Presence is **separate from document data**: not saved, not in undo history, can be lost without harm.
- Each client broadcasts `{ user, color, cursor }`, **throttled to ~10 updates/sec** (every 100ms). Remove a user after ~30s without heartbeat.
- Cursor positions are **relative positions** (anchored to character ids), so when someone types above, remote cursors stay at the right place.
- Rendering: convert position → screen coordinates (`view.coordsAtPos(pos)` or `Range.getClientRects()`), then draw an absolutely positioned overlay layer (caret + name label + translucent selection boxes). **Don't insert cursor elements into the editable DOM** — it breaks typing and the model.
- Recompute positions on doc change, scroll and resize, batched in `requestAnimationFrame`.
- Avatar bar on top; click an avatar → scroll to that person's cursor. Name label hides after 2s of inactivity.
- Assign colours from a fixed palette of ~12 accessible colours; don't rely on colour alone — show name labels.

### 5.5 Offline editing and merge on reconnect

- Keep the full doc state + pending updates in **IndexedDB** (`y-indexeddb` with Yjs). On open: load from IndexedDB first (instant), then sync with server.
- While offline, edits keep going into the local CRDT. Status: "Offline — your changes are saved on this device."
- On reconnect: exchange **state vectors** (Yjs: "here's what I've seen from each client"), each side sends only what the other is missing. CRDT merge is automatic and always converges.
- **Merged ≠ meaningful.** If two people rewrote the same sentence offline, the result might contain both versions mixed. That's accepted in Docs-like apps; version history lets users fix it. Optionally highlight "changes made while you were offline".
- Long offline + permission revoked meanwhile: server rejects updates → show "You no longer have edit access", keep a local copy to export/copy.
- Use a Service Worker to cache the app shell so the editor can open offline.

### 5.6 Undo/redo in a multi-user setting

- A normal undo stack would undo the **last change in the doc**, which could be your teammate's typing. That's wrong.
- **Rule: undo only my own changes.** Track the origin of each transaction (local vs remote) and only push local ones onto the undo stack (`Y.UndoManager` with `trackedOrigins`).
- Undo = create a **new inverse operation** (not "go back in time"), then send it like a normal edit. With OT the inverse op is transformed against remote ops that came after it; with CRDT it targets character ids, so it still finds the right text.
- Group keystrokes: typing within ~500ms counts as one undo step (word-level, not letter-level).
- Edge case: I typed "hello", Alice deleted that paragraph, I press undo → my insert is already gone; undo does nothing for that item and moves on. Don't resurrect others' deletions unexpectedly.
- Redo stack clears when I make a new local edit (not when others edit).

### 5.7 Performance with large documents

- **Render only what changed.** Editor frameworks diff the model and update only touched nodes. In React wrappers, memoize block components by block id + version.
- **Virtualize off-screen blocks** for 200+ page docs: render placeholders with estimated heights for blocks far from the viewport (Google Docs uses its own canvas-based layout to control this). Careful: find-in-page and screen readers need text — offer an in-app search and keep the current section in the DOM.
- **Lazy load heavy blocks:** images with `loading="lazy"`, embeds and code syntax highlighting only when visible.
- **Keep typing on the main thread cheap:** move spell-check, word count, and CRDT snapshot encoding to a **Web Worker**; debounce them.
- **Garbage collection of tombstones** in the CRDT, and periodic server snapshots so clients load a compact state instead of the full history.
- **Throttle presence rendering** — 30 collaborators each moving cursors shouldn't cause 300 re-renders/sec.
- **Measure:** input latency (`event.timeStamp` → next frame), long tasks during typing, time to first editable.

### Also mention

- **Security:** permission checked on the server for every WebSocket message (not just on connect, roles can change); sanitize pasted HTML through the schema; links get `rel="noopener noreferrer"`; images through a proxy.
- **Comments:** anchors use relative positions so they move with text; if the anchored text is deleted, show the comment as "orphaned" with the original quote.
- **Version history:** server saves snapshots (e.g. every 5 min of activity or 500 ops). Restore creates a new version on top — never deletes history.
- **Accessibility:** editor is real text with semantic headings/lists; toolbar is `role="toolbar"` with arrow-key navigation and `aria-pressed` on Bold etc.; announce "Ravi joined" via `aria-live="polite"` (not every cursor move).
- **i18n:** IME composition (Hindi, Chinese, Japanese input) — don't send ops mid-composition; wait for `compositionend`. RTL paragraphs with `dir="auto"`.
- **Analytics:** sync errors, reconnect counts, time to editable, divergence detection (periodic checksum compare with server).

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Conflict resolution | OT (central server transforms) | CRDT (Yjs/Automerge) | CRDT/Yjs — offline + simpler server, mature library; OT is fine if a central server already exists |
| Doc storage format | HTML string | Structured node tree | Node tree — mergeable, schema-safe, renders consistently |
| Editor engine | Raw `contenteditable` | ProseMirror / TipTap / Lexical | Framework — handles selection, IME, paste, schema; building from scratch takes years |
| Transport | Polling / SSE + POST | WebSocket | WebSocket — two-way, low latency; long-poll fallback |
| Send frequency | Every keystroke | Batch every ~50ms | Batch — fewer messages, still feels real-time |
| Presence | Stored with doc | Separate ephemeral channel | Separate — not persisted, no undo, can be dropped |
| Undo | Global doc undo | Per-user (local origin) undo | Per-user — never undo someone else's work |
| Large docs | Render everything | Virtualize far-off blocks | Render all up to ~50 pages, virtualize beyond; keep search/a11y working |

## 7. Likely follow-up questions

**Q: How do two clients know they have the same document?**
With OT, the server's version number orders everything; clients can send a checksum periodically. With CRDT, same set of updates = same state by design; compare state vectors / hashes to detect bugs.

**Q: Why not just "last write wins" for the whole document?**
Two people typing in different paragraphs would overwrite each other's work every save. We need merging at the character level.

**Q: What happens if the server crashes mid-session?**
Clients keep editing locally (pending queue + IndexedDB). They reconnect to another instance, sync from the last persisted version, and resend unacked ops. Idempotent op ids prevent double-apply.

**Q: How do you handle a viewer who should not edit?**
UI is read-only (`editable: false`), but the real protection is the server rejecting ops from viewers. Viewers still receive updates and presence.

**Q: How does copy-paste from Google Docs/Word work?**
Read `text/html` from the clipboard, parse it through the editor schema (keeps headings/bold/lists, drops unknown styles and scripts), insert as one transaction = one undo step.

**Q: How would you implement comments that stay attached when text changes?**
Store the anchor as relative positions (character ids) or as a mark on the text. Text inserted inside the range extends it; if the whole range is deleted, the comment becomes orphaned and shows the original quoted text.

**Q: 500 people open the same doc (company all-hands notes). What breaks?**
Presence broadcast is N² — limit visible cursors to ~20 nearest/most-recent and show "+480 viewers". Viewers get updates in batched form. Shard the room's fan-out across connection servers.

**Q: How do you test this?**
Unit tests for transform/merge with random op sequences (fuzz/property tests: apply in random orders, assert same result). E2E with two browser contexts in Playwright typing at once. Simulate offline with network throttling.

**Q: What's the hardest part on the frontend?**
Mapping between the DOM selection and model positions, IME composition, and keeping remote cursors correct — that's why we use ProseMirror/Lexical rather than raw contenteditable.

## 8. If you only have 60 seconds

- The doc is a structured node tree (blocks + marks), rendered by ProseMirror/TipTap — never raw HTML as the source of truth.
- Local-first: every keystroke applies locally in the same frame; changes are batched (~50ms) and sent over a WebSocket.
- Conflicts solved with a CRDT (Yjs): unique ids per character so any order of updates converges; OT is the central-server alternative (Google Docs).
- Presence (cursors, avatars) is a separate, throttled, non-persisted channel; cursors use relative positions and draw in an overlay.
- Offline: doc + pending updates in IndexedDB; on reconnect exchange state vectors and merge automatically.
- Undo only my own changes, as new inverse ops, grouped by word.
- Large docs: re-render only changed blocks, virtualize far-off blocks, heavy work in a Web Worker; server snapshots keep load fast.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Content types, # of editors, offline, comments/history, doc size |
| 4–8 | Requirements | Convergence, local latency < 16ms, never lose text, out of scope |
| 8–15 | Architecture | Editor view, model, CRDT/OT, sync provider, presence, IndexedDB, collab server |
| 15–20 | Data model | Node tree, ops, presence with relative positions, where each lives |
| 20–24 | API | HTTP load snapshot + WebSocket messages (ops, ack, presence, sync) |
| 24–40 | Deep dives | OT vs CRDT with the "cat" example (must do), local-first sync loop, presence, offline merge, undo |
| 40–45 | Trade-offs + wrap up | OT vs CRDT pick, large doc perf, summary |

## Common mistakes

- Jumping to components before defining data/entities — the node tree and the operation format drive everything else.
- Storing the document as an HTML string and "sending the whole doc on every change" (last write wins = lost work).
- Waiting for the server before showing the user's own keystroke.
- Saying "use OT/CRDT" without being able to show a tiny conflict example and how it resolves.
- Global undo that removes other people's changes.
- Putting cursor positions as plain indexes (they drift when others type) or storing presence in the document.

## My mistakes

- [ ]
