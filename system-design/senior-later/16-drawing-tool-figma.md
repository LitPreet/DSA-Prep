# Design / Drawing Tool (e.g. Figma, Canva, Excalidraw): browser-based tool with shapes, layers, transforms

> **Difficulty:** Hard · **Asked at:** design/whiteboard product companies (Canva, Figma, Miro-style startups), large tech frontend rounds, and SaaS companies with diagram or annotation features · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

---

## 0. Clarifying questions to ask first

- Which shapes do we support? Rectangle, ellipse, line, arrow, text, freehand, images?
  → Assume: rectangle, ellipse, line/arrow, text, freehand pen, image, and groups/frames.
- Is it a whiteboard (Excalidraw) or a precise design tool (Figma)?
  → Assume: something in between — precise transforms, layers panel, snapping, but no vector boolean ops or auto-layout.
- How big can a file get?
  → Assume: normal files have 100–2,000 shapes; must stay at 60fps up to ~10,000 shapes.
- Real-time collaboration?
  → Assume: yes, but keep it brief — multiplayer cursors and live edits. Single-user rendering and interaction is the focus.
- Infinite canvas or fixed page size?
  → Assume: infinite canvas with pan and zoom (10% to 3200%).
- Devices?
  → Assume: desktop first (mouse, trackpad, keyboard). Touch/pen on tablet should work for basic drawing.
- Export?
  → Assume: export selection or whole canvas as PNG and SVG.
- Offline?
  → Assume: should keep working if the network drops; sync later.

## 1. Requirements

### Functional
- Create shapes with tools (toolbar + keyboard shortcuts: V select, R rectangle, O ellipse, L line, T text, P pen).
- Select (click, shift+click, drag a selection box), move, resize, rotate, delete, duplicate.
- Edit properties: fill, stroke, stroke width, opacity, corner radius, text font/size.
- Layers panel: list of shapes in z-order; reorder, rename, hide, lock; group / ungroup.
- Infinite canvas: pan (space+drag, trackpad), zoom (Ctrl+scroll, pinch, zoom-to-fit).
- Snapping to other shapes' edges/centers with smart guides.
- Undo / redo.
- Copy / paste (within and across files), paste images from clipboard.
- Autosave; open existing files.
- Export PNG / SVG.
- Multiplayer: see other users' cursors and changes (brief).

### Non-functional (performance, accessibility, devices, network)
- **Performance:** 60fps (under 16ms per frame) during pan, zoom and drag, with up to 10k shapes. Open a 2k-shape file in under 2 seconds.
- **Accessibility:** canvas is hard for screen readers — provide a layers panel and properties panel that are fully keyboard and screen-reader usable; keyboard to move/select shapes; respect reduced motion.
- **Devices:** mouse, trackpad, touch and stylus via Pointer Events; high-DPI (retina) screens must look sharp.
- **Network:** local-first — edits apply instantly, save to IndexedDB, sync to server in the background. Works offline.
- **Memory:** images downscaled/cached; don't keep huge bitmaps for zoomed-out views.

### Out of scope
- Vector boolean operations, pen tool bezier editing in depth.
- Prototyping, auto-layout, components/variants.
- Comments, version history UI, permissions UI.
- Plugin marketplace.

