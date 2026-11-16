# Frontend Interview Question Bank (3 YOE)

Companion to [PREP_PLAN.md](PREP_PLAN.md). ★ = must do (do these first). *(Company)* = reported in a candidate write-up.

**Contents**
1. Machine coding (60+)
2. JS polyfills & utilities (80+)
3. DSA (150, by pattern)
4. JavaScript theory & output questions
5. React / Next.js
6. Frontend system design
7. Web fundamentals, browser, security
8. CSS & HTML
9. TypeScript
10. Behavioral

---

## 1. Machine Coding

### Checklist for every build (this is what interviewers grade)
- [ ] Clarify requirements first (2–3 min) and say your assumptions out loud
- [ ] Component breakdown before coding (draw the tree)
- [ ] Clean props API, no prop drilling beyond 2 levels
- [ ] Loading / error / empty states
- [ ] Keyboard access + ARIA (tab, enter, escape, arrow keys)
- [ ] Edge cases (empty input, rapid clicks, race conditions, huge lists)
- [ ] Mention what you'd add with more time (tests, memoization, virtualization)

### Easy: build each in under 45 min
- [ ] ★ Counter (increment/decrement/reset, step input, min/max)
- [ ] ★ Todo app (add/edit/delete/complete/filter, persist in localStorage)
- [ ] ★ Accordion (single-open + multi-open modes) *(Microsoft)*
- [ ] ★ Tabs (dynamic tabs, keyboard nav) *(Atlassian, Adobe, Microsoft)*
- [ ] ★ Star rating (hover preview, click to set, half stars, keyboard) *(Amazon)*
- [ ] ★ Modal (portal, focus trap, ESC, click outside, scroll lock)
- [ ] Toggle switch / dark mode toggle (persist, respects `prefers-color-scheme`)
- [ ] Progress bar (animate 0→100%)
- [ ] Traffic light (red→green→yellow timers, configurable)
- [ ] Stopwatch (start/pause/reset/lap)
- [ ] Countdown timer (HH:MM:SS input, pause/resume)
- [ ] Toast notifications (stacking, auto-dismiss, types, position)
- [ ] Tooltip (positions, hover + focus, viewport edge handling)
- [ ] Password strength meter + show/hide
- [ ] Textarea with character counter + limit
- [ ] Like button with optimistic update + rollback on error
- [ ] Fetch & display list from API (loading/error/retry)
- [ ] Dice roller / random color generator
- [ ] Breadcrumbs from a route path
- [ ] Copy-to-clipboard button with feedback
- [ ] "Last seen" relative timestamp component (just now / 5m ago / yesterday) *(Amazon)*

### Medium: 60–90 min (the core of most rounds)
- [ ] ★ Autocomplete / typeahead (debounce, cache, keyboard nav, highlight match, handle out-of-order responses)
- [ ] ★ Pagination (client-side + server-side, page size selector, ellipsis)
- [ ] ★ Infinite scroll (IntersectionObserver, loading sentinel, end of list)
- [ ] ★ Image carousel (React **and vanilla JS**, auto-play, dots, swipe, infinite loop) *(Amazon vanilla JS, Microsoft, Agoda)*
- [ ] ★ OTP input (auto-focus next, backspace to prev, paste full code)
- [ ] ★ Data table with sort + filter + search + pagination *(Paytm: sort + date filter must work together)*
- [ ] ★ Nested comments (reply, edit, delete, collapse, recursive render)
- [ ] ★ File/folder explorer (expand/collapse, add/rename/delete, recursive)
- [ ] ★ Nested checkbox tree (checking parent checks children; partial = indeterminate)
- [ ] ★ Tic-tac-toe (N×N, winner check, undo, restart) *(Microsoft)*
- [ ] ★ Grid Light Box: click cells to light them up; when all are lit they turn off **in reverse order** *(Uber)*
- [ ] ★ Multi-step form wizard (validation per step, back/next, summary)
- [ ] Form with validation (sync + async e.g. "username taken", error messages, submit disable)
- [ ] Progress bars queue: "Add" button adds bars that fill over 2s, with max 3 filling concurrently
- [ ] Transfer list (two lists, move selected items between them)
- [ ] Multi-select dropdown with chips + search
- [ ] Drag-and-drop list reorder (native HTML5 DnD)
- [ ] Date picker / calendar month view
- [ ] Memory card matching game
- [ ] Whack-a-mole
- [ ] Shopping cart (add/remove/qty, totals, coupon)
- [ ] Poll widget (vote, percentage bars, one vote per user)
- [ ] Stepper / order tracker
- [ ] Job board with "load more" (Hacker News API)
- [ ] Star Wars / GitHub user search with debounce + pagination
- [ ] Sortable, resizable table columns
- [ ] Accessible dropdown menu (arrow keys, typeahead, ESC)
- [ ] Image gallery with lightbox (next/prev, keyboard, lazy load)
- [ ] Rate-limited "Load more" button (throttle clicks)

