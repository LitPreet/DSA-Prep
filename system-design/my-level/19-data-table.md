# Data Table (reusable component for a design system: sorting, filtering, pagination, selection)

> **Difficulty:** Medium · **Asked at:** Product companies with dashboards and admin panels (SaaS, fintech, e-commerce back-office), design-system / platform teams · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Is this a one-off table for one page, or a reusable component in a design system used by many teams?
  → Assume: reusable design-system component. So the API matters as much as the UI.
- How many rows? Hundreds, thousands, or millions?
  → Assume: anything from 50 rows to millions. The component must support both client-side and server-side data.
- Which features are must-have? Sorting, filtering, pagination, row selection, column resize?
  → Assume: sort, filter, paginate, select are must-have. Resize / reorder / hide columns are nice-to-have.
- Pagination style: page numbers, "Load more", or infinite scroll?
  → Assume: page numbers by default (admin users want "page 7 of 40"), infinite scroll as an option.
- Is inline editing of cells needed?
  → Assume: no. Read-only cells, but cells can render custom content (buttons, badges, links).
- Which devices?
  → Assume: desktop first. On mobile it should scroll horizontally, not break.
- Should table state (sort, filters, page) survive refresh and be shareable as a link?
  → Assume: yes, optional URL sync.
- Accessibility level?
  → Assume: WCAG 2.1 AA. Fully keyboard usable, screen-reader friendly.

## 1. Requirements

### Functional

- Render rows and columns from a column definition list and a data array.
- Sort by clicking a column header (asc → desc → none). Optional multi-column sort with Shift+click.
- Filter: a global search box plus per-column filters (text, select, number range, date range).
- Pagination: page size selector (10 / 25 / 50 / 100), next/prev, jump to page, total count.
- Row selection: checkbox per row, "select all on this page", and "select all N matching results" across pages.
- Custom cell rendering (avatar + name, status badge, action menu).
- Loading, empty, and error states.
- Optional: column resize, reorder, show/hide, sticky header and first column, row expand.

### Non-functional (performance, accessibility, devices, network)

- **Performance:** 60fps scroll with 10,000 rows on the client (needs virtualization). Sorting 10k rows under ~50ms. Typing in a filter should not freeze the UI (debounce).
- **Re-renders:** selecting one row must not re-render all rows.
- **Accessibility:** real table semantics, `aria-sort` on headers, keyboard reachable controls, announced loading and result counts.
- **Devices:** desktop first; horizontal scroll on small screens; touch targets at least 44px on mobile.
- **Network:** server mode must handle slow networks — keep old rows visible while new ones load, cancel stale requests, show errors with retry.
- **Bundle size:** core should be small (< ~15KB gzipped). Virtualization and advanced features should be tree-shakable.
- **Theming:** uses design-system tokens (spacing, colors, density: compact / comfortable).

### Out of scope

- Inline cell editing and spreadsheet-style formulas (see ../senior-later/20-google-sheets.md).
- Pivot tables, grouping and aggregation.
- Export to Excel (CSV export can be mentioned briefly).
- Real-time updates over WebSocket.

## 2. Architecture

```text
+---------------------------------------------------------------+
|                    <DataTable /> (public API)                 |
|                                                               |
|  +-------------+   +-------------------+   +---------------+  |
|  |  Toolbar    |   |  Table State      |   | URL Sync      |  |
|  | search,     |<->|  Manager (hook)   |<->| (optional)    |  |
|  | filters,    |   | sort/filter/page/ |   | ?sort=&page=  |  |
|  | col toggle  |   | selection/columns |   +---------------+  |
|  +-------------+   +---------+---------+                      |
|                              |                                |
|                    +---------v---------+                      |
|                    |  Data Source      |                      |
|                    |  client: in-memory| ---> Server API      |
|                    |  server: fetcher  |      (server mode)   |
|                    +---------+---------+                      |
|                              | visible rows                   |
|  +---------------------------v-----------------------------+  |
|  | Table View                                              |  |
|  |  <thead> HeaderCells (sort button, resize handle)       |  |
|  |  <tbody> Virtualizer -> Row (memo) -> Cell (render fn)  |  |
|  +---------------------------------------------------------+  |
|  +---------------------------------------------------------+  |
|  | Footer: Pagination, selection summary, row count        |  |
|  +---------------------------------------------------------+  |
+---------------------------------------------------------------+
```

