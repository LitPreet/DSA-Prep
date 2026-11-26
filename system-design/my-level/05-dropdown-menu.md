# Dropdown Menu (reusable component for a design system)

> **Difficulty:** Medium · **Asked at:** companies with their own design system (Atlassian, Flipkart, Swiggy, Microsoft, Adobe, Uber), and UI-platform teams · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Is this an **action menu** (Edit, Delete, Share) or a **select** (pick a value for a form)? → Assume: action menu (ARIA `menu` pattern). I'll mention how a select/listbox differs.
- Do we need nested sub-menus? → Assume: one level of sub-menu is supported, but design it later.
- Do we need search/filter inside the menu? → Assume: no (that is a combobox — different component).
- How many items? → Assume: usually < 20; must not break with 500 (virtualize as an option).
- Who uses it — product teams in many apps? → Assume: yes, used across 10+ apps, so API stability and flexibility matter.
- What framework? → Assume: React 18+, must work with SSR (Next.js).
- Support for checkbox/radio items, icons, shortcuts, dividers, disabled items? → Assume: yes.
- Mobile? → Assume: works with touch; no bottom-sheet variant in v1.

## 1. Requirements

### Functional
- A trigger button opens and closes a floating menu.
- Menu items: normal action, disabled, with icon, with shortcut hint, divider, group label, checkbox item, radio item, link item.
- Selecting an item runs its `onSelect` and closes the menu (configurable).
- Close on: Escape, click outside, selecting an item, Tab away.
- Menu positions itself next to the trigger and flips/shifts when near viewport edges.
- Optional sub-menu.
- Controlled and uncontrolled open state.

### Non-functional (performance, accessibility, devices, network)
- **Accessibility:** full WAI-ARIA menu button pattern, full keyboard support, correct focus movement, screen reader announcements.
- **Performance:** no layout thrash on scroll; lazy render menu content (not in DOM when closed); small bundle (< 8 KB gzipped for the component).
- **Devices:** works with mouse, touch, keyboard, screen readers; correct on small screens.
- **Flexible:** works inside modals, scroll containers, `overflow: hidden` parents, and RTL layouts.
- **Theming:** uses design tokens; supports dark mode.
- **Network:** none (pure UI). Items can be async-loaded by the consumer; we show a loading slot.

### Out of scope
- Combobox / autocomplete with typing to filter.
- Context menu (right-click) — mention that it reuses the same internals.
- Mobile bottom-sheet variant.

## 2. Architecture

```text
 ┌──────────────────── <Dropdown> (Provider) ────────────────────┐
 │  state: open, activeIndex, triggerRef, contentRef, ids        │
 │                                                               │
 │  ┌─────────────────┐        ┌──── Portal (document.body) ───┐ │
 │  │ Dropdown.Trigger│ ─────▶ │ Dropdown.Content              │ │
 │  │ <button         │ opens  │  role="menu"                  │ │
 │  │ aria-haspopup   │        │  ├─ Dropdown.Item  role=      │ │
 │  │ aria-expanded>  │        │  │    "menuitem"              │ │
 │  └─────────────────┘        │  ├─ Dropdown.Separator        │ │
 │                             │  ├─ Dropdown.Group/Label      │ │
 │                             │  ├─ Dropdown.CheckboxItem     │ │
 │                             │  └─ Dropdown.Sub (nested)     │ │
 │                             └───────────────────────────────┘ │
 │                                                               │
 │  Hooks used inside:                                           │
 │   usePosition (flip/shift)   useRovingFocus (arrow keys)      │
 │   useDismiss (Esc/outside)   useTypeahead   useId             │
 └───────────────────────────────────────────────────────────────┘
```

| Component | Responsibility |
|---|---|
| `Dropdown` (root) | Holds open state (controlled or not), shares it via React Context, generates ids. |
| `Dropdown.Trigger` | Renders the button, toggles open, sets `aria-haspopup`, `aria-expanded`, `aria-controls`. Opens on Enter/Space/ArrowDown. |
| `Dropdown.Content` | Portal + positioned floating panel, `role="menu"`, handles keyboard nav, focus, dismiss. |
| `Dropdown.Item` | `role="menuitem"`, registers itself in an item list, calls `onSelect`. |
| `CheckboxItem` / `RadioGroup` / `RadioItem` | `menuitemcheckbox` / `menuitemradio` with `aria-checked`. |
| `Separator`, `Label`, `Group` | Visual and semantic grouping (`role="separator"`, `role="group"`). |
| `Dropdown.Sub` | Nested menu, opens on ArrowRight/hover. |
| `usePosition` | Computes x/y, flips and shifts within viewport, updates on scroll/resize. |
| `useDismiss` | Escape key + pointer down outside both trigger and content. |
| `useRovingFocus` + `useTypeahead` | Arrow keys, Home/End, jump-to-letter. |

