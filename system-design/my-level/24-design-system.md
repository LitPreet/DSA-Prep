# Design System / Component Library (e.g. for a company like CRED or Razorpay)

> **Difficulty:** Medium · **Asked at:** companies with many frontend teams and a strong brand (Razorpay Blade, CRED, Flipkart, Swiggy, Groww), and platform / UI-infra team roles · **Time in interview:** 45 min
> Not on GreatFrontEnd's list; common at Indian product companies.

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Who uses it? How many teams and apps? → Assume: 15+ product teams, 10+ web apps (dashboard, checkout, marketing pages).
- Which platforms? Web only, or React Native too? → Assume: React web first. Tokens shared with mobile later.
- Do we need multiple themes? Light/dark? Multiple brands (white-label)? → Assume: light + dark, and one partner brand theme later.
- Do we support SSR (Next.js)? → Assume: yes, some apps use Next.js App Router with React Server Components.
- Is there a design team with a Figma library? → Assume: yes. Figma is the design source; tokens must stay in sync with it.
- Accessibility target? → Assume: WCAG 2.1 AA. It is a legal and trust issue for fintech.
- Are teams already using some other library (MUI, Ant, custom)? → Assume: yes, a mix. We need a migration plan.
- How many components in v1? → Assume: ~25 core: Button, Input, Select, Checkbox, Radio, Switch, Modal, Toast, Tooltip, Tabs, Table, Badge, Avatar, Card, etc.

## 1. Requirements

### Functional

- A **token** layer: colors, spacing, typography, radius, shadows, motion, breakpoints.
- Themes: light and dark, switchable at runtime without reload. Room for more brands.
- A set of **accessible React components** with a consistent, predictable API.
- Docs site with live examples, props tables, do/don't guidelines (Storybook).
- Published as npm packages with versioning and changelogs.
- Support both "use as-is" (styled) and "build your own look" (headless hooks) for special cases.

### Non-functional (performance, accessibility, devices, network)

- **Bundle size:** importing just `Button` should add under ~5 KB gzipped. Full library tree-shakes. Core runtime (theme provider) under 3 KB.
- **No runtime style cost:** no style injection during render, so no slowdowns in large lists and works with SSR/RSC.
- **Accessibility:** every component passes axe with zero violations, full keyboard support, visible focus, 4.5:1 contrast for text.
- **Devices:** touch targets at least 44×44 px on mobile; works in latest 2 versions of Chrome, Safari, Firefox, plus Android WebView.
- **Stability:** semantic versioning; no breaking changes in minor versions; deprecations warned for at least one major.
- **DX:** full TypeScript types, autocomplete for props and tokens.

### Out of scope

- Building the Figma library itself.
- React Native components (only shared tokens).
- Complex domain widgets (charts, rich text editor). They can live in separate packages later.

## 2. Architecture

```text
   +-------------------+        export / sync        +---------------------------+
   |   Figma library   | --------------------------> |  tokens/ (JSON source)    |
   |   (designers)     |     (Tokens Studio plugin)  |  color, space, type, ...  |
   +-------------------+                             +-------------+-------------+
                                                                   |
                                                     Style Dictionary build
                                                                   |
                    +----------------------+-----------------------+---------------------+
                    v                      v                       v                     v
             tokens.css              tokens.ts                tokens.json          ios/android
         (CSS variables,          (typed JS consts,          (for other            (later)
          per theme)               var() references)          tools)
                    |                      |
                    +----------+-----------+
                               v
   +---------------------------------------------------------------------------+
   |  Monorepo (pnpm workspaces + Turborepo)                                   |
   |                                                                           |
   |  @acme/tokens   ->  @acme/react-hooks (headless)  ->  @acme/react (styled) |
   |                                                    \                      |
   |                                                     -> @acme/icons        |
   |  apps/docs (Storybook)   tooling: changesets, codemods, eslint-plugin     |
   +------------------------------------+--------------------------------------+
                                        |  CI: lint, types, unit, axe, visual
                                        |  regression, size-limit, publish
                                        v
                               +------------------+
                               |  npm registry    |  (private or public)
                               +--------+---------+
                                        v
                 +-------------+  +-------------+  +-------------+
                 | Checkout app|  | Dashboard   |  | Marketing   |
                 +-------------+  +-------------+  +-------------+
```