### Hard: 90–120 min (SDE-2 and above)
- [ ] ★ Payment app: send money + receive cashback, SOLID principles *(Flipkart)*
- [ ] ★ Kanban board (columns, drag & drop between columns, add/edit cards, persist)
- [ ] ★ Virtualized list (render 10k rows, only the visible ones)
- [ ] ★ Chat UI with streaming AI responses (stream tokens, stop button, retry, auto-scroll)
- [ ] Spreadsheet (cells, `=A1+B2` formulas, dependency recompute)
- [ ] Google Calendar day view (overlapping events side by side)
- [ ] Undo/redo text or drawing editor (command pattern)
- [ ] Snake game
- [ ] Connect Four / Sudoku validator + UI
- [ ] Chess board with legal moves for one piece
- [ ] Music/video player controls (play/pause/seek/volume/playlist)
- [ ] Basic rich text editor (bold/italic/list via contenteditable)
- [ ] Mini Trello / Jira board with filters
- [ ] Excel-like editable grid with keyboard navigation
- [ ] ATM machine (LLD + code: states, withdraw, denominations) *(Razorpay)*

---

## 2. JS Polyfills & Utilities

Write each **from memory** with edge cases. Say the time complexity out loud.

### Array.prototype
- [ ] ★ map · [ ] ★ filter · [ ] ★ reduce (with/without initial value) · [ ] forEach
- [ ] find / findIndex · [ ] some / every · [ ] includes (NaN!) · [ ] indexOf
- [ ] ★ flat (with depth) · [ ] flatMap · [ ] Array.from · [ ] fill · [ ] concat · [ ] reverse / sort (implement merge sort)

### Function
- [ ] ★ call · [ ] ★ apply · [ ] ★ bind (including `new` on a bound fn) *(Paytm)*
- [ ] ★ debounce (leading/trailing, cancel, flush) *(Paytm, PhonePe)*
- [ ] ★ throttle (leading/trailing) *(Paytm, Walmart)*
- [ ] ★ memoize (custom key resolver) · [ ] ★ curry (fixed arity + infinite `sum(1)(2)(3)()`)
- [ ] once · [ ] compose / pipe · [ ] partial application · [ ] `sum(1)(2)(3).valueOf()`

### Promise
- [ ] ★ Custom Promise class (states, then chaining, catch, finally, async resolution)
- [ ] ★ Promise.all *(Paytm)* · [ ] ★ Promise.allSettled · [ ] ★ Promise.race · [ ] ★ Promise.any
- [ ] Promise.resolve / reject · [ ] promisify (callback → promise)
- [ ] ★ sleep / delay · [ ] ★ retry with exponential backoff · [ ] promise with timeout
- [ ] ★ Run promises in sequence (reduce chain) · [ ] ★ **Promise pool / concurrency limit** (run N at a time)
- [ ] Task queue with priority · [ ] Cancelable fetch (AbortController) · [ ] Fetch with cache + TTL
- [ ] Dedupe in-flight requests (same URL → same promise)
- [ ] async/await implemented with generators