**Main flow — user opens menu and selects "Delete" with keyboard:**
1. Focus is on trigger. User presses ArrowDown.
2. Trigger sets `open = true` and `initialFocus = 'first'`.
3. `Content` mounts in a portal, `usePosition` measures trigger + content and places it (flips up if no space below).
4. Focus moves to the first enabled item.
5. User presses ArrowDown twice → `activeIndex` moves, skipping disabled items; focus follows.
6. User presses Enter → item's `onSelect(event)` runs.
7. Menu closes, focus returns to the trigger.

## 3. Data model

```ts
// Internal state in the root
interface DropdownState {
  open: boolean;
  activeIndex: number | null;          // highlighted item
  triggerRef: React.RefObject<HTMLButtonElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  menuId: string;                      // from useId()
  triggerId: string;
}

// Each item registers itself so the menu knows order + disabled state
interface ItemRecord {
  id: string;
  ref: React.RefObject<HTMLElement>;
  disabled: boolean;
  textValue: string;                   // for typeahead
}

type Placement =
  | 'bottom-start' | 'bottom' | 'bottom-end'
  | 'top-start' | 'top' | 'top-end'
  | 'left' | 'right';

interface Position {
  x: number;
  y: number;
  placement: Placement;                // final placement after flip
  maxHeight: number;                   // so long menus scroll inside
}

// Optional data-driven API (for simple cases)
type MenuItemData =
  | { type: 'item'; id: string; label: string; icon?: React.ReactNode; shortcut?: string; disabled?: boolean; onSelect?: () => void }
  | { type: 'separator' }
  | { type: 'group'; label: string; items: MenuItemData[] }
  | { type: 'sub'; label: string; items: MenuItemData[] };
```

| Entity | Lives in | Why |
|---|---|---|
| `open` | Component state (or parent if controlled) | Parent sometimes needs to open it (e.g., from a tour). |
| `activeIndex` | Component state inside `Content` | Pure UI detail, nobody else cares. |
| Item list (`ItemRecord[]`) | Ref inside context (not state) | Items register on mount; storing in state would cause re-render loops. |
| `Position` | Component state, updated in `useLayoutEffect` | Must be measured from DOM before paint. |
| Ids (`menuId`, `triggerId`) | `useId()` | Stable across SSR and client — no hydration mismatch. |
| Selected value (checkbox/radio items) | Consumer's state | The menu does not own business data. |
| Server / URL | — | Nothing. Pure UI component. |

## 4. Interface (API)

### Component API

Compound-component API (main one, flexible):

```tsx
<Dropdown>
  <Dropdown.Trigger asChild>
    <IconButton aria-label="More actions" icon={<DotsIcon />} />
  </Dropdown.Trigger>

  <Dropdown.Content placement="bottom-end" offset={4}>
    <Dropdown.Item icon={<EditIcon />} shortcut="⌘E" onSelect={edit}>Edit</Dropdown.Item>
    <Dropdown.Item onSelect={duplicate}>Duplicate</Dropdown.Item>
    <Dropdown.Separator />
    <Dropdown.Group label="Sort by">
      <Dropdown.RadioGroup value={sort} onValueChange={setSort}>
        <Dropdown.RadioItem value="name">Name</Dropdown.RadioItem>
        <Dropdown.RadioItem value="date">Date</Dropdown.RadioItem>
      </Dropdown.RadioGroup>
    </Dropdown.Group>
    <Dropdown.Separator />
    <Dropdown.Item tone="danger" disabled={!canDelete} onSelect={remove}>Delete</Dropdown.Item>
  </Dropdown.Content>
</Dropdown>
```

Root props:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | — | Controlled mode. |
| `defaultOpen` | `boolean` | `false` | Uncontrolled mode. |
| `onOpenChange` | `(open: boolean) => void` | — | Called in both modes. |
| `modal` | `boolean` | `false` | If true, outside content is inert while open. |
| `dir` | `'ltr' \| 'rtl'` | from context | Flips ArrowLeft/Right for sub-menus. |

