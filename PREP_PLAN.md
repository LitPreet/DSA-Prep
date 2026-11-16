# 8-Week Frontend Interview Plan (3 YOE, 8 hrs/day)

Start date: Mon 17 Nov 2026 · Target: offers by mid-Jan 2027

Tick `[x]` as you go. Commit every solved problem to this repo the same day.

Related files: [QUESTION_BANK.md](QUESTION_BANK.md) (all machine coding / polyfill / DSA / theory lists) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) (focused system design topics, resources, practice problems)

---

## Part 1: What companies actually ask (from candidate reports, 2025–2026)

These come from self-reported write-ups (Medium, GeeksforGeeks, Glassdoor, LeetCode Discuss, devtools.tech).
Formats change, so always check the latest reports before each interview.

### Where DSA matters least: apply here first (your DSA is still building)

| Company | Rounds / format | Questions reported |
|---|---|---|
| **Atlassian** | Karat screen (plain JS, **React not allowed**) → browser coding round (build a mock UI, any framework) → values/HM | Reviewers say "mostly React + JS, no LeetCode-style DSA". Graded on code quality + **testing** |
| **Swiggy** (SDE-2, 2026) | Take-home (array/string logic + small React app) → React primitives → JS internals → machine coding + UI architecture | No abstract algorithm puzzles. Focus on live UI build, runtime performance, async JS |
| **Paytm** | React machine coding → JS fundamentals | React app with **sorting + date filtering working together**, event loop, **Promise.all polyfill**, call/apply/bind, **debounce + throttle** |
| **PhonePe** | JS core → performance → machine coding | Event loop, **flatten nested object**, debouncing, browser rendering cycle, promises |
| **Walmart** | JS → React → frontend design | CSR vs SSR, performance for high-traffic e-commerce, **XSS mitigation**, **throttle** |
| **Razorpay** (SDE-2, 2026) | LLD (**ATM machine design + code**) → system design → React machine coding → web fundamentals + JS → HM | Mixed LLD + frontend |

### Medium DSA

| Company | Rounds / format | Questions reported |
|---|---|---|
| **Flipkart** (FE2/SDE-2) | 5 rounds: machine coding → DSA → UI depth → product sense → team fit | Machine coding: **payment app (send money + receive cashback)** with SOLID principles. Also DSA + HLD |
| **Uber** (Oct 2025) | CodeSignal (2 coding + JS/browser MCQ) → machine coding → design | **"Grid Light Box"** in React: click cells to light them up, then they turn off **in reverse order of activation** |
| **Amazon** (SDE-II FE) | Online test (HTML/CSS/JS) → F2F rounds → Leadership Principles | **Image carousel in vanilla JS**, **star rating**, **"last seen" timestamp** component, DSA mediums, heavy LP stories |
| **Microsoft** | Machine coding + DSA | Reported: **tabs**, **accordion**, **tic-tac-toe**, **image carousel** |
| **Zepto** | ~3 rounds: machine coding → JS → frontend system design | Watch for down-levelling (they offered SDE-1 to an SDE-2 applicant) |

### Heavy DSA: apply in week 6+

| Company | Notes |
|---|---|
| **Google** | Reportedly 2 DSA rounds (medium–hard, same bar as general SWE) + 1 frontend + 1 design + Googliness. Apply last |

### The pattern across all of them
1. **Machine coding in React and in plain JS.** This is the #1 filter.
2. **JS polyfills + output prediction**: debounce, throttle, Promise.all, bind, flatten, event loop.
3. **React internals + performance**: reconciliation, hooks, memo, lazy loading.
4. **Frontend system design** (SDE-2): autocomplete, feed, chat UI, AI chat interface.
5. **Product sense / HM / behavioral**: Flipkart and Amazon weight this heavily.

---

## Part 2: Daily schedule (8 hrs)

| Time | Block |
|---|---|
| 09:00–11:30 | **DSA** (2.5h): 3 problems. Spend 25 min stuck, then read the solution, then re-code it from memory |
| 11:30–13:30 | **JS polyfills + machine coding** (2h): 1 polyfill + 1 timed UI build (60–90 min) |
| 14:30–16:00 | **Theory / system design** (1.5h) |
| 16:00–17:00 | **Job hunt** (1h): 5–10 targeted applications + 5 referral DMs |
| 17:00–18:00 | **Revision + behavioral** (1h): redo yesterday's problems, write 1 STAR story |

Sunday: one full mock interview + review the week's mistakes. Rest the evening.

---

