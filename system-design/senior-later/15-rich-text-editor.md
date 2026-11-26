# Rich Text Editor (e.g. the editor on Medium): a reusable component

> **Difficulty:** Hard · **Asked at:** product companies with writing/notes/CMS features (Atlassian, Notion-style startups, Zoho, Freshworks, Microsoft), and senior-leaning frontend rounds at large tech · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

---

## 0. Clarifying questions to ask first

- Is this a reusable component (used by many teams) or a single feature on one page?
  → Assume: reusable React component, other teams will add their own features via plugins.
- Which formatting do we need? Bold/italic/underline, headings, lists, links, quotes, code blocks? Images? Tables?
  → Assume: bold, italic, underline, strike, inline code, links, H1–H3, bullet/numbered lists, quote, code block, images. Tables out of scope.
- What output format does the backend want — HTML, Markdown, or JSON?
  → Assume: we store our own JSON document. We can export HTML (for rendering a published post) and Markdown.
- Single user or real-time collaboration?
  → Assume: single user. Design so collaboration can be added later (see 12-collaborative-editor.md).
- How long can a document be?
  → Assume: typical post 2–5k words; must stay smooth up to ~50k words.
- Do we need it on mobile?
  → Assume: yes, mobile web (iOS Safari, Android Chrome), including non-English keyboards (Hindi, Chinese, Japanese).
- Save model: explicit "Save" button or autosave?
  → Assume: autosave with draft status, plus "Publish".
- Do users paste content from Word / Google Docs / other sites?
  → Assume: yes, very common. Paste must keep basic formatting and must be safe.

## 1. Requirements

### Functional
- Type and edit text; apply inline formatting (bold, italic, underline, strike, code, link).
- Block types: paragraph, heading, bullet list, numbered list, quote, code block, image, divider.
- Formatting via toolbar, keyboard shortcuts (Cmd/Ctrl+B), and a floating "bubble" toolbar on text selection (like Medium).
- Markdown-style shortcuts: typing `# ` makes a heading, `- ` makes a list, `> ` makes a quote.
- Undo / redo.
- Paste from other apps with cleaned formatting. Paste/drag images → upload.
- Autosave drafts; load existing document.
- Export to HTML and Markdown.
- Extensible: teams can add new blocks (e.g. embed, mention) and new commands.

### Non-functional (performance, accessibility, devices, network)
- **Performance:** typing latency under 16ms per keystroke (one frame). No full re-render of the whole doc on each key. Smooth at 50k words.
- **Accessibility:** works with screen readers (correct roles, headings, lists); every toolbar action has a keyboard shortcut; toolbar is keyboard reachable; focus is never lost.
- **Devices:** desktop + mobile browsers. IME (input method editor — the popup used to type Chinese/Japanese/Hindi) must work. Spellcheck and autocorrect must work.
- **Network:** autosave must survive flaky networks (retry, local backup in IndexedDB). Never lose what the user typed.
- **Security:** pasted HTML and saved content must never run scripts (XSS).
- **Bundle size:** core under ~60kb gzipped; heavy plugins (code highlighting) lazy loaded.

### Out of scope
- Real-time multi-user editing (covered in 12-collaborative-editor.md).
- Comments / suggestions mode.
- Tables, math equations.
- Version history UI (we only keep autosave versions on the server).

## 2. Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                       <RichTextEditor />  (React)                │
│                                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Toolbar   │  │ Bubble menu  │  │  Slash menu / popovers   │  │
│  └─────┬──────┘  └──────┬───────┘  └───────────┬──────────────┘  │
│        │ commands       │                      │                 │
│        ▼                ▼                      ▼                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Editor Core (no React)                  │  │
│  │  ┌───────────┐  ┌──────────────┐  ┌───────────────────┐    │  │
│  │  │ Document  │  │  Selection   │  │ Command registry  │    │  │
│  │  │  model    │  │   model      │  │ + Transactions    │    │  │
│  │  └───────────┘  └──────────────┘  └───────────────────┘    │  │
│  │  ┌───────────┐  ┌──────────────┐  ┌───────────────────┐    │  │
│  │  │  History  │  │ Plugin host  │  │ Schema (allowed   │    │  │
│  │  │ undo/redo │  │              │  │ nodes & marks)    │    │  │
│  │  └───────────┘  └──────────────┘  └───────────────────┘    │  │
│  └───────────┬──────────────────────────────────▲─────────────┘  │
│              │ render (diff)                    │ input events   │
│              ▼                                  │                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │      View layer: contenteditable surface (DOM)             │  │
│  │      beforeinput / composition / paste / selectionchange   │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────────────────────────┘
               │ onChange(doc)  (debounced)
               ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│ Autosave manager         │──────▶ │ Server: /documents API   │
