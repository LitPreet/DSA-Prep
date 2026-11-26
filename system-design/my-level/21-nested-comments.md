# Nested Comments System (e.g. Reddit / YouTube comments)

> **Difficulty:** Medium · **Asked at:** product companies with user content (Flipkart reviews and Q&A, Swiggy/Zomato reviews, community or social apps), and as a general "design a UI component with tree data" round · **Time in interview:** 45 min
> Not on GreatFrontEnd's list; common at Indian product companies.

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

---

## 0. Clarifying questions to ask first

- How deep can replies go? Unlimited (Reddit) or only 1 level (YouTube)?
  → Assume: unlimited on the server, but the UI shows up to 6 levels inline, then a "Continue this thread →" link.
- How many comments on a popular post?
  → Assume: up to 10,000 total. A normal post has 20–200.
- Do we need real-time new comments, or only on refresh?
  → Assume: show a "5 new comments" pill (like Twitter), not live insertion. Live insertion makes the list jump while reading.
- What actions? Post, reply, edit, delete, upvote/downvote?
  → Assume: all of them. Votes are up/down with a score.
- Sorting options?
  → Assume: "Top" (default) and "New".
- Rich text? Markdown, images, mentions?
  → Assume: a small markdown subset (bold, italic, links, code, quotes). No image uploads.
- Who can see comments? Logged out users?
  → Assume: anyone can read; login needed to post or vote.
- Devices?
  → Assume: mobile web first (most Indian traffic), desktop too.

## 1. Requirements

### Functional
- Show the top-level comments of a post, sorted by Top or New.
- Show replies under each comment as a tree (indented, with a thread line).
- Load more top-level comments with "Load more" (or infinite scroll).
- Load more replies for one comment with "5 more replies".
- Collapse / expand a thread.
- Post a new comment and reply to any comment.
- Upvote / downvote with an instant score change.
- Edit and delete your own comment. A deleted comment with replies shows "[deleted]" so the replies still make sense.
- Show a "N new comments" pill when others post.

### Non-functional (performance, accessibility, devices, network)
- **Performance:** first 20 comments visible in under 1.5 s on a 4G phone. Typing in the reply box should not re-render the whole tree. Scrolling a 1,000-comment page must stay at 60 fps.
- **Accessibility:** screen reader announces depth ("level 3, reply to Rahul"). Every action works with the keyboard. Focus moves to the new reply box when you click "Reply".
- **Devices:** indentation must not eat the screen on a 360 px phone. Cap the indent at ~6 levels and use small (12 px) indent steps on mobile.
- **Network:** slow 3G should still show something (skeleton). A failed post must keep the user's text so they can retry.
- **Security:** user content must never run scripts (XSS).

### Out of scope
- Moderation tools, spam detection, reports.
- Notifications ("someone replied to you") — separate system.
- Image/GIF uploads in comments.
- Server-side ranking algorithm details (we just call the API with `sort=top`).

## 2. Architecture

```text
+-------------------------------------------------------------------+
|                          CommentsSection                          |
|  +-------------------+   +-------------------------------------+  |
|  | SortBar (Top/New) |   | NewCommentsPill ("5 new comments")  |  |
|  +-------------------+   +-------------------------------------+  |
|  +-------------------------------------------------------------+  |
|  | Composer (top-level)                                        |  |
|  +-------------------------------------------------------------+  |
|  +-------------------------------------------------------------+  |
|  | CommentTree                                                 |  |
|  |   CommentNode (id) --+-- CommentBody (markdown -> safe HTML)|  |
|  |                      +-- ActionBar (vote, reply, edit, del) |  |
|  |                      +-- Composer (inline reply, if open)   |  |
|  |                      +-- CommentNode (child)  ... recursive |  |
|  |                      +-- LoadMoreReplies / ContinueThread   |  |
|  +-------------------------------------------------------------+  |
|  +-------------------+                                            |
|  | LoadMoreTopLevel  |                                            |
|  +-------------------+                                            |
+-------------------------------|-----------------------------------+
                                |  reads/writes
                   +------------v-------------+
                   |  Comments Store          |  normalized:
                   |  byId, childIds, cursors |  { byId, childrenOf }
                   +------------+-------------+
                                |
                   +------------v-------------+     +----------------+
                   |  API Client (fetch)      |<--->|  REST server   |
                   +------------+-------------+     +----------------+
                                |
                   +------------v-------------+     +----------------+
                   |  Realtime (SSE)          |<----|  Event stream  |
                   +--------------------------+     +----------------+
```