## 2. Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        React app shell                               │
│  ┌───────────┐  ┌────────────────┐  ┌────────────────────────────┐   │
│  │ Toolbar   │  │ Layers panel   │  │ Properties panel           │   │
│  │ (tools)   │  │ (virtualized)  │  │ (fill, stroke, x/y/w/h)    │   │
│  └─────┬─────┘  └───────┬────────┘  └──────────────┬─────────────┘   │
│        │ setTool        │ select/reorder           │ updateShape     │
│        ▼                ▼                          ▼                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                 Editor store (plain TS, not React)             │  │
│  │  Scene graph (shapes by id)  · Selection · Camera · Tool state │  │
│  │  Command / History manager   · Spatial index (quadtree)        │  │
│  └───────┬──────────────────────────────▲─────────────────┬───────┘  │
│          │ mark dirty                   │ commands        │ ops      │
│          ▼                              │                 ▼          │
│  ┌──────────────────────┐   ┌───────────┴─────────┐  ┌────────────┐  │
│  │ Renderer (Canvas 2D  │   │ Interaction layer   │  │ Sync /     │  │
│  │ or WebGL), rAF loop, │   │ pointer events,     │  │ persistence│  │
│  │ dirty-rect redraw    │   │ hit test, handles,  │  │ IndexedDB +│  │
│  └──────────┬───────────┘   │ snapping, shortcuts │  │ WebSocket  │  │
│             │               └─────────────────────┘  └─────┬──────┘  │
│   <canvas> (shapes)  +  overlay <canvas>/SVG (selection, handles,    │
│                          guides, cursors)                  │         │
└────────────────────────────────────────────────────────────┼─────────┘
                                                             ▼
                          ┌────────────────────────────────────────────┐
                          │ Server: files API, image upload/CDN,       │
                          │ realtime service (WebSocket, CRDT doc)     │
                          └────────────────────────────────────────────┘
```

| Component | Responsibility |
|---|---|
| React shell (toolbar, layers, properties) | Normal DOM UI. Subscribes to small slices of the store (selected ids, active tool). |
| Editor store | Source of truth: shapes map, selection, camera (pan/zoom), active tool. Plain TypeScript, outside React, so 60fps updates don't re-render React. |
| Command / History manager | Every change is a command with `do`/`undo`. Holds undo/redo stacks. |
| Spatial index | Quadtree / R-tree of shape bounding boxes. Fast "what is under the mouse?" and "what is on screen?". |
| Renderer | Draws visible shapes on `<canvas>` inside `requestAnimationFrame`, only when something is dirty. |
| Overlay layer | Draws selection box, resize/rotate handles, snap guides, other users' cursors. Separate so it can redraw without redrawing all shapes. |
| Interaction layer | Converts pointer events to commands using the current tool (state machine: idle → pressing → dragging). |
| Sync / persistence | Saves to IndexedDB, sends ops over WebSocket, applies remote ops. |
| Server | Stores files, serves images via CDN, relays realtime changes. |

**Data flow when the user drags a rectangle to move it:**
1. `pointerdown` on canvas. Convert screen point → world point using the camera. Hit test via spatial index → rectangle `r1`. Select it. Tool state machine goes to `pressing`.
2. `pointermove` beyond 3px → `dragging`. For each move, compute `dx, dy` in world units, apply snapping, and update `r1.x / r1.y` as a **preview** (no history entry yet). Mark old and new bounds dirty.
3. Renderer's rAF loop sees the dirty flag, redraws only the dirty region (or the whole visible canvas if simpler), and the overlay redraws handles.
4. `pointerup` → create one `MoveShapesCommand({ids:['r1'], from, to})` and push to history (one undo step for the whole drag). Update spatial index.
5. Sync layer sends the op to the server and writes to IndexedDB (debounced). Properties panel shows the new x/y.

## 3. Data model

```ts
type ShapeType = 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'path' | 'image' | 'group' | 'frame';

type BaseShape = {
  id: string;              // unique, e.g. nanoid — also used by CRDT
  type: ShapeType;
  parentId: string | null; // group or frame this shape belongs to; null = page root
  index: string;           // fractional index for z-order, e.g. "a0", "a0V" (see deep dive)
  x: number;               // position in world units (top-left before rotation)
  y: number;
  width: number;
  height: number;
  rotation: number;        // radians, around the shape's center
  opacity: number;         // 0..1
  locked: boolean;
  hidden: boolean;
  name: string;            // shown in layers panel
};

type Style = {
  fill: string | null;     // "#4f46e5"
  stroke: string | null;
  strokeWidth: number;
  cornerRadius?: number;
};

