# Frontend Interview DSA Weightage: Non-Medium Platforms (LeetCode Discuss, GfG, Blind, aggregators), Nov 2025 – Nov 2026

**Method and caveats (read first)**
- Research date: 2026-11-26. About 20 tool calls.
- **LeetCode Discuss pages returned HTTP 403 to the fetch tool, and Blind returned 402 (paywall).** All LeetCode and Blind details below come from search-engine snippet summaries, not full reads of the posts. Round lists may be incomplete. GfG and frontend-junction.com pages were fetched in full.
- **No Reddit threads (r/developersIndia, r/Frontend, r/cscareerquestions, r/reactjs) came up in any search.** Reddit is not represented. dev.to and Hashnode also returned no first-hand loops. Glassdoor and AmbitionBox returned only index pages, with no usable round data.
- **The target of 25+ distinct loops was NOT met for the Nov 2025 – Nov 2026 window.** I found 10 in-window frontend loops with some round data (9 with enough to classify), plus about 14 older or undated frontend loops, which are labeled separately. Treat every percentage below as indicative only (n ≈ 9 loops, 23 classified rounds).
- Overlap warning: the Microsoft 2026 and Google L4 2026 loops listed on frontend-junction.com also appear as Medium "frontend-army" posts ([Microsoft Medium](https://medium.com/frontend-army/microsoft-frontend-interview-experience-2026-89256ae8622b)). They may duplicate the Medium dataset, so the cross-check should exclude them if they are already counted there.
- Selection bias: posters skew toward India-based candidates, notable or difficult loops, and rejections. HR and behavioral rounds are routinely left out of write-ups, so the behavioral share is undercounted.

## Q1. What share of frontend interview rounds are DSA vs JS/machine coding vs frontend system design vs behavioral in this independent sample?

### Takeaway
In the small in-window sample (9 classifiable loops, 23 rounds), about **13% of rounds were DSA-primary**. JS/web/React fundamentals and machine coding/UI build were about **30% each**, take-homes about 9%, system design about 9%, and behavioral/HM about 4% (undercounted). **About 5 of 9 loops (≈56%) had at least some DSA-style coding, but only about 4 of 9 (≈44%) had a dedicated DSA round.** Where difficulty is named, it is Easy to Medium, with a rare Hard at big tech.

### In-window loop dataset (Nov 2025 – Nov 2026)

| # | Company / role | Date | YOE / level | Location | Rounds (type) | DSA problems | Source |
|---|---|---|---|---|---|---|---|
| 1 | Headout, Frontend Lead | Apr 2026 | 10 YOE, Lead | Bangalore | (1) 90-min machine coding: kanban board in vanilla JS/CSS [MC]; (2) system design [SD, FE vs general unclear]; (3) hiring manager [HM]. Not offered. | None | [LeetCode 7792155](https://leetcode.com/discuss/post/7792155/) (snippet) |
| 2 | D. E. Shaw, Frontend | Mar 2026 | n/s | India (implied) | (1) OA: to-do app + nested folder structure [MC/UI]; (2) screen: DSA questions + JS output question on Promises/setTimeout [DSA + JS]. Later rounds unknown. | DSA unnamed | [LeetCode 7664645](https://leetcode.com/discuss/post/7664645/) (snippet) |
| 3 | JTG, Frontend Engineer (campus) | 2026 | Fresher | India | (1) college assessment [other]; (2) JavaScript DSA test [DSA]; (3) 2.5-h machine coding: checkers game [MC]; (4) ~3-h technical: chat widget + FE questions [MC/JS] | Unnamed | [LeetCode 8546949](https://leetcode.com/discuss/post/8546949/) (snippet) |
| 4 | Jio Hotstar, SDE-2 Frontend | ~early 2026 (post ID adjacent to Feb-2026 posts; inferred) | SDE-2 | India | (1) CV/projects + 2 JS coding Qs + event loop [JS]; (2) machine coding: dropdown component + a11y/state/perf discussion [MC]. Rejected after ~2 months despite positive feedback. | None | [LeetCode 7598082](https://leetcode.com/discuss/post/7598082/) (snippet) |
| 5 | EZ Works, Frontend Developer I | GfG updated 28 Jan 2026 | n/s (junior) | Virtual | (0) take-home assignment [TH]; (1) ~30 min: React basics, map/filter/reduce, assignment walkthrough [JS]; (2) ~35–40 min with FE lead: browser/CRP, async/defer, SSR/SSG/hydration, perf debugging, memoization, Web Vitals + experience/mentoring questions [JS/web + some behavioral]. Author: focus on "fundamentals and real-world reasoning rather than DSA". | None | [GfG](https://www.geeksforgeeks.org/interview-experiences/ez-works-frontend-developer-interview-experience-rounds-1-2/) |
| 6 | APIwiz, SDE-1 Frontend | GfG updated 26 Nov 2025 | SDE-1 | Online | (1) take-home: JSON Tree Visualizer in React [TH]; (2) technical: JS/React theory, JS output snippets, 3 coding problems, React debugging of a large e-commerce codebase [JS-primary, with embedded DSA] | Flatten deeply nested array (polyfill-style, not solved); find missing numbers in array (Easy-type); string compression "aaaabbbcc"→"a4b3c2" (Easy-type). Author rates overall difficulty Moderate–High. | [GfG](https://www.geeksforgeeks.org/interview-experiences/apiwiz-sde-1-frontend/) |
| 7 | Google, SWE-3 (L4) Frontend | 2026 | 4 YOE | n/s | 5 rounds: preliminary screening, DSA, Googliness. Exact split not stated. Topics: graph and geometry fundamentals. | Graph/geometry (unnamed) | [frontend-junction](https://www.frontend-junction.com/interview-experience) (possible Medium duplicate) |
| 8 | Microsoft, Frontend Engineer | 2026 | n/s | n/s | 6 rounds: machine coding (~2 h, production-style UI) [MC]; advanced JS [JS]; low-level design [MC/LLD]; problem solving [DSA]; browser internals [JS/web]; scalability [FE SD] | Unnamed | [frontend-junction](https://www.frontend-junction.com/interview-experience); also [Medium](https://medium.com/frontend-army/microsoft-frontend-interview-experience-2026-89256ae8622b) (likely duplicate) |
| 9 | Expedia, Frontend | ~Jan–Feb 2026 (inferred from post ID) | n/s | n/s | Code-review round: critique a React component for performance, state management, missing keys, a11y [JS/React]. Author found it "more practical than typical DSA rounds". Other rounds not captured. | None reported | [LeetCode 7520847](https://leetcode.com/discuss/post/7520847/) (snippet) |
| 10 | Razorpay, Frontend | May 2026 | n/s | India | Partial: states Razorpay "does NOT have a DSA round". Web-fundamentals round on browser rendering, CORS, localStorage, performance. | None | [Mocklingo blog](https://mocklingo.com/blogs/i-interviewed-at-razorpay-for-frontend) (snippet) |

Context only (not a single loop): a Feb 2026 LeetCode post by a senior FE who interviewed with about 40 companies ([LeetCode 7580886](https://leetcode.com/discuss/post/7580886/), snippet only).

### Aggregate stats (in-window, loops 1–6, 8, 9; Google excluded from the round split because its split is unstated; Razorpay partial)
Round classification: each round counted once by primary type. Mixed rounds are noted.

| Round type | Count | Share of 23 rounds |
|---|---|---|
| DSA / LeetCode-style (D.E. Shaw screen [mixed with JS output], JTG DSA test, Microsoft problem solving) | 3 | 13% |
| JS fundamentals / web / React theory / output / code review (Hotstar R1, EZ R1, EZ R2, APIwiz technical [includes embedded DSA], MS adv JS, MS browser internals, Expedia code review) | 7 | 30% |
| Machine coding / UI build / FE LLD (Headout, D.E. Shaw OA, JTG MC, JTG chat widget, Hotstar dropdown, MS MC, MS LLD) | 7 | 30% |
| Take-home (EZ Works, APIwiz) | 2 | 9% |
| System design (MS scalability = FE SD; Headout = unclear FE/general) | 2 | 9% |
| Behavioral / HM / HR (Headout HM) | 1 | 4% (undercounted) |
| Other (JTG college aptitude assessment) | 1 | 4% |

- Loops with **any DSA-style coding**: D.E. Shaw, JTG, APIwiz (embedded), Google, Microsoft = **5 of 9** loops with known content (≈56%). The 9 are loops 1–8 and 10; Expedia is excluded as unknown.
- Loops with a **dedicated DSA round**: D.E. Shaw, JTG, Google, Microsoft = **4 of 9 (≈44%)**.
- Loops with **no DSA**: Headout, Jio Hotstar, EZ Works, Razorpay = 4 of 9.
- Loops with **machine coding or take-home UI build**: 7 of 9 (all except Google and Razorpay-partial) ≈ 78%.

### Older / undated frontend loops (labeled separately; NOT in the stats above)

| Company / role | Date | Rounds | DSA named | Source |
|---|---|---|---|---|
| Uber, Front End SWE II | ~2025 (date uncertain) | System design (design Google Calendar); specialization round that "can either be a make a UI or a leetcodeish javascript question". Candidate got a JS question involving graphs + async jobs. | Graph + async jobs (unnamed, ~Medium) | [LeetCode 7322609](https://leetcode.com/discuss/post/7322609/) (snippet) |
| Upstox, SDE-2 Frontend | Jul 2025 | HackerRank OA; DSA/problem-solving round; system design + React (deep-copy polyfill, React optimization); HM + HR | Search in Rotated Sorted Array (LC 33, Medium) | [plainenglish.io (Medium network)](https://javascript.plainenglish.io/upstox-sde-2-frontend-interview-experience-july-2025-982df5edc3d9) (snippet; Medium-hosted) |
| Arrise / Pragmatic Play, SDE-2 FE | ~2025 | 4 YOE, 25+ LPA; details not retrieved | n/a | [LeetCode 7164080](https://leetcode.com/discuss/interview-experience/7164080) |
| JobTwine, Frontend (4–6 YOE) | ~2025 | Five rounds; JS and micro-frontend questions | n/a | [LeetCode 7258044](https://leetcode.com/discuss/post/7258044/) (snippet) |
| Razorpay, Frontend | Dec 2024 | Machine coding (tab component) + discussion-style web fundamentals. Rejected. | None | [LeetCode 6273899](https://leetcode.com/discuss/post/6273899/razorpay-frontend-interview-experience-b-yvc8/) (snippet) |
| Razorpay, Senior FE | Nov 2024 | Project deep-dive + system design + web perf; machine coding | None | [frontend-junction](https://www.frontend-junction.com/interview-experience) |
| Razorpay, FE (fresher) | undated | Technical depth, coding, web fundamentals, HM. Offer. | n/s | [frontend-junction](https://www.frontend-junction.com/interview-experience) |
| Walmart India, Frontend | ~2024 | Opening two-pointer coding question; React hooks (useEffect), DOM, CSS basics | Two-pointer problem (unnamed) | [LeetCode 6036136](https://leetcode.com/discuss/post/6036136/interview-experience-walmart-india-front-516a/) (snippet) |
| Kotak Mahindra, SDE2 Frontend, Gurgaon | 2024 | Machine coding incl. React search-and-highlight | n/s | [LeetCode 6024240](https://leetcode.com/discuss/post/6024240/Kotak-Mahindra-Bank-or-SDE2-(Frontend)-or-Gurgaon/) (snippet) |
| Amazon, SDE-II Frontend | undated (older) | Online test on HTML/JS/CSS; machine coding image carousel; system design of a newspaper home page | None listed | [GfG](https://www.geeksforgeeks.org/interview-experiences/amazon-interview-experience-for-sde-ii-frontend/) (snippet) |
| Amazon, FEE2 | undated | OA, phone screen, 4 onsite: algorithms, system design, FE fundamentals, behavioral. Offer. Canada. | Unnamed | [frontend-junction](https://www.frontend-junction.com/interview-experience) |
| Salesforce, SMTS Frontend | undated | 6 rounds: algorithms, FE fundamentals, performance, system design, collaboration. Offer. | Unnamed | [frontend-junction](https://www.frontend-junction.com/interview-experience) |
| LinkedIn, Senior SWE Frontend | undated | Phone screen + 6-round loop; vanilla JS in plain editor; core JS, browser, a11y, system design, UI architecture | n/s | [frontend-junction](https://www.frontend-junction.com/interview-experience) |
| Zepto, SE II (React Native) | undated | 3 technical: RN production, JS fundamentals, machine coding, FE system design. Downlevel to SE I offered. | None | [frontend-junction](https://www.frontend-junction.com/interview-experience) |
| Microsoft, Frontend SE2 | undated | DSA round + JS implementation round | Trapping Rain Water (LC 42, Hard); Longest Substring Without Repeating Characters (LC 3, Medium) | [Blind](https://www.teamblind.com/post/what-to-expect-in-microsoft-frontend-engg-2-interviews-wvd3zyv3) (snippet) |

Older-set observation: big-tech loops (Amazon x2, Salesforce, Microsoft, Google L5, multi-FAANG) consistently include an algorithms round. Indian product startups (Razorpay x3, Zepto, Kotak) mostly do not, and favor machine coding plus web fundamentals.

### Cited Findings
- EZ Works (Jan 2026) author: the process focused on "fundamentals and real-world reasoning rather than DSA"; no DSA was asked — [GfG](https://www.geeksforgeeks.org/interview-experiences/ez-works-frontend-developer-interview-experience-rounds-1-2/)
- APIwiz (Nov 2025) SDE-1 FE: take-home JSON tree, then a mixed technical round with flatten-array, missing-numbers and string-compression problems plus React debugging — [GfG](https://www.geeksforgeeks.org/interview-experiences/apiwiz-sde-1-frontend/)
- D.E. Shaw (Mar 2026) FE screen included DSA questions and a Promise/setTimeout output question after a UI-building OA — [LeetCode](https://leetcode.com/discuss/post/7664645/)
- JTG (2026) campus FE: JS DSA test, then 2.5-h checkers machine coding and a ~3-h chat-widget technical round — [LeetCode](https://leetcode.com/discuss/post/8546949/)
- Headout (Apr 2026, 10 YOE, Bangalore): machine coding + system design + HM, no DSA — [LeetCode](https://leetcode.com/discuss/post/7792155/)
- Jio Hotstar SDE-2 FE: JS coding/event loop round + dropdown machine coding, no DSA — [LeetCode](https://leetcode.com/discuss/post/7598082/)
- Blind commenters: minimum LeetCode Easy for FE, Medium for FAANG; a Zeta thread cites two LeetCode Mediums as a typical DSA round — [Blind](https://www.teamblind.com/post/dsa-for-frontend-interview-gw0ydr56) (snippet)
- One engineer's view: trees/graphs, DP, sorting and divide-and-conquer are rarely asked in UI interviews, but basic DFS/BFS and tree traversal can come up. FE "data structures" questions are often DOM traversal — [tanaypratap substack](https://tanaypratap.substack.com/p/dsa-for-fe-devs); [Blind](https://www.teamblind.com/post/dsa-for-frontend-interview-gw0ydr56) (snippets)

### Inferences
- Across non-Medium sources, the "frontend-native" rounds (JS fundamentals + machine coding + take-home) make up about 70% of rounds, versus about 13% for pure DSA. DSA is present in roughly half of loops, but usually as one round or a sub-part of a round, not the centerpiece.
- DSA presence is strongly company-type dependent. Big tech, HFT/quant, and campus hiring (Google, Microsoft, D.E. Shaw, Amazon, Salesforce, JTG campus) include it. Indian product startups and scale-ups (Razorpay, Headout, Hotstar SDE-2, EZ Works, Zepto) often skip it.
- Named DSA difficulty clusters at Easy–Medium (array/string/two-pointer/sliding-window/binary-search). Hard (Trapping Rain Water) appears only in a big-tech anecdote.

### Gaps
- Only about 9 classifiable in-window loops were found, versus a target of 25+. LeetCode (403) and Blind (402) bodies could not be read, so round lists from those are snippet-based and may be incomplete.
- No Reddit data at all. Glassdoor and AmbitionBox gave no usable 2026 frontend round data.
- Behavioral/HR rounds are systematically underreported in write-ups.

## Q2. Do Reddit/LeetCode discussions in 2026 suggest DSA is becoming more or less important for frontend roles (AI-era changes, companies dropping LeetCode, AI-assisted rounds)?

### Takeaway
The evidence is weak and anecdotal, but it leans toward **"DSA steady at big tech, flat or declining elsewhere, with a shift to practical, AI-resistant rounds"**: code review, debugging existing codebases, live machine coding, and deeper fundamentals questions. I found no first-hand 2026 frontend post describing an AI-assisted coding round. Claims about AI-assisted rounds come only from secondary prep guides.

### Cited Findings
- A 3.5-YOE engineer with recent offers (Blind) said "a lot of companies now are asking for harder questions or more practical coding rounds to get around AI" and that practicing practical rounds helped most — [Blind](https://www.teamblind.com/post/went-through-frontend-interviews-recently-here-are-the-kinda-questions-they-ask-dbyqb3ob) (snippet; date not confirmed)
- Expedia FE (early 2026) used a React code-review round (perf, state, keys, a11y); the candidate called it more practical than typical DSA rounds — [LeetCode](https://leetcode.com/discuss/post/7520847/) (snippet)
- APIwiz (Nov 2025) included a React debugging task on a large e-commerce codebase with four user-reported bugs — [GfG](https://www.geeksforgeeks.org/interview-experiences/apiwiz-sde-1-frontend/)
- Razorpay FE (May 2026 blog): "does NOT have a DSA round"; a July 2026 Razorpay senior FE account (Medium, so overlapping) says the process evaluated "practical engineering skills rather than abstract algorithmic puzzles" — [Mocklingo](https://mocklingo.com/blogs/i-interviewed-at-razorpay-for-frontend); [Medium](https://medium.com/techtrends-digest/my-interview-experience-for-a-senior-frontend-engineer-role-at-razorpay-3cd53f242979) (snippets)
- Counter-signal: Google L4 FE (2026) and Microsoft FE (2026) loops still include DSA/problem-solving rounds — [frontend-junction](https://www.frontend-junction.com/interview-experience)
- Prep guides disagree. One says generic LeetCode prep "under-prepares" for machine coding. Another says FE loops include JS trivia, utility implementation, UI builds, system design "and often LeetCode" — [techinterview.org](https://www.techinterview.org/post/3233474937/frontend-engineering-interview-guide-2026/); [techscreen.app](https://techscreen.app/articles/frontend-engineer-interview-guide-2026) (snippets; SEO guides, low reliability)
- A secondary 2026 prep guide (exact page among the search results not pinned down) claims AI-assisted coding rounds are run by Canva, Meta, and Google (a Gemini pilot for junior and mid-level US roles). **Unverified, and no first-hand FE post corroborates it.** Candidate pages: [techscreen.app](https://techscreen.app/articles/frontend-engineer-interview-guide-2026), [frontendatlas](https://frontendatlas.com/guides/interview-blueprint/intro)

### Inferences
- The AI-era response visible in first-hand FE posts is not "drop DSA, add AI tools". It is more live, practical, explain-your-reasoning formats: code review, debugging, longer machine coding (2–3 h), and why-questions. These work against AI-assisted cheating more than they relax standards.
- For a candidate, DSA prep is still needed for big-tech and quant targets. For Indian startups and mid-size product companies, machine coding and JS/browser fundamentals carry more weight.

### Gaps
- No Reddit 2026 threads were retrievable, so the requested Reddit sentiment remains unmeasured.
- No first-hand 2026 frontend report of an AI-assisted coding round was found.
- There is no longitudinal data, such as the same company's FE loop in 2024 vs 2026, beyond Razorpay (consistently no DSA in 2024 and 2026).

## Q3. Any differences for ~3 YOE frontend devs in India specifically?

### Takeaway
For India mid-level (SDE-1/SDE-2, about 2–5 YOE) frontend loops, the typical pattern is **OA or take-home → JS fundamentals/output/polyfills → machine coding (dropdown, kanban, tabs, carousel, JSON tree) → system design or HM**. DSA appears in about half of loops, usually at Easy–Medium. India loops are described as more gap-probing than overseas loops.

### Cited Findings
- A senior FE who interviewed with about 40 companies (Feb 2026) said India-based loops felt focused on finding gaps, while overseas loops emphasized problem-solving and communication — [LeetCode 7580886](https://leetcode.com/discuss/post/7580886/) (snippet)
- India SDE-2 FE examples: Jio Hotstar (JS + dropdown MC, no DSA) — [LeetCode](https://leetcode.com/discuss/post/7598082/); Upstox Jul 2025 (DSA: rotated sorted array, Medium; plus deep-copy polyfill) — [plainenglish.io](https://javascript.plainenglish.io/upstox-sde-2-frontend-interview-experience-july-2025-982df5edc3d9); Kotak 2024 (React MC) — [LeetCode](https://leetcode.com/discuss/post/6024240/Kotak-Mahindra-Bank-or-SDE2-(Frontend)-or-Gurgaon/)
- India SDE-1/junior FE: EZ Works (no DSA) and APIwiz (take-home + Easy-level array/string problems + flatten polyfill) — [GfG EZ Works](https://www.geeksforgeeks.org/interview-experiences/ez-works-frontend-developer-interview-experience-rounds-1-2/); [GfG APIwiz](https://www.geeksforgeeks.org/interview-experiences/apiwiz-sde-1-frontend/)
- Polyfill/JS staples in India FE loops: flatten array (`Array.prototype.flat`), debounce/throttle, deep copy, Promise/setTimeout output, event loop — [GfG APIwiz](https://www.geeksforgeeks.org/interview-experiences/apiwiz-sde-1-frontend/); [LeetCode D.E. Shaw](https://leetcode.com/discuss/post/7664645/); [plainenglish.io Upstox](https://javascript.plainenglish.io/upstox-sde-2-frontend-interview-experience-july-2025-982df5edc3d9)
- A Blind poster with 3 YOE preparing for Zepto Frontend SDE-2 asked what to expect from a live machine coding round, which indicates machine coding is the main concern at that level — [Blind](https://www.teamblind.com/post/zepto-interview-vjyceeqc) (snippet)
- Level mismatch risk: ARRISE rejected a frontend candidate for insufficient experience against a 4+ YOE requirement. Zepto offered a downlevel to SE I — [LeetCode](https://leetcode.com/discuss/post/6980820/); [frontend-junction](https://www.frontend-junction.com/interview-experience)
- Non-frontend contrast: India SDE-2 general/backend loops in 2026 (Flipkart Jan/Sep 2026, Navi Sep 2026) are heavier on DSA (graphs, tries, Jump Game II, K Closest Elements, all Medium+) and LLD machine coding, so FE loops appear lighter on DSA than generalist SDE-2 loops — [Flipkart Jan 2026](https://leetcode.com/discuss/post/8455829/flipkart-sde-2-interview-experience-jan-o8ngx/); [Navi 2026](https://leetcode.com/discuss/post/8549192/navi-sde-2-2026-interview-experience-by-6u5tv/); [Flipkart Sep 2026](https://leetcode.com/discuss/post/8567797/flipkart-sde2-interview-experience-septe-ymsa/) (snippets)

### Inferences
- For a ~3 YOE India FE candidate, the evidence suggests roughly this prep weighting: machine coding (vanilla JS + React components) and JS/browser fundamentals first, then Easy–Medium DSA on arrays, strings, two pointers, sliding window, binary search, hashing, and basic tree/graph traversal, then FE system design basics. Dropping DSA entirely would cut off about half of loops, including big tech and quant firms.
- At 3 YOE, candidates often sit on the SDE-1/SDE-2 boundary. Downleveling and rejection over YOE requirements appear in the sample, so machine-coding quality likely decides the level.

### Gaps
- No post explicitly at exactly 3 YOE in India in the window had full round details. The Zepto 3-YOE Blind post had no answers.
- No AmbitionBox or Glassdoor data was retrievable to quantify India-specific round frequency.