## Part 3: Job hunt checklist (do in Week 1, then daily)

- [ ] Resume: every bullet has a number ("cut LCP 3.2s→1.4s", "built X used by 50k users"). One page.
- [ ] LinkedIn: Open to Work (recruiters only), headline `Frontend Engineer | React · TypeScript · Next.js | 3 YOE`
- [ ] LinkedIn post about the layoff: short, positive, what you're looking for, ask for referrals
- [ ] Message your ex-manager + 3 ex-colleagues for referrals/intros
- [ ] Spreadsheet: Company · Role · Referrer · Applied date · Stage · Next step
- [ ] Job alerts on LinkedIn, Naukri, Instahyre, Wellfound, Cutshort
- [ ] Ask for the referral **before** applying. Apply to Tier 1 (low DSA) companies first.
- [ ] Daily: 5 referral DMs + 5–10 applications (quality over volume)

---

## Part 4: Week-by-week plan

### Week 1: Arrays, hashing, JS basics, job hunt launch
**DSA (LeetCode)**
- [ ] Contains Duplicate (217) · [ ] Valid Anagram (242) · [ ] Two Sum (1) ✅ already done
- [ ] Group Anagrams (49) · [ ] Top K Frequent (347) · [ ] Product Except Self (238)
- [ ] Longest Consecutive Sequence (128) · [ ] Sort Colors (75) · [ ] Merge Intervals (56)
- [ ] Majority Element ✅ · [ ] Kadane ✅ · [ ] Buy/Sell Stock ✅ (re-solve these from memory)
- [ ] Rotate Array ✅ · [ ] Missing Number · [ ] Move Zeroes · [ ] Intersection of Two Arrays (349)

**JS**
- [ ] Scope, hoisting, TDZ, closures (10 output questions)
- [ ] `this`: implicit/explicit/arrow/new (10 output questions)
- [ ] Polyfills: `Array.prototype.map`, `filter`, `reduce`
- [ ] Polyfills: `call`, `apply`, `bind` *(Paytm)*

**Machine coding**
- [ ] Todo app (add/edit/delete/filter, localStorage)
- [ ] Accordion (single + multi open) *(Microsoft)*
- [ ] Star rating with hover + keyboard *(Amazon)*

**Theory:** [ ] Event loop (microtask vs macrotask, 15 output questions) · [ ] Box model, specificity, flex vs grid

### Week 2: Two pointers, sliding window, async JS
**DSA**
- [ ] Valid Palindrome (125) · [ ] Two Sum II (167) · [ ] 3Sum (15) · [ ] Container With Most Water (11)
- [ ] Best Time Buy/Sell (121) · [ ] Longest Substring w/o Repeat (3) · [ ] Longest Repeating Char Replacement (424)
- [ ] Permutation in String (567) · [ ] Minimum Size Subarray Sum (209) · [ ] Subarray Sum Equals K (560)
- [ ] Remove Duplicates (26) · [ ] Merge Sorted Array (88)

**JS**
- [ ] Promises from scratch (states, chaining, error propagation)
- [ ] Polyfills: **Promise.all** *(Paytm)*, Promise.race, Promise.allSettled, Promise.any
- [ ] **Debounce** *(Paytm, PhonePe)* + **Throttle** *(Paytm, Walmart)*, with leading/trailing options
- [ ] Async/await output questions · [ ] Retry with exponential backoff · [ ] Promise with timeout

**Machine coding**
- [ ] Tabs (dynamic, keyboard-accessible) *(Atlassian, Microsoft)*
- [ ] Pagination (client + server) · [ ] OTP input (auto-focus, paste, backspace)
- [ ] Modal (portal, focus trap, ESC, click outside)

**Theory:** [ ] Frontend system design framework (RADIO: Requirements → Architecture → Data model → Interface/API → Optimizations)

### Week 3: Binary search, stack, JS objects
**DSA**
- [ ] Binary Search (704) · [ ] Search Insert (35) · [ ] First/Last Position (34) · [ ] Search Rotated Array (33)
- [ ] Find Min Rotated (153) · [ ] Koko Eating Bananas (875)
- [ ] Valid Parentheses (20) · [ ] Min Stack (155) · [ ] Daily Temperatures (739) · [ ] Next Greater Element (496)
- [ ] Evaluate RPN (150) · [ ] Implement Queue using Stacks (232)