| Component | Responsibility |
|---|---|
| CommentsSection | Owns sort, top-level pagination, pill for new comments. |
| CommentTree | Renders the list of top-level IDs. Virtualizes when the list is large. |
| CommentNode | Renders one comment by ID and recursively renders its children. Handles collapse and depth limit. |
| CommentBody | Turns markdown into sanitized HTML. Memoized on `body`. |
| ActionBar | Vote, reply, edit, delete buttons. Calls store actions. |
| Composer | Textarea + submit. Keeps its own text state so typing doesn't re-render the tree. |
| Comments Store | Normalized map of comments + children lists + cursors. Does optimistic updates and rollback. |
| API Client | REST calls, retries, idempotency keys. |
| Realtime | SSE connection per post. Pushes events into a "pending new" buffer. |

**Main flow — user replies to a comment:**
1. User clicks "Reply" on comment `c42`. `CommentNode` opens an inline `Composer`, focus moves into the textarea.
2. User types and clicks "Post". Composer calls `store.addReply(parentId='c42', body)`.
3. Store creates a temp comment `tmp_abc` with `status: 'sending'`, adds it to `byId`, and puts its ID first in `childrenOf['c42']`. The UI shows it at once, slightly faded.
4. API client sends `POST /posts/p1/comments` with `parentId` and an `Idempotency-Key` header.
5. On success, the store swaps `tmp_abc` for the real comment `c901` (same position).
6. On failure, the comment stays with a red "Failed. Retry" link. Text is not lost.
7. The server also broadcasts `comment.created` on SSE. Our own tab ignores it because the ID already exists (de-dup).

## 3. Data model

```ts
type CommentId = string;

interface Author {
  id: string;
  name: string;
  avatarUrl: string;
  isOp: boolean;            // original poster badge
}

interface Comment {
  id: CommentId;
  postId: string;
  parentId: CommentId | null; // null = top-level
  author: Author | null;      // null when deleted
  body: string;               // raw markdown; "" when deleted
  createdAt: string;          // ISO
  editedAt: string | null;
  score: number;
  myVote: -1 | 0 | 1;
  replyCount: number;         // total direct replies on server
  depth: number;              // 0 for top-level
  isDeleted: boolean;
  // client-only
  status?: 'sending' | 'failed';
}

// Normalized store
interface CommentsState {
  byId: Record<CommentId, Comment>;
  childrenOf: Record<CommentId | 'root', CommentId[]>; // ordered
  cursorOf: Record<CommentId | 'root', string | null>;  // next page cursor
  loadingOf: Record<CommentId | 'root', boolean>;
  collapsed: Record<CommentId, true>;
  sort: 'top' | 'new';
  pendingNew: Comment[];      // from SSE, shown as "N new comments" pill
}
```

**Why flat + normalized and not a nested tree object?**
- The server returns a flat list with `parentId`. It's easy to page and easy to store in SQL.
- With a map, update/vote on one comment is O(1): `byId[id].score++`. In a nested tree you must walk the tree to find it, and copy every parent on the path for immutability, which re-renders the whole branch.
- Each `CommentNode` subscribes only to `byId[id]` and `childrenOf[id]`. A vote re-renders one node, not 1,000.

Building `childrenOf` from a flat page:

```ts
function mergeComments(state: CommentsState, list: Comment[]) {
  for (const c of list) {
    state.byId[c.id] = c;
    const key = c.parentId ?? 'root';
    const arr = (state.childrenOf[key] ??= []);
    if (!arr.includes(c.id)) arr.push(c.id); // keep server order, avoid dupes
  }
}
```

(Use a Set alongside the array if lists get big; `includes` is fine for 20–50 per page.)

| Entity | Lives in | Why |
|---|---|---|
| Comments (`byId`, `childrenOf`) | Client store (Zustand / Redux Toolkit / React Query cache) | Shared by many nodes; needs O(1) updates and optimistic changes. |
| Cursors and loading flags | Client store | Per-thread pagination state. |
| Sort order | URL (`?sort=new`) | Shareable link; back button works. |
| Collapsed threads | Client store (optionally sessionStorage) | UI only; survives scroll/virtualization unmount. |
| Draft reply text | Component state (+ sessionStorage per parentId) | Typing must not re-render the tree; draft survives accidental close. |
| Linked comment (`/comments/c42`) | URL | Deep links from notifications open that thread. |
| Source of truth for comments, votes | Server | Everything else is a cache. |