│ (debounce, retry, IDB)   │        │ /uploads (images)        │
└──────────────────────────┘        └──────────────────────────┘
```

| Component | Responsibility |
|---|---|
| `RichTextEditor` (React) | Public component. Creates the editor core, mounts the view, renders toolbar and menus. |
| Toolbar / Bubble menu / Slash menu | UI only. Read current state (is bold active?) and call commands. |
| Document model | Immutable tree of nodes (blocks) with text and marks. The single source of truth. |
| Selection model | Where the cursor is, as positions in the model (not DOM nodes). |
| Schema | List of allowed node types and marks, and what can go inside what. Used to validate and sanitize. |
| Commands + Transactions | Every change is a transaction: a list of small steps applied to the doc. |
| History | Stores inverse transactions for undo/redo, groups typing. |
| Plugin host | Lets plugins add nodes, marks, commands, keymaps, paste rules, input rules. |
| View layer | Renders the model into a `contenteditable` div, listens to browser input, maps DOM ↔ model positions. |
| Autosave manager | Debounces changes, saves to IndexedDB first, then server; retries on failure. |

**Data flow when the user presses Cmd+B with text selected:**
1. Browser fires `keydown`. The keymap plugin matches `Mod-b` to the `toggleBold` command.
2. The command reads the current selection from the selection model, and creates a transaction: "add mark `bold` from position 10 to 25".
3. The transaction is applied → new immutable document + new selection.
4. History stores the inverse step ("remove mark bold 10–25") for undo.
5. View layer diffs old vs new doc and updates only the changed DOM nodes, then restores the DOM selection from the model selection.
6. Editor emits `onChange`. React toolbar re-renders "Bold" as active. Autosave manager debounces and saves.

**Data flow when the user types a letter:** the browser fires `beforeinput` with `inputType: "insertText"`. We call `preventDefault()` (when safe), create an "insert text" transaction, and re-render that one text node. During IME composition we let the browser change the DOM and read the result at `compositionend` (see deep dive).

## 3. Data model

```ts
// A mark is inline formatting on a range of text.
type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; attrs: { href: string; title?: string } };

type TextNode = {
  type: 'text';
  text: string;
  marks: Mark[];          // e.g. [{type:'bold'}, {type:'italic'}]
};

type BlockNode =
  | { id: string; type: 'paragraph'; content: TextNode[] }
  | { id: string; type: 'heading'; attrs: { level: 1 | 2 | 3 }; content: TextNode[] }
  | { id: string; type: 'quote'; content: BlockNode[] }
  | { id: string; type: 'codeBlock'; attrs: { language?: string }; content: TextNode[] }
  | { id: string; type: 'bulletList' | 'orderedList'; content: ListItemNode[] }
  | { id: string; type: 'image'; attrs: { src: string; alt: string; width?: number; uploadId?: string } }
  | { id: string; type: 'divider' };

type ListItemNode = { id: string; type: 'listItem'; content: BlockNode[] };

type EditorDoc = {
  type: 'doc';
  version: number;        // schema version, for migrations
  content: BlockNode[];
};
```

```ts
// Selection uses positions in the model, not DOM nodes.
type Selection =
  | { type: 'text'; anchor: number; head: number }   // anchor = where drag started, head = where cursor is
  | { type: 'node'; pos: number };                    // a whole block selected, e.g. an image

// A step is the smallest change. A transaction is a list of steps.
type Step =
  | { type: 'insertText'; pos: number; text: string; marks: Mark[] }
  | { type: 'delete'; from: number; to: number }
  | { type: 'addMark'; from: number; to: number; mark: Mark }
  | { type: 'removeMark'; from: number; to: number; mark: Mark }
  | { type: 'setBlockType'; pos: number; blockType: string; attrs?: object }
  | { type: 'replace'; from: number; to: number; slice: BlockNode[] };

type Transaction = {
  steps: Step[];
  selectionAfter: Selection;
  meta: { source: 'keyboard' | 'paste' | 'command' | 'remote'; addToHistory: boolean; time: number };
};