### Object
- [ ] ★ Deep clone (circular refs, Date, Map, Set, RegExp) · [ ] ★ Deep equal
- [ ] ★ Flatten nested object `{a:{b:1}}` → `{"a.b":1}` *(PhonePe)* · [ ] Unflatten
- [ ] ★ `_.get(obj, "a.b[0].c", default)` · [ ] `_.set` · [ ] deep merge
- [ ] Object.assign · [ ] Object.create · [ ] Object.entries / fromEntries · [ ] deep freeze
- [ ] pick / omit · [ ] ★ JSON.stringify (simplified: handles nested, arrays, strings, undefined) · [ ] JSON.parse (simplified)
- [ ] ★ instanceof · [ ] ★ `new` operator · [ ] Object.is

### Data-structure utilities
- [ ] ★ EventEmitter (on, off, once, emit) · [ ] Pub/Sub · [ ] Observable (basic)
- [ ] ★ LRU cache (Map-based) · [ ] localStorage with expiry
- [ ] chunk · [ ] groupBy · [ ] uniqBy · [ ] intersection / difference · [ ] zip · [ ] shuffle (Fisher–Yates)
- [ ] ★ Array → tree (parentId list to nested) · [ ] Tree → flat array
- [ ] classnames() utility · [ ] Template engine `"Hi {{name}}"` · [ ] camelCase ↔ snake_case keys (deep)

### Timers
- [ ] ★ setInterval using setTimeout · [ ] clearAllTimeouts · [ ] Custom setTimeout using requestAnimationFrame
- [ ] Batch analytics events (flush every N events or T ms, `sendBeacon` on unload)

### DOM
- [ ] ★ getElementsByClassName (tree traversal) · [ ] getElementsByTagName
- [ ] ★ Find corresponding node in two identical DOM trees
- [ ] ★ Event delegation helper · [ ] Render JSON (virtual DOM) to real DOM · [ ] DOM → JSON
- [ ] Lazy-load images with IntersectionObserver · [ ] Infinite scroll in vanilla JS
- [ ] Highlight search term in text · [ ] Detect click outside element
- [ ] Simple `useState`-like reactive store in vanilla JS (state + subscribe + render)

### String
- [ ] trim · [ ] repeat · [ ] padStart · [ ] reverse words · [ ] compress `aaabb` → `a3b2`
- [ ] Format number with commas (Indian + international) · [ ] Relative time ("5m ago")

---

## 3. DSA: 150 problems by pattern (LeetCode numbers)

Frontend interviews are mostly **Easy–Medium**. Hard problems are optional. Do ★ first (~75), then the rest.
✅ = already in this repo; re-solve from memory.

### Arrays & Hashing
- [ ] ★ 1 Two Sum ✅ · [ ] ★ 217 Contains Duplicate · [ ] ★ 242 Valid Anagram · [ ] ★ 49 Group Anagrams
- [ ] ★ 347 Top K Frequent · [ ] ★ 238 Product Except Self · [ ] ★ 128 Longest Consecutive
- [ ] ★ 169 Majority Element ✅ · [ ] ★ 53 Max Subarray (Kadane) ✅ · [ ] ★ 121 Buy/Sell Stock ✅
- [ ] ★ 189 Rotate Array ✅ · [ ] ★ 268 Missing Number · [ ] ★ 283 Move Zeroes · [ ] 136 Single Number
- [ ] 485 Max Consecutive Ones · [ ] 26 Remove Duplicates · [ ] 27 Remove Element · [ ] 88 Merge Sorted Array
- [ ] ★ 75 Sort Colors · [ ] 31 Next Permutation · [ ] 118 Pascal's Triangle · [ ] 36 Valid Sudoku
- [ ] ★ 54 Spiral Matrix · [ ] 48 Rotate Image · [ ] 73 Set Matrix Zeroes · [ ] 349 Intersection of Two Arrays

### Two Pointers
- [ ] ★ 125 Valid Palindrome · [ ] ★ 167 Two Sum II · [ ] ★ 15 3Sum · [ ] ★ 11 Container With Most Water
- [ ] 344 Reverse String · [ ] 977 Squares of Sorted Array · [ ] 42 Trapping Rain Water (hard)

### Sliding Window
- [ ] ★ 3 Longest Substring Without Repeating · [ ] ★ 424 Longest Repeating Char Replacement
- [ ] ★ 567 Permutation in String · [ ] ★ 209 Min Size Subarray Sum · [ ] 643 Max Average Subarray I
- [ ] 1004 Max Consecutive Ones III · [ ] 438 Find All Anagrams · [ ] 76 Min Window Substring (hard) · [ ] 239 Sliding Window Max (hard)

