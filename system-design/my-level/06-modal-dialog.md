# Modal Dialog (reusable component for a design system)

> **Difficulty:** Easy–Medium · **Asked at:** companies with a design system or UI-platform team (Atlassian, Flipkart, PhonePe, Microsoft, Adobe), common in SDE-2 frontend rounds · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- What kinds of modals? Confirm dialog, form dialog, full-screen, drawer/side sheet? → Assume: standard dialog + alert dialog (confirm/destructive). Drawer reuses the same base later.
- Can a modal open another modal (stacking)? → Assume: yes, must support it correctly.
- Should clicking the overlay close it? → Assume: yes by default, configurable (off for forms with unsaved data).
- Sizes? → Assume: `sm | md | lg | full`; full-screen on mobile.
- Do we need an imperative API like `modal.confirm('Delete?')`? → Assume: yes, nice to have, built on top of the component.
- Animations? → Assume: fade + scale in/out, respect reduced motion.
- SSR? → Assume: React 18+ with Next.js, must be SSR safe.
- Browser support? → Assume: last 2 versions of evergreen browsers + iOS Safari 15+.

## 1. Requirements

### Functional
- Open / close a dialog with a title, body, and footer actions.
- Close via: close button, Escape key, overlay click (configurable), action buttons.
- Focus moves into the dialog on open, stays trapped inside, and returns to the trigger on close.
- Background page does not scroll while open, and is not reachable by keyboard or screen reader.
- Support stacked modals: Escape / overlay close only the top one.
- Variants: `dialog` and `alertdialog`; sizes; scrollable long content with sticky header/footer.
- Controlled and uncontrolled usage; imperative `confirm()` helper.

### Non-functional (performance, accessibility, devices, network)
- **Accessibility:** WAI-ARIA dialog pattern, labelled and described, focus trap, screen reader users can't wander outside.
- **Performance:** not rendered when closed (lazy content), smooth 60fps animation using `transform`/`opacity` only, small bundle (< 5 KB gzipped).
- **Devices:** works on mobile (iOS scroll lock is tricky), virtual keyboard doesn't hide inputs, full-screen on small screens.
- **Robust:** works inside any parent (overflow hidden, transforms) — always appears on top.
- **Theming:** design tokens, dark mode, RTL.
- **Network:** none directly. Async actions (e.g., "Save") need loading state and should not close on failure.

### Out of scope
- Non-modal dialogs / popovers (separate component).
- Drag to move / resize.
- Routing modals (URL-driven) — I'll mention as a follow-up.

## 2. Architecture

```text
 App tree                                document.body
 ┌──────────────────────────┐            ┌───────────────────────────────────┐
 │ <Modal open onOpenChange>│            │ <div id="app" inert aria-hidden>  │
 │   <Modal.Trigger/>       │            │                                   │
 │   <Modal.Content> ───────┼──Portal───▶│ <div data-layer-root>             │
 │     <Modal.Title/>       │            │   ┌── Overlay (backdrop) ───────┐ │
 │     <Modal.Description/> │            │   │  ┌── Dialog panel ────────┐ │ │
 │     body ...             │            │   │  │ role="dialog"          │ │ │
 │     <Modal.Footer/>      │            │   │  │ aria-modal="true"      │ │ │
 │     <Modal.Close/>       │            │   │  │ aria-labelledby=title  │ │ │
 │   </Modal.Content>       │            │   │  │ FocusTrap              │ │ │
 │ </Modal>                 │            │   │  └────────────────────────┘ │ │
 └──────────────────────────┘            │   └─────────────────────────────┘ │
                                         └───────────────────────────────────┘
 Shared services (module-level singletons):
   ModalStack (which modal is on top)   ScrollLock (ref-counted)
   useFocusTrap   useDismiss (Esc / overlay)   Presence (exit animation)
```

| Component | Responsibility |
|---|---|
| `Modal` (root) | Open state (controlled/uncontrolled), ids, context for children. |
| `Modal.Trigger` | Button that opens; remembered as the element to return focus to. |
| `Modal.Content` | Portal, overlay, panel with `role="dialog"`, focus trap, dismiss handling, animation. |
| `Modal.Title` / `Modal.Description` | Give ids for `aria-labelledby` / `aria-describedby`. |
| `Modal.Close` | Any button that closes the dialog. |
| `ModalStack` | Ordered list of open modals; only top one reacts to Esc/overlay; sets z-index. |
| `ScrollLock` | Locks body scroll; ref-counted so nested modals don't unlock early. |
| `useFocusTrap` | Moves focus in, loops Tab/Shift+Tab, restores focus on close. |
| `Presence` | Keeps content mounted until exit animation ends. |
| `confirm()` helper | Imperative API that renders a Modal and returns a Promise. |