type DocumentMeta = {
  id: string;
  title: string;
  status: 'draft' | 'published';
  revision: number;       // increases on every server save, used for conflict check
  updatedAt: string;
};
```

| Entity | Lives in | Why |
|---|---|---|
| `EditorDoc` (current) | Editor core (outside React state) | Changes on every keystroke. Putting it in React state would re-render the whole tree each key. |
| `Selection` | Editor core | Same reason; also must stay in sync with the DOM selection. |
| History stack | Editor core (memory) | Only needed during the session. |
| Active marks for toolbar (`isBold`) | Component state via `useSyncExternalStore` | Toolbar subscribes to small derived values only. |
| `DocumentMeta` (title, status, revision) | Client store (React Query / Zustand) + server | Shared with other UI (header, publish button). |
| Unsaved draft backup | IndexedDB | Survives tab crash / offline. |
| Saved document | Server (JSON in DB) | Source of truth across devices. |
| Document id | URL (`/edit/:docId`) | Shareable, reload-safe. |

## 4. Interface (API)

### Component API

```tsx
type RichTextEditorProps = {
  initialContent?: EditorDoc | string;      // JSON, or HTML/Markdown string to import
  onChange?: (doc: EditorDoc, editor: Editor) => void;  // debounced by caller if needed
  readOnly?: boolean;
  placeholder?: string;
  plugins?: Plugin[];                       // extra features
  autofocus?: boolean | 'start' | 'end';
  onImageUpload?: (file: File) => Promise<{ src: string }>;  // host app decides where to upload
  ariaLabel?: string;
  className?: string;
};

// Usage
<RichTextEditor
  initialContent={doc}
  plugins={[mentionPlugin, embedPlugin]}
  onChange={(doc) => autosave(doc)}
  onImageUpload={uploadToS3}
/>
```

Imperative handle (via `ref`) for parents that need to call commands:

```ts
interface Editor {
  getJSON(): EditorDoc;
  getHTML(): string;
  getMarkdown(): string;
  commands: {
    toggleBold(): boolean;          // returns false if not possible here
    toggleItalic(): boolean;
    setHeading(level: 1 | 2 | 3): boolean;
    toggleBulletList(): boolean;
    setLink(href: string): boolean;
    unsetLink(): boolean;
    insertImage(attrs: { src: string; alt: string }): boolean;
    undo(): boolean;
    redo(): boolean;
  };
  can(): { toggleBold(): boolean; undo(): boolean /* ... dry run, used to disable buttons */ };
  isActive(name: string, attrs?: object): boolean;   // isActive('heading', {level: 2})
  chain(): ChainedCommands;          // editor.chain().focus().toggleBold().run() → one transaction
  on(event: 'update' | 'selectionUpdate' | 'focus' | 'blur', fn: () => void): () => void;
  destroy(): void;
}
```

Plugin API — how another team adds a feature:

```ts
interface Plugin {
  name: string;
  nodes?: Record<string, NodeSpec>;         // new block types, e.g. 'embed'
  marks?: Record<string, MarkSpec>;         // new inline marks, e.g. 'highlight'
  commands?: Record<string, (...args: any[]) => Command>;
  keymap?: Record<string, Command>;         // { 'Mod-Shift-h': toggleHighlight }
  inputRules?: InputRule[];                 // '# ' → heading
  pasteRules?: PasteRule[];                 // YouTube URL pasted → embed node
  nodeView?: Record<string, React.ComponentType<NodeViewProps>>; // custom React UI for a node
  onTransaction?: (tr: Transaction, state: EditorState) => void;
}

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
// If dispatch is missing, it is a "dry run": just say if the command can run.
```

### Server API

```http
GET  /api/documents/:id
→ 200 { "id": "d_42", "title": "My post", "status": "draft", "revision": 17,
        "content": { "type": "doc", "version": 2, "content": [ ... ] }, "updatedAt": "..." }

PUT  /api/documents/:id          (autosave, full document)
     { "title": "My post", "content": { ... }, "baseRevision": 17 }
→ 200 { "revision": 18, "updatedAt": "..." }
→ 409 { "error": "REVISION_CONFLICT", "serverRevision": 19 }   // saved from another tab

POST /api/documents/:id/publish
→ 200 { "status": "published", "url": "/p/my-post-d42" }