| Component | Responsibility |
|---|---|
| `DataTable` | Public entry point. Takes columns, data or fetcher, and state props. Wires everything together. |
| Table State Manager (`useTableState`) | Holds sort, filters, pagination, selection, column visibility/order/width. Supports controlled and uncontrolled modes. |
| Data Source | Client mode: runs filter → sort → paginate in memory. Server mode: turns state into a request and fetches. |
| URL Sync | Optional. Reads initial state from the URL and writes changes back with `replaceState`. |
| Toolbar | Global search, filter chips, column visibility menu, bulk action bar when rows are selected. |
| HeaderCell | Column title, sort button with `aria-sort`, resize handle, filter trigger. |
| Virtualizer | Renders only the rows in (and near) the viewport. |
| Row / Cell | Memoized. Cell uses the column's `cell` render function. |
| Pagination | Page buttons, page size select, "showing 26–50 of 1,240". |

**Main flow: user clicks a column header to sort (server mode)**

1. User clicks "Created at" header. HeaderCell calls `toggleSort("createdAt")`.
2. State manager updates sort to `createdAt desc` and resets page to 1 (old page numbers are meaningless after a sort).
3. If controlled, it calls `onSortChange` and the parent passes new `sort`. If URL sync is on, URL becomes `?sort=createdAt:desc&page=1`.
4. Data source builds `GET /api/orders?sort=createdAt:desc&page=1&pageSize=25`, aborts any in-flight request.
5. While loading, old rows stay visible with a light overlay and `aria-busy="true"` (no layout jump).
6. Response arrives → rows replaced, `total` updated, header shows `aria-sort="descending"`, a live region says "Sorted by Created at, descending".

## 3. Data model

```ts
type SortDirection = 'asc' | 'desc';

interface SortRule {
  columnId: string;
  direction: SortDirection;
}

type FilterValue =
  | { type: 'text'; op: 'contains' | 'equals'; value: string }
  | { type: 'select'; values: string[] }
  | { type: 'number'; min?: number; max?: number }
  | { type: 'date'; from?: string; to?: string };   // ISO dates

interface ColumnDef<TRow> {
  id: string;                          // stable key, used in URL and state
  header: string | (() => React.ReactNode);
  accessor: (row: TRow) => unknown;    // how to read the value
  cell?: (ctx: { row: TRow; value: unknown }) => React.ReactNode;
  sortable?: boolean;
  sortFn?: (a: TRow, b: TRow) => number;      // custom compare
  filter?: 'text' | 'select' | 'number' | 'date';
  width?: number; minWidth?: number;
  pinned?: 'left' | 'right';
  hideable?: boolean;
}

interface PaginationState {
  pageIndex: number;   // 0-based
  pageSize: number;
}

// Selection that works across pages and with "select all matching"
type SelectionState =
  | { mode: 'some'; ids: Set<string> }                 // only these
  | { mode: 'all'; excludedIds: Set<string> };         // all matching filter, except these

interface ColumnState {
  order: string[];
  hidden: Set<string>;
  widths: Record<string, number>;
}

interface TableState {
  sort: SortRule[];
  filters: Record<string, FilterValue>;
  globalSearch: string;
  pagination: PaginationState;
  selection: SelectionState;
  columns: ColumnState;
}

interface PageResult<TRow> {
  rows: TRow[];
  total: number;          // for "page X of Y"
  nextCursor?: string;    // for cursor mode
}
```

| Entity | Lives in | Why |
|---|---|---|
| Rows (server mode) | Server, cached in client store (React Query) | Source of truth is the DB. Cache makes back/forward instant. |
| Rows (client mode) | Component props | Parent already has the data. Table only derives views. |
| Column definitions | Component props (stable, memoized by caller) | They are code, not data. |
| Sort, filters, page | URL (optional) + component state | URL makes it shareable and survives refresh. |
| Selection | Component state | Temporary. Putting 500 IDs in the URL is bad. |
| Column order / width / hidden | localStorage (per table id) | User preference. Should survive refresh, but not be shared in links. |
| Hover, resize-in-progress | Component state / refs | Very short-lived UI state. |

## 4. Interface (API)

### Component API

**Two styles of API.** I would build a **headless core** (`useDataTable` hook — logic only, no markup) and a **batteries-included** `<DataTable>` on top of it that uses our design-system styles. Most teams use `<DataTable>`. Teams with unusual layouts use the hook. This is the TanStack Table model.