| Component | Responsibility |
|---|---|
| Figma + Tokens Studio | Designers own token values. Exported as JSON into the repo through a PR. |
| `tokens/` JSON | Single source of truth for raw values and semantic names. |
| Style Dictionary | Build tool that turns token JSON into CSS variables, TS constants, and native formats. |
| `@acme/tokens` | Published tokens: `tokens.css`, `tokens.ts`, themes. |
| `@acme/react-hooks` | Headless logic: `useButton`, `useCombobox`, focus trap, keyboard nav. No styles. |
| `@acme/react` | Styled components built on hooks + tokens. What 95% of teams use. |
| `@acme/icons` | SVG icons as tree-shakeable React components. |
| Storybook docs | Live examples, props tables, a11y panel, used for visual tests. |
| CI pipeline | Types, tests, axe, visual regression (Chromatic), size budgets, changesets release. |
| Codemods + ESLint plugin | Help teams migrate and avoid deprecated APIs. |

**Main flow: a designer changes the brand primary color**

1. Designer updates `color.brand.500` in Figma and pushes tokens via Tokens Studio. This opens a PR on `tokens/*.json`.
2. CI runs Style Dictionary and generates new `tokens.css` and `tokens.ts`.
3. Contrast check script fails the PR if any text/background pair drops below 4.5:1.
4. Visual regression runs on all Storybook stories and shows the diffs. A designer approves.
5. A changeset marks it as a `minor` (visual change, no API change). On merge, CI publishes `@acme/tokens@2.4.0` and `@acme/react@5.8.0`.
6. Apps get the update through Renovate/Dependabot PRs. Since components read CSS variables, no component code changed.

## 3. Data model

There is no database. The "data" here is tokens, themes, and component prop contracts.

```ts
// 1. Primitive (raw) tokens: the palette. Never used directly by components.
const primitives = {
  color: {
    blue: { 50: "#EEF4FF", 500: "#2563EB", 700: "#1D4ED8" },
    gray: { 0: "#FFFFFF", 50: "#F8FAFC", 900: "#0F172A", 1000: "#000000" },
    red:  { 500: "#DC2626" },
  },
  space: { 0: "0px", 1: "4px", 2: "8px", 3: "12px", 4: "16px", 6: "24px", 8: "32px" },
  radius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
  font: { size: { 100: "12px", 200: "14px", 300: "16px", 500: "20px" } },
} as const;

// 2. Semantic tokens: named by PURPOSE. This is what components use.
type SemanticColor =
  | "surface.default" | "surface.raised" | "surface.overlay"
  | "text.primary" | "text.secondary" | "text.onAction" | "text.danger"
  | "action.primary.bg" | "action.primary.bgHover" | "border.default" | "focus.ring";

interface Theme {
  name: "light" | "dark" | (string & {});
  colors: Record<SemanticColor, string>; // values point to primitives
}

const light: Theme = {
  name: "light",
  colors: {
    "surface.default": "{color.gray.0}",
    "text.primary": "{color.gray.900}",
    "action.primary.bg": "{color.blue.500}",
    "focus.ring": "{color.blue.500}",
    // ...
  } as Theme["colors"],
};

// 3. Component contract
type Size = "sm" | "md" | "lg";
type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
```

**Three layers of tokens:** primitive (`blue.500`) → semantic (`action.primary.bg`) → optional component (`button.primary.bg`). Dark mode only changes the semantic layer mapping. Components never know about `blue.500`.