**Main flow — user clicks "Delete project":**
1. Trigger click → `onOpenChange(true)`. We save `document.activeElement` (the trigger).
2. `Content` portals into `body`, pushes itself onto `ModalStack`, gets z-index for its level.
3. `ScrollLock` locks body scroll; the rest of the app gets `inert`.
4. Focus moves to the first sensible element (the Cancel button for destructive alerts).
5. Tab cycles only inside the dialog. Screen reader announces "Delete project?, dialog, This cannot be undone".
6. User presses Escape → top-of-stack check passes → `onOpenChange(false)`.
7. Exit animation plays, content unmounts, modal popped from stack, scroll unlocked, `inert` removed, focus returned to the trigger.

## 3. Data model

```ts
interface ModalState {
  open: boolean;
  titleId: string;          // useId()
  descriptionId: string;
  contentRef: React.RefObject<HTMLDivElement>;
  returnFocusEl: HTMLElement | null; // element focused before opening
}

// Global stack (module singleton or context at app root)
interface ModalStackEntry {
  id: string;
  ref: React.RefObject<HTMLElement>;
  dismissible: boolean;
}
type ModalStack = ModalStackEntry[];   // last = top-most

// Scroll lock bookkeeping
interface ScrollLockState {
  count: number;                       // how many modals want lock
  prevOverflow: string;
  prevPaddingRight: string;            // to avoid layout shift from scrollbar
  scrollY: number;                     // for iOS position:fixed trick
}

type ModalSize = 'sm' | 'md' | 'lg' | 'full';

type PresenceState = 'mounted-open' | 'closing' | 'unmounted';

// Imperative confirm helper
interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;   // default "Confirm"
  cancelLabel?: string;    // default "Cancel"
  tone?: 'default' | 'danger';
}
```

| Entity | Lives in | Why |
|---|---|---|
| `open` | Component state or parent (controlled) | Parent often needs control (close after API success). |
| `titleId`, `descriptionId` | `useId()` in root | Stable ids, SSR safe, link ARIA attributes. |
| `returnFocusEl` | Ref in root | Needed only on close; no re-render needed. |
| `ModalStack` | Module singleton / root-level context | Shared across all modals on the page to know the top one. |
| `ScrollLockState` | Module singleton | Body is global; must be ref-counted. |
| Form data inside modal | Consumer's state | Modal doesn't own business data. |
| URL | Optional (consumer) | Only for "routable" modals (e.g., `/photos/12` opens photo modal). |
| Server | — | Nothing; pure UI. |

## 4. Interface (API)

### Component API

Compound-component API:

```tsx
<Modal>
  <Modal.Trigger asChild>
    <Button tone="danger">Delete project</Button>
  </Modal.Trigger>

  <Modal.Content role="alertdialog" size="sm" initialFocus={cancelRef}>
    <Modal.Title>Delete project?</Modal.Title>
    <Modal.Description>This will delete all files. This cannot be undone.</Modal.Description>
    <Modal.Footer>
      <Modal.Close asChild><Button ref={cancelRef}>Cancel</Button></Modal.Close>
      <Button tone="danger" onClick={handleDelete}>Delete</Button>
    </Modal.Footer>
  </Modal.Content>
</Modal>
```

Root and `Content` props:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | — | Controlled mode. |
| `defaultOpen` | `boolean` | `false` | Uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Fires for all close reasons. |
| `role` | `'dialog' \| 'alertdialog'` | `'dialog'` | `alertdialog` for confirmations. |
| `size` | `ModalSize` | `'md'` | `full` used automatically under 640px if `fullScreenOnMobile`. |
| `closeOnOverlayClick` | `boolean` | `true` (false for `alertdialog`) | |
| `closeOnEsc` | `boolean` | `true` | |
| `initialFocus` | `RefObject<HTMLElement>` | first tabbable | |
| `finalFocus` | `RefObject<HTMLElement>` | trigger | Where focus goes after close. |
| `onEscapeKeyDown` / `onPointerDownOutside` | `(e) => void` | — | `e.preventDefault()` to block close (e.g., unsaved changes). |
| `portalContainer` | `HTMLElement` | `document.body` | |
| `preventScroll` | `boolean` | `true` | |