type RectShape = BaseShape & { type: 'rect'; style: Style };
type EllipseShape = BaseShape & { type: 'ellipse'; style: Style };
type LineShape = BaseShape & { type: 'line' | 'arrow'; points: [number, number][]; style: Style;
                               startBinding?: string; endBinding?: string }; // arrow attached to shape id
type TextShape = BaseShape & { type: 'text'; text: string; fontFamily: string; fontSize: number;
                               align: 'left' | 'center' | 'right'; style: Style };
type PathShape = BaseShape & { type: 'path'; points: [number, number, number][] }; // x, y, pressure
type ImageShape = BaseShape & { type: 'image'; assetId: string };
type GroupShape = BaseShape & { type: 'group' | 'frame'; clip?: boolean };

type Shape = RectShape | EllipseShape | LineShape | TextShape | PathShape | ImageShape | GroupShape;
```

```ts
type DesignFile = {
  id: string;
  name: string;
  pages: Record<string, { id: string; name: string }>;
  shapes: Record<string, Shape & { pageId: string }>;  // flat map by id, NOT a nested tree
  assets: Record<string, { id: string; url: string; width: number; height: number; mime: string }>;
  schemaVersion: number;
};

type Camera = { x: number; y: number; zoom: number };   // world point at screen top-left + scale

type EditorState = {
  currentPageId: string;
  selectedIds: Set<string>;
  hoveredId: string | null;
  tool: 'select' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'pen' | 'hand';
  camera: Camera;
  interaction: { kind: 'idle' } | { kind: 'dragging'; start: Point } | { kind: 'resizing'; handle: Handle }
             | { kind: 'rotating' } | { kind: 'brushSelect'; rect: Box };
};

type Presence = { userId: string; name: string; color: string; cursor: Point | null; selectedIds: string[] };
```

Why a **flat map with `parentId`** instead of a nested tree: updating one shape is O(1) by id, moving a shape between groups is just changing `parentId`, and it maps directly to a CRDT map for collaboration. We build the tree (children lists) as a derived, cached index.

| Entity | Lives in | Why |
|---|---|---|
| Shapes, pages, assets meta | Editor store (memory) + IndexedDB + server | Changes at 60fps; must survive offline and reload; server is the shared truth. |
| Image bytes | CDN (server), cached by browser / Cache API | Large; load lazily; never inside the JSON. |
| Selection, hover, tool, interaction state | Editor store (client only) | Per user, per tab. Not saved in the file. |
| Camera (pan/zoom) | Editor store; last value in localStorage | Per user; nice to restore on reload, not shared. |
| Presence (others' cursors) | Memory, from WebSocket | Temporary; no need to persist. |
| Undo/redo stacks | Editor store (memory) | Per user, per session. |
| File id, page id | URL (`/file/:fileId?page=p2`) | Shareable link, reload-safe. |
| Layers panel expanded/collapsed | Component state | Pure UI. |

## 4. Interface (API)

### Component API

```tsx
type CanvasEditorProps = {
  fileId: string;
  initialFile?: DesignFile;           // if host already loaded it
  readOnly?: boolean;                 // view-only links
  tools?: ToolDefinition[];           // add or remove tools
  shapeUtils?: ShapeUtil[];           // custom shape types (plugin)
  onChange?: (changes: ShapeChange[]) => void;
  onSelectionChange?: (ids: string[]) => void;
  uploadAsset?: (file: File) => Promise<{ assetId: string; url: string }>;
  collaboration?: { url: string; user: { id: string; name: string; color: string } };
};