## 4. Interface (API)

### Component API

```tsx
<CommentsSection
  postId="p1"
  initialSort="top"
  focusCommentId={undefined}   // set when opened from a deep link
  maxInlineDepth={6}
/>

<CommentNode
  id="c42"
  depth={2}
/>                              // reads everything else from store by id

<Composer
  parentId={'c42' | null}
  initialValue=""
  autoFocus
  onSubmit={(body) => Promise<void>}
  onCancel={() => void}
  maxLength={10000}
/>

<CommentBody markdown={comment.body} isDeleted={comment.isDeleted} />
```

Key point: `CommentNode` takes only `id` and `depth`. If you pass the full comment object down, every parent re-render creates new props and breaks memo.

### Server API

**1. Get top-level comments (with a few replies preloaded)**

`GET /posts/:postId/comments?sort=top&limit=20&cursor=<opaque>&replyLimit=3&replyDepth=2`

```json
{
  "comments": [
    { "id": "c1", "parentId": null, "depth": 0, "body": "Great post", "score": 120,
      "myVote": 0, "replyCount": 14, "author": { "id": "u1", "name": "Asha" },
      "createdAt": "2026-11-20T10:00:00Z", "isDeleted": false },
    { "id": "c5", "parentId": "c1", "depth": 1, "body": "Agreed", "score": 30,
      "replyCount": 2, "...": "..." }
  ],
  "cursors": { "root": "eyJzIjoxMjAsImlkIjoiYzEifQ", "c1": "eyJ...", "c5": null }
}
```

The response is a flat list. Top-level comments plus up to 3 replies each, up to depth 2. Server returns a cursor for each thread it cut short, so the client can show "11 more replies".

**2. Get more replies of one comment**

`GET /comments/:commentId/replies?sort=top&limit=10&cursor=<opaque>&replyLimit=2&replyDepth=1`

Same flat shape. Response `cursors[commentId]` is the next page.

**Why cursor pagination, not offset (`page=3`)?**
- New comments are added all the time. With offset, a new comment at the top shifts everything, so page 2 repeats one item or skips one.
- A cursor says "after score=120 and id=c1". It's stable.
- Sort by Top needs a tie-breaker (`score, id`) inside the cursor because many comments have the same score.

**3. Create**

`POST /posts/:postId/comments` · Header `Idempotency-Key: <uuid>`

```json
{ "parentId": "c42", "body": "Nice **point**" }
```
→ `201` with the full `Comment`. The idempotency key means a retry after a timeout does not create a duplicate comment.

**4. Edit** — `PATCH /comments/:id` `{ "body": "..." }` → updated comment.
**5. Delete** — `DELETE /comments/:id` → `200 { "id": "c42", "isDeleted": true }` (soft delete).
**6. Vote** — `PUT /comments/:id/vote` `{ "value": 1 }` (`-1 | 0 | 1`). PUT with the final value, not "toggle", so it's idempotent and safe to retry.

**7. Real-time** — `GET /posts/:postId/comments/stream` (Server-Sent Events)

```text
event: comment.created
data: {"comment": {"id":"c950","parentId":null, "...": "..."}}

event: comment.updated
data: {"id":"c42","body":"edited text","editedAt":"..."}

event: comment.deleted
data: {"id":"c42"}

event: score.updated
data: {"id":"c42","score":131}
```

SSE because it's one-way (server → client), auto-reconnects, and works over plain HTTP. Score events are batched by the server every ~5 s so a viral post doesn't flood clients.

## 5. Optimizations and deep dives

### 5.1 Recursive rendering and depth limit