```tsx
<DataTable<Order>
  tableId="orders"                     // key for saved column prefs
  columns={columns}
  // --- data: either client or server mode ---
  data={orders}                        // client mode
  // or
  fetchData={fetchOrders}              // server mode: (state) => Promise<PageResult>
  getRowId={(row) => row.id}           // never use array index as id

  // --- uncontrolled (simple) ---
  defaultSort={[{ columnId: 'createdAt', direction: 'desc' }]}
  defaultPageSize={25}

  // --- or controlled (parent owns state) ---
  sort={sort}
  onSortChange={setSort}
  filters={filters}
  onFiltersChange={setFilters}
  pagination={pagination}
  onPaginationChange={setPagination}
  selection={selection}
  onSelectionChange={setSelection}

  // --- features ---
  selectable="multi"                   // 'none' | 'single' | 'multi'
  syncWithUrl
  virtualize="auto"                    // turns on above ~200 rendered rows
  stickyHeader
  density="compact"

  // --- states & slots ---
  loading={isLoading}
  error={error}
  emptyState={<EmptyOrders />}
  renderBulkActions={(sel) => <DeleteButton selection={sel} />}
  renderRowExpansion={(row) => <OrderDetails order={row} />}
/>
```

**Controlled vs uncontrolled.** Each piece of state (sort, filters, pagination, selection) follows the same React pattern as `<input>`:
- If `sort` prop is given → controlled. The table only calls `onSortChange`; parent decides.
- If not → table keeps its own state, starting from `defaultSort`.

```ts
function useControllableState<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const set = useCallback((next: T) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }, [isControlled, onChange]);
  return [current, set] as const;
}
```

**Custom cells with render functions:**

```tsx
const columns: ColumnDef<Order>[] = [
  { id: 'customer', header: 'Customer', accessor: (o) => o.customer.name,
    cell: ({ row }) => <Avatar src={row.customer.avatar} name={row.customer.name} />,
    sortable: true, filter: 'text', pinned: 'left' },
  { id: 'status', header: 'Status', accessor: (o) => o.status,
    cell: ({ value }) => <Badge tone={toneFor(value)}>{value}</Badge>,
    filter: 'select' },
  { id: 'amount', header: 'Amount', accessor: (o) => o.amountPaise,
    cell: ({ value }) => formatINR(value as number), sortable: true, filter: 'number' },
];
```

Callers must memoize `columns` (define outside the component or use `useMemo`). Otherwise every parent render creates new functions and breaks row memoization. I would warn in dev mode if `columns` identity changes on every render.

### Server API

```
GET /api/orders?page=2&pageSize=25
              &sort=createdAt:desc,amount:asc
              &q=rahul
              &filter[status]=paid,refunded
              &filter[amount][min]=1000
```

Response:

```json
{
  "rows": [
    { "id": "ord_812", "customer": { "name": "Rahul S", "avatar": "..." },
      "status": "paid", "amountPaise": 249900, "createdAt": "2026-11-20T10:12:00Z" }
  ],
  "total": 1240,
  "page": 2,
  "pageSize": 25
}
```

Bulk action with "select all matching":

```
POST /api/orders/bulk-archive
{ "selection": { "mode": "all", "excludedIds": ["ord_3"] },
  "filters": { "status": ["paid"] }, "q": "rahul" }
```

The server applies the same filters, so we never send 50,000 IDs.

**Offset vs cursor pagination:**

| | Offset (`page=5&pageSize=25`) | Cursor (`after=ord_812&limit=25`) |
|---|---|---|
| Jump to page 37 | Yes | No |
| Total count / "page X of Y" | Easy | Expensive or not given |
| Stable when rows are inserted | No — rows shift, you see duplicates or miss rows | Yes |
| DB cost on deep pages | `OFFSET 100000` is slow | Fast (uses index) |
| Best for | Admin tables, page numbers, small-to-medium data | Infinite scroll, feeds, huge or fast-changing data |

My default for an admin data table: **offset**, because users want page numbers and counts. Use **cursor** when the table uses infinite scroll or data changes very fast (logs, events).

## 5. Optimizations and deep dives

### 5.1 Client-side vs server-side sort/filter/paginate

Rule of thumb by row count:

| Total rows | Approach |
|---|---|
| < ~1,000 | Load all, do everything on the client. Instant UX, no loading spinners. |
| 1,000 – ~10,000 | Client is still OK if the payload is small (< ~1–2MB). Use virtualization. Maybe move filtering to a Web Worker. |
| > ~10,000 or unknown | Server-side. Client only shows one page. |

Other reasons to go server-side even with small data: permissions (user must not download all rows), data changes often, or the sort needs DB logic (e.g., locale-aware collation).

Client pipeline, always in this order — **filter → sort → paginate** — each memoized so changing the page does not re-sort:

```ts
const filtered = useMemo(() => applyFilters(data, filters, globalSearch), [data, filters, globalSearch]);
const sorted   = useMemo(() => applySort(filtered, sort, columns), [filtered, sort, columns]);
const pageRows = useMemo(() => sorted.slice(page * size, (page + 1) * size), [sorted, page, size]);
```

Sorting details people miss: use a **stable sort** (`Array.prototype.sort` is stable in modern JS), sort a copy not the prop, compare strings with `Intl.Collator` (handles case and accents), and put `null` values last.

Server mode details: **debounce** the search box (~300ms), **abort** stale requests with `AbortController` (or let React Query cancel by key), and use `keepPreviousData` so old rows stay while the new page loads.

### 5.2 Row and column virtualization

With 10,000 rows × 10 columns = 100,000 DOM cells. The browser chokes. Virtualization renders only visible rows (~30) plus a small overscan (~5 above and below).

```text
scroll container (height 600px, overflow: auto)
 └─ spacer div (height = rowCount * rowHeight)   <- gives correct scrollbar
     └─ rows absolutely positioned / translateY(startIndex * rowHeight)
```

- Fixed row height is simplest and fastest. Variable heights need measuring (`ResizeObserver`) and an estimated size.
- **Column virtualization** only matters with many columns (50+). Same idea horizontally.
- Use a library (`@tanstack/react-virtual`, `react-window`) — don't hand-roll in the interview, but explain how it works.
- Downsides: Ctrl+F browser search won't find off-screen rows; screen readers see only rendered rows, so set `aria-rowcount` on the table and `aria-rowindex` on each row.
- With pagination at 25–100 rows you often **don't need** virtualization. Turn it on automatically above ~200 rendered rows.

### 5.3 Sticky header, first column, and column resize / reorder / hide

```css
.table-scroll { overflow: auto; max-height: 70vh; }
thead th     { position: sticky; top: 0; z-index: 2; background: var(--surface); }
td.pinned-left, th.pinned-left { position: sticky; left: 0; z-index: 1; background: var(--surface); }
thead th.pinned-left { z-index: 3; }   /* corner cell above both */
```

- `position: sticky` works on `th`/`td` and costs nothing in JS. Background must be solid or rows show through.
- For more than one pinned column, compute `left` offsets from the widths of earlier pinned columns.
- **Resize:** a drag handle on the header's right edge. Use pointer events; during the drag, update a CSS variable (`--col-amount-width`) instead of React state so 60fps drag doesn't re-render rows. Commit to state on `pointerup`. Also allow keyboard resize (arrow keys on the focused handle).
- **Reorder:** drag-and-drop headers (dnd-kit), plus a keyboard-friendly "Move left / right" in the column menu.
- **Hide:** a "Columns" menu with checkboxes. Save order/width/hidden in localStorage under `tableId`.
- Use `table-layout: fixed` with explicit widths so columns don't jump when page content changes.

### 5.4 Row selection across pages

The naive way — store selected row objects or indexes — breaks when you change pages, sort, or filter.

- Store **IDs**, not indexes (`getRowId`). Indexes change on sort.
- "Select all on this page" = add the current page's IDs.
- "Select all 1,240 matching" = switch to `{ mode: 'all', excludedIds }`. Unchecking a row adds it to `excludedIds`. This is how Gmail works.
- If the filter changes while in `all` mode, reset selection (otherwise "all" silently means something different). Show a banner: "All 1,240 orders selected. Clear selection".
- Header checkbox has three states: unchecked, checked, indeterminate (`ref.indeterminate = true`, plus `aria-checked="mixed"`).
- Shift+click to select a range on the current page.

```ts
const isSelected = (id: string, sel: SelectionState) =>
  sel.mode === 'some' ? sel.ids.has(id) : !sel.excludedIds.has(id);
```