POST /api/uploads/images         (multipart/form-data, or ask for a pre-signed URL)
     → 200 { "uploadId": "u_9", "src": "https://cdn.example.com/u_9.webp", "width": 1200, "height": 800 }

GET  /api/documents/:id/export?format=html|md
→ 200 text/html or text/markdown
```

Notes: autosave sends the full JSON (a 5k-word doc is ~50–100kb, fine). For very long docs, we can send patches (list of steps) instead. The server must **re-validate and sanitize** the JSON against the same schema — never trust the client.

## 5. Optimizations and deep dives

### 5.1 Why not just `contenteditable` + save `innerHTML`?

The naive approach: `<div contenteditable>` and `document.execCommand('bold')`, then save `innerHTML`. It works for a demo and breaks in production:

- **Different browsers produce different HTML.** Pressing Enter gives `<div>` in Chrome, `<p>` or `<br>` in others. Bold may be `<b>`, `<strong>`, or `<span style="font-weight:bold">`.
- **Many ways to say the same thing.** `<b><i>hi</i></b>` and `<i><b>hi</b></i>` are the same. Hard to check "is this bold?" or to diff.
- **`execCommand` is deprecated** and inconsistent, and you cannot add custom blocks with it.
- **Undo is owned by the browser.** Once you change the DOM from JS, the native undo stack breaks.
- **Security:** saving raw HTML means you store whatever was pasted, including `<img onerror=...>`.

**What real editors do (ProseMirror, Lexical, Slate, Tiptap):** keep their **own document model** — a tree of nodes with text and marks, validated by a schema. `contenteditable` is only the **input and render surface**:

```
user input ──▶ intercept (beforeinput) ──▶ transaction ──▶ new model ──▶ render DOM
                                                             │
                                                  JSON saved to server
```

The model is normalized (one way to represent each thing), so "is bold active?", undo, serialization and collaboration are all easy. In an interview I would say: "I would build on ProseMirror/Tiptap or Lexical rather than write this from zero, but here is how the core works."

**Why not render the doc with React components?** We can for blocks (Lexical does), but React re-rendering + DOM reconciliation inside a `contenteditable` fights the browser's own DOM edits (especially during IME). So the core uses its own small DOM diff, and React is used for UI around it and for special "node views" (e.g. an image block with a resize handle).

### 5.2 Selection and cursor model

The DOM selection is `(node, offset)` pairs — they break when we re-render nodes. So the model stores selection as **integer positions** in the doc.

- Each block's start/end and each character counts as one position (ProseMirror style). Position 0 = before first block.
- `anchor` = where the selection started, `head` = where the cursor is now. If `anchor === head` it is a collapsed cursor.
- **Model → DOM:** after each render, convert positions to DOM `(node, offset)` and call `selection.setBaseAndExtent(...)`.
- **DOM → model:** on `selectionchange` (mouse click, arrow keys), map the DOM point back to a position.
- **Stored marks:** if the cursor is collapsed and the user presses Cmd+B, nothing is selected. We save `storedMarks = [bold]` so the next typed character is bold.
- **Node selection:** clicking an image selects the whole node (blue outline), so Delete removes it.

Mapping positions through changes is key: if text is inserted before your cursor, your position must shift. Each step has a `map(pos)` function. This is the same idea used later for collaboration.

### 5.3 Commands and transactions (bold, lists, links)

Every change goes through a transaction. Commands are pure functions `(state, dispatch?) => boolean`:

```ts
const toggleMark = (markType: MarkType): Command => (state, dispatch) => {
  const { from, to, empty } = state.selection;
  if (!state.schema.allowsMark(state.selection, markType)) return false; // e.g. no bold in code block
  if (!dispatch) return true;                  // dry run, used for disabling toolbar buttons

  const tr = state.tr();
  if (empty) {
    tr.toggleStoredMark(markType);             // apply to next typed char
  } else if (state.doc.rangeHasMark(from, to, markType)) {
    tr.removeMark(from, to, markType);
  } else {
    tr.addMark(from, to, markType.create());
  }
  dispatch(tr);
  return true;
};
```

- **Lists:** `toggleBulletList` wraps selected paragraphs into `bulletList > listItem > paragraph`. Tab = indent (`sinkListItem`), Shift+Tab = outdent (`liftListItem`), Enter on an empty list item = exit the list.
- **Links:** select text → Cmd+K → small popover with an input. On submit: validate URL (only `http`, `https`, `mailto`), then `addMark(from, to, link{href})`. Pasting a URL over selected text makes it a link (a paste rule).
- **Input rules:** after each text insert, check the text before the cursor against regexes: `/^#\s$/` → heading 1, `/^-\s$/` → bullet list, `/\*\*(.+)\*\*$/` → bold.
- **Chaining:** `editor.chain().focus().toggleBold().toggleItalic().run()` builds **one** transaction → one undo step, one render.