```tsx
const CommentNode = memo(function CommentNode({ id, depth }: { id: string; depth: number }) {
  const comment = useComments((s) => s.byId[id]);
  const childIds = useComments((s) => s.childrenOf[id] ?? EMPTY);
  const collapsed = useComments((s) => !!s.collapsed[id]);
  const hasMore = useComments((s) => s.cursorOf[id] != null);

  if (!comment) return null;

  return (
    <li role="treeitem" aria-level={depth + 1} aria-expanded={childIds.length ? !collapsed : undefined}>
      <CommentHeader comment={comment} />
      {!collapsed && (
        <>
          <CommentBody markdown={comment.body} isDeleted={comment.isDeleted} />
          <ActionBar id={id} />
          {depth + 1 >= MAX_INLINE_DEPTH && childIds.length > 0 ? (
            <a href={`/posts/${comment.postId}/comments/${id}`}>Continue this thread →</a>
          ) : (
            <ul role="group">
              {childIds.map((cid) => <CommentNode key={cid} id={cid} depth={depth + 1} />)}
              {hasMore && <LoadMoreReplies parentId={id} remaining={comment.replyCount - childIds.length} />}
            </ul>
          )}
        </>
      )}
    </li>
  );
});
```

- `EMPTY` is a constant `[]` so the selector returns the same reference and doesn't cause re-renders.
- **Why a depth limit?** On a 360 px phone, 10 levels × 16 px = 160 px of indent; text gets squeezed into a thin column. Also very deep recursion is slow. After 6 levels we show "Continue this thread", which opens a new page rooted at that comment (`/comments/c42`), resetting depth to 0.
- Collapse is stored in the store (not local state) so a virtualized node that unmounts and mounts again remembers it.

### 5.2 Lazy loading replies with per-thread cursors

- First load: 20 top-level + 3 replies each + depth 2. That's usually ~100 comments, enough to fill 3–4 screens.
- Each thread has its own cursor in `cursorOf[parentId]`. "Load 11 more replies" calls `GET /comments/c1/replies?cursor=...` and merges into `childrenOf['c1']`.
- Guard against double clicks: if `loadingOf[c1]` is true, ignore. Disable the button and show a spinner.
- If a new comment was added optimistically into that thread, de-dupe by ID during merge.
- Top-level pagination: use an `IntersectionObserver` sentinel near the bottom to load the next 20 automatically, plus a visible "Load more" button as a fallback for keyboard users.

### 5.3 Optimistic post and vote with rollback

Vote is the most frequent action. It must feel instant.

```ts
async function vote(id: string, value: -1 | 0 | 1) {
  const prev = get().byId[id];
  const delta = value - prev.myVote;
  set((s) => { s.byId[id] = { ...prev, myVote: value, score: prev.score + delta }; });
  try {
    await api.put(`/comments/${id}/vote`, { value });
  } catch {
    // roll back only if nobody changed it since
    set((s) => { if (s.byId[id].myVote === value) s.byId[id] = prev; });
    toast.error('Vote failed. Try again.');
  }
}
```

- **Fast clicking up/down/up:** debounce the network call (300 ms) and send only the final value. The UI updates on every click; the server gets one request.
- **Posting:** temp ID, faded style, `aria-busy`. On success replace temp ID in `byId` and in `childrenOf[parent]` at the same index. On failure keep it with "Retry / Discard". It is safe to clear the textarea right after submit, because the text now lives in the temp comment and Retry reuses it.
- Increase `replyCount` of the parent optimistically too, and roll it back on failure.

### 5.4 Edit and delete (soft delete)

- **Why soft delete?** If comment c42 has 8 replies and we remove it fully, the replies lose their parent. The tree breaks and replies like "No, you're wrong" make no sense. So the server keeps the row, clears `body` and `author`, sets `isDeleted: true`. UI shows "[deleted]" in grey with the replies still under it.
- If the deleted comment has **no** replies, the client can hide it fully.
- Edit: inline Composer pre-filled with the raw markdown. Optimistic update, show "(edited)" next to time with the `editedAt` tooltip.
- Delete asks for confirmation (a small dialog) because it can't be undone. Focus returns to the next comment after delete.

### 5.5 Performance for thousands of comments

1. **Normalized store + selectors**: each node subscribes to its own slice. A vote re-renders 1 node.
2. **`React.memo` on `CommentNode` and `CommentBody`**: props are only `id`, `depth`, `markdown` — primitives, so memo works.
3. **Composer owns its text state**: typing re-renders only the Composer, not the tree.
4. **Markdown parse cache**: `useMemo(() => renderMarkdown(body), [body])`. Parsing 1,000 bodies on each render would be slow.
5. **Virtualizing a tree**: virtualization libraries (react-window, TanStack Virtual) need a flat list. So we **flatten the visible tree** into rows:

```ts
function flattenVisible(state: CommentsState): { id: string; depth: number }[] {
  const rows: { id: string; depth: number }[] = [];
  const walk = (parent: string, depth: number) => {
    for (const id of state.childrenOf[parent] ?? []) {
      rows.push({ id, depth });
      if (!state.collapsed[id] && depth + 1 < MAX_INLINE_DEPTH) walk(id, depth + 1);
    }
  };
  walk('root', 0);
  return rows;
}
```

   Each row renders one comment with `paddingLeft = depth * 12px` and thread lines drawn with CSS. Use `measureElement` (dynamic height) because comments have different lengths. Memoize the flatten on `childrenOf` and `collapsed`.
   - **When to virtualize?** Only above ~300 visible comments. Below that, plain rendering is simpler and avoids issues with Ctrl+F and screen readers.
6. **`content-visibility: auto`** on each top-level thread is a cheap middle step: the browser skips layout/paint of off-screen threads without any JS.
7. Avatars `loading="lazy"`, fixed size 24×24 to avoid layout shift.

### 5.6 Sanitizing user content (XSS) and markdown

- Never use `dangerouslySetInnerHTML` with raw user text.
- Pipeline: markdown → HTML (e.g. `marked` or `markdown-it` with `html: false`, so raw HTML in input is escaped) → **DOMPurify** with an allow-list (`p, strong, em, a, code, pre, blockquote, ul, ol, li`).
- Links: allow only `http:` / `https:` (block `javascript:`), add `rel="nofollow ugc noopener noreferrer"` and `target="_blank"`.
- Server also sanitizes or stores raw and sanitizes on output; client sanitization is defense in depth, not the only wall.
- Add a CSP header (`script-src 'self'`) so even if something slips, inline scripts won't run.
- Alternative: `react-markdown` renders to React elements (no innerHTML), which is safer by default. Good answer for interviews.

### 5.7 Accessibility

- Structure: `<section aria-label="Comments">`, a heading "Comments (1,240)".
- Tree semantics: nested `<ul>/<li>` is good enough and widely supported. Full `role="tree"` needs arrow-key handling (Up/Down between comments, Left to collapse, Right to expand) — only do it if you implement all keys.
- Each comment is an `<article>` with `aria-labelledby` pointing to the author name, and a visually hidden "Reply to Asha, level 3".
- Collapse button: `aria-expanded`, label "Collapse thread, 14 replies".
- Vote buttons: `aria-pressed` for the active vote; score inside `aria-live="polite"` is too noisy — instead update the button label ("Upvoted, score 121").
- Reply opens composer → focus to textarea. Cancel/post → focus back to the Reply button.
- "N new comments" pill is a button; announce it with a polite live region once, not on every new comment.

**Also mention**
- Deep link to a comment: load its ancestor chain + its subtree, scroll to it, highlight for 2 s.
- Rate-limit posting client-side (disable button while sending) and server-side.
- Relative time ("5m ago") updated by one shared 60 s timer, not one interval per comment.
- Mentions `@user` autocomplete reuses the autocomplete design.
- Prefetch replies on hover of "Load more" on desktop.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Client data shape | Nested tree object | Flat normalized map + `childrenOf` | **B.** O(1) updates, per-node subscriptions, easy merge of paged data. |
| Server response | Nested JSON | Flat list with `parentId` | **Flat.** Same shape for every endpoint; easy to merge; no deep recursion when parsing. |
| Pagination | Offset | Cursor | **Cursor.** Stable when new comments arrive; handles ties with `(score,id)`. |
| Real-time | Insert new comments live | "N new comments" pill | **Pill.** Content doesn't jump under the reader; user controls when to load. |
| Real-time transport | WebSocket | SSE | **SSE.** Only server → client; simple, auto-reconnect. Posting uses normal REST. |
| Delete | Hard delete | Soft delete "[deleted]" | **Soft** when it has replies; keeps the tree readable. |
| Rendering 1,000s | Render all + memo | Virtualize flattened tree | **Memo first, `content-visibility`, virtualize only above ~300 rows.** Virtualization costs Ctrl+F and a11y. |
| Depth | Unlimited indent | Cap at 6 + "Continue thread" | **Cap.** Readable on mobile. |
| Markdown | innerHTML + DOMPurify | react-markdown (React elements) | **react-markdown** for safety; DOMPurify if perf of large lists matters. |