### Prefix Sum
- [ ] ★ 560 Subarray Sum Equals K · [ ] 303 Range Sum Query · [ ] 724 Pivot Index · [ ] 525 Contiguous Array

### Strings
- [ ] ★ 14 Longest Common Prefix · [ ] ★ 5 Longest Palindromic Substring · [ ] 647 Palindromic Substrings
- [ ] ★ 151 Reverse Words · [ ] 387 First Unique Char · [ ] 383 Ransom Note · [ ] 205 Isomorphic Strings
- [ ] 8 String to Integer (atoi) · [ ] 443 String Compression

### Binary Search
- [ ] ★ 704 Binary Search · [ ] ★ 35 Search Insert · [ ] ★ 34 First/Last Position · [ ] ★ 33 Search Rotated
- [ ] ★ 153 Min in Rotated · [ ] ★ 875 Koko Eating Bananas · [ ] 74 Search 2D Matrix · [ ] 162 Find Peak
- [ ] 278 First Bad Version · [ ] 69 Sqrt(x)

### Stack & Queue
- [ ] ★ 20 Valid Parentheses · [ ] ★ 155 Min Stack · [ ] ★ 739 Daily Temperatures · [ ] ★ 496 Next Greater Element
- [ ] ★ 150 Evaluate RPN · [ ] 232 Queue using Stacks · [ ] 225 Stack using Queues
- [ ] ★ 394 Decode String · [ ] ★ 71 Simplify Path · [ ] 22 Generate Parentheses · [ ] 853 Car Fleet
- [ ] 84 Largest Rectangle in Histogram (hard)

### Linked List
- [ ] ★ 206 Reverse · [ ] ★ 21 Merge Two Sorted · [ ] ★ 141 Cycle · [ ] 142 Cycle II · [ ] ★ 876 Middle
- [ ] ★ 19 Remove Nth From End · [ ] 143 Reorder · [ ] ★ 2 Add Two Numbers · [ ] 234 Palindrome LL
- [ ] 160 Intersection · [ ] ★ 146 **LRU Cache** · [ ] 138 Copy List with Random Pointer
- [ ] 23 Merge K Sorted (hard) · [ ] 25 Reverse K Group (hard)

### Recursion & Backtracking
- [ ] ★ 78 Subsets · [ ] ★ 46 Permutations · [ ] ★ 39 Combination Sum · [ ] 17 Letter Combinations
- [ ] 79 Word Search · [ ] 90 Subsets II · [ ] 131 Palindrome Partitioning

### Trees (important: the DOM is a tree)
- [ ] ★ 94 / 144 / 145 Inorder / Preorder / Postorder (recursive + iterative)
- [ ] ★ 104 Max Depth · [ ] ★ 226 Invert · [ ] ★ 100 Same Tree · [ ] ★ 101 Symmetric · [ ] 572 Subtree
- [ ] ★ 102 Level Order · [ ] ★ 199 Right Side View · [ ] 103 Zigzag · [ ] ★ 543 Diameter · [ ] 110 Balanced
- [ ] 112 Path Sum · [ ] ★ 235 LCA of BST · [ ] ★ 236 LCA of Binary Tree · [ ] ★ 98 Validate BST
- [ ] 230 Kth Smallest in BST · [ ] 105 Build from Preorder+Inorder · [ ] 208 Implement Trie (autocomplete!)
- [ ] 297 Serialize/Deserialize (hard) · [ ] 124 Max Path Sum (hard)

### Heap / Priority Queue
- [ ] ★ 215 Kth Largest · [ ] ★ 703 Kth Largest in Stream · [ ] 1046 Last Stone Weight
- [ ] ★ 973 K Closest Points · [ ] 621 Task Scheduler · [ ] 295 Find Median from Stream (hard)