`Content` props: `placement` (`'bottom-start'`), `offset` (`4`), `collisionPadding` (`8`), `avoidCollisions` (`true`), `portalContainer` (`document.body`), `loop` (`true` — wrap from last to first), `closeOnSelect` (`true`), `maxHeight`.

`Item` props: `onSelect(event)` (call `event.preventDefault()` to keep menu open), `disabled`, `icon`, `shortcut`, `tone`, `textValue` (for typeahead when children aren't plain text), `asChild` (render as `<a>` for links).

**Uncontrolled** (most common):

```tsx
<Dropdown defaultOpen={false}> ... </Dropdown>
```

**Controlled** (parent decides):

```tsx
const [open, setOpen] = useState(false);
<Dropdown open={open} onOpenChange={setOpen}> ... </Dropdown>
```

Implementation of controlled/uncontrolled in one hook:

```ts
function useControllableState<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : inner;
  const set = useCallback((next: T) => {
    if (!isControlled) setInner(next);
    onChange?.(next);
  }, [isControlled, onChange]);
  return [current, set] as const;
}
```

Also offer a simple data-driven wrapper for teams that want less code: `<SimpleDropdown items={MenuItemData[]} trigger={...} />`, built on top of the compound API.

### Server API

There is no server API — this is a pure UI component. Instead, the public surface is:

- **Events:** `onOpenChange`, `onSelect`, `onEscapeKeyDown(e)`, `onPointerDownOutside(e)` (consumer can `preventDefault()` to stop closing), `onCloseAutoFocus(e)` (to control where focus goes after closing).
- **Data attributes for styling:** `data-state="open|closed"`, `data-highlighted`, `data-disabled`, `data-side="top|bottom"` (so arrows/animations can depend on final placement).
- **Theming tokens (CSS variables):**

```css
:root {
  --dropdown-bg: var(--color-surface-raised);
  --dropdown-fg: var(--color-text);
  --dropdown-item-hover-bg: var(--color-surface-hover);
  --dropdown-danger-fg: var(--color-red-600);
  --dropdown-radius: var(--radius-md);
  --dropdown-shadow: var(--shadow-lg);
  --dropdown-z: var(--z-popover); /* 1000 */
  --dropdown-min-width: 180px;
}
```

## 5. Optimizations and deep dives

### 5.1 Positioning and collision with viewport edges

Steps in `usePosition`:
1. Measure `trigger.getBoundingClientRect()` and content size.
2. Compute x/y for preferred placement (`bottom-start` → `x = trigger.left`, `y = trigger.bottom + offset`).
3. **Flip:** if content overflows bottom of viewport and there is more space on top, use `top-start`.
4. **Shift:** clamp x so it stays inside `[padding, viewportWidth - width - padding]`.
5. **Size:** if neither side fits, set `maxHeight` to available space and let the menu scroll.
6. Apply with `transform: translate(x, y)` on a `position: fixed` element (cheap, no reflow).

```ts
useLayoutEffect(() => {
  if (!open) return;
  const update = () => setPos(computePosition(triggerRef.current!, contentRef.current!, opts));
  update();
  window.addEventListener('scroll', update, { capture: true, passive: true }); // capture: any scroll parent
  window.addEventListener('resize', update);
  const ro = new ResizeObserver(update);
  ro.observe(contentRef.current!);
  return () => { /* remove listeners, ro.disconnect() */ };
}, [open]);
```

- `useLayoutEffect` so position is set before paint (no flicker at 0,0).
- In practice I'd use **Floating UI** (`@floating-ui/react`, ~10 KB) — it solves flip/shift/size/arrow and scroll parents. In an interview, explain the algorithm, then say you'd use the library.
- If the trigger scrolls out of view, close the menu or hide it (`hide` middleware).
- Future: CSS Anchor Positioning (`anchor-name`, `position-try`) will do this natively; mention it as progressive enhancement.

### 5.2 Portals and z-index

Problem: if the menu renders inside a card with `overflow: hidden` or a parent with `transform`, it gets clipped or `position: fixed` breaks.

- Render `Content` in a **portal** to `document.body`. React events still bubble through the React tree, so context works.
- Use a **z-index scale** from tokens: `dropdown 1000`, `modal 1300`, `popover inside modal` — portal into the modal container or use higher layer.
- Allow `portalContainer` prop for special cases (Shadow DOM, iframes, full-screen elements).
- Native option: the **Popover API** (`popover` attribute) puts the element in the browser **top layer**, so no z-index fights at all. Good progressive enhancement.

### 5.3 Keyboard navigation and ARIA (menu vs listbox)

ARIA markup:

```html
<button id="t1" aria-haspopup="menu" aria-expanded="true" aria-controls="m1">Actions</button>
<div id="m1" role="menu" aria-labelledby="t1" tabindex="-1">
  <div role="menuitem" tabindex="-1">Edit</div>
  <div role="menuitem" tabindex="-1" aria-disabled="true">Delete</div>
  <div role="separator"></div>
  <div role="menuitemcheckbox" aria-checked="true" tabindex="-1">Show grid</div>
</div>
```

Keyboard map:

| Key | On trigger | Inside menu |
|---|---|---|
| Enter / Space | Open, focus first item | Activate item |
| ArrowDown | Open, focus first item | Next item (wrap if `loop`) |
| ArrowUp | Open, focus last item | Previous item |
| Home / End | — | First / last item |
| Escape | — | Close, focus trigger |
| Tab | — | Close, move focus naturally (menus don't trap focus) |
| A–Z | — | Typeahead: jump to next item starting with that letter |
| ArrowRight / Left | — | Open / close sub-menu (swap in RTL) |

**Menu vs listbox:** `menu` is for actions (commands). For choosing a value in a form, use `listbox` with `role="option"` and `aria-selected`, usually inside a combobox. Using `menu` for a select is a common a11y bug — say this in the interview.

Typeahead: collect key presses into a buffer, clear it after 500ms, find the next item whose `textValue` starts with the buffer.

### 5.4 Focus management

Two options:
- **Roving tabindex** (I pick this): actual DOM focus moves to each item (`tabindex=-1` + `.focus()`). Screen readers announce naturally.
- **`aria-activedescendant`**: focus stays on the menu container; we point to active item id. Needed for comboboxes where focus must stay in the input.

Rules:
- On open via keyboard → focus first (or last for ArrowUp) item. On open via mouse → focus the menu container (so no visible highlight jump) — but still keyboard ready.
- Skip disabled items in navigation but keep them visible and announced (`aria-disabled`), so users know the option exists.
- On close → return focus to trigger, **except** when closing because the user clicked somewhere else or pressed Tab (don't steal focus back).
- Hover highlights an item and moves focus to it, so mouse and keyboard stay in sync (one `activeIndex`).

### 5.5 Click outside

```ts
useEffect(() => {
  if (!open) return;
  const onPointerDown = (e: PointerEvent) => {
    const t = e.target as Node;
    if (contentRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
    onPointerDownOutside?.(e);
    if (!e.defaultPrevented) setOpen(false);
  };
  document.addEventListener('pointerdown', onPointerDown, true); // capture phase
  return () => document.removeEventListener('pointerdown', onPointerDown, true);
}, [open]);
```

Gotchas:
- Exclude the trigger, otherwise clicking the trigger closes then re-opens.
- Portal content is not a DOM child of the root — check both refs. For nested sub-menus (also portaled), keep a tree of open layers and only close when the click is outside **all** of them.
- Use `pointerdown` not `click`, so the menu closes before the other element reacts, and it works for touch.
- Iframes: clicking into an iframe doesn't fire events on our document — listen to `window` `blur` too.

### 5.6 Virtualizing long lists

For 500+ items (e.g. "Move to folder..."): render only visible rows with `@tanstack/react-virtual`. Issues to handle:
- Keyboard nav must work on the **index**, not the DOM — scroll the active index into view (`virtualizer.scrollToIndex`), then focus.
- Set `aria-setsize` and `aria-posinset` on rendered items so screen readers say "item 37 of 500".
- Honestly, 500 items in an action menu is a UX smell — suggest a combobox with search instead.

### Also mention
- **SSR safety:** don't touch `window`/`document` during render; portal only after mount; `useId` for ids.
- **RTL:** `bottom-start` means right side in RTL; ArrowLeft/Right swap for sub-menus.
- **Animations:** enter/exit with `data-state` + CSS; keep the element mounted until exit animation ends (presence pattern); respect `prefers-reduced-motion`.
- **Sub-menu hover intent:** use a "safe triangle" so moving the mouse diagonally to the sub-menu doesn't close it.
- **Touch:** open on `click` not hover; bigger hit areas (44px).
- **Testing:** React Testing Library with `userEvent.keyboard('{ArrowDown}')`, axe checks, Playwright for positioning near edges, visual regression in Storybook.
- **Bundle:** tree-shakeable exports; sub-menu code only loaded when used.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| API style | Compound components | Single component with `items` prop | Compound for flexibility (custom items, icons); thin `items` wrapper on top for simple use. |
| Rendering location | Inline in DOM | Portal to body | Portal: escapes `overflow: hidden` and z-index problems. Allow override. |
| Positioning | Write own | Floating UI library | Library: edge cases (scroll parents, flip, RTL) are many; explain the algorithm anyway. |
| Focus approach | Roving tabindex | `aria-activedescendant` | Roving for menus; activedescendant for combobox with input. |
| Closed state | Unmount content | Keep mounted, hidden | Unmount (lazy): less DOM; keep mounted only during exit animation. |
| Open state | Controlled only | Controlled + uncontrolled | Both, via `useControllableState`. |
| Layering | z-index scale | Native Popover API / top layer | z-index tokens now; Popover API as progressive enhancement. |

## 7. Likely follow-up questions

**Q: How do items know their index if they're arbitrary children?**
Each item registers its ref in a list kept in context on mount (`useLayoutEffect`). Order is taken from DOM order (`compareDocumentPosition`) so conditional items stay correctly ordered. Libraries call this a "collection".

**Q: How would you support `asChild`?**
`Trigger asChild` clones its only child and merges props (handlers, aria, ref) instead of rendering its own `<button>`. Use a `Slot` component that composes event handlers and refs.

**Q: Menu inside a modal — anything special?**
The modal's focus trap must allow focus into the menu. Portal the menu into the modal's container (or a shared layer root) and make the layer stack aware: Escape closes only the top-most layer (the menu), not the modal.

**Q: How do you prevent the menu from closing when selecting a checkbox item?**
`onSelect(e)` receives an event; consumer calls `e.preventDefault()` to keep it open. Or `closeOnSelect={false}` on the item.

**Q: How would you build a right-click context menu with this?**
Same `Content` and items; different trigger. Position at the pointer coordinates (a virtual anchor element with a fake `getBoundingClientRect`). Also open with Shift+F10 / Menu key.

**Q: Performance with many dropdowns on a page (e.g., a table with 1000 rows)?**
Only the trigger renders per row; content mounts on open. Scroll/resize listeners attach only when open. Or use one shared menu instance and pass the row id.

**Q: How do you test accessibility?**
`jest-axe` for static checks, RTL keyboard tests for each key in the map, manual testing with VoiceOver and NVDA, and Storybook a11y addon in CI.

**Q: How do you version and avoid breaking 10 apps?**
Semver, deprecation warnings in dev mode for a release before removing props, codemods for big changes, changelog, and visual regression tests.

## 8. If you only have 60 seconds

- Compound API: `<Dropdown><Dropdown.Trigger/><Dropdown.Content><Dropdown.Item/></Dropdown.Content></Dropdown>`, context shares state; controlled + uncontrolled.
- Content renders in a portal, positioned with flip/shift/size logic (Floating UI), updated on scroll/resize in `useLayoutEffect`.
- ARIA menu-button pattern: `aria-haspopup`, `aria-expanded`, `role="menu"`, `menuitem`/`menuitemcheckbox`; listbox for value picking.
- Full keyboard: arrows, Home/End, typeahead, Enter, Escape, Tab; roving tabindex; focus back to trigger on close.
- Dismiss on Escape, pointerdown outside (checking trigger + portaled content), select.
- Theming via CSS variables and `data-state` attributes; SSR-safe with `useId`; virtualize only for huge lists.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarify | Menu vs select, sub-menus, item types, count, SSR. |
| 5–9 | Requirements | Item types, close rules, a11y + keyboard as must-have. |
| 9–16 | Architecture | Root/Trigger/Content/Item diagram, hooks, keyboard open flow. |
| 16–20 | Data model | State, item registry, position, where each lives. |
| 20–27 | API | Compound example, props table, controlled vs uncontrolled, events, tokens. |
| 27–41 | Deep dives | Positioning + flip, portal/z-index, keyboard + ARIA, focus, click outside. |
| 41–45 | Trade-offs + wrap | Trade-off table, testing, versioning. |

## Common mistakes

- Forgetting accessibility and keyboard support — no arrow keys, no Escape, `div`s with `onClick` and no roles.
- Using `role="menu"` for a form select (should be listbox / combobox).
- Rendering the menu inline and having it clipped by `overflow: hidden` or hidden under a sticky header.
- Click-outside handler that forgets the trigger or the portal, causing open-close flicker.
- Not returning focus to the trigger after closing, so keyboard users get lost at the top of the page.
- Only a single `items` prop API — teams can't add custom content, so they fork the component.

## My mistakes

- [ ]