<CanvasEditor fileId="f_123" collaboration={{ url: wsUrl, user }} uploadAsset={upload} />
```

Imperative editor API (via `ref` or a `useEditor()` hook) — this is also the "commands API" that toolbar, shortcuts and plugins use:

```ts
interface Editor {
  createShapes(shapes: Partial<Shape>[]): string[];
  updateShapes(patches: { id: string; changes: Partial<Shape> }[]): void;
  deleteShapes(ids: string[]): void;
  select(ids: string[]): void;
  group(ids: string[]): string;            // returns new group id
  ungroup(groupId: string): void;
  bringForward(ids: string[]): void;       // also sendBackward, bringToFront, sendToBack
  setCamera(camera: Partial<Camera>): void;
  zoomToFit(): void;
  screenToWorld(p: Point): Point;
  getShapesAt(p: Point): Shape[];
  undo(): void; redo(): void;
  batch(fn: () => void): void;             // many changes → one undo step
  exportImage(opts: { ids?: string[]; format: 'png' | 'svg'; scale?: number }): Promise<Blob>;
  subscribe(selector: (s: EditorState) => unknown, cb: () => void): () => void;
}

// Plugin: a custom shape type
interface ShapeUtil<S extends Shape = Shape> {
  type: string;
  getBounds(shape: S): Box;
  hitTest(shape: S, worldPoint: Point, tolerance: number): boolean;
  render(ctx: CanvasRenderingContext2D, shape: S): void;
  toSvg(shape: S): SVGElement;
}
```

### Server API

```http
GET  /api/files/:id
→ 200 { "id": "f_123", "name": "Landing page", "schemaVersion": 3, "revision": 452,
        "pages": {...}, "shapes": {...}, "assets": {...} }
     (for big files: a binary CRDT snapshot, gzip)

POST /api/files/:id/ops          (fallback when no WebSocket; batched)
     { "clientId": "c_9", "baseRevision": 452,
       "ops": [ { "op": "update", "id": "r1", "changes": { "x": 120, "y": 80 } } ] }
→ 200 { "revision": 453 }

POST /api/assets                 → 200 { "assetId": "a_77", "uploadUrl": "https://s3...signed" }
PUT  <uploadUrl>  (image bytes, direct to storage)

POST /api/files/:id/export       { "format": "pdf", "pageId": "p1" }   // heavy export, server-side
→ 202 { "jobId": "j_5" }   then GET /api/exports/j_5 → { "status": "done", "url": "..." }

WS   wss://realtime.example.com/files/:id
  client → { "type": "update", "update": "<binary CRDT update>" }
  client → { "type": "presence", "cursor": { "x": 300, "y": 120 }, "selectedIds": ["r1"] }
  server → { "type": "update", ... } / { "type": "presence", "userId": "u2", ... }
```

PNG/SVG export of a selection is done on the client (fast, no upload). Only big exports (PDF of many pages) go to the server.

## 5. Optimizations and deep dives

### 5.1 Canvas 2D vs SVG vs WebGL

| | SVG (DOM) | Canvas 2D | WebGL / WebGPU |
|---|---|---|---|
| How it works | Each shape is a DOM element | You draw pixels with JS each frame | GPU draws triangles with shaders |
| Good up to | ~1–2k shapes | ~10k–50k shapes | 100k+ shapes |
| Hit testing | Free (DOM events) | You build it | You build it |
| Text, a11y | Easy, real text | Must draw text yourself | Hardest |
| Effort | Low | Medium | High |
| Used by | Small diagram tools | Excalidraw, many whiteboards | Figma (WebGL/C++ via WASM) |

**What I'd pick:** Canvas 2D for shapes. It handles thousands of shapes, is simple, and we control redraws. Use DOM/SVG for the **overlay** pieces that need interaction or text input (text editing uses a positioned `<textarea>`/`contenteditable` over the canvas while editing). Move to WebGL only if profiling shows we need 50k+ shapes or heavy effects. Mention SVG is fine if the interviewer says "max a few hundred shapes" — it is the simplest.

High-DPI: set `canvas.width = cssWidth * devicePixelRatio` and `ctx.scale(dpr, dpr)`, otherwise everything looks blurry on retina.

### 5.2 Infinite canvas: camera / viewport transform

There are two coordinate systems:
- **World** — where shapes live (`x: 5000` is fine; it's infinite).
- **Screen** — CSS pixels in the browser window.

The camera maps one to the other. With `camera = { x, y, zoom }` where `(x, y)` is the world point at the screen's top-left:

```ts
const worldToScreen = (p: Point, c: Camera) => ({ x: (p.x - c.x) * c.zoom, y: (p.y - c.y) * c.zoom });
const screenToWorld = (p: Point, c: Camera) => ({ x: p.x / c.zoom + c.x, y: p.y / c.zoom + c.y });