| Entity | Lives in | Why |
|---|---|---|
| Token values (source) | `tokens/*.json` in the monorepo, synced from Figma | One source of truth, reviewed via PR, diffable. |
| Generated CSS variables | `@acme/tokens` package (`tokens.css`) | Browser applies theme with no JS; works with SSR. |
| Typed token names | `@acme/tokens` package (`tokens.ts`) | Autocomplete and type errors for wrong token names. |
| Current theme (light/dark) | `data-theme` attribute on `<html>` + localStorage + cookie | CSS switches instantly; cookie lets SSR render the right theme with no flash. |
| Component variants, sizes | Package (TS types + CSS) | Part of the public API, versioned. |
| Open/closed, selected value | Component state (uncontrolled) or parent state (controlled) | Consumer decides; see controlled vs uncontrolled below. |
| Usage analytics (which components each app uses) | CI scan script output (JSON) | Helps plan deprecations and migrations. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
// Button: polymorphic, ref-forwarding
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;     // default "primary"
  size?: Size;                 // default "md"
  isLoading?: boolean;         // shows spinner, keeps width, sets aria-busy
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;           // render child element (e.g. <Link>) with button styles
}

// Text input: controlled OR uncontrolled
interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;               // required -> accessible by default
  helperText?: string;
  errorText?: string;          // sets aria-invalid + aria-describedby
  size?: Size;
  value?: string;              // controlled
  defaultValue?: string;       // uncontrolled
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Select: compound components
// <Select value={v} onValueChange={setV}>
//   <Select.Trigger placeholder="Choose bank" />
//   <Select.Content>
//     <Select.Item value="hdfc">HDFC</Select.Item>
//     <Select.Item value="icici" disabled>ICICI</Select.Item>
//   </Select.Content>
// </Select>
interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;               // used for aria-labelledby
  size?: "sm" | "md" | "lg" | "fullscreen";
  initialFocusRef?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}
```

API rules we follow everywhere: same names for the same idea (`size`, `variant`, `isDisabled` vs `disabled` — pick one), events named `onXChange`, booleans start with `is`/`has` or match the native attribute, every component spreads `...rest` to the root and forwards `ref`.

### Package public API, token export format, theming API

There is no server API. The public "API" is the packages.

```ts
// @acme/react — public entry (index.ts), named exports only, no default exports
export { Button } from "./Button";
export { TextField } from "./TextField";
export { Select } from "./Select";
export { Modal } from "./Modal";
export { ThemeProvider, useTheme } from "./theme";
export type { ButtonProps, TextFieldProps, SelectProps, ModalProps } from "./types";
```

```json
// package.json (key parts)
{
  "name": "@acme/react",
  "version": "5.8.0",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./styles.css": "./dist/styles.css"
  },
  "peerDependencies": { "react": "^18.2.0 || ^19.0.0", "react-dom": "^18.2.0 || ^19.0.0" }
}
```

Token export format — generated `tokens.css`:

```css
:root, [data-theme="light"] {
  --color-surface-default: #FFFFFF;
  --color-text-primary: #0F172A;
  --color-action-primary-bg: #2563EB;
  --color-focus-ring: #2563EB;
  --space-1: 4px; --space-2: 8px; --space-4: 16px;
  --radius-md: 8px;
  --font-size-200: 14px;
}
[data-theme="dark"] {
  --color-surface-default: #0F172A;
  --color-text-primary: #F8FAFC;
  --color-action-primary-bg: #60A5FA;
}
```

Generated `tokens.ts` (typed references, not raw values, so theming still works):

```ts
export const vars = {
  color: { text: { primary: "var(--color-text-primary)" }, action: { primary: { bg: "var(--color-action-primary-bg)" } } },
  space: { 1: "var(--space-1)", 2: "var(--space-2)", 4: "var(--space-4)" },
} as const;
```

Theming API:

```tsx
<ThemeProvider defaultTheme="system" storageKey="acme-theme">
  <App />
</ThemeProvider>