### Graphs
- [ ] ★ 200 Number of Islands · [ ] ★ 733 Flood Fill · [ ] ★ 994 Rotting Oranges · [ ] 133 Clone Graph
- [ ] ★ 207 Course Schedule · [ ] 210 Course Schedule II (topological sort) · [ ] 695 Max Area of Island
- [ ] 130 Surrounded Regions · [ ] 417 Pacific Atlantic · [ ] 127 Word Ladder (hard)

### Intervals
- [ ] ★ 56 Merge Intervals · [ ] ★ 57 Insert Interval · [ ] 435 Non-overlapping · [ ] 452 Min Arrows

### Greedy
- [ ] ★ 55 Jump Game · [ ] 45 Jump Game II · [ ] 134 Gas Station · [ ] 763 Partition Labels

### Dynamic Programming (basics only)
- [ ] ★ 70 Climbing Stairs · [ ] ★ 198 House Robber · [ ] 213 House Robber II · [ ] ★ 322 Coin Change
- [ ] ★ 300 Longest Increasing Subsequence · [ ] 139 Word Break · [ ] ★ 62 Unique Paths
- [ ] 1143 Longest Common Subsequence · [ ] 152 Max Product Subarray · [ ] 91 Decode Ways · [ ] 416 Partition Equal Subset

### Bit Manipulation
- [ ] 191 Number of 1 Bits · [ ] 338 Counting Bits · [ ] 190 Reverse Bits · [ ] 371 Sum of Two Integers

### Design
- [ ] ★ 146 LRU Cache · [ ] 380 Insert Delete GetRandom O(1) · [ ] 705 Design HashSet · [ ] 1472 Browser History (frontend-flavored)

---

## 4. JavaScript Theory & Output Questions

For each topic, explain it in 2 minutes **and** solve 5+ "what's the output?" questions.

- [ ] ★ var / let / const, hoisting, TDZ
- [ ] ★ Scope, lexical scope, scope chain
- [ ] ★ Closures (counter, private vars, loop with setTimeout + var vs let)
- [ ] ★ `this` in all contexts (method, standalone, arrow, `new`, call/apply/bind, event handler, class)
- [ ] ★ Event loop: call stack, microtasks (Promise, queueMicrotask, MutationObserver) vs macrotasks (setTimeout, I/O)
- [ ] ★ Promises vs async/await, error handling, unhandled rejections
- [ ] ★ Prototypes, prototype chain, `__proto__` vs `prototype`, classes are sugar
- [ ] ★ `==` vs `===`, type coercion, truthy/falsy, `typeof null`, NaN
- [ ] Shallow vs deep copy, spread, structuredClone
- [ ] Pass by value vs reference
- [ ] Map/Set vs WeakMap/WeakSet (and why Weak matters for memory)
- [ ] Generators & iterators, Symbol.iterator
- [ ] Getters/setters, Object.defineProperty, Proxy & Reflect
- [ ] Modules: ESM vs CommonJS, tree shaking, dynamic import
- [ ] Garbage collection & memory leaks (detached DOM, closures, listeners, timers)
- [ ] Currying vs partial application, pure functions, immutability
- [ ] Event bubbling, capturing, delegation, stopPropagation vs preventDefault
- [ ] Debounce vs throttle: when to use which
- [ ] `requestAnimationFrame`, `requestIdleCallback`
- [ ] Web Workers, SharedArrayBuffer (high level)
- [ ] Strict mode · [ ] Optional chaining & nullish coalescing · [ ] Tagged templates
- [ ] Error types, try/catch with async, `finally` behavior

---

## 5. React / Next.js