**Uncontrolled** — trigger and modal live together, simplest:

```tsx
<Modal><Modal.Trigger>Open</Modal.Trigger><Modal.Content>...</Modal.Content></Modal>
```

**Controlled** — close only after the API call succeeds:

```tsx
const [open, setOpen] = useState(false);
const save = async () => {
  setSaving(true);
  try { await api.save(form); setOpen(false); }
  catch { setError('Could not save'); }  // stay open on failure
  finally { setSaving(false); }
};
<Modal open={open} onOpenChange={(o) => !saving && setOpen(o)}>...</Modal>
```

**Imperative helper** for quick confirmations:

```ts
const ok = await confirm({ title: 'Delete project?', tone: 'danger', confirmLabel: 'Delete' });
if (ok) deleteProject();
```

Built with a `<ModalProvider>` at app root that renders queued modals and resolves a Promise on close.

### Server API

There is no server API — it is a pure UI component. The public surface instead is:

- **Events:** `onOpenChange`, `onOpenAutoFocus(e)`, `onCloseAutoFocus(e)`, `onEscapeKeyDown(e)`, `onPointerDownOutside(e)`, `onAnimationEnd`.
- **Data attributes:** `data-state="open|closed"` on overlay and panel (for CSS animations), `data-size`, `data-nested="true"` for stacked modals.
- **Theming tokens:**

```css
:root {
  --modal-bg: var(--color-surface);
  --modal-overlay-bg: rgb(0 0 0 / 0.5);
  --modal-radius: var(--radius-lg);
  --modal-shadow: var(--shadow-xl);
  --modal-padding: var(--space-6);
  --modal-width-sm: 400px;
  --modal-width-md: 560px;
  --modal-width-lg: 800px;
  --modal-z: var(--z-modal); /* 1300 */
  --modal-duration: 200ms;
}
```

## 5. Optimizations and deep dives

### 5.1 Focus trap and restoring focus