### 5.4 Undo / redo with grouping

Do not rely on browser undo. The history plugin keeps two stacks of **inverse steps**:

```ts
type HistoryEntry = { steps: Step[]; inverted: Step[]; selectionBefore: Selection; time: number };
// undoStack: HistoryEntry[]; redoStack: HistoryEntry[]

function onTransaction(tr: Transaction) {
  if (!tr.meta.addToHistory) return;           // e.g. remote changes, autosave metadata
  const last = undoStack.at(-1);
  const sameGroup = last
    && tr.meta.source === 'keyboard'
    && tr.meta.time - last.time < 500           // typed within 500ms
    && isAdjacent(last, tr);                    // continuing the same word/place
  if (sameGroup) merge(last, tr); else undoStack.push(toEntry(tr));
  redoStack.length = 0;                          // new change clears redo
}
```

- **Grouping:** typing "hello world" should not need 11 undos. Group by time (500ms) and position, and break a group on space/Enter or when the cursor jumps.
- **Formatting and paste** are always their own undo step.
- **Restore selection** on undo — the user must see where the change happened.
- Cap the stack (e.g. 200 entries) to limit memory.
- Intercept `historyUndo` / `historyRedo` in `beforeinput` (Mac Edit menu and mobile shake-to-undo send these) and Cmd+Z / Cmd+Shift+Z / Ctrl+Y in the keymap.

### 5.5 Paste handling and HTML sanitization (XSS)

Paste is the biggest source of bugs and security issues.

