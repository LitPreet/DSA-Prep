# Spreadsheet (e.g. Google Sheets)

> **Difficulty:** Hard · **Asked at:** Big tech and productivity-tool companies (Google, Microsoft, Atlassian, Zoho, Notion-style startups), senior-leaning frontend loops · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

> Builds on ../my-level/19-data-table.md (virtualization, sticky headers, memoization). A data table shows rows of records. A spreadsheet is a grid of **cells** that users edit, and cells can depend on each other through formulas. That dependency part is what makes this question hard.

## 0. Clarifying questions to ask first

- How big can a sheet be?
  → Assume: up to ~1M cells with data, a grid that "looks" infinite (e.g. 100k rows × 1,000 columns), but most cells empty.
- Do we need formulas? Which ones?
  → Assume: yes. Basic math (`+ - * / ^`), cell refs (`A1`, `$A$1`), ranges (`A1:B10`), and a few functions (`SUM`, `AVERAGE`, `IF`, `MIN`, `MAX`, `CONCAT`).
- Real-time collaboration?
  → Assume: yes, but I'll cover it briefly. Deep dive is in 12-collaborative-editor.md.
- Multiple sheets (tabs) in one file?
  → Assume: yes, but cross-sheet formulas are a stretch goal.
- Formatting?
  → Assume: bold/italic, text color, background, alignment, number formats (currency, %, date). No conditional formatting.
- Offline support?
  → Assume: nice-to-have. Keep edits locally if the network drops and sync later.
- Devices?
  → Assume: desktop first. Mobile is view + light editing.
- Charts, pivot tables, filters?
  → Assume: out of scope.

## 1. Requirements

### Functional