**JS**
- [ ] Prototypes, `__proto__`, classes, `Object.create`
- [ ] **Flatten nested object** *(PhonePe)* + flatten array (with depth)
- [ ] Deep clone (handles circular refs, Date, Map) · [ ] Deep equal
- [ ] Curry (infinite `sum(1)(2)(3)()`) · [ ] Memoize · [ ] Event emitter (on/off/once/emit)

**Machine coding**
- [ ] **Autocomplete/typeahead** (debounce, cache, keyboard nav, race conditions)
- [ ] **Image carousel in vanilla JS** *(Amazon, Microsoft)*
- [ ] Infinite scroll with IntersectionObserver

**System design:** [ ] Design Autocomplete · [ ] Design a News Feed

### Week 4: Linked list, React in depth, Uber/Flipkart problems
**DSA**
- [ ] Reverse LL (206) · [ ] Merge Two Sorted (21) · [ ] Linked List Cycle (141) · [ ] Middle of LL (876)
- [ ] Remove Nth From End (19) · [ ] Reorder List (143) · [ ] Add Two Numbers (2) · [ ] Palindrome LL (234)
- [ ] Intersection of Two LLs (160) · [ ] LRU Cache (146) (frontend interviewers love this one)

**React**
- [ ] Virtual DOM, reconciliation, keys, Fiber (high level)
- [ ] Hooks in depth: useEffect cleanup, stale closures, useRef, useLayoutEffect
- [ ] useMemo / useCallback / React.memo: when they help and when they hurt
- [ ] Custom hooks: `useDebounce`, `useFetch`, `usePrevious`, `useLocalStorage`
- [ ] Context vs Redux Toolkit vs Zustand · [ ] Error boundaries, Suspense, lazy

**Machine coding**
- [ ] **Grid Light Box** *(Uber)*: lights turn off in reverse order of activation
- [ ] **Payment app with cashback** *(Flipkart)*: SOLID, clean component boundaries
- [ ] **React list with sorting + date filter combined** *(Paytm)*
- [ ] Nested comments (reply, collapse, delete)

**System design:** [ ] Chat app (WebSocket vs SSE vs polling, optimistic UI) · [ ] **AI chat interface** (streaming tokens, abort, retry)

### Week 5: Trees, Next.js, performance
**DSA**
- [ ] Inorder/Preorder/Postorder (iterative + recursive) · [ ] Max Depth (104) · [ ] Invert Tree (226)
- [ ] Same Tree (100) · [ ] Subtree of Another (572) · [ ] Level Order (102) · [ ] Right Side View (199)
- [ ] Diameter (543) · [ ] Balanced Tree (110) · [ ] LCA of BST (235) · [ ] Validate BST (98) · [ ] Kth Smallest in BST (230)

**JS + DOM**
- [ ] `getElementsByClassName` polyfill (DOM tree traversal) · [ ] Find a node in identical DOM trees
- [ ] Event delegation, bubbling/capturing · [ ] Implement `JSON.stringify` (simplified)

**Next.js + performance**
- [ ] CSR vs SSR vs SSG vs ISR *(Walmart)* · [ ] Server vs Client components · [ ] Hydration mismatches
- [ ] Core Web Vitals (LCP, INP, CLS): causes + fixes · [ ] Code splitting, lazy loading, image optimization
- [ ] List virtualization (build a simple one)

**Machine coding**
- [ ] File/folder explorer (add/rename/delete, recursive)
- [ ] Nested checkbox tree (parent/child selection sync)
- [ ] Kanban board with drag & drop

**System design:** [ ] Google Docs / collaborative editor (OT vs CRDT at a high level) · [ ] Design system / component library

### Week 6: Heaps, graphs, web security; start mocks
**DSA**
- [ ] Kth Largest (215) · [ ] Last Stone Weight (1046) · [ ] K Closest Points (973)
- [ ] Number of Islands (200) · [ ] Flood Fill (733) · [ ] Clone Graph (133) · [ ] Rotting Oranges (994)
- [ ] Course Schedule (207) · [ ] Insert Interval (57) · [ ] Non-overlapping Intervals (435)

**Web fundamentals**
- [ ] Browser rendering pipeline (parse → style → layout → paint → composite) *(PhonePe)*
- [ ] **XSS** *(Walmart)*, CSRF, CSP, CORS · [ ] Cookies vs localStorage vs sessionStorage
- [ ] HTTP caching (Cache-Control, ETag), CDN · [ ] Service workers, PWA basics

**LLD (Razorpay, Flipkart)**
- [ ] SOLID with JS examples · [ ] **ATM machine design + code** *(Razorpay)* · [ ] Parking lot