1. Listen to `paste`, call `preventDefault()`, read `clipboardData`.
2. Prefer our own format if present (`application/x-myeditor+json` — when copying inside our editor we put JSON there, so nothing is lost).
3. Else take `text/html`. Parse it with `DOMParser` (which **does not run scripts** and does not load images, unlike setting `innerHTML` on a live element).
4. **Convert DOM → our model using the schema** — this is the real sanitizer. Each schema node has `parseDOM` rules: `<h1>` → heading 1, `<strong>`, `<b>`, `font-weight:700` → bold. **Anything not in the schema is dropped**; only its text is kept. So `<script>`, `<iframe>`, `onclick`, `style` all disappear automatically.
5. Clean Word/Google Docs junk (`<o:p>`, Google's `<b style="font-weight:normal" id="docs-internal-guid-...">` wrapper which is NOT bold).
6. Validate link `href`: allow `http:`, `https:`, `mailto:` only. Block `javascript:` and `data:`.
7. Images in paste: if `src` is external or `data:`, upload it via `onImageUpload` and replace `src` with our CDN URL.
8. Else fall back to `text/plain` — split on blank lines into paragraphs.

Defense in depth: when rendering the published post, generate HTML from the JSON on the server (whitelist again) and pass it through DOMPurify if any raw HTML reaches the client. Add a CSP header (`script-src 'self'`) on the published page.

### 5.6 IME / composition input and mobile quirks

**IME** (Input Method Editor): when typing Japanese, Chinese, or Hindi with a phonetic keyboard, the user types several keys and the OS shows a temporary underlined word, then confirms it. Android keyboards with autocorrect behave the same way for English too.

- Between `compositionstart` and `compositionend`, the browser **owns** the DOM of that text. If we re-render that node, the composition breaks (characters duplicate or vanish).
- Rule: **do not re-render the composing text node during composition.** Let the browser edit the DOM. On `compositionend`, read the DOM text, diff it against the model, and create one transaction.
- `beforeinput` with `insertCompositionText` cannot be cancelled — so we "read back" from the DOM (Lexical and ProseMirror use a `MutationObserver` for this).
- Android: `keydown` often gives `keyCode 229` (unknown), so do not rely on keydown for Backspace/Enter — use `beforeinput` `inputType` (`deleteContentBackward`, `insertParagraph`).
- iOS: the virtual keyboard covers the bottom; position the toolbar above it using `window.visualViewport` resize events.
- Spellcheck/autocorrect replace text with `insertReplacementText` — handle that input type.

### 5.7 Serialization: JSON / HTML / Markdown

- **JSON** is the storage format: exact, versioned (`version` field → write migrations when schema changes), easy to validate.
- **HTML** for display: each node has `toDOM` (`heading` → `<h2>`). Run on the server for published pages (good for SEO, no editor JS needed for readers).
- **Markdown** for export/import: a serializer walks the tree (`bold` → `**text**`). Some things do not map (underline) — document the loss.
- Each plugin provides its own `parseDOM`, `toDOM`, `toMarkdown`, so new nodes serialize correctly.

### 5.8 Performance with long documents

- Model is **immutable with structural sharing**: changing one paragraph creates a new paragraph + new parents, all other blocks are reused (same object reference). The view compares by reference and only re-renders changed blocks — O(changed blocks), not O(doc).
- Give each block a stable `id` → DOM nodes are reused, not recreated.
- Toolbar state: subscribe with `useSyncExternalStore` to only `isActive('bold')` etc., so React work is tiny per keystroke.
- `onChange` serialization (`getJSON`) is costly — debounce it (e.g. 1s) for autosave, not per key.
- For 50k+ words: CSS `content-visibility: auto` on blocks lets the browser skip layout/paint of off-screen blocks. Full virtualization (removing DOM) is risky in `contenteditable` (breaks find-in-page, selection across blocks, screen readers), so only consider it at extreme sizes.
- Lazy load heavy plugins: code syntax highlighting (Prism/Shiki), embeds.

### Also mention
- **Accessibility:** editor div has `role="textbox"`, `aria-multiline="true"`, `aria-label`. Use real `<h2>`, `<ul>`, `<blockquote>` so screen readers announce structure. Toolbar uses `role="toolbar"` with roving tabindex (arrow keys move between buttons), `aria-pressed` on toggle buttons. Announce "Bold on" via an `aria-live` region. Image alt text prompt on upload.
- **Autosave & offline:** write to IndexedDB on every debounced change, then PUT to server. Show "Saving… / Saved / Offline — saved locally". Use `baseRevision` to detect saves from another tab (409 → ask the user or show a "newer version exists" banner). `beforeunload` warning if unsaved.
- **Collaboration:** because every change is a transaction of steps with position mapping, we can later plug in OT or a CRDT (Yjs) — details in 12-collaborative-editor.md.
- **Image upload:** insert a placeholder node with a local `blob:` URL + progress immediately; replace `src` when upload finishes; remove on failure with a toast.
- **Testing:** unit test commands on the model (no DOM needed), and Playwright tests for typing, paste and IME on real browsers.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Source of truth | DOM / `innerHTML` | Own document model (tree + marks) | **Model.** Consistent across browsers, safe, enables undo, plugins, collaboration. |
| Build vs buy | Write editor from scratch | ProseMirror/Tiptap or Lexical | **Library.** Years of browser edge cases (IME, selection). Spend effort on product plugins. |
| Storage format | HTML string | JSON document | **JSON.** Validatable against schema, versioned, easy to migrate; generate HTML on export. |
| Rendering blocks | React components for every block | Editor's own DOM diff + React only for node views | **Own diff + React node views.** Avoids React fighting the browser during IME. |
| Undo | Browser native undo | Own history of inverse steps | **Own history.** Native undo breaks once JS edits DOM. |
| Autosave payload | Full document | Patches/steps | **Full doc** for normal sizes (simple, idempotent); patches only for very long docs or collab. |
| Paste sanitization | DOMPurify on HTML | Parse into schema (drop unknown) | **Schema parse** as main filter + DOMPurify/CSP on output for defense in depth. |
| Long docs | Virtualize DOM | `content-visibility: auto` | **content-visibility** — keeps selection, find, a11y working. |

## 7. Likely follow-up questions

**Q1. How do you know if the toolbar's Bold button should look active?**
Check marks at the selection: if collapsed, use `storedMarks` or the marks of the char before the cursor; if a range, active only if all text in range has bold. Expose `editor.isActive('bold')` and subscribe with `useSyncExternalStore` on `selectionUpdate`.

**Q2. A user pastes a 20-page Word document. What happens?**
We parse once with `DOMParser`, convert to model through the schema (drops junk), insert as one transaction (one undo step). Images get placeholder nodes and upload in parallel with a concurrency limit. If it is huge, show a short "Pasting…" state; parsing in a Worker is possible since `DOMParser` is not available there — so we parse on main thread but chunk the conversion.

**Q3. How do you add a new "@mention" feature as a plugin?**
Add an inline `mention` node (`attrs: {userId, label}`, atom — cannot edit inside). Input rule on `@` opens a popover with search; selecting inserts the node. Provide `toDOM` (`<span data-user-id>`), `toMarkdown` (`@label`), and a React node view for hover card.

**Q4. How do you handle schema changes? Old documents have `type: 'callout'` which we renamed.**
Store `version` in the doc. On load, run migrations `v1 → v2 → v3` (pure functions on JSON). The server can also migrate in bulk. Unknown nodes fall back to paragraph with text, never crash.

**Q5. Why intercept `beforeinput` instead of `keydown`?**
`beforeinput` tells you the intent (`insertText`, `deleteWordBackward`, `insertParagraph`, `historyUndo`) regardless of keyboard, platform or input method. `keydown` on mobile often gives key code 229 and misses autocorrect or voice input.

**Q6. How do you prevent XSS from saved content?**
Three layers: schema-based parse on paste (unknown tags/attrs dropped, URL protocol whitelist), server-side validation of the JSON on save, and HTML generated from JSON with escaping + CSP on the published page. Never store or render raw user HTML.

**Q7. Autosave conflicts if the same doc is open in two tabs?**
Each save sends `baseRevision`. If the server revision is newer → 409. Show "This draft was changed in another tab" with options reload/overwrite. `BroadcastChannel` can also warn the other tab early. Real merging is the collaboration problem (file 12).

**Q8. How would you make this work offline?**
Editor works fully local. Debounced saves go to IndexedDB with a `dirty` flag; a sync queue PUTs when `online` fires. On load, if IndexedDB copy is newer than server's `updatedAt`, offer to restore it.

**Q9. How would you test this?**
Unit tests for commands and serializers (pure functions on the model). Snapshot tests for paste conversion with real Word/Docs clipboard HTML fixtures. E2E (Playwright) for typing, selection, undo, on Chrome, Safari, Firefox and mobile emulation.

## 8. If you only have 60 seconds

- `contenteditable` is only the input/render surface; the source of truth is our own **document model** — a tree of block nodes with text and marks, validated by a **schema**.
- Every change is a **transaction** of steps created by **commands** (`toggleBold`, `toggleList`); the view diffs and updates only changed blocks.
- Selection is stored as **model positions** and mapped to/from the DOM; positions are mapped through each step.
- **Undo/redo** stores inverse steps, groups fast typing, restores selection.
- **Paste** is parsed through the schema — unknown tags/attrs dropped — which is also the XSS defense; links whitelist protocols.
- **IME**: don't touch the DOM during composition; read back at `compositionend`. Use `beforeinput` input types, not keydown.
- Save **JSON** (versioned), export HTML/Markdown; autosave to IndexedDB then server with revision checks; plugins add nodes, marks, commands, keymaps.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Reusable vs one page, formats needed, output format, collab or not, mobile/IME, paste. |
| 4–9 | Requirements | Functional list, typing latency, a11y, XSS, never lose data. Out of scope: collab, tables. |
| 9–16 | Architecture | Diagram: React UI → editor core (model, selection, commands, history, plugins) → contenteditable view; autosave. Walk through Cmd+B flow. |
| 16–22 | Data model | Node tree + marks, selection as positions, transaction/steps. Where each thing lives. |
| 22–27 | API | Props, `editor.commands`, plugin interface, save/upload endpoints. |
| 27–40 | Deep dives | Why own model vs innerHTML, transactions + undo grouping, paste + XSS, IME. Pick perf if time. |
| 40–45 | Trade-offs + wrap up | Build vs buy, JSON vs HTML, a11y, offline. Invite follow-ups. |

## Common mistakes

- **Jumping to components before defining data/entities** — drawing a Toolbar and an Editor box without saying what the document model looks like. The model is the whole answer here.
- Saying "use `contenteditable` and save `innerHTML`" without explaining browser inconsistency, broken undo and XSS.
- Keeping the document in React `useState` and re-rendering the whole editor on every keystroke.
- Forgetting paste sanitization and `javascript:` links — interviewers almost always ask about XSS.
- Ignoring IME/mobile input; it shows you have never shipped an editor to real users.
- Spending all the time on toolbar UI and never reaching undo/redo or serialization.

## My mistakes

- [ ]