- Show a large grid with column headers (A, B, C…) and row numbers (1, 2, 3…).
- Select a cell, edit it by typing or double-click, commit with Enter/Tab, cancel with Escape.
- Formula bar showing the raw content of the active cell (`=SUM(A1:A5)`), while the cell shows the result (`150`).
- Formulas with cell refs, ranges, and functions. Auto recalculation when a dependency changes.
- Show errors: `#REF!`, `#DIV/0!`, `#NAME?`, `#CIRC!` (circular reference).
- Range selection with mouse drag and Shift+arrows. Keyboard navigation (arrows, Tab, Enter, Ctrl+arrows to jump to edge of data).
- Copy/paste within the sheet and to/from Excel or other apps (TSV on the clipboard).
- Undo/redo.
- Resize rows and columns, freeze rows/columns, insert/delete rows and columns.
- Cell formatting and number formats.
- Autosave, plus multi-user editing with presence (see others' cursors).

### Non-functional (performance, accessibility, devices, network)

- **Scroll:** 60fps on a sheet with 1M filled cells.
- **Edit latency:** typing in a cell feels instant (< 16ms per keystroke); recalculation of a normal chain < 100ms.
- **Load:** first visible screen in < 2s for a large sheet (load visible part first, rest later).
- **Memory:** memory grows with **filled** cells, not grid size.
- **Accessibility:** screen reader can announce the active cell address and value; full keyboard use.
- **Network:** edits saved even on flaky network (queue + retry); show "Saving… / All changes saved / Offline".
- **Devices:** desktop browsers, high-DPI screens (crisp text on canvas).

### Out of scope

- Charts, pivot tables, conditional formatting, data validation dropdowns.
- Macros / Apps Script.
- Full Excel function library (~400 functions). We build an extensible registry with a few.
- Deep OT/CRDT design (see 12-collaborative-editor.md).

## 2. Architecture

```text
+------------------------------------------------------------------------+
|                               Client                                   |
|                                                                        |
|  +-----------+  +---------------------------------------------------+  |
|  | Toolbar   |  | FormulaBar  (raw value of active cell, editable)  |  |
|  +-----+-----+  +-------------------------+-------------------------+  |
|        |                                  |                            |
|  +-----v----------------------------------v-------------------------+  |
|  | Grid View                                                        |  |
|  |  Canvas layer: cells, gridlines, headers, frozen panes           |  |
|  |  DOM overlay: cell editor <input>, selection box, other cursors  |  |
|  |  Hidden a11y layer: live region with active cell info            |  |
|  +-----+------------------------------------------------------------+  |
|        | user intents (select, edit, paste, resize)                    |
|  +-----v-------------+     +---------------------+                     |
|  | Command Manager   |---->| Sheet Store         |                     |
|  | (undo/redo stack) |     | cells Map, row/col  |                     |
|  +-------------------+     | sizes, formats      |                     |
|                            +----+-----------+----+                     |
|                                 |           |                          |
|               +-----------------v--+   +----v-------------------+      |
|               | Formula Engine     |   | Sync Client            |      |
|               | parser, dep graph, |   | op queue, WebSocket,   |      |
|               | evaluator          |   | IndexedDB offline log  |      |
|               | (Web Worker)       |   +----+-------------------+      |
|               +--------------------+        |                          |
+---------------------------------------------|--------------------------+
                                              |  WebSocket (ops, presence)
                                              v  REST (load, snapshots)
                                   +------------------------+
                                   | Sheet Service          |
                                   | op log, snapshots, ACL |
                                   +------------------------+
```

| Component | Responsibility |
|---|---|
| Toolbar | Formatting buttons, number format, freeze, undo/redo. Dispatches commands. |
| FormulaBar | Shows and edits the raw input of the active cell. |
| Grid View (canvas) | Draws only visible cells, headers, gridlines, frozen panes. Handles hit-testing (x,y → row,col). |
| DOM overlay | Real `<input>`/`<textarea>` for editing (IME, spellcheck, copy work), selection rectangle, collaborator cursors. |
| Command Manager | Every change is a command with `do` / `undo`. Keeps undo/redo stacks. |
| Sheet Store | Sparse cell map, row heights, column widths, frozen counts, selection. Notifies the view. |
| Formula Engine | Parses formulas to an AST, keeps a dependency graph, recalculates in topological order. Runs in a Web Worker for big sheets. |
| Sync Client | Sends ops to server, applies remote ops, keeps an offline queue in IndexedDB, sends presence. |
| Sheet Service | Stores the op log and snapshots, orders ops, checks permissions, broadcasts to other clients. |

**Main flow: user types `=A1*2` into B1 and presses Enter**

1. User double-clicks B1 (or just starts typing). The DOM overlay places an `<input>` exactly over B1's rectangle.
2. On Enter, the grid creates `SetCellCommand({ ref: "B1", raw: "=A1*2" })` and sends it to the Command Manager.
3. Command Manager runs it: stores old value for undo, writes new raw into the Sheet Store, pushes to undo stack.
4. Formula Engine parses `=A1*2`, updates the graph (B1 depends on A1), evaluates B1, then re-evaluates everything that depends on B1, in topological order.
5. Store updates computed values; the canvas redraws only the dirty cells (if visible).
6. Sync Client sends the op `{ type: "setCell", ref: "B1", raw: "=A1*2", baseVersion: 42 }`. Status shows "Saving…" then "All changes saved".
7. Server broadcasts the op to other users; their engines recalculate locally the same way.
8. Selection moves to B2 (Enter moves down).

## 3. Data model

```ts
type CellKey = string;               // "row:col", e.g. "0:1" for B1 (0-based)

type CellValue = number | string | boolean | null | CellError;
type CellError = { error: '#REF!' | '#DIV/0!' | '#NAME?' | '#VALUE!' | '#CIRC!' };

interface Cell {
  raw: string;                       // exactly what user typed: "=A1*2" or "150"
  value: CellValue;                  // computed result (derived, not saved as truth)
  formatId?: string;                 // points to a shared style
}

interface CellFormat {
  bold?: boolean; italic?: boolean;
  textColor?: string; bgColor?: string;
  hAlign?: 'left' | 'center' | 'right';
  numberFormat?: 'general' | 'number' | 'currency' | 'percent' | 'date' | string; // e.g. "#,##0.00"
}

interface Sheet {
  id: string;
  name: string;
  cells: Map<CellKey, Cell>;          // sparse: only non-empty cells
  formats: Map<string, CellFormat>;   // shared styles, deduped
  rowHeights: Map<number, number>;    // only rows different from default (21px)
  colWidths: Map<number, number>;     // only cols different from default (100px)
  frozenRows: number;
  frozenCols: number;
  rowCount: number;                   // logical size, e.g. 1000 (grows on scroll)
  colCount: number;
}

interface Workbook {
  id: string;
  title: string;
  sheets: Sheet[];
  version: number;                    // server version for sync
}

interface CellRange { start: { row: number; col: number }; end: { row: number; col: number } }

interface Selection {
  active: { row: number; col: number };   // the one cell with the thick border
  ranges: CellRange[];                    // can be many with Ctrl+click
}

// Formula engine internals
type AstNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'ref'; row: number; col: number; absRow: boolean; absCol: boolean }
  | { type: 'range'; from: AstNode; to: AstNode }
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '^' | '&' | '=' | '<' | '>'; left: AstNode; right: AstNode }
  | { type: 'call'; name: string; args: AstNode[] };

interface DependencyGraph {
  dependsOn: Map<CellKey, Set<CellKey>>;   // B1 -> {A1}     (precedents)
  dependents: Map<CellKey, Set<CellKey>>;  // A1 -> {B1}     (who to recalc)
}

// Ops sent to server
type SheetOp =
  | { type: 'setCell'; sheetId: string; row: number; col: number; raw: string }
  | { type: 'setFormat'; sheetId: string; range: CellRange; formatId: string }
  | { type: 'insertRows'; sheetId: string; at: number; count: number }
  | { type: 'deleteCols'; sheetId: string; at: number; count: number }
  | { type: 'resizeCol'; sheetId: string; col: number; width: number };
```

| Entity | Lives in | Why |
|---|---|---|
| Workbook, sheets, raw cell content | Server (op log + snapshots) | Source of truth, shared by all users. |
| Cells map, sizes, formats | Client store | Needed for fast local edits and rendering. |
| Computed values, dependency graph, ASTs | Client store / Web Worker memory | Derived. Can be rebuilt from raw. Not saved as truth (server may cache values for fast first paint). |
| Pending ops (not yet acked) | IndexedDB + memory | Survive refresh and offline. |
| Selection, edit mode, scroll position | Component state / store | Local to this user only. |
| Active sheet tab, maybe cell (`#gid=2&range=B5`) | URL | Shareable deep link to a place in the sheet. |
| Undo/redo stacks | Client memory | Per user, per session. |
| Other users' cursors (presence) | Client memory (from WebSocket) | Short-lived, not saved. |

## 4. Interface (API)

### Component API

```tsx
<Spreadsheet
  workbookId="wb_123"
  readOnly={false}
  onSaveStatusChange={(s: 'saving' | 'saved' | 'offline' | 'error') => {}}
/>

<Toolbar
  activeFormat={CellFormat}
  canUndo={boolean} canRedo={boolean}
  onCommand={(cmd: Command) => void}
/>

<FormulaBar
  address="B1"                    // shown in the name box
  raw="=A1*2"
  onChange={(raw: string) => void}
  onCommit={() => void}
  onCancel={() => void}
/>

<Grid
  sheet={Sheet}
  selection={Selection}
  editing={{ row: number; col: number; draft: string } | null}
  remoteCursors={Array<{ userId: string; color: string; row: number; col: number }>}
  onSelectionChange={(s: Selection) => void}
  onStartEdit={(row: number, col: number, initial?: string) => void}
  onCommitEdit={(raw: string, move: 'down' | 'right' | 'none') => void}
  onResizeCol={(col: number, width: number) => void}
/>

<CellEditor                       // positioned DOM <textarea> over the active cell
  rect={{ x: number; y: number; width: number; height: number }}
  value={string}
  onChange onCommit onCancel
/>

<SheetTabs sheets={{ id: string; name: string }[]} activeId onSelect onAdd onRename />
```

Hooks to keep components thin:

```ts
const cell = useCell(sheetId, row, col);            // subscribe to one cell only
const { execute, undo, redo } = useCommands();
const viewport = useViewport(scrollTop, scrollLeft); // visible row/col range
```

### Server API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/workbooks/:id` | GET | Metadata + sheet list + version |
| `/api/workbooks/:id/sheets/:sheetId/cells?rows=0-199&cols=0-25` | GET | Load a block of cells (visible area first) |
| `/api/workbooks/:id/ops` | POST | Fallback for sending ops without WebSocket |
| `/ws/workbooks/:id` | WebSocket | Send/receive ops and presence |
| `/api/workbooks/:id/export?format=csv&sheet=:sheetId` | GET | CSV export |

Load response (chunk):

```json
{
  "version": 42,
  "cells": [
    { "r": 0, "c": 0, "raw": "100", "v": 100 },
    { "r": 0, "c": 1, "raw": "=A1*2", "v": 200, "f": "fmt_3" }
  ],
  "formats": { "fmt_3": { "bold": true, "numberFormat": "currency" } },
  "colWidths": { "1": 140 },
  "frozenRows": 1
}
```

WebSocket messages:

```json
// client -> server
{ "type": "op", "clientOpId": "c7-19", "baseVersion": 42,
  "op": { "type": "setCell", "sheetId": "s1", "row": 0, "col": 1, "raw": "=A1*2" } }

// server -> client (ack to sender, broadcast to others)
{ "type": "op", "version": 43, "clientOpId": "c7-19", "userId": "u_9", "op": { ... } }

// presence
{ "type": "presence", "userId": "u_9", "name": "Asha", "color": "#e91e63",
  "sheetId": "s1", "active": { "row": 4, "col": 2 } }
```

## 5. Optimizations and deep dives

### 5.1 Sparse cell storage

A 100k × 1,000 grid as a 2D array = 100 million slots. Most are empty. That wastes memory and makes "insert a column" very slow.

Use a **Map keyed by `"row:col"`**. Only filled cells use memory.

```ts
const key = (r: number, c: number) => `${r}:${c}`;
function getCell(sheet: Sheet, r: number, c: number) { return sheet.cells.get(key(r, c)); }
```

- Memory is O(filled cells).
- Rendering walks the **visible** row/col range and does `get()` for each — ~50 × 20 = 1,000 lookups per frame, cheap.
- Row/column sizes also sparse: store only non-default ones. To find "which row is at y = 52,000px" quickly, keep a prefix-sum array (or a Fenwick tree) of row heights and binary search.
- Alternative used by bigger engines: chunk the grid into blocks (e.g. 256×32) and store a Map of blocks. Better cache locality and easy to load from server in chunks.
- **Insert row problem:** with keys like `"5:2"`, inserting a row at 3 means re-keying every cell below. Fix: keep a row ID indirection — `rowOrder: string[]` maps visual index → stable row ID, and cells are keyed by `rowId:colId`. Insert = splice one ID into the array. This also helps collaboration (an op on "row r_9f" still points to the right row after someone inserts above it).

### 5.2 Rendering the huge grid: canvas vs virtualized DOM

| | Virtualized DOM | Canvas |
|---|---|---|
| How | Render only visible cells as `<div>`s, recycle on scroll | Draw visible cells as pixels with `ctx.fillText` / `fillRect` |
| Cells on screen | ~1,000–3,000 DOM nodes, each with styles | 1 `<canvas>` element |
| Scroll performance | OK, but fast scroll can show blank areas; style/layout cost per cell | Very smooth; one redraw per frame |
| Text editing, IME, selection | Free from browser | Must overlay a real DOM input |
| Accessibility | Natural | Must build a separate a11y layer |
| Effort | Lower | Higher (hit testing, high-DPI, text measuring) |

**Why Google Sheets uses canvas:** a sheet screen can have thousands of visible cells, each with its own font, color, border, and number format. Creating and styling that many DOM nodes on every fast scroll is too slow, and layout/style recalculation becomes the bottleneck. Canvas skips the DOM, layout, and style engine — it just paints pixels for the visible area. It also makes gridlines and frozen panes cheap.

**What I'd say in the interview:** "For an MVP or a smaller grid, virtualized DOM is fine and faster to build. For Google Sheets scale, I'd use canvas for the cell layer, and DOM only for things that need the browser: the cell editor, context menus, and an accessibility layer."

Canvas rendering details:

```ts
function draw(ctx: CanvasRenderingContext2D, vp: Viewport, sheet: Sheet) {
  const dpr = window.devicePixelRatio;          // crisp text on retina
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vp.width, vp.height);
  for (let r = vp.firstRow; r <= vp.lastRow; r++) {
    for (let c = vp.firstCol; c <= vp.lastCol; c++) {
      const cell = sheet.cells.get(`${r}:${c}`);
      const { x, y, w, h } = cellRect(r, c, vp);
      if (cell?.formatId) paintBackground(ctx, x, y, w, h, cell);
      if (cell) paintText(ctx, formatValue(cell), x, y, w, h); // clip to cell
    }
  }
  paintGridLines(ctx, vp);
  paintFrozenPanes(ctx, vp, sheet);              // drawn last, on top
}
```

- Redraw in `requestAnimationFrame`, at most once per frame, even if 10 updates arrive.
- Canvas size = CSS size × `devicePixelRatio`.
- Hit testing: on click, convert `(x, y)` + scroll offset to `(row, col)` with binary search on the prefix sums.
- Cache text measurements (`measureText` is slow-ish) for overflow/clipping.
- Scrolling: a big empty div inside a scroll container gives a native scrollbar; the canvas stays fixed and redraws using `scrollTop/scrollLeft`.

### 5.3 Formula parsing and evaluation with a dependency graph

**Step 1 — Parse.** Tokenize `=SUM(A1:A3)*2` → `[FUNC SUM] [(] [REF A1] [:] [REF A3] [)] [*] [NUM 2]`. Then a recursive-descent parser builds an AST respecting precedence (`^` before `* /` before `+ -` before comparisons). Cache the AST per cell; reparse only when `raw` changes.

**Step 2 — Build the graph.** Walk the AST, collect all referenced cells. Update both maps:

```ts
function setDeps(cell: CellKey, newDeps: Set<CellKey>, g: DependencyGraph) {
  for (const old of g.dependsOn.get(cell) ?? []) g.dependents.get(old)?.delete(cell);
  g.dependsOn.set(cell, newDeps);
  for (const d of newDeps) {
    if (!g.dependents.has(d)) g.dependents.set(d, new Set());
    g.dependents.get(d)!.add(cell);
  }
}
```

Big ranges like `SUM(A:A)` would add a million edges. Store range dependencies separately (an interval list per column) and check "is the changed cell inside any watched range?" instead of expanding.

**Step 3 — Recalculate only what changed, in the right order.** When A1 changes, find all cells that directly or indirectly depend on it (BFS over `dependents`), then sort them **topologically** so every cell is computed after its inputs.

```ts
function recalc(changed: CellKey, g: DependencyGraph, evalCell: (k: CellKey) => void) {
  // 1. collect affected cells
  const affected = new Set<CellKey>();
  const queue = [changed];
  while (queue.length) {
    const k = queue.shift()!;
    for (const d of g.dependents.get(k) ?? []) if (!affected.has(d)) { affected.add(d); queue.push(d); }
  }
  // 2. Kahn's algorithm: count inputs that are also affected
  const inDeg = new Map<CellKey, number>();
  for (const k of affected) {
    let n = 0;
    for (const p of g.dependsOn.get(k) ?? []) if (affected.has(p)) n++;
    inDeg.set(k, n);
  }
  const ready = [...affected].filter((k) => inDeg.get(k) === 0);
  let done = 0;
  while (ready.length) {
    const k = ready.shift()!;
    evalCell(k); done++;
    for (const d of g.dependents.get(k) ?? []) {
      if (!affected.has(d)) continue;
      inDeg.set(d, inDeg.get(d)! - 1);
      if (inDeg.get(d) === 0) ready.push(d);
    }
  }
  // 3. anything left was never ready => part of a cycle
  if (done < affected.size) for (const k of affected) if (inDeg.get(k)! > 0) markError(k, '#CIRC!');
}
```

Why topological order matters: if C1 = A1 + B1 and B1 = A1 * 2, computing C1 before B1 gives a stale result. Topo sort guarantees B1 first.

**Evaluation:** walk the AST. `ref` → look up the cell's computed value. `range` → array of values. `call` → look up in a function registry `{ SUM: (args) => ..., IF: ... }` — new functions are just new entries. Errors propagate: any input error → output error (except functions like `IFERROR`).

**Web Worker:** for big sheets, run the engine in a worker so a 50,000-cell recalc does not freeze typing. The main thread sends `setCell` messages; the worker returns `{ key, value }[]` patches. Show the old value until the new one arrives.

**Volatile functions** like `NOW()` and `RAND()` recalc on every change — mark them and include them in each recalc.

### 5.4 Detecting circular references

`A1 = B1 + 1`, `B1 = A1 + 1` → infinite loop if not caught.

- **When the user enters a formula:** before saving the new edges, do a DFS from the edited cell over its new `dependsOn`. If you reach the edited cell again, it's a cycle. Mark the cell `#CIRC!` (Sheets shows "Circular dependency detected").
- **During recalc:** Kahn's algorithm naturally detects cycles — cells whose in-degree never reaches 0 are in a cycle (see code above).
- Keep the formula saved (user may fix another cell to break the cycle); just show the error value.
- Self-reference `A1 = A1 + 1` is the simplest cycle; test it.

### 5.5 Selection model, keyboard, and copy/paste

- **Active cell** — one cell with focus (thick border); typing goes here.
- **Ranges** — list of rectangles. Shift+click / Shift+arrows extends the last range from the anchor. Ctrl/Cmd+click adds a new range.
- **Keyboard:** arrows move; Tab/Shift+Tab move right/left; Enter moves down (or commits edit); Ctrl+arrow jumps to edge of data (scan the sparse map in that direction); Ctrl+Home goes to A1; F2 enters edit mode; Delete clears contents; typing a printable key starts editing and replaces content.
- **Two modes:** *navigation mode* (arrows move selection) vs *edit mode* (arrows move the text caret). While editing a formula, clicking another cell **inserts a reference** instead of moving selection — a classic detail.
- **Auto-scroll:** when selection moves off-screen, scroll so it's visible; while drag-selecting near the edge, auto-scroll with a timer.

**Copy/paste as TSV:** Excel and Google Sheets put tab-separated text on the clipboard, so we do the same for compatibility.

```ts
document.addEventListener('copy', (e) => {
  const rows = getRangeValues(selection.ranges[0]);   // 2D array of displayed values
  const tsv = rows.map((r) => r.map(escapeTsv).join('\t')).join('\n');
  e.clipboardData!.setData('text/plain', tsv);
  e.clipboardData!.setData('text/html', toHtmlTable(rows)); // keeps formatting for Docs/Excel
  e.preventDefault();
});

document.addEventListener('paste', (e) => {
  const text = e.clipboardData!.getData('text/plain');
  const grid = text.split(/\r?\n/).map((line) => line.split('\t'));
  execute(new PasteCommand(selection.active, grid));   // one command => one undo step
  e.preventDefault();
});
```

- Internal copy/paste of formulas should **shift relative references** (`=A1` copied one row down becomes `=A2`; `$A$1` stays). Keep a richer internal clipboard copy with raw formulas and formats.
- Values with tabs/newlines must be quoted when copying.
- Pasting 10,000 cells = one command, one recalc batch, one network op batch.

### 5.6 Undo/redo with commands

Every change is a command object:

```ts
interface Command {
  do(store: SheetStore): void;
  undo(store: SheetStore): void;
  toOps(): SheetOp[];          // what to send to the server
}

class SetCellsCommand implements Command {
  private before = new Map<CellKey, string | undefined>();
  constructor(private changes: Map<CellKey, string>) {}
  do(s: SheetStore) {
    for (const [k, raw] of this.changes) { this.before.set(k, s.getRaw(k)); s.setRaw(k, raw); }
  }
  undo(s: SheetStore) { for (const [k, raw] of this.before) s.setRaw(k, raw ?? ''); }
  toOps() { /* setCell ops */ return []; }
}
```

- Undo stack + redo stack. New command clears the redo stack. Cap at ~100–500 entries.
- Group related changes (paste, fill-down, typing a whole cell) into one command.
- **In collaboration, undo only your own changes.** Undo creates a *new* inverse op that is sent like any other edit — you don't roll back the server's history. If someone else changed the same cell after you, the inverse may be skipped or applied based on product rules.
- Why commands and not snapshots: snapshots of a 1M-cell sheet are too big; commands store only what changed.

### 5.7 Frozen rows/columns and number formatting

**Frozen panes:** split the viewport into 4 areas — top-left corner (frozen rows × frozen cols, never scrolls), top strip (scrolls horizontally only), left strip (scrolls vertically only), main area (scrolls both). On canvas, draw each area with its own clip rectangle and offset; draw the main area first, frozen parts on top. With DOM, use `position: sticky` like the data table.

**Number formatting:** keep the **value** separate from its **display**. The cell stores `0.256`; the format decides it shows as `25.6%`, `₹0.26`, or `0.26`. Formulas always use the raw value.

```ts
const fmtCache = new Map<string, Intl.NumberFormat>();
function formatValue(v: CellValue, f?: CellFormat, locale = 'en-IN') {
  if (typeof v !== 'number') return String(v ?? '');
  if (f?.numberFormat === 'percent') return get(locale, { style: 'percent', maximumFractionDigits: 2 }).format(v);
  if (f?.numberFormat === 'currency') return get(locale, { style: 'currency', currency: 'INR' }).format(v);
  if (f?.numberFormat === 'date') return serialToDate(v).toLocaleDateString(locale);
  return String(v);
}
```

- Cache `Intl.NumberFormat` objects — creating one per cell per frame is slow.
- Dates are stored as numbers (days since 1899-12-30, Excel-compatible), so date math works in formulas.
- Typing `25%` or `₹1,200` should be parsed to the number + auto-apply the format.

### 5.8 Collaboration and saving (brief)

- Ops are **cell-level** (`setCell B1`), so two people editing different cells never conflict. Same cell → last write wins (server order decides). This is simpler than text editing.
- Structural ops (insert/delete rows/cols) are the hard part — they shift other people's references. Use stable row/col IDs (5.1) or transform ops against each other (OT). See **12-collaborative-editor.md** for OT vs CRDT details.
- Server assigns a version to each op and broadcasts. Client applies local ops optimistically, then rebases on server order.
- Presence: colored border on the cell each user has selected, name tag on hover; throttle presence messages (~10/sec max).
- Saving: no "Save" button. Ops go out as they happen, batched every ~100–300ms. Unacked ops are kept in IndexedDB so a refresh or offline period doesn't lose work. Server takes periodic snapshots so loading doesn't replay the whole op log.
- Status indicator: "Saving…" / "All changes saved in Drive" / "Offline — changes will sync".

### Also mention

- **Accessibility:** canvas is invisible to screen readers. Keep a hidden focused element with `role="grid"` semantics for the active cell, and a live region that announces "B1, 200, formula equals A1 times 2". Provide keyboard shortcuts for everything. High-contrast mode via theme tokens drawn on canvas.
- **i18n:** locale affects decimal separators (`1.234,5` in Germany), function argument separators (`;` vs `,`), date formats, and RTL sheets.
- **Performance budgets:** frame < 16ms during scroll; recalc of typical chains < 100ms; load visible chunk first, rest in idle time; measure with Performance panel.
- **Export:** CSV per sheet (values, not formulas); XLSX via server.
- **Security:** never `eval()` formulas — use our own parser. Escape CSV cells starting with `=`, `+`, `-`, `@` to avoid CSV injection in Excel.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Cell storage | 2D array | Sparse Map (`"r:c"` or row IDs) | Sparse Map. Memory scales with filled cells; most of the grid is empty. |
| Rendering | Virtualized DOM | Canvas + DOM overlay | Canvas at Google Sheets scale (thousands of styled cells, smooth scroll). Virtualized DOM for MVP / smaller grids. |
| Recalculation | Recalc whole sheet | Dependency graph + topo sort of affected cells | Dependency graph. Edits touch few cells; full recalc doesn't scale. |
| Where formulas run | Main thread | Web Worker | Worker for big sheets so typing never freezes; main thread is fine for small ones. |
| Undo | Snapshots | Command pattern (do/undo) | Commands. Small memory, maps nicely to sync ops. |
| Row/col identity | Index | Stable IDs + order array | Stable IDs. Cheap insert/delete and safer collaboration. |
| Conflict handling | OT | CRDT | Cell-level last-write-wins with server ordering + OT for structural ops (see file 12). |
| Save | Manual save button | Autosave ops + offline queue | Autosave. Users expect it; no lost work. |

## 7. Likely follow-up questions

**Q: How does `SUM(A1:A100000)` stay fast when one cell changes?**
Don't expand the range into 100k edges. Store it as a range dependency. When A5 changes, find ranges containing A5 (interval check), and mark SUM dirty. For extra speed, SUM can update incrementally (`newSum = oldSum - old + new`).

**Q: What happens when a row is deleted that a formula refers to?**
References pointing into the deleted row become `#REF!`. References below it shift up (`=A10` becomes `=A9`). With stable row IDs, formulas internally point to IDs, so shifting is automatic and only deleted IDs become `#REF!`.

**Q: How do you load a sheet with 1M cells quickly?**
Load metadata + the visible chunk first and paint. Fetch other chunks in the background (or on scroll). The server can send cached computed values so we don't need to evaluate everything before first paint. Build the dependency graph in the worker in idle time.

**Q: Why not just use `eval` for formulas?**
Security (any JS could run, including stealing data from other users in a shared doc) and correctness (spreadsheet semantics like ranges, `^`, `&`, error values, and `=` as comparison are not JS). Write a small tokenizer + parser.

**Q: Two users type into the same cell at the same time?**
Server orders the ops; the later one wins and both clients converge. The loser sees their value replaced. Optionally show a small toast "Asha changed this cell". If one user is mid-edit, don't overwrite their draft — show the remote value after they commit or cancel.

**Q: How would you make it accessible with canvas rendering?**
Hidden DOM layer: one focused element representing the active cell with `role="gridcell"`, `aria-rowindex`, `aria-colindex`, and the cell's value/formula as its label. A live region announces selection changes. All actions available from keyboard and menus.

**Q: How would you implement fill-down (drag the small square)?**
Detect a pattern in the source cells (same value, numbers +1, dates +1 day), generate raw values for the target range, and shift relative references in formulas. Run it as one command (one undo step) and one batched recalc.

**Q: How do you avoid recalculation blocking the UI even in a worker?**
Worker keeps the main thread free. Inside the worker, process in chunks and post partial results so visible cells update first (prioritize cells in the viewport). Cancel/merge pending recalcs if new edits arrive.

## 8. If you only have 60 seconds

- **Sparse storage:** cells in a Map keyed by `"row:col"` (or stable row/col IDs), not a 2D array; row/col sizes stored only when non-default with prefix sums for lookup.
- **Canvas rendering** for the cell grid (like Google Sheets) because thousands of styled DOM cells can't scroll at 60fps; DOM overlay for the editor, menus, and an a11y layer.
- **Formula engine:** tokenize → AST → dependency graph; on change, BFS the dependents and **topologically sort** them to recalc only what's affected; run in a Web Worker for big sheets.
- **Circular refs** detected with DFS on edit and Kahn's algorithm during recalc → `#CIRC!`.
- **Selection model** with active cell + ranges, navigation vs edit mode, copy/paste as **TSV** for Excel compatibility.
- **Command pattern** for undo/redo; the same commands produce the ops we sync.
- **Collaboration:** cell-level ops, server ordering, presence cursors, autosave with an IndexedDB offline queue (details in file 12).

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarify + requirements | Size of sheet, formulas, collaboration, formatting, offline |
| 5–12 | Architecture | Grid view, store, command manager, formula engine (worker), sync client; edit flow |
| 12–18 | Data model | Sparse cells Map, raw vs value, formats, selection, dependency graph |
| 18–22 | API | Grid/FormulaBar/CellEditor props, chunk loading endpoint, WebSocket ops |
| 22–40 | Deep dives | Canvas vs DOM, dependency graph + topo sort + cycles, selection + TSV copy/paste, undo/redo commands |
| 40–45 | Trade-offs + wrap-up | Trade-off table, frozen panes, number formats, collaboration in one minute |

## Common mistakes

- Jumping to components before defining data/entities — here the sparse cell map, raw vs computed value, and dependency graph are the whole design.
- Using a 2D array sized to the full grid, or rendering every cell as a DOM node.
- Recalculating the whole sheet on every edit, or recalculating dependents in random order (stale values) instead of topological order.
- Forgetting circular references, or using `eval()` for formulas.
- Storing only the formatted display string ("25.6%") instead of the number + a format.
- Spending 20 minutes on OT vs CRDT and never reaching the formula engine — collaboration is one piece, not the main problem.

## My mistakes

- [ ]