// Zoom around the mouse pointer: the world point under the mouse must stay under the mouse.
function zoomAt(c: Camera, screenPt: Point, newZoom: number): Camera {
  const before = screenToWorld(screenPt, c);
  const zoom = clamp(newZoom, 0.1, 32);
  return { zoom, x: before.x - screenPt.x / zoom, y: before.y - screenPt.y / zoom };
}

// Rendering: set the transform once per frame, then draw shapes in world units.
ctx.setTransform(dpr * c.zoom, 0, 0, dpr * c.zoom, -c.x * c.zoom * dpr, -c.y * c.zoom * dpr);
```

- Pan = change `camera.x/y`. Zoom = change `camera.zoom` with `zoomAt`.
- Wheel events: `ctrlKey` true → pinch-zoom on trackpad; else → pan. Call `preventDefault()` (listener with `{ passive: false }`) to stop browser page zoom.
- **Culling:** compute the visible world rect from the camera; ask the spatial index only for shapes inside it. Shapes off-screen cost nothing.
- **Level of detail:** at very low zoom, draw text as grey bars and images as low-res thumbnails.

### 5.3 Render loop: requestAnimationFrame + dirty flags

Never draw directly inside a `pointermove` handler — mouse events can fire 120+ times a second. Instead mark state dirty and draw at most once per frame:

```ts
let dirty = false;
let dirtyRect: Box | null = null;

function invalidate(box?: Box) {
  dirtyRect = box && dirtyRect ? union(dirtyRect, box) : box ?? FULL;
  if (!dirty) { dirty = true; requestAnimationFrame(render); }
}