## 7. Likely follow-up questions

**Q1. How would you build the tree from a flat list in O(n)?**
One pass: for each comment, put it in `byId` and push its ID into `childrenOf[parentId ?? 'root']`. Server order is already sorted, so children arrays keep the right order. No recursion needed to build; recursion is only for rendering.

**Q2. A user upvotes and the API fails. What happens?**
UI already showed the new score. On failure we restore the previous `myVote` and `score`, but only if the user hasn't voted again since. Show a small error toast.

**Q3. Two users edit/delete at the same time, or someone deletes a comment I'm replying to?**
Server returns `404/410` for reply to a deleted parent. Show "This comment was deleted" and keep the draft so the user can copy it. SSE `comment.deleted` also updates the UI live.

**Q4. How do you avoid re-rendering 1,000 comments when one changes?**
Normalized store, each `CommentNode` selects only its own data by ID, `React.memo` with primitive props, Composer with local state. A change touches one node.

**Q5. How does "Continue this thread" work?**
It's a link to `/posts/p1/comments/c42`. That page calls `GET /comments/c42/replies` and renders c42 as the root at depth 0, with a "← Back to full discussion" link and the parent chain shown in a small breadcrumb.

**Q6. How would you sort by Top on the client when a new comment arrives?**
I won't re-sort live — it moves things under the user. New comments go into `pendingNew`. When the user clicks the pill, own new comments go to the top of the list. A full re-sort happens only when the user changes sort or refreshes.

**Q7. How do you prevent XSS from comments?**
Markdown parser with raw HTML disabled, then DOMPurify with an allow-list, block `javascript:` URLs, `rel="ugc nofollow noopener"`, plus server-side sanitizing and a CSP header.

**Q8. Offline / slow network while posting?**
Keep the comment in "sending" state, retry with the same idempotency key with backoff (1 s, 2 s, 4 s). Save the draft in sessionStorage so a refresh doesn't lose it.

**Q9. YouTube vs Reddit style — what changes?**
YouTube is 2 levels: top-level + flat replies (replies to replies are shown flat with "@name"). Then no recursion is needed, max depth = 1, and the "View 23 replies" toggle loads a flat list. Data model stays the same.

## 8. If you only have 60 seconds

- Server sends a **flat list with `parentId`**; client keeps a **normalized store**: `byId` + `childrenOf` + per-thread **cursors**.
- **Recursive `CommentNode`** that takes only `id` and `depth`, memoized; cap at 6 levels then "Continue this thread".
- Load 20 top-level + 3 replies each; "Load more replies" uses **cursor pagination per thread** (stable when new comments arrive).
- **Optimistic** post and vote with temp IDs and rollback; idempotency key on POST; vote is PUT with final value.
- **Soft delete** keeps "[deleted]" so replies stay in context.
- New comments via **SSE** into a "N new comments" pill, no jumping.
- Perf: memo + selectors, `content-visibility`, **flatten + virtualize** above ~300 rows. Security: markdown without raw HTML + **DOMPurify** + CSP. A11y: nested lists, `aria-expanded`, focus management.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Depth, volume, real-time, actions, markdown, mobile. |
| 4–9 | Requirements | Functional list, perf numbers, a11y, XSS. Out of scope. |
| 9–16 | Architecture | Box diagram, store, SSE, flow of posting a reply. |
| 16–22 | Data model | Flat vs tree, normalized `byId` + `childrenOf`, where each state lives. |
| 22–28 | API | Paged endpoints with per-thread cursors, POST with idempotency, vote PUT, SSE events. |
| 28–40 | Deep dives | Recursive render + depth limit, optimistic + rollback, soft delete, virtualization, XSS. |
| 40–45 | Trade-offs + wrap | Pill vs live insert, cursor vs offset; 60-second summary. |

## Common mistakes

- Jumping to components before defining data/entities. The flat vs tree data shape decides almost everything here.
- Storing comments as a deeply nested object and updating them with recursive spreads — slow and re-renders whole branches.
- Using offset pagination, then getting duplicates when new comments arrive.
- Rendering user markdown with `dangerouslySetInnerHTML` without sanitizing.
- Hard-deleting comments and breaking the reply chain.
- Inserting real-time comments directly into the list so the page jumps while the user reads.

## My mistakes

- [ ]