### 5.5 State in the URL

```
/orders?sort=createdAt:desc&page=3&pageSize=50&status=paid&q=rahul
```

- Benefits: refresh keeps state, back button works, link can be shared with a teammate.
- Use `history.replaceState` for typing in search (don't add 20 history entries), `pushState` for page changes (so Back goes to previous page).
- Only put **non-default** values in the URL to keep it short. Validate on read — the URL is user input.
- Two tables on one page? Prefix keys (`orders.page=3`).
- Keep selection and column widths **out** of the URL.

### 5.6 Re-render performance with memoization

Problem: clicking one checkbox updates selection state → whole table re-renders → 100 rows × 10 cells re-run.

- `const Row = React.memo(RowImpl)` and pass each row only what it needs: `row`, `isSelected` (boolean, not the whole Set), stable `onToggle`.
- Stable callbacks: `const onToggle = useCallback((id) => setSelection(...), [])` using functional updates.
- Column defs memoized by the caller (see section 4).
- For very large tables, a small external store (Zustand or `useSyncExternalStore`) lets each row subscribe to "am I selected?" so only 1 row re-renders.
- Debounce filter input; use `useDeferredValue(search)` so typing stays smooth while the filtered list renders in the background.
- Measure with React Profiler before and after — say this in the interview.

### 5.7 Loading, empty, and error states

| State | What to show |
|---|---|
| First load | Skeleton rows matching column layout (avoid layout shift). |
| Refetch (sort / page change) | Keep old rows, dim them slightly, small spinner in header. `aria-busy="true"`. |
| Empty, no filters | "No orders yet" + primary action ("Create order"). |
| Empty, with filters | "No results for 'rahul' with status Paid" + "Clear filters" button. Different message! |
| Error | Inline message inside the table area with "Retry". Keep toolbar usable. |
| Partial (page beyond total after delete) | Auto go back to the last valid page. |

### 5.8 Accessibility

**Table semantics vs ARIA grid.** This is a common interview question.
- Use native `<table>`, `<thead>`, `<th scope="col">`, `<tbody>`, `<tr>`, `<td>`. Screen readers already know how to read tables (row/column headers announced). Tab moves between interactive elements inside cells. **This is my default** for a read-only data table.
- `role="grid"` is for spreadsheet-like widgets where arrow keys move between cells and only one cell is in tab order (roving tabindex). It is much more work and easy to get wrong. Use it only if you add cell navigation / editing.
- If you use divs for virtualization layout, add `role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`.

Sortable headers:

```tsx
<th scope="col" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
  <button onClick={() => toggleSort(col.id)}>
    {col.header} <SortIcon dir={dir} aria-hidden />
  </button>
</th>
```

- The sort control must be a `<button>` (focusable, Enter/Space work), not a clickable `<th>`.
- Row checkboxes need labels: `aria-label="Select order ord_812"`.
- A polite live region announces: "Showing 26 to 50 of 1,240 results", "Sorted by Amount, ascending".
- Add `<caption>` (can be visually hidden) describing the table.
- Visible focus rings; don't rely on color alone for status badges.

### Also mention

- **i18n:** format numbers, dates, and currency with `Intl`; RTL support — sticky "left" becomes `inset-inline-start`.
- **Mobile:** horizontal scroll with pinned first column, or a "card list" layout below a breakpoint.
- **CSV export:** client mode exports filtered+sorted rows; server mode calls an export endpoint that returns a file (or emails a link for huge exports).
- **Performance budget:** interaction to next paint < 200ms for sort/select; first render of 50 rows < 100ms.
- **Testing:** unit test the pure filter/sort functions; RTL tests for keyboard and `aria-sort`; visual tests for sticky columns.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| API style | Headless hook (logic only) | Batteries-included component | Both: headless core + styled `<DataTable>` on top. Most teams want the easy one; power users need the hook. |
| Where to sort/filter | Client | Server | Client under ~1–10k rows, server above. Support both through `data` vs `fetchData` props. |
| Pagination | Offset | Cursor | Offset for admin tables (page numbers, total). Cursor for infinite scroll / changing data. |
| Long lists | Pagination | Infinite scroll + virtualization | Pagination for admin work (users remember "page 3"). Infinite scroll for browsing feeds. |
| Markup | Native `<table>` | `role="grid"` with divs | Native table for read-only. Grid only if cell-by-cell keyboard navigation or editing is needed. |
| State ownership | Uncontrolled | Controlled | Support both with `value` / `defaultValue` / `onChange`, like React inputs. |
| Select all | Store all IDs | `{ mode: 'all', excludedIds }` | Exclusion model. Scales to millions and the server applies filters. |
| Column width during drag | React state | CSS variable, commit on release | CSS variable. Smooth drag without re-rendering rows. |

## 7. Likely follow-up questions

**Q: How would you support 1 million rows?**
Server-side sort/filter/paginate, never load all. If they want infinite scroll, use cursor pagination with virtualization and keep only a window of pages in memory (drop pages far from the viewport). Total count can be approximate ("1M+").

**Q: How do you avoid race conditions when the user clicks sort quickly many times?**
Abort the previous request with `AbortController`, or tag each request with an ID and ignore responses that are not the latest. React Query does this by query key.

**Q: Why use a headless table library?**
It separates logic (sort, filter, selection state) from markup. The design system controls styling, and teams can build unusual layouts (cards, nested rows) using the same logic. Easier to test the logic as pure functions.

**Q: How do you make filtering 50k rows on the client not freeze the UI?**
Debounce input, use `useDeferredValue` or `startTransition` so typing stays responsive, pre-compute lowercase search strings once, and if still slow, move filter/sort to a Web Worker.

**Q: Selected row disappears after a filter. What happens?**
Selection is by ID, so it is still selected but hidden. Show "3 selected (1 hidden by filters)" or clear selection on filter change. Be explicit — bulk delete on hidden rows surprises users.

**Q: Variable row heights with virtualization?**
Use an estimated height, measure real rows with `ResizeObserver` after render, and cache heights by row ID. The library adjusts scroll offset. It is slower and can jump a bit, so prefer fixed heights for data tables.

**Q: How do you test this component?**
Pure functions (applySort, applyFilters) with unit tests. Interaction tests with React Testing Library: click header → check `aria-sort` and row order. Accessibility with axe. Performance test with 10k rows in a Storybook story and the Profiler.

**Q: How would you add inline editing?**
Switch to `role="grid"` with roving tabindex, Enter to edit, Escape to cancel. Optimistic update with rollback on server error. Per-cell validation. This moves toward the spreadsheet design.

## 8. If you only have 60 seconds

- It is a design-system component, so the **API** is key: column definitions with render functions, controlled + uncontrolled state, headless core plus styled wrapper.
- Two data modes: **client** (under ~1–10k rows: filter → sort → paginate, memoized) and **server** (query params, debounced, abortable, keep previous data).
- **Offset** pagination for admin tables with page numbers; **cursor** for infinite scroll or fast-changing data.
- **Selection by ID** with an `excludedIds` model for "select all N matching" across pages.
- **Virtualize** above ~200 rows; sticky header/column with CSS `position: sticky`; memoized rows so one click doesn't re-render everything.
- Sort/filter/page in the **URL** for share and refresh; column prefs in localStorage.
- Native `<table>` semantics, header **buttons with `aria-sort`**, live region for result counts, clear empty vs no-results vs error states.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarify + requirements | Reusable or one-off, row count, features, pagination style, a11y |
| 5–12 | Architecture | Box diagram, state manager, client vs server data source, sort flow |
| 12–18 | Data model | ColumnDef, TableState, SelectionState with exclusion model |
| 18–26 | API | Component props, controlled vs uncontrolled, render props, server query params, offset vs cursor |
| 26–40 | Deep dives | Client vs server rule, virtualization, selection across pages, re-render memoization, accessibility |
| 40–45 | Trade-offs + wrap-up | Trade-off table, URL state, loading/empty/error, what you'd do next |

## Common mistakes

- Jumping to components before defining data/entities — the column definition and table state shape drive everything else.
- Using the array index as row key or selection ID. It breaks on sort, filter, and page change.
- Forgetting to reset to page 1 when sort or filters change.
- Making headers clickable `<th>` elements without a `<button>` and without `aria-sort`.
- Saying "just virtualize" without mentioning the a11y cost (`aria-rowcount`/`aria-rowindex`) or that 25-row pages don't need it.
- Treating "no data" and "no results for this filter" as the same empty state.

## My mistakes

- [ ]