function render() {
  dirty = false;
  const region = dirtyRect; dirtyRect = null;
  ctx.save();
  if (region !== FULL) { ctx.beginPath(); ctx.rect(...toScreen(region)); ctx.clip(); }  // only repaint this area
  clear(region);
  for (const shape of spatialIndex.query(region ?? visibleWorldRect())  // culling
                                   .sort(byZIndex)) {
    shapeUtils[shape.type].render(ctx, shape);
  }
  ctx.restore();
}
```

- **Dirty rect:** when one shape moves, only repaint `union(oldBounds, newBounds)`. Big win for big files. During pan/zoom the whole screen changes, so redraw everything (still culled).
- **Two canvases:** a "scene" canvas for shapes and an "overlay" canvas for selection, handles, guides, cursors. Hover and cursor movement only redraw the cheap overlay.
- **Cache:** cache complex shapes (freehand paths → `Path2D`, text layout) and redraw from cache. During a drag, you can snapshot the unchanged shapes to an offscreen bitmap and only draw the moving shapes on top.
- **OffscreenCanvas + Worker:** move rendering off the main thread if the UI still janks.

### 5.4 Hit testing and the spatial index

"Which shape is under the mouse?" — with 10k shapes, a loop over all of them on every `pointermove` is too slow.

1. **Broad phase:** spatial index (quadtree or R-tree, e.g. `rbush`) of each shape's axis-aligned bounding box (AABB). Query a tiny box around the pointer → maybe 3 candidates instead of 10,000. Same index answers "visible shapes" and "shapes inside selection box".
2. **Narrow phase:** precise check per candidate, in z-order from top:
   - Convert the point into the shape's **local space** (undo its rotation), then:
   - rect: inside `0..w, 0..h`; ellipse: `(x/rx)² + (y/ry)² <= 1`; line/path: distance to segment `< strokeWidth/2 + tolerance` (tolerance in screen px ÷ zoom, so thin lines stay clickable when zoomed out); or use `ctx.isPointInPath(path2D, x, y)`.
   - Skip hidden/locked shapes; if shape has no fill, only the stroke counts.
3. First hit wins. Clicking inside a group selects the group; double-click enters the group.

**Quadtree in one line:** split space into 4 squares; any square with too many shapes splits again into 4. A query only visits squares that overlap the query box. Update a shape's entry on `pointerup` (or cheaply on each move — remove + insert is O(log n)).

### 5.5 Transforms: move, resize, rotate (matrix math simply)

Each shape has a transform: translate to `(x, y)`, rotate by `rotation` around its center. A 2D affine matrix stores this as 6 numbers `[a, b, c, d, e, f]`:

```
| a c e |      a,b,c,d = rotation and scale
| b d f |      e,f     = translation (move)
| 0 0 1 |
```

Why matrices: you can **multiply** them to combine transforms (group transform × child transform = child's world transform), and **invert** them to go from world back to local space (needed for hit testing and resize).

```ts
function shapeMatrix(s: Shape): DOMMatrix {
  return new DOMMatrix()
    .translate(s.x + s.width / 2, s.y + s.height / 2)  // move to center
    .rotate((s.rotation * 180) / Math.PI)              // rotate around center
    .translate(-s.width / 2, -s.height / 2);           // back to top-left
}
const worldMatrix = (s: Shape) => s.parentId ? worldMatrix(get(s.parentId)).multiply(shapeMatrix(s)) : shapeMatrix(s);
const toLocal = (s: Shape, p: Point) => worldMatrix(s).inverse().transformPoint(p);
```

- **Move:** add `dx, dy` (world units) to `x, y`.
- **Resize** (8 handles): convert the pointer into the shape's local space, so a rotated shape resizes along its own axes. The opposite handle stays fixed (anchor). Shift = keep aspect ratio, Alt = resize from center. Negative width = flip.
- **Rotate:** angle = `atan2(pointer − center)` minus angle at drag start; Shift snaps to 15°.
- **Multi-select:** transform the shared bounding box, then apply the same scale/rotation to each child relative to the box's anchor.
- Draw handles on the overlay at a **fixed screen size** (8px) regardless of zoom.

### 5.6 Undo / redo with the command pattern

```ts
interface Command { do(): void; undo(): void; label: string }

class UpdateShapesCommand implements Command {
  constructor(private before: Record<string, Partial<Shape>>, private after: Record<string, Partial<Shape>>) {}
  do()   { store.applyPatches(this.after); }
  undo() { store.applyPatches(this.before); }
  label = 'Update shapes';
}