**Machine coding**
- [ ] Tic-tac-toe (N×N, winner check) *(Microsoft)* · [ ] Form builder with validation · [ ] "Last seen" timestamp component *(Amazon)*

**Mocks:** [ ] Mock 1 · [ ] Mock 2 · [ ] Mock 3 (Pramp, a friend, or ask Claude)

### Week 7: DP basics, TypeScript, company-specific prep
**DSA**
- [ ] Climbing Stairs (70) · [ ] House Robber (198) · [ ] Coin Change (322) · [ ] Longest Increasing Subsequence (300)
- [ ] Word Break (139) · [ ] Unique Paths (62)
- [ ] Re-solve 10 problems you got wrong earlier (from memory, timed)

**TypeScript**
- [ ] Generics, utility types (Partial, Pick, Omit, Record) · [ ] Type narrowing, discriminated unions
- [ ] Typing React props, hooks, events

**Company prep** (for each company where you have an interview)
- [ ] Read 5+ recent interview reports (LeetCode Discuss, Glassdoor, GeeksforGeeks, frontend-junction, devtools.tech)
- [ ] Re-build their reported machine coding problem under time pressure

**Behavioral: write these STAR stories**
- [ ] Biggest technical win (with numbers) · [ ] Performance improvement · [ ] Conflict with a teammate/PM
- [ ] Failure and what you learned · [ ] Ownership beyond your role · [ ] Tight deadline
- [ ] "Why were you laid off?" (2 lines: factual, not personal, then what's next)
- [ ] Amazon: map stories to the Leadership Principles

### Week 8: Full mock loops + interview mode
- [ ] Daily: 1 DSA medium (timed 30 min) + 1 machine coding (timed 60 min) + 1 system design (45 min)
- [ ] Mock loop 1 · [ ] Mock loop 2 · [ ] Mock loop 3 · [ ] Mock loop 4
- [ ] Revise all polyfills in one sitting (should take < 2 hrs)
- [ ] Revise all system design notes
- [ ] Salary research (levels.fyi, AmbitionBox) + your negotiation number

---

## Rules
1. **Apply from week 1.** Early interviews are free practice.
2. **Machine coding: always handle** loading/error/empty states, keyboard access, and clean component props. That's what gets graded.
3. **Talk while you code.** Interviewers grade communication.
4. **Track mistakes** in `MISTAKES.md`. Re-solve them on Sundays.
5. If you're stuck on something for more than a day, ask for help instead of losing time.

## Sources
- Razorpay SDE-2: https://medium.com/frontend-army/razorpay-frontend-interview-experience-sde-2-c8281db61ed5
- Zepto/Razorpay/Walmart: https://medium.com/@gadarsh555/frontend-engineer-interview-experience-2-5-71db5c39aaa2
- Swiggy SDE-2: https://medium.com/techtrends-digest/deconstructing-the-swiggy-frontend-sde-2-interview-loop-ba3cff71d2ac
- Flipkart SDE-2: https://roundz.substack.com/p/flipkart-interview-experience-frontend-engineer-sde2
- Atlassian (Glassdoor): https://www.glassdoor.com/Interview/Atlassian-Frontend-Engineer-Interview-Questions-EI_IE115699.0,9_KO10,27.htm
- Uber senior FE: https://devtools.tech/blog/uber-senior-frontend-interview-experience---rid---HhAZPA5jvh67sTfzr8cw
- Machine coding by company: https://www.frontendgeek.com/blogs/20-frontend-machine-coding-round-interview-questions
- Paytm: https://apoorvpandey0.medium.com/paytm-frontend-interview-experience-af399a7fc42d
- Paytm Money: https://medium.com/@phalgun99/my-interview-experience-with-paytm-money-frontend-developer-role-aeb332e5a4bc
- PhonePe: https://dataford.io/interview-guides/phonepe/frontend-engineer
- Walmart: https://dataford.io/interview-guides/walmart/frontend-engineer
- Amazon SDE-II FE: https://www.geeksforgeeks.org/interview-experiences/amazon-interview-experience-for-sde-ii-frontend/
- Amazon 2025 compilation: https://www.fastprep.io/experience/2025-amazon-frontend-oa-interviews-25-experiences-part-1-cs59praq1p
- Google FE DSA bar: https://spacecomplexity.ai/blog/dsa-for-frontend-engineers
- More experiences: https://www.frontend-junction.com/interview-experience · https://github.com/Devtools-Tech-Team/front-end-interview-questions