Rules:
- On open: save `document.activeElement`. Focus `initialFocus`, else first tabbable element, else the panel itself (`tabindex="-1"`). For destructive alerts focus **Cancel**, not Delete.
- While open: Tab from last element goes to first; Shift+Tab from first goes to last.
- On close: focus the saved element (if it's still in the DOM; else fallback to `finalFocus` or `body`).

```ts
const TABBABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    (node.querySelector<HTMLElement>(TABBABLE) ?? node).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = [...node.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [active]);
}
```

Better than only a Tab handler: make everything outside **`inert`** (`appRoot.inert = true`). Then focus can't leave by mouse click, screen reader virtual cursor, or browser UI either. Keep the Tab loop as backup.

### 5.2 Scroll lock

Simple version: `document.body.style.overflow = 'hidden'`. Problems and fixes:
- **Layout shift:** the scrollbar disappears and the page jumps right. Fix: add `padding-right` equal to scrollbar width (`window.innerWidth - document.documentElement.clientWidth`), or use `scrollbar-gutter: stable` on `html`.
- **iOS Safari** ignores `overflow: hidden` on body for touch scroll. Fix: set `body { position: fixed; top: -scrollY; width: 100% }`, then restore `window.scrollTo(0, scrollY)` on unlock.
- **Nested modals:** use a **counter**. Lock on 0→1, unlock on 1→0. Otherwise closing the inner modal unlocks the page while the outer is still open.
- Scroll inside the modal must still work: panel body has `overflow-y: auto` and `overscroll-behavior: contain` (stops scroll chaining to the page).

### 5.3 ESC and overlay close

- Listen for `keydown` Escape on `document`, but only the **top** modal in `ModalStack` acts. Call `e.stopPropagation()` so a parent modal doesn't also close.
- Overlay close: use `pointerdown` **and** check `pointerup` happened on the overlay too. Otherwise, when a user selects text inside the panel and releases the mouse over the overlay, the modal closes by mistake — a classic bug.

```tsx
const downOnOverlay = useRef(false);
<div className="overlay"
  onPointerDown={(e) => { downOnOverlay.current = e.target === e.currentTarget; }}
  onPointerUp={(e) => { if (downOnOverlay.current && e.target === e.currentTarget) requestClose('overlay'); }}
/>
```

- Let consumers block closing (`onEscapeKeyDown={(e) => dirty && e.preventDefault()}`) — e.g., show "Discard changes?" instead.
- `alertdialog`: no overlay close by default; the user must choose an action.

### 5.4 Portal + stacking multiple modals

- Portal to `document.body` so `overflow: hidden` and `transform` on ancestors can't clip it or break `position: fixed`.
- `ModalStack` gives each modal its level: `z-index: calc(var(--modal-z) + level * 10)`. Only the top one gets Esc/overlay events, and only the top one has an active focus trap; lower ones become `inert`.
- Popovers/dropdowns opened **inside** a modal portal into the modal's layer (or a shared layer root) so they're above it and inside the focus-trap allow-list.
- Toasts should sit above modals (separate higher z-index token), and must not be made `inert`.

### 5.5 ARIA dialog pattern

```html
<div role="dialog" aria-modal="true" aria-labelledby="m-title" aria-describedby="m-desc" tabindex="-1">
  <h2 id="m-title">Delete project?</h2>
  <p id="m-desc">This will delete all files. This cannot be undone.</p>
  <button>Cancel</button><button>Delete</button>
  <button aria-label="Close">×</button>
</div>
```

- `aria-modal="true"` tells screen readers the outside is not available, but support varies — so also use `inert` (or `aria-hidden="true"`) on the app root.
- Always require a title. In dev mode, `console.warn` if `Modal.Title` is missing (or an `aria-label` is not given). Allow a visually hidden title.
- `role="alertdialog"` for confirmations that interrupt the user.
- The close "×" button needs an accessible name.

### 5.6 The native `<dialog>` element

```tsx
const ref = useRef<HTMLDialogElement>(null);
useEffect(() => { open ? ref.current?.showModal() : ref.current?.close(); }, [open]);
<dialog ref={ref} onClose={() => onOpenChange(false)} onCancel={handleEsc}>...</dialog>
```

What you get for free with `showModal()`:
- **Top layer** — always above everything, no z-index or portal needed.
- Outside content is automatically **inert**; focus moves inside; Escape fires `cancel`.
- `::backdrop` pseudo-element for the overlay.

What it doesn't solve: scroll lock (still needed), focus return isn't consistent in all browsers, overlay click close (handle click on the `<dialog>` element itself where target is the dialog), exit animations (need `@starting-style` / `transition-behavior: allow-discrete` in modern browsers). My answer: **use native `<dialog>` as the base** in 2026 since support is good, and add scroll lock, focus restore, stack awareness, and animation on top. If the company supports older browsers, use the div-based approach above.

### 5.7 Animations

- Animate only `opacity` and `transform: scale(0.96) → 1` — GPU friendly, no layout.
- Exit animation needs the element to stay mounted: `Presence` sets `data-state="closed"`, waits for `animationend` (with timeout fallback), then unmounts.
- `@media (prefers-reduced-motion: reduce)` → fade only or no animation.
- Don't start focus trap logic after the animation — move focus immediately so keyboard users aren't stuck.

### Also mention
- **SSR safety:** no `document` access during render; mount portal after hydration (`useEffect` + mounted flag); `useId` for ids.
- **Mobile:** full-screen on small screens, `100dvh` instead of `100vh` (browser bars), sticky footer above the virtual keyboard.
- **RTL:** close button and footer action order flip with logical properties (`inset-inline-end`).
- **Lazy content:** the content and heavy children (forms, editors) only render when open; can `React.lazy` big modal bodies.
- **Routable modals:** for shareable content (photo viewer) keep state in URL; back button closes the modal.
- **Testing:** RTL tests for focus in/out, Tab loop, Esc, overlay; `jest-axe`; Playwright on iOS WebKit for scroll lock.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Base element | Native `<dialog>` + `showModal()` | Div + portal + custom logic | Native: top layer and inert for free; add scroll lock, focus restore, animations on top. Div-based if old browsers matter. |
| Blocking outside | `aria-hidden` on siblings | `inert` | `inert`: blocks focus, clicks, and screen readers in one attribute. |
| Overlay click | Always closes | Configurable, off for alerts/dirty forms | Configurable, with consumer `preventDefault` hook. |
| API style | Compound components | Single `<Modal title footer>` props | Compound for flexibility + a simple `confirm()` helper for common cases. |
| State | Controlled only | Controlled + uncontrolled | Both; controlled needed for async save flows. |
| Closed content | Unmount | Keep mounted + hidden | Unmount after exit animation; keep-mounted option for preserving form state. |
| Scroll lock | `overflow: hidden` | `position: fixed` trick | `overflow: hidden` + scrollbar compensation; `position: fixed` for iOS. |

## 7. Likely follow-up questions

**Q: How do you handle a form with unsaved changes when the user presses Esc?**
Consumer passes `onEscapeKeyDown` / `onPointerDownOutside` and calls `e.preventDefault()` when dirty, then opens a nested "Discard changes?" alert dialog. Our stack handles the nesting.

**Q: What if the trigger is removed from the DOM after closing (e.g., deleted row)?**
Check `previous.isConnected`. If gone, focus `finalFocus` or a sensible container (like the list heading). Never leave focus on `body` silently.

**Q: How does the `confirm()` imperative API work in React?**
A `ModalProvider` at the root holds a queue in state. `confirm()` pushes an entry with a Promise `resolve` function and returns the Promise. The provider renders the modal; Confirm/Cancel call `resolve(true/false)` and remove the entry.

**Q: Why not just `z-index: 9999`?**
It still loses to stacking contexts created by parents (`transform`, `opacity < 1`, `isolation`). Portal (or top layer via `<dialog>`) removes the dialog from those contexts; then a token scale keeps layers predictable.

**Q: How do you make a modal shareable by URL?**
Store modal state in the URL (`?modal=invite` or a route like `/photos/12`). Opening pushes history; closing goes back. In Next.js, intercepting routes do this. On direct visit, render as a full page.

**Q: Long content — how do you scroll?**
Panel has `max-height: calc(100dvh - 2rem)`, header and footer fixed, body `overflow-y: auto`. Don't scroll the whole overlay unless content is a document-style modal.

**Q: How would a drawer / bottom sheet reuse this?**
Same root, focus trap, scroll lock, stack, and dismiss logic; only the panel layout and animation change. That's why these pieces are separate hooks.

**Q: How do you test the focus trap?**
RTL: open modal, assert focus is on the expected element, `userEvent.tab()` through all items and check it loops, Shift+Tab backwards, Esc closes and focus returns to the trigger. Plus manual VoiceOver/NVDA testing.

## 8. If you only have 60 seconds

- Compound API: `Modal`, `Trigger`, `Content`, `Title`, `Description`, `Close`; controlled + uncontrolled; `confirm()` Promise helper.
- Built on native `<dialog>` with `showModal()` (top layer, inert outside) or portal + `inert` on app root.
- Focus: save trigger, move focus in (Cancel for destructive), trap Tab, restore on close.
- Scroll lock with ref counting, scrollbar width compensation, iOS `position: fixed` trick.
- Esc and overlay close only the top modal in a stack; overlay close checks pointerdown + pointerup; consumers can block close.
- ARIA: `role="dialog"/"alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`; warn if no title.
- Animate opacity/transform with exit presence, reduced-motion support, SSR safe with `useId`.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–5 | Clarify | Variants, stacking, overlay close, imperative API, SSR, browsers. |
| 5–9 | Requirements | Close rules, focus/scroll requirements, a11y as must-have. |
| 9–16 | Architecture | Portal diagram, components, shared stack + scroll lock, open/close flow. |
| 16–20 | Data model | Modal state, stack, scroll lock state, where each lives. |
| 20–26 | API | Compound example, props table, controlled save flow, `confirm()`, tokens. |
| 26–41 | Deep dives | Focus trap + restore, scroll lock, Esc/overlay, stacking, ARIA, native `<dialog>`. |
| 41–45 | Trade-offs + wrap | Native vs custom, inert, animations, testing. |

## Common mistakes

- Forgetting accessibility and keyboard support — no focus trap, no Esc, no `aria-labelledby`, focus not returned to trigger.
- Using only `overflow: hidden` and ignoring iOS scroll and scrollbar layout shift.
- Overlay closes when the user drags-selects text from inside the panel to outside.
- Nested modals: Esc closes all of them, or closing the inner one unlocks scroll.
- Rendering inline and fighting `z-index` instead of using a portal or the top layer.
- Not checking SSR — touching `document` during render breaks Next.js builds.

## My mistakes

- [ ]