const history = { undo: [] as Command[], redo: [] as Command[] };
function execute(cmd: Command) { cmd.do(); history.undo.push(cmd); history.redo = []; }
```

- Store **diffs** (before/after of changed fields only), not full snapshots — cheap even with 10k shapes.
- One drag = one command (preview during drag, commit on `pointerup`). `editor.batch()` groups multiple commands (e.g. "paste 50 shapes").
- Also restore the selection on undo.
- With collaboration: undo only **your own** changes (Yjs `UndoManager` tracks local origin), so you don't undo someone else's work.

### 5.7 Selection, snapping and guides (short)

- Click = select top hit; Shift+click = toggle; drag on empty space = **brush select** (spatial index query of the box; contained vs touching mode).
- Selection lives in `selectedIds: Set<string>`, not on the shapes (it's per user, never saved).
- **Snapping:** while dragging, collect candidate lines (left/center/right x, top/middle/bottom y) of **nearby visible** shapes via the spatial index. Find the closest within threshold (`6px / zoom`). Adjust position, then draw pink guide lines on the overlay. Sort candidates once at drag start, binary search on each move.

### 5.8 Persistence, autosave and collaboration (brief)

- **Local-first:** apply edits to memory instantly; write to IndexedDB (debounced ~500ms); push ops to the server. Show "Saved / Offline — changes kept locally".
- **Collaboration:** each shape is a CRDT map keyed by id (e.g. Yjs `Y.Map<shapeId, Y.Map>`). Two people editing different shapes never conflict; same property → last-writer-wins. Fractional `index` strings for z-order mean two users can insert "between" layers without renumbering everything.
- **Presence:** cursors and selections sent via WebSocket at ~20–30Hz (throttled), interpolated smoothly on the receiving side. Not saved, not in undo.
- Detailed CRDT/OT discussion → see 12-collaborative-editor.md.

### 5.9 Export PNG / SVG

- **PNG:** create an offscreen canvas sized to the selection bounds × scale (1x/2x/3x), set camera to those bounds, render with the same renderer, `canvas.toBlob('image/png')`. Images must be CORS-enabled (`crossOrigin="anonymous"`) or the canvas becomes "tainted" and export fails.
- **SVG:** each `ShapeUtil` has `toSvg()`; embed fonts or convert text to paths; embed images as data URLs.
- Very large exports (PDF, many pages): server-side job using the same rendering code (headless).

### Also mention
- **Accessibility:** canvas has `role="application"` and `aria-label`; the layers panel is a real tree (`role="tree"`) so screen readers and keyboard users can select shapes; arrow keys nudge (Shift = 10px); announce selection changes in an `aria-live` region; visible focus ring on selected shapes.
- **Keyboard shortcuts:** tools (V, R, O, T), Cmd+G group, Cmd+D duplicate, Delete, Cmd+Z, `[` `]` z-order, Space to pan. Show a shortcuts dialog (`?`). Ignore shortcuts while typing in a text field.
- **Security:** sanitize imported SVGs (they can contain `<script>`); validate uploaded file types; text shapes are drawn on canvas so no HTML injection there.
- **Memory:** decode images with `createImageBitmap`, keep mipmaps for zoomed-out views, release bitmaps for off-screen images.
- **React performance:** the canvas is not React-rendered. React panels subscribe with `useSyncExternalStore` to small selectors (e.g. selected ids), so a drag doesn't re-render the app. Layers panel is virtualized for thousands of rows.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Rendering | SVG / DOM per shape | Canvas 2D (WebGL later) | **Canvas 2D.** Scales to 10k shapes and we control redraws. SVG only if shape count stays small. |
| State location | React state / Redux | Plain TS store outside React | **Outside React.** 60fps updates must not trigger React renders; panels subscribe to slices. |
| Shape storage | Nested tree | Flat map by id + `parentId` | **Flat map.** O(1) updates, easy reparenting, maps to CRDT. Tree is a derived index. |
| Z-order | Integer `zIndex` | Fractional index string | **Fractional index.** Reorder one shape without renumbering others; no conflicts in multiplayer. |
| Hit testing | Loop all shapes | Spatial index + precise test | **Spatial index.** O(log n) broad phase, precise check only on a few. |
| Redraw strategy | Redraw everything each frame | Dirty flags + dirty rect + rAF | **Dirty + rAF.** Idle canvas costs zero; small edits repaint small area. |
| Undo | Full snapshots | Commands storing diffs | **Commands with diffs.** Low memory; works with "undo my own changes" in collab. |
| Sync | Save whole file | Ops / CRDT updates | **Ops/CRDT.** Small payloads, offline merge, multiplayer. Whole-file snapshot periodically for fast load. |

## 7. Likely follow-up questions

**Q1. The canvas lags when dragging with 10,000 shapes. How do you debug and fix it?**
Profile with Chrome Performance tab. Usual fixes: cull to visible shapes via spatial index, dirty-rect redraw, cache static shapes into an offscreen bitmap and only draw moving shapes on top, cache `Path2D`/text layout, make sure React isn't re-rendering on each move. Last step: WebGL or OffscreenCanvas in a Worker.

**Q2. How does zoom-to-cursor work?**
Find the world point under the mouse before zoom. After changing zoom, set camera x/y so that same world point maps to the same screen point: `camera.x = worldPt.x - screenPt.x / newZoom`.

**Q3. How do you edit text on a canvas?**
On double-click, hide the canvas text and place a DOM `<textarea>` (or contenteditable) exactly over it with the same font, scaled by zoom and rotated with CSS transform. On blur, save text to the shape and redraw on canvas. This gives native IME, spellcheck and selection for free.

**Q4. How do you click a thin 1px line when zoomed out?**
Hit tolerance in screen pixels (e.g. 4px) converted to world units (`4 / zoom`). Check distance from point to each line segment is less than `strokeWidth/2 + tolerance`.

**Q5. How does a group work when you resize it?**
The group's bounds are the union of children's bounds. Resizing the group computes a scale and anchor; apply that to each child's position and size (and font size for text, optionally). Store it as one command so undo restores all children.

**Q6. Two users move the same shape at the same time. What happens?**
With a CRDT per shape, `x`/`y` are last-writer-wins registers — both clients converge to the same final value. Usually fine for design tools. We also show the other user's selection outline so people avoid editing the same shape.

**Q7. How do arrows stay connected when a shape moves?**
Arrow stores `startBinding`/`endBinding` = shape ids. Keep a reverse index (shapeId → arrows bound to it). When a shape moves, recompute those arrows' endpoints to the nearest point on the shape's edge, in the same command.

**Q8. How do you load a huge file fast?**
Load a compressed snapshot (not the full op log), render the visible viewport first, build the spatial index in chunks (or in a Worker), lazy load images at the needed resolution. Show the layers panel after the canvas is interactive.

**Q9. Canvas vs SVG — when would you choose SVG?**
Small diagrams (under ~1k shapes), when you need crisp text, CSS styling, DOM events and accessibility for free, or easy SVG export. Excalidraw-sized whiteboards and Figma-sized files go Canvas or WebGL.

## 8. If you only have 60 seconds

- Data model is a **flat map of shapes by id** with `x, y, width, height, rotation, parentId, index`; groups/layers via `parentId`, z-order via fractional index.
- State lives in a **plain TS store outside React**; React only renders toolbar, layers and properties panels.
- Render on **Canvas 2D** in a **requestAnimationFrame loop** with dirty flags, dirty rects, culling, and a separate overlay canvas for handles/guides/cursors.
- **Camera transform** (`x, y, zoom`) maps world ↔ screen; zoom around the cursor.
- **Hit testing**: quadtree/R-tree broad phase, then precise test in the shape's local space using the inverse matrix.
- **Command pattern** for undo/redo storing diffs; one drag = one command.
- Local-first: IndexedDB + ops to server; multiplayer with CRDT per shape + throttled presence cursors.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Shape types, file size, collab or not, infinite canvas, devices, export. |
| 4–8 | Requirements | Functional list; 60fps with 10k shapes; offline; a11y via panels. |
| 8–15 | Architecture | Diagram: React panels, editor store, renderer, interaction layer, sync. Walk through "drag a shape". |
| 15–21 | Data model | Shape type, flat map + parentId, camera, selection; where each lives. |
| 21–25 | API | `<CanvasEditor>` props, editor commands, ShapeUtil plugin, files/ops/assets/WebSocket endpoints. |
| 25–40 | Deep dives | Canvas vs SVG vs WebGL, camera transform, rAF + dirty rect, hit testing + spatial index, transforms, undo. |
| 40–45 | Trade-offs + wrap up | Collab brief, export, a11y, perf debugging. Invite follow-ups. |

## Common mistakes

- **Jumping to components before defining data/entities** — drawing Toolbar/Canvas boxes without the shape model, coordinate systems and selection state.
- Putting every shape in React state (or rendering each shape as a React component) and re-rendering on every `pointermove`.
- Drawing inside event handlers instead of batching to one draw per frame with `requestAnimationFrame`.
- Forgetting world vs screen coordinates — zoom then breaks hit testing, handles and snapping.
- Looping over all shapes for hit testing with no spatial index, and no plan for "what if there are 10k shapes?".
- Making undo store full snapshots per mouse move instead of one command per drag.

## My mistakes

- [ ]