- [ ] ★ Virtual DOM, reconciliation, diffing, why `key` matters (and index-as-key bugs)
- [ ] ★ Rendering: what triggers a re-render, batching, React 18 automatic batching
- [ ] ★ useState (functional updates, stale state) · [ ] ★ useEffect (deps, cleanup, race conditions, Strict Mode double run)
- [ ] ★ useMemo / useCallback / React.memo: when they help, when they hurt
- [ ] ★ useRef (DOM refs, mutable values, previous value) · [ ] useLayoutEffect vs useEffect
- [ ] ★ useReducer · [ ] useContext + performance pitfalls · [ ] useTransition / useDeferredValue
- [ ] useId · [ ] useSyncExternalStore · [ ] forwardRef / useImperativeHandle
- [ ] ★ Custom hooks: useDebounce, useThrottle, useFetch, usePrevious, useLocalStorage, useOnClickOutside, useIntersectionObserver, useWindowSize, useInterval
- [ ] ★ Controlled vs uncontrolled components · [ ] Lifting state up · [ ] Composition vs inheritance
- [ ] HOC vs render props vs hooks · [ ] Compound components pattern
- [ ] Error boundaries · [ ] Suspense & lazy · [ ] Portals · [ ] Fragments
- [ ] ★ State management: Context vs Redux Toolkit vs Zustand vs React Query (server vs client state)
- [ ] React Query / SWR: caching, stale-while-revalidate, invalidation
- [ ] Fiber architecture & concurrent rendering (high level)
- [ ] React 19: Actions, `use()`, Server Components, React Compiler
- [ ] Testing: React Testing Library, mocking fetch, testing hooks
- [ ] ★ Next.js: CSR vs SSR vs SSG vs ISR *(Walmart)*, App Router, Server vs Client components
- [ ] ★ Hydration & hydration mismatch causes (Date.now, window, localStorage during render)
- [ ] Next.js caching, revalidation, middleware, route handlers, streaming
- [ ] ★ Debugging a slow React app: React Profiler, why-did-you-render, flame charts

---

## 6. Frontend System Design

**Framework (RADIO):** Requirements (functional + non-functional) → Architecture (components) → Data model (client state shape) → Interface (API contracts, pagination) → Optimizations (perf, a11y, offline, security, i18n)

### Problems
- [ ] ★ Autocomplete / search typeahead (debounce, cache, race conditions, a11y)
- [ ] ★ News feed / Instagram feed (pagination cursor, virtualization, optimistic likes)
- [ ] ★ Chat app / WhatsApp Web (WebSocket, offline queue, read receipts, ordering)
- [ ] ★ AI chat interface (token streaming via SSE, stop/regenerate, markdown rendering, history)
- [ ] ★ E-commerce product listing + cart (filters in URL, SSR for SEO, cart sync)
- [ ] Image carousel / Pinterest masonry grid
- [ ] Google Docs collaborative editor (OT vs CRDT, presence, conflict resolution)
- [ ] Design system / component library (tokens, theming, versioning, a11y)
- [ ] Real-time dashboard / stock ticker (polling vs WS, throttled rendering)
- [ ] Video streaming player (Netflix/YouTube: adaptive bitrate, buffering)
- [ ] Travel/hotel booking flow
- [ ] Jira / Kanban project board
- [ ] Notification system (toast + inbox, real-time)
- [ ] Analytics / event-tracking SDK (batching, retry, sendBeacon)
- [ ] Rich text editor · [ ] Spreadsheet (Google Sheets) · [ ] Comments system (nested, pagination)
- [ ] Micro-frontends architecture (module federation, pros/cons)

### Concepts to know
- [ ] Rendering patterns: CSR, SSR, SSG, ISR, streaming, islands
- [ ] Pagination: offset vs cursor · [ ] REST vs GraphQL vs tRPC
- [ ] Real-time: polling, long polling, SSE, WebSockets
- [ ] Caching layers: browser, HTTP, service worker, CDN, in-memory, IndexedDB
- [ ] Optimistic updates & rollback · [ ] Offline-first
- [ ] Performance budget, Core Web Vitals, bundle analysis
- [ ] i18n, RTL, a11y at scale · [ ] Feature flags, A/B tests · [ ] Error monitoring (Sentry), logging

---

## 7. Web Fundamentals, Browser, Security, Performance