const { theme, resolvedTheme, setTheme } = useTheme(); // setTheme("dark")

// Scoped theme: a dark promo card inside a light page
<ThemeProvider theme="dark" scoped><PromoCard /></ThemeProvider> // sets data-theme on a wrapper div
```

`ThemeProvider` only sets `data-theme` and saves the choice. CSS does the rest. To avoid a flash of the wrong theme, ship a tiny inline script in `<head>` that reads the cookie/localStorage and sets `data-theme` before first paint.

## 5. Optimizations and deep dives

### 5.1 Design tokens and theming

- **Why CSS variables?** Change `data-theme` on `<html>` and every component updates in one style recalculation. No React re-render, no JS per component. Works in SSR and Server Components.
- **Semantic naming is the key idea.** Components use `--color-text-primary`, never `--blue-900`. Then dark mode, a partner brand, or high-contrast mode is just another mapping file.
- **Spacing scale on 4 px:** 4, 8, 12, 16, 24, 32, 48. Limits random values like `13px`.
- **Typography tokens as sets:** `text.body.md = { size: 14px, lineHeight: 20px, weight: 400 }` so teams do not mix sizes and line-heights randomly.
- **Dark mode is not "invert colors".** Surfaces get lighter as they get higher (elevation) instead of using shadows; saturated brand colors are toned down to keep contrast.
- **Contrast checks in CI:** a script loops through known text/background pairs per theme and fails below 4.5:1 (3:1 for large text and UI borders).
- **No flash on load:** inline `<script>` in `<head>` sets `data-theme` from cookie before CSS paints. With SSR, read the cookie on the server and render the attribute.

### 5.2 Component API design principles

**Composition with compound components.** Instead of one component with 30 props (`<Select options items renderItem groupBy ...>`), give small parts that share state via context.

```tsx
const SelectContext = createContext<SelectState | null>(null);

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [selected, setSelected] = useControllableState({ value, defaultValue, onChange: onValueChange });
  const [open, setOpen] = useState(false);
  return (
    <SelectContext.Provider value={{ selected, setSelected, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  );
}
Select.Trigger = SelectTrigger;
Select.Content = SelectContent;
Select.Item = SelectItem;
```

Teams can add icons, groups, dividers, or custom rows without us adding new props.

**Controlled vs uncontrolled.** Support both with one hook:

```ts
function useControllableState<T>({ value, defaultValue, onChange }: {
  value?: T; defaultValue: T; onChange?: (v: T) => void;
}) {
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

Uncontrolled = easy default (`defaultValue`). Controlled = parent owns state (`value` + `onValueChange`), needed for forms and validation. Warn in dev if a component switches between the two.

**Forwarding refs.** Consumers need the real DOM node for focus, scroll, tooltips, and form libraries (React Hook Form uses `ref`). Every component forwards ref to its main element. In React 19, `ref` is a normal prop; for React 18 support we still use `forwardRef`.

**Polymorphic `as` prop vs `asChild`.**
- `<Button as="a" href="/pay">` renders an `<a>` with button styles. Typing it correctly in TS is hard (props change by element) and slows the type checker.
- `asChild` (Radix "Slot" pattern): `<Button asChild><Link href="/pay">Pay</Link></Button>`. The child is rendered, and our props and classes are merged into it. Simpler types and works with Next.js `Link`. I would pick `asChild` for interactive components and `as` for layout/text (`<Text as="h2">`).

**Headless vs styled.**
- Headless = logic and a11y only (`useCombobox`, Radix primitives, React Aria). Teams bring their own styles.
- Styled = ready-to-use with brand look.
- We ship both layers: styled components are built **on top of** our headless hooks. 95% of usage is styled; a marketing team with a custom look can use the hooks and still get correct keyboard and ARIA behavior.

**Other rules:** spread `...rest` to the root, merge `className` instead of replacing, accept `data-*` and `aria-*`, never hide native props.

### 5.3 Styling approach trade-offs

| Approach | Good | Bad | Fit |
|---|---|---|---|
| CSS Modules + CSS variables | Zero runtime, plain CSS, works with RSC/SSR, easy to override | No type safety on class names (unless generated), variants are manual | Solid, boring, safe choice |
| Runtime CSS-in-JS (styled-components, Emotion) | Dynamic styles from props, colocated, theme via JS | Injects styles during render: slower, issues with React 18 streaming and Server Components, adds ~12 KB | Avoid for new libraries in 2026 |
| Zero-runtime CSS-in-JS (vanilla-extract, Panda CSS, Linaria) | Type-safe styles and tokens in TS, output is static CSS, variants API (`recipe`) | Needs a build plugin in every consumer's bundler (or we pre-compile), learning curve | Great for a library if we pre-build CSS |
| Tailwind | Fast to build, consistent scale, tiny CSS in apps | Consumers must run Tailwind with our preset and scan our package; class strings in library are hard to override; brand tokens must map into config | Good for apps; for a shared library only if all apps already use Tailwind |

**My pick:** vanilla-extract (or CSS Modules) **compiled at library build time** to plain `.css` + JS that only returns class names. Consumers do not need any plugin; they import `@acme/react/styles.css` once. Tokens are CSS variables, so theming stays runtime-free. In the interview, say "zero runtime" as the main reason.

### 5.4 Accessibility built in

The big promise of a design system: **teams get a11y for free** if they use our components.

- **Focus rings:** use `:focus-visible` so the ring shows for keyboard users but not mouse clicks. 2 px solid `--color-focus-ring` with 2 px offset. Never `outline: none` without a replacement.
- **Keyboard:** follow WAI-ARIA Authoring Practices. Tabs: arrow keys move, Home/End jump. Menu/Select: arrows, Enter, Esc, type-ahead. Modal: focus trap, Esc closes, focus returns to the trigger.
- **ARIA wired automatically:** `TextField` makes `label` required and links `aria-describedby` to helper/error text with `useId()`. `Button isLoading` sets `aria-busy` and keeps the label for screen readers. Icon-only buttons require `aria-label` (TS type enforces it).
- **Use native elements first:** `<button>`, `<input type="checkbox">` styled, not `<div onClick>`.
- **Testing:**
  - Unit: `jest-axe` / `vitest-axe` on every component state: `expect(await axe(container)).toHaveNoViolations()`.
  - Storybook a11y addon runs axe on every story in CI.
  - Playwright keyboard tests for complex widgets (Select, Modal, DatePicker).
  - Manual check with VoiceOver and TalkBack before each major release — axe catches only ~30–40% of issues.
- **Motion and contrast:** respect `prefers-reduced-motion`; contrast checked at token level.

### 5.5 Packaging, distribution, and versioning

- **Monorepo** with pnpm workspaces + Turborepo: `tokens`, `react-hooks`, `react`, `icons`, `docs`, `codemods`. Shared tsconfig and lint; Turborepo caches builds.
- **Build:** `tsup` or Rollup outputs **ESM** (main) + CJS (for old Jest setups) + `.d.ts`. Keep one file per component (`preserveModules`) so bundlers can drop unused ones.
- **Tree-shaking checklist:**
  - ESM output, named exports only.
  - `"sideEffects": ["**/*.css"]` in package.json so JS files are marked safe to drop.
  - No top-level code that runs on import (no global registrations).
  - Icons: one component per file; never a giant `icons` object.
- **Peer dependencies:** `react` and `react-dom` are **peers**, not dependencies. Otherwise apps can end up with two Reacts, which breaks hooks ("Invalid hook call").
- **Semantic versioning:** MAJOR = breaking prop/behavior change, MINOR = new component/prop or visual change, PATCH = bug fix.
- **Changesets:** every PR adds a small `.changeset/*.md` saying which packages change and how (`minor`, `patch`) with a human note. On merge, a bot opens a "Version Packages" PR that bumps versions and writes CHANGELOGs; merging it publishes to npm.
- **"use client"** banner on interactive components so they work in Next.js App Router; pure layout components (Box, Text) stay server-safe.

### 5.6 Docs, visual regression, adoption, and bundle budgets

**Storybook docs**
- One story per important state: each variant × size, disabled, loading, error, long text, RTL, dark theme.
- Autodocs generate props tables from TS types. Add MDX pages for usage rules: "Use one primary button per screen".
- Stories double as test cases (interaction tests with `play` functions).

**Visual regression**
- Chromatic or Playwright screenshots of every story in light and dark. A pixel diff on a PR shows exactly what changed.
- Catches "I changed padding in Button and broke 40 components" before release. Designers review the diffs.
- Disable animations and use fixed fonts in the test environment to avoid flaky diffs.

**Adoption and migration**
- Start with 2 pilot teams (e.g. checkout and dashboard), learn, then roll out.
- **Deprecations:** mark old props with `@deprecated` JSDoc (strikethrough in editor) + a dev-only `console.warn` once per session. Keep it working for at least one major version.
- **Codemods** (jscodeshift): `npx @acme/codemods v5-to-v6` renames props (`type="primary"` → `variant="primary"`) and imports automatically. Saves weeks across 15 teams.
- **ESLint plugin:** rules like `no-raw-colors` (ban hex values in app CSS, suggest tokens) and `no-deprecated-components`.
- **Adoption tracking:** a script scans app repos for imports of `@acme/react` vs old libraries; a dashboard shows % adoption per team.

**Bundle size budgets**
- `size-limit` in CI with budgets: `Button` ≤ 5 KB gz, `Select` ≤ 12 KB gz, full library ≤ 80 KB gz. PR fails if exceeded and posts the diff as a comment.
- Avoid heavy deps: no lodash (use small utils), no moment; use `@floating-ui/dom` (~3 KB) for positioning.
- Lazy-load heavy parts (DatePicker calendar locale data) inside the component.

### Also mention

- RTL support using logical CSS properties (`margin-inline-start`) — cheap to add early, painful later.
- Icon pipeline: SVGs from Figma → SVGO → React components with `currentColor`.
- Versioned docs site so teams on v5 can still read v5 docs.
- A contribution model: other teams can propose components via RFC; core team reviews API.
- Responsive props (`size={{ base: "sm", md: "lg" }}`) — useful but adds complexity; keep to layout components.
- Token naming review with design: renaming tokens later is a breaking change.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Theming | CSS variables | JS theme object in React context | CSS variables. Theme switch without re-render, SSR-safe, no JS cost. |
| Styling | Runtime CSS-in-JS | Zero-runtime (vanilla-extract / CSS Modules) | Zero-runtime, pre-compiled. Faster, works with RSC, no consumer plugin. |
| Component shape | One big component with many props | Compound components | Compound for complex widgets (Select, Tabs, Menu). Simple props for Button, Badge. |
| Polymorphism | `as` prop | `asChild` (Slot) | `asChild` for interactive parts (better types, router links), `as` for Text/Box. |
| Logic + style | Styled only | Headless hooks + styled layer | Both. Styled for speed; headless for teams that need a custom look. |
| Repo | Single package | Monorepo, multiple packages | Monorepo. Tokens and icons can be used without React; independent versions. |
| Versioning | Manual bumps | Changesets | Changesets. Every PR declares impact; changelogs are automatic. |
| Release style | Big-bang breaking release | Deprecate → codemod → remove | Deprecate first with warnings and a codemod. Teams upgrade on their own schedule. |

## 7. Likely follow-up questions

**Q1. How do you stop teams from using random hex colors?**
ESLint / Stylelint rule that bans hex/rgb values in app code and suggests the matching token. Make tokens easy to find with TS autocomplete. Track violations per repo.

**Q2. A team needs a Button variant you do not have. What do you do?**
First ask if an existing variant fits. If it is a one-off, they use `className` with tokens. If 3+ teams need it, add it to the system through an RFC. Never let teams fork the component.

**Q3. How do you make a breaking change safely?**
Add the new API next to the old one. Mark old as `@deprecated` with a dev warning. Ship a codemod. Remove in the next major after usage tracking shows near-zero use. Write a migration guide.

**Q4. How do you avoid a flash of light theme for dark-mode users?**
Store choice in a cookie; SSR reads it and renders `<html data-theme="dark">`. For static pages, a tiny blocking inline script in `<head>` sets the attribute before paint.

**Q5. Why are React and React DOM peer dependencies?**
So the app's single React instance is used. If the library bundles its own React, hooks break with "Invalid hook call" and bundle size doubles.

**Q6. How does tree-shaking actually work here?**
Bundlers (webpack, Vite/Rollup) remove unused ESM exports. They need static `import`/`export`, and they need to know files have no side effects (`sideEffects` field). CSS is marked as a side effect so it is never dropped.

**Q7. How do you sync tokens between Figma and code?**
Tokens Studio exports JSON to a Git branch and opens a PR. Style Dictionary builds platform outputs. The JSON in Git is the source of truth for code; CI checks contrast and runs visual diffs.

**Q8. How do you measure success of the design system?**
Adoption % (imports of new vs old library), number of one-off components in apps going down, a11y violations per app, time to build a new screen, and bundle size of apps.

**Q9. How would you support React Native later?**
Tokens already export JSON; add a Style Dictionary target for RN (JS objects with numbers, not CSS strings). Headless hooks can be shared if they avoid DOM APIs; styled components are written per platform.

## 8. If you only have 60 seconds

- **Tokens first:** primitive → semantic → component, generated from Figma JSON with Style Dictionary into **CSS variables**; dark mode = remap semantic tokens via `data-theme`.
- **Component APIs:** compound components for complex widgets, controlled + uncontrolled via one hook, forward refs, spread rest props, `asChild` for links.
- **Two layers:** headless hooks for logic and a11y, styled components on top.
- **Styling:** zero-runtime (vanilla-extract or CSS Modules) pre-compiled to CSS — fast, SSR/RSC friendly.
- **A11y built in:** `:focus-visible`, WAI-ARIA keyboard patterns, required labels, axe in CI.
- **Shipping:** pnpm monorepo, ESM + `sideEffects`, React as peer dep, semver with changesets, size-limit budgets.
- **Adoption:** Storybook docs, visual regression, deprecations with codemods, ESLint rules, adoption dashboard.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Users/teams, themes, SSR, a11y target, existing libraries. |
| 4–8 | Requirements | Tokens, themes, components, docs; bundle size, zero runtime, AA. |
| 8–15 | Architecture | Figma → tokens → packages → apps diagram; the "change brand color" flow. |
| 15–21 | Data model | Three token layers, theme mapping, where state lives. |
| 21–27 | API | Button / TextField / Select props, package exports, `tokens.css`, ThemeProvider. |
| 27–40 | Deep dives | Compound + controlled/uncontrolled, styling choice, a11y, tree-shaking + versioning. |
| 40–45 | Trade-offs + wrap-up | Styling and migration trade-offs, adoption metrics, questions. |

## Common mistakes

- Jumping to components before defining data/entities — for a design system that means **tokens and naming** come before any Button.
- Using raw palette values (`blue-500`) in components instead of semantic tokens, which makes dark mode a rewrite.
- Choosing runtime CSS-in-JS without mentioning SSR, Server Components, and render cost.
- Forgetting React as a peer dependency, or shipping CJS only, so nothing tree-shakes.
- Treating accessibility as "add ARIA later" instead of building keyboard and focus into each component and testing with axe.
- No plan for adoption: no versioning policy, no deprecations, no codemods — the library exists but nobody migrates.

## My mistakes

- [ ]