- [ ] ★ What happens when you type a URL (DNS → TCP/TLS → HTTP → parse → render)
- [ ] ★ Critical rendering path: DOM, CSSOM, render tree, layout, paint, composite *(PhonePe)*
- [ ] ★ Reflow vs repaint, what triggers layout thrashing
- [ ] ★ Core Web Vitals: LCP, INP, CLS (causes + fixes)
- [ ] ★ Code splitting, lazy loading, tree shaking, preload/prefetch/preconnect
- [ ] Image optimization (WebP/AVIF, srcset, lazy, dimensions to avoid CLS)
- [ ] `async` vs `defer` scripts · [ ] Web fonts loading (FOIT/FOUT, font-display)
- [ ] ★ HTTP caching: Cache-Control, ETag, Last-Modified · [ ] CDN
- [ ] HTTP/1.1 vs HTTP/2 vs HTTP/3 · [ ] Status codes
- [ ] ★ CORS (preflight, credentials) · [ ] ★ XSS (stored/reflected/DOM, sanitization, CSP) *(Walmart)*
- [ ] ★ CSRF (SameSite cookies, tokens) · [ ] Clickjacking · [ ] Secure/HttpOnly cookies
- [ ] ★ Auth: cookies vs JWT in localStorage, OAuth flow, refresh tokens
- [ ] Storage: cookies vs localStorage vs sessionStorage vs IndexedDB
- [ ] Service workers, PWA, caching strategies
- [ ] Webpack vs Vite, Babel, how bundlers work, source maps, HMR
- [ ] Accessibility: semantic HTML, ARIA roles, focus management, screen readers, color contrast

---

## 8. CSS & HTML

- [ ] ★ Box model, `box-sizing` · [ ] ★ Specificity & cascade · [ ] ★ Flexbox (all properties)
- [ ] ★ Grid (template areas, auto-fit vs auto-fill, minmax) · [ ] ★ Positioning (relative/absolute/fixed/sticky)
- [ ] Stacking context & z-index bugs · [ ] BFC, margin collapse
- [ ] Responsive design: media queries, **container queries**, mobile-first, clamp()
- [ ] Units: rem/em/%/vh/vw/dvh · [ ] Pseudo-classes vs pseudo-elements
- [ ] Centering a div (5 ways) · [ ] CSS variables & theming · [ ] Transitions vs animations, GPU-friendly properties
- [ ] CSS-in-JS vs CSS Modules vs Tailwind (trade-offs)
- [ ] Semantic HTML5, forms & validation, `<dialog>`, meta tags, SEO basics

---

## 9. TypeScript

- [ ] ★ type vs interface · [ ] ★ Generics (constraints, defaults) · [ ] ★ Utility types: Partial, Required, Pick, Omit, Record, ReturnType, Parameters
- [ ] ★ Union, intersection, discriminated unions, type narrowing & guards
- [ ] unknown vs any vs never · [ ] keyof, typeof, indexed access, mapped & conditional types, `infer`
- [ ] ★ Typing React: props, children, events, refs, generic components, custom hooks
- [ ] Implement utility types yourself (MyPick, MyOmit, MyReadonly, DeepPartial)

---

## 10. Behavioral (write STAR stories)

- [ ] ★ Tell me about yourself (90 sec: current role → 2 wins → why this role)
- [ ] ★ Why were you laid off? (factual, 2 lines, then what you're doing now)
- [ ] ★ Biggest technical achievement (with numbers)
- [ ] ★ A performance problem you fixed
- [ ] ★ Conflict with a teammate / PM / designer
- [ ] ★ A failure / a bug you shipped, and what you learned
- [ ] Ownership beyond your role · [ ] Tight deadline / trade-off you made
- [ ] Disagreeing with a decision · [ ] Mentoring someone · [ ] Learning something fast
- [ ] Why this company? (research each one) · [ ] Questions to ask the interviewer (have 3 ready)
- [ ] Amazon: map stories to Leadership Principles (Customer Obsession, Ownership, Dive Deep, Bias for Action, Deliver Results)
- [ ] Flipkart/Razorpay: product sense ("how would you improve X feature?")

---

## Practice platforms
- **Machine coding / polyfills:** GreatFrontEnd, BFE.dev (BigFrontEnd), devtools.tech, frontendgeek.com, learnersbucket.com
- **DSA:** LeetCode (NeetCode 150 / Striver A2Z), NeetCode videos when stuck
- **System design:** GreatFrontEnd system design, Namaste Frontend System Design, frontendinterviews.dev
- **Interview experiences:** LeetCode Discuss, Glassdoor, GeeksforGeeks, frontend-junction.com, Medium
- **Mocks:** Pramp, peers, or Claude
