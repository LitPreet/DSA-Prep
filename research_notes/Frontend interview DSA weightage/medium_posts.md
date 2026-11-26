# Frontend interview experiences on Medium (Nov 2025 – Nov 2026): tally of round types and DSA weight

> **How these notes were collected:** WebFetch and curl both got HTTP 403 when opening Medium article pages directly. Full text therefore came only from Medium's own RSS feeds (`medium.com/feed/<publication|@author|tag/...>`). Those feeds carry the whole post for free posts and only a 1–2 sentence preview for member-only posts. No paywall-bypass services were used. The data falls into three tiers:
> - **Tier F (full text, in window):** 10 posts. Every round is known, so these are the only posts used in the percentage stats.
> - **Tier P (partial):** member-only posts (mostly the *Frontend Army* publication) that are known only from search-engine summaries or RSS previews. They are used only for yes/no "DSA mentioned" signals, and they are marked as partial.
> - **Tier M (metadata only):** title, date, company and location only, with no round content.
> - **Older (pre-Nov 2025):** kept separate.
>
> Today's date is 26 Nov 2026.

---

## Fraction of rounds by type (DSA vs JS vs machine coding vs FE system design vs behavioral)

### Takeaway
The full-text sample is 10 loops and 36 rounds. DSA appeared in 9 of the 36 rounds (25%), and only about 4 of those rounds were dedicated DSA rounds. JavaScript fundamentals/polyfills appeared in 12 rounds (33%), machine coding in 11 (31%), frontend system design in 9 (25%) and behavioral/HR/HM in 9 (25%). Many rounds were mixed, so these shares add up to more than 100%. 5 of the 10 loops (50%) had at least one DSA component. Where the difficulty is known, it was usually LeetCode Medium, with one Hard. Frontend-specific rounds (JS + machine coding + FE system design) clearly outnumber DSA, but DSA was far from absent.

### Tier F dataset: full text read via the author's RSS feed, published Nov 2025 – Nov 2026

Round type codes: **DSA** = LeetCode-style DSA; **JS** = JS fundamentals/polyfills/output questions; **MC** = machine coding/UI build; **FESD** = frontend system design; **LLD** = low-level design; **BESD** = backend/general system design; **BEH** = behavioral/HR/HM/recruiter; **TH** = take-home.

| # | Post (link) | Published | Level / YOE | Company (type) | Location | Rounds (type) | DSA problems named (difficulty) | Outcome |
|---|---|---|---|---|---|---|---|---|
| F1 | [Postman Senior Engineer (Frontend)](https://saumyadip25.medium.com/postman-senior-engineer-frontend-interview-experience-feee8e512d9d) | 24 Sep 2026 (**but the author applied Sep 2024**) | Senior; YOE not stated | Postman (global product) | Not stated; one interviewer was "from the UK" | R1 EM round: Promise-from-scratch polyfill + React timer in CodeSandbox → BEH+JS+MC. R2 FE technical: XSS/CSP/CORS, `getElementsByClassName` polyfill, MutationObserver, **Number of Islands**, mapAsync, rendering 1000+ items → JS+DSA. R3 frontend system design: Slack-like chat → FESD. (4 rounds planned) | Number of Islands (LC 200, Medium) | Rejected after R3 |
| F2 | [SuperMoney by Flipkart SDE-3 Frontend](https://medium.com/@anjaliraheja1850/supermoney-by-flipkart-sde-3-frontend-interview-experience-05e3b99ebc1d) | 6 Sep 2026 | SDE-3 | SuperMoney (Indian product / Flipkart group) | India (implied; applied via Instahyre) | R1 1.5 h live build of an inventory management system → MC. R2 optimized timers for many products + experience/CDN caching discussion → MC. R3 design Google Forms → FESD | None | Selected in all 3 rounds |
| F3 | [Kotak Mahindra Bank Senior Frontend](https://medium.com/@anjaliraheja1850/kotak-mahindra-bank-senior-frontend-engineer-interview-experience-fa350e29c85e) | 17 Aug 2026 (interviewed Apr 2026) | Senior FE | Kotak (Indian bank / fintech) | India | R1 "Bar Raiser": DSA (15 min) + JS internals, Web Vitals, micro-frontends → DSA+JS. R2 nested comments UI in 45 min → MC. R3 AI chat app design + 8–9 JS output questions + "short DSA problem" → FESD+JS+DSA. R4 HR (compensation) → BEH | Longest Substring Without Repeating Characters (LC 3, **Medium**, sliding window expected); one more short DSA problem, not named | Selected |
| F4 | [Uber Senior Frontend Engineer — 2026](https://medium.com/@anjaliraheja1850/uber-senior-frontend-engineer-interview-experience-2026-ddc9dd742dbd) | 9 Aug 2026 (interviewed Jan 2026) | Senior | Uber (big tech) | Not stated | R1 CodeSignal: 8 JS MCQs + implement `mapAsyncLimit` (concurrency) → JS. R2 design a stock-trading platform → FESD. The author says Uber's process "covered … DSA, and a hiring manager round", but she only took 2 rounds | None in the rounds she took (DSA said to be part of the process) | No response after R2 |
| F5 | [Quest Global Frontend](https://medium.com/@deeksha.gverma11/my-quest-global-frontend-interview-experience-3dd1fa7f1fcb) | 28 Sep 2026 | Not stated | Quest Global (**IT/engineering services**) | Not stated | Single interview: resume deep dive, WebRTC/WebSocket/Canvas, useMemo/useCallback, auth/token flow, recreate a UI image in HTML/CSS → JS(web)+MC | None | Not stated |
| F6 | [UiPath Frontend SDE-2](https://medium.com/@vaibhav11t/i-interviewed-at-uipath-frontend-sde-2-react-machine-coding-lld-dsa-one-brutal-reality-check-cbd08859e99d) | 2 Mar 2026 | **SDE-2** (YOE not stated) | UiPath (global product) | Not stated (virtual) | R1 React: fetch API → table with loading/error states → MC. R2 low-level design → LLD. R3 DSA → DSA | Burst Balloons (LC 312, **Hard**, DP); Course Schedule (LC 207, **Medium**, graph) | **Rejected, "primarily due to the DSA round"** |
| F7 | [Headout Senior SWE (Frontend)](https://medium.com/@yashpreetbathla/my-first-interview-in-3-years-senior-software-engineer-frontend-at-headout-4a6884ed4b07) | 25 May 2026 | Senior; ≥3 yrs at last job (Tessell) | Headout (Indian product startup) | India (implied) | R1 recruiter screen → BEH. R2 frontend machine coding, vanilla JS → MC. R3 design a Toast component as an NPM package (1.5 h) → FESD | None | Rejected |
| F8 | [Harness Senior SWE (Frontend), 8 rounds](https://medium.com/@yashpreetbathla/harness-senior-software-engineer-frontend-interview-experience-all-8-rounds-a06f8347dda5) | 31 May 2026 | Senior; same author as F7 | Harness (global product, India office) | India (in-office F2F round) | R1 recruiter → BEH. R2 3 coding questions → DSA+JS. R3 single-problem "DSA deep dive" → DSA. R4 n×n memory-pattern game in vanilla JS → MC. R5 React + project + FE system design + DSA → JS+FESD+DSA. R6 in-person build of a GitHub PR page in React + whiteboard DOM BFS/DFS → MC+DSA. R7 Head of Engineering, culture → BEH. R8 Director, HLD of the PR page + culture → FESD+BEH | Ordered pattern-in-string check (≈ Is Subsequence, Easy); next palindrome greater than N (Medium–Hard edge cases); split array to minimise sum difference (prefix sum, Easy/Medium); **Gas Station** (LC 134, Medium); delete all siblings of a DOM node (tree traversal, Easy). The author says the problems are paraphrased | **Offer** |
| F9 | [Adobe Computer Scientist 1 Frontend, 4 rounds](https://medium.com/@yashpreetbathla/adobe-frontend-interview-experience-all-4-rounds-questions-how-i-cr) | 2 Jun 2026 | "Senior frontend bar" (CS-1); same author | Adobe (big tech), Adobe Express team | India (implied) | R1 DSA: trees, graphs, arrays, live → DSA. R2 React machine coding + JS → MC+JS. R3 manager + JS design discussion → BEH+JS. R4 Director: system design (RADIO framework) + culture → FESD+BEH | Not disclosed (NDA). The author prepared trees, graphs (BFS/DFS/Dijkstra-style) and prefix sums | **Selected** |
| F10 | [Confluent Senior Frontend, 5 rounds](https://medium.com/@yashpreetbathla/confluent-senior-frontend-interview-experience-all-5-rounds-why-thi) | 18 Jun 2026 | Senior; same author | Confluent (global product) | India (implied) | R1 JS live coding → JS. R2 JS live coding → JS. R3 extend an existing page in vanilla HTML+JS → MC. R4 frontend-leaning system design → FESD. R5 managerial → BEH | None. The author says the questions were "not the recycled patterns you've already solved on LeetCode" | **Selected** |

Note on the F8–F10 links: the RSS `<link>` values were truncated in this capture. The canonical slugs start as shown. Each post is listed on [the author's feed](https://medium.com/feed/@yashpreetbathla).

### Cited Findings
- **Round counts in Tier F (10 loops, 36 rounds; a round can count under several types):**
  - Rounds containing DSA: 9/36 = **25%**. These are F1-R2, F3-R1, F3-R3, F6-R3, F8-R2, F8-R3, F8-R5, F8-R6 and F9-R1 — [F1](https://saumyadip25.medium.com/postman-senior-engineer-frontend-interview-experience-feee8e512d9d), [F3](https://medium.com/@anjaliraheja1850/kotak-mahindra-bank-senior-frontend-engineer-interview-experience-fa350e29c85e), [F6](https://medium.com/@vaibhav11t/i-interviewed-at-uipath-frontend-sde-2-react-machine-coding-lld-dsa-one-brutal-reality-check-cbd08859e99d), [F8](https://medium.com/@yashpreetbathla/harness-senior-software-engineer-frontend-interview-experience-all-8-rounds-a06f8347dda5), [F9](https://medium.com/@yashpreetbathla/adobe-frontend-interview-experience-all-4-rounds-questions-how-i-cr)
  - Rounds that were mainly or wholly DSA: about 4/36 ≈ **11%** (F6-R3, F8-R2, F8-R3, F9-R1). In the other 5 DSA rounds, DSA was one part next to JS, React or design. Same sources as above.
  - Rounds containing JS fundamentals/polyfills/output questions: 12/36 = **33%**.
  - Rounds containing machine coding/UI build: 11/36 = **31%**. 4 were vanilla JS/HTML (F5, F7, F8-R4, F10) and 5 were React (F1, F6, F8-R6, F9, and F2 likely).
  - Rounds containing frontend system design: 9/36 = **25%**. Topics: Slack chat, Google Forms, AI chat app, stock trading platform, Toast NPM package, GitHub PR page HLD, Adobe and Confluent (topics undisclosed).
  - Rounds containing LLD: 1/36 (UiPath).
  - Backend/general system design: **0/36**.
  - Take-home: **0/36**. SuperMoney R1 was a 1.5 h live build "similar to being given" an assignment, but it was proctored live — [F2](https://medium.com/@anjaliraheja1850/supermoney-by-flipkart-sde-3-frontend-interview-experience-05e3b99ebc1d).
  - Rounds containing behavioral/HR/HM/recruiter: 9/36 = **25%**. Of these, 5 were purely non-technical (F3-R4, F7-R1, F8-R1, F8-R7, F10-R5).
- **Loops with at least one DSA round or component: 5/10 = 50%** (Postman, Kotak, UiPath, Harness, Adobe). If Uber is counted using the author's description of the full process, it is **6/10**: "the process covered JavaScript problem-solving, machine coding, frontend/system design, DSA, and a hiring manager round" — [F4](https://medium.com/@anjaliraheja1850/uber-senior-frontend-engineer-interview-experience-2026-ddc9dd742dbd)
- **Loops with no DSA:** SuperMoney/Flipkart SDE-3, Headout, Confluent, Quest Global (a single round), and Uber for the rounds the author took — [F2](https://medium.com/@anjaliraheja1850/supermoney-by-flipkart-sde-3-frontend-interview-experience-05e3b99ebc1d), [F7](https://medium.com/@yashpreetbathla/my-first-interview-in-3-years-senior-software-engineer-frontend-at-headout-4a6884ed4b07), [F10](https://medium.com/@yashpreetbathla/confluent-senior-frontend-interview-experience-all-5-rounds-why-thi), [F5](https://medium.com/@deeksha.gverma11/my-quest-global-frontend-interview-experience-3dd1fa7f1fcb)
- **Every loop in Tier F had at least one JS or machine-coding round (10/10), and 8/10 had frontend system design.** The two without FESD were Quest Global (one round) and UiPath, where LLD took its place — see the table sources.
- **DSA difficulty where named (Tier F):**
  - 2 named LeetCode Mediums: LC 200 Number of Islands and LC 3 Longest Substring — [F1](https://saumyadip25.medium.com/postman-senior-engineer-frontend-interview-experience-feee8e512d9d), [F3](https://medium.com/@anjaliraheja1850/kotak-mahindra-bank-senior-frontend-engineer-interview-experience-fa350e29c85e)
  - LC 207 Course Schedule (Medium) and LC 312 Burst Balloons (**Hard**) — [F6](https://medium.com/@vaibhav11t/i-interviewed-at-uipath-frontend-sde-2-react-machine-coding-lld-dsa-one-brutal-reality-check-cbd08859e99d)
  - LC 134 Gas Station (Medium), plus several Easy/Medium array, string and DOM-tree problems — [F8](https://medium.com/@yashpreetbathla/harness-senior-software-engineer-frontend-interview-experience-all-8-rounds-a06f8347dda5)
  - Topic areas seen: sliding window, graph BFS/DFS (Islands, Course Schedule, DOM tree), DP (Burst Balloons), greedy (Gas Station), prefix sums.
- The Kotak DSA question was time-boxed to about 15 minutes, and "the key here was to come up with an efficient sliding-window based solution rather than using a brute-force approach" — [F3](https://medium.com/@anjaliraheja1850/kotak-mahindra-bank-senior-frontend-engineer-interview-experience-fa350e29c85e)
- The "machine coding" label covers many kinds of task:
  - Full feature builds: inventory management, nested comments, GitHub PR page, memory game — [F2](https://medium.com/@anjaliraheja1850/supermoney-by-flipkart-sde-3-frontend-interview-experience-05e3b99ebc1d), [F3](https://medium.com/@anjaliraheja1850/kotak-mahindra-bank-senior-frontend-engineer-interview-experience-fa350e29c85e), [F8](https://medium.com/@yashpreetbathla/harness-senior-software-engineer-frontend-interview-experience-all-8-rounds-a06f8347dda5)
  - JS utility implementations that Uber called "machine coding": `mapAsyncLimit` — [F4](https://medium.com/@anjaliraheja1850/uber-senior-frontend-engineer-interview-experience-2026-ddc9dd742dbd)

### Tier P dataset: partial, member-only (details come from search-engine summaries or RSS previews only)

| # | Post | Date | Level | Company (type) | Location | What is visible | DSA? |
|---|---|---|---|---|---|---|---|
| P1 | [Microsoft Frontend (Frontend Army)](https://medium.com/frontend-army/microsoft-frontend-interview-experience-2026-89256ae8622b) | "2026" in title | n/s | Big tech | n/s | 6 rounds. R1 was a ~2 h machine-coding round (email client / chat UI given as examples) | Unknown |
| P2 | [Amazon Frontend Engineer (Frontend Army)](https://medium.com/frontend-army/amazon-frontend-engineer-interview-experience-2026-a81e237279aa) | "2026" | FEE I | Big tech | n/s | OA + "algorithm-focused interviews" + frontend interviews | **Yes** |
| P3 | [Angel One SDE 2 Frontend (Frontend Army)](https://medium.com/frontend-army/angel-one-sde-2-frontend-interview-experience-2026-af0c1ee64a42) | "2026" | SDE-2 | Indian fintech | India | R1 JS output questions (this/call); prototypes, polyfills, currying, async, performance, observability | Not mentioned |
| P4 | [Adobe MTS-2 Frontend (Frontend Army)](https://medium.com/frontend-army/adobe-mts-2-frontend-interview-experience-2026-75d7f305d3a0) | "2026" | MTS-2 | Big tech | n/s | R1: closures, event loop, `this`, debounce/throttle implementations | Unknown |
| P5 | [Groww SDE-2 Frontend (Frontend Army)](https://medium.com/frontend-army/groww-sde-2-frontend-interview-experience-2026-eb7d16f9acc9) | "2026" | SDE-2 | Indian fintech | India | React, TypeScript, practical problem-solving | **No** ("no heavy LeetCode-style round", per search summary) |
| P6 | [Freshworks Frontend Engineer, 26 LPA (Frontend Army)](https://medium.com/frontend-army/freshworks-frontend-engineer-interview-experience-26-lpa-2026-edcfb2439393) | 16 Nov 2026 | n/s | Indian SaaS | Chennai | OA included a debounce implementation and a React re-render fix | Unknown |
| P7 | [Hiver SDE-2 Frontend (Frontend Army)](https://medium.com/frontend-army/hiver-sde-2-frontend-interview-experience-2026-a265b5b5d4b8) | "2026" | SDE-2 | Indian SaaS | India | OA with 4 sections and no React; rapid-fire LLD; HLD/FE system design | Not mentioned |
| P8 | [Nykaa SDE-2 Frontend (Frontend Army)](https://medium.com/frontend-army/nykaa-frontend-interview-experience-sde-2-a244c8d81bd0) | **Date unverified** | SDE-2 | Indian e-commerce | India | R1 project + DSA (linked list, tree); FE system design; LLD | **Yes** |
| P9 | [Okta SDE-2 Frontend (Frontend Army)](https://medium.com/frontend-army/okta-sde-2-frontend-interview-experience-sde-2-990014c22919); also [author version, 11 Jan 2026](https://medium.com/@chauhan27.abhay/okta-sde-2-frontend-interview-experience-6c9856436383) | 11 Jan 2026 (author copy) | SDE-2 | Global product | India | React machine coding + extended JS discussion; "React, JavaScript, System Design". Rejected | Not mentioned |
| P10 | [JioHotstar SDE-2 Frontend, 48 LPA (Frontend Army)](https://medium.com/frontend-army/jiohotstar-frontend-interview-experience-48-lpa-sde-2-865d1e62892d) | Date unverified | SDE-2 | Indian product | India | Project deep dive, event loop, closures, browser internals; 2+ months; rejected | Not mentioned |
| P11 | [Razorpay SDE-2 Frontend (Frontend Army)](https://medium.com/frontend-army/razorpay-frontend-interview-experience-sde-2-c8281db61ed5) | Date unverified | SDE-2 | Indian fintech | India | LLD (design an ATM), HLD, React machine coding, web fundamentals | Not mentioned |
| P12 | [Razorpay Senior Frontend (Frontend Army)](https://medium.com/frontend-army/razorpay-frontend-interview-experience-senior-frontend-engineer-a00355bc1900) | Date unverified | Senior | Indian fintech | India | Project deep dive, JavaScript, machine coding, HM; rejected after R3 | **No** DSA round listed |
| P13 | [Flipkart UI Engineer 2, 50 LPA (Frontend Army)](https://medium.com/frontend-army/my-flipkart-frontend-interview-experience-50-lpa-ui-engineer-2-eb698a323ecb) | Date unverified (search tool called it "most recent") | UI Eng 2 | Indian e-commerce | Bangalore | 5 rounds: MC, UI tech/JS deep dive, **DSA with a DOM polyfill**, system design, HM; rejected in final round | **Yes** |
| P14 | [Swiggy SDE-1 Frontend (Frontend Army)](https://medium.com/frontend-army/swiggy-frontend-interview-experience-sde-1-a53609d5c3bd) | Apr 2026 (per search summary) | SDE-1 | Indian product | India | Online test: basic DSA, JS, React MC, CSS/MCQs; nested JSON viewer; file explorer; rejected | **Yes (basic)** |
| P15 | [Deconstructing the Swiggy Frontend SDE-2 Loop (TechTrends Digest)](https://medium.com/techtrends-digest/deconstructing-the-swiggy-frontend-sde-2-interview-loop-ba3cff71d2ac) | Jul 2026 (per search summary) | SDE-2 | Indian product | India | "Bypassed abstract algorithmic puzzles"; ~2 h machine coding (restaurant listing feed); runtime performance; async JS | **No** |
| P16 | [Meesho Frontend: "No DSA Drama, Just JavaScript Karma"](https://medium.com/@chauhan27.abhay/meesho-frontend-interview-experience-no-dsa-drama-just-javascript-karma-a8d4a9f6f4e7) | 21 Dec 2025 | n/s | Indian e-commerce | India | Preview: "If you're tired of cracking trees and graphs just to build buttons and modals, Meesho's frontend interview process feels like a breath of…" | **No** (title) |
| P17 | [PhonePe UI Engineer](https://medium.com/@chauhan27.abhay/phonepe-interview-experience-ui-engineer-e2aae67e3c20) | 4 Feb 2026 | UI Eng | Indian fintech | India | Subtitle: "From DSA to Deep JS — a full-day frontend reality check" | **Yes** (subtitle) |
| P18 | [My Atlassian Senior Frontend (50+ LPA)](https://medium.com/@chauhan27.abhay/my-atlassian-senior-frontend-interview-experience-50-lpa-51bc491b4750) | ~Dec 2025 (search tool said "about 349 days" old; exact date unverified) | Senior | Global product (Atlassian India) | India | "7 interviews + discussions", first a 20-min recruiter call | Unknown |
| P19 | [Housing.com SDE-1 Frontend](https://medium.com/@chauhan27.abhay/housing-com-frontend-interview-experience-sde-1-machine-coding-react-hooks-javascript-web-abdfa14d8fed) | 17 Jan 2026 | SDE-1 | Indian product | India | Title: "Machine Coding, React Hooks, JavaScript & Web…" | Not in title |
| P20 | [CGI Frontend Interview, Round 2](https://medium.com/@anil-singh/cgi-frontend-interview-experience-round-2-2c6aa8c1e5b3) | Date unverified | n/s | **IT services** | n/s | Advanced React, promises vs async/await, API handling, security, performance at scale | Not mentioned |

Tier P summary for DSA:
- DSA mentioned: 6 posts (P2 Amazon, P8 Nykaa, P13 Flipkart UI2, P14 Swiggy SDE-1, P17 PhonePe, plus Amazon's OA).
- DSA explicitly absent: 5 posts (P5 Groww, P12 Razorpay Senior, P15 Swiggy SDE-2, P16 Meesho, and P11 Razorpay SDE-2 by omission).
- Not determinable: the rest.

### Tier M: metadata only (in window, member-only, no round details visible)
Frontend Army RSS listing, Nov 2026 ([feed](https://medium.com/feed/frontend-army)). Each preview only says "This is an interview experience shared by a candidate…":
- [Cloudflare FE, Bengaluru, 25 Nov 2026](https://medium.com/frontend-army/cloudflare-frontend-engineer-interview-experience-45-lpa-2026-0fdddd2f1706)
- [Dropbox FE, US, 23 Nov](https://medium.com/frontend-army/dropbox-frontend-engineer-interview-experience-230k-2026-c5503f574ae5)
- [Stripe FE, Bengaluru, 20 Nov](https://medium.com/frontend-army/stripe-frontend-engineer-interview-experience-58-lpa-2026-cc36ce63cb53)
- [Walmart SDE-3 FE, Bengaluru, 18 Nov](https://medium.com/frontend-army/walmart-sde-3-frontend-interview-experience-52-lpa-2026-44480ffa7706)
- [Netflix FE, US, internal switch, 13 Nov](https://medium.com/frontend-army/netflix-frontend-engineer-interview-experience-420k-2026-805bf38cf3ed)
- [Intuit SDE-2 FE, Bengaluru, 11 Nov](https://medium.com/frontend-army/intuit-sde-2-frontend-interview-experience-42-lpa-2026-96b959235bb9)
- [CRED SDE-2 FE, Bengaluru, 9 Nov](https://medium.com/frontend-army/cred-sde-2-frontend-interview-experience-40-lpa-2026-0e332b205496)
- [Coinbase Senior FE, remote India, 6 Nov](https://medium.com/frontend-army/coinbase-senior-frontend-interview-experience-60-lpa-2026-572ffe4afa33)
- [Reddit Senior FE, Bengaluru, 4 Nov](https://medium.com/frontend-army/reddit-senior-frontend-engineer-interview-experience-60-lpa-2026-0b89e49d9119)

Other in-window posts from [@chauhan27.abhay's feed](https://medium.com/feed/@chauhan27.abhay), preview only:
- [Microsoft SWE-2 FE, 3 Feb 2026](https://medium.com/@chauhan27.abhay/microsoft-swe-2-frontend-interview-experience-324813af5139)
- [Airbnb SDE-1 FE, 7 Feb 2026](https://medium.com/@chauhan27.abhay/airbnb-frontend-interview-experience-sde-1-a-deep-dive-into-ui-js-real-world-thinking-ef069f5ec612)
- [Swiggy Senior FE, 24 Jan 2026](https://medium.com/@chauhan27.abhay/swiggys-senior-frontend-interview-30-45-lpa-what-they-actually-test-c0f2175f3463)
- [GoodScore Junior FE, 23 Jan 2026](https://medium.com/codetodeploy/interview-experience-at-goodscore-junior-frontend-developer-1550133c7808)
- [Zeta SDE-1 FE, 22 LPA offer, 17 Dec 2025](https://medium.com/@chauhan27.abhay/zeta-sde-1-frontend-interview-experience-22-lpa-offer-4c00d32abec4)
- [Angel One SDE-2 FE, 13 Dec 2025](https://medium.com/@chauhan27.abhay/angel-one-frontend-interview-experience-sde-2-40-lpa-b34e0327f936)

### Older posts (before Nov 2025), kept out of the stats
- [2.5 YOE frontend, 10 companies (Zepto, Razorpay, Walmart, Procore, HackerRank, Kotak 811, Fynd, Chalo, Shopflo, Healthify)](https://medium.com/@gadarsh555/frontend-engineer-interview-experience-2-5-71db5c39aaa2), 12 Oct 2024, full text. The DSA problems it lists, pooled across those companies:
  - Combination Sum II (Medium)
  - Capacity to Ship Packages (Medium)
  - Shortest Bridge (Medium)
  - Symmetric Tree (Easy)
  - Word Ladder (Hard)
  - Edit Distance (Medium)
  - Longest Substring Without Repeating Characters (Medium)
  - Maximum Subarray (Medium)
  - It also has separate sections for vanilla JS machine coding, React machine coding and HM problems. This is the closest match to a ~2–4 YOE India profile, but it is from 2024.
- Titles only, 2025 ([feed](https://medium.com/feed/@abhishek4075)):
  - [Flipkart UI Eng II, 21 Apr 2025](https://medium.com/@abhishek4075/ui-engineer-ii-interview-experience-flipkart-711c4b374a0c). A search summary describes a live vanilla JS e-commerce build plus a code-review/performance round.
  - [PhonePe UI Eng II, 29 Aug 2025](https://medium.com/@abhishek4075/frontend-interview-experience-in-phonepe-ui-engineer-ii-71676feb22f3)
  - [Adobe CS II, Apr 2025](https://medium.com/@abhishek4075/computer-scientist-ii-frontend-interview-experience-adobe-5f3a4e938eb2)
  - [Mercer Mettl SDE 2](https://medium.com/@abhishek4075/frontend-interview-experience-in-mercer-mettl-sde-2-6313f36d1230)
  - [Saas Labs SDE 2](https://medium.com/@abhishek4075/frontend-interview-experience-in-saas-labs-sde-2-84a9c3bf4f7e)
  - [Stable Money SDE 2](https://medium.com/@abhishek4075/frontend-interview-experience-in-stable-money-sde-2-1188453cd7c6)
  - [Wishlink SDE II](https://medium.com/@abhishek4075/frontend-interview-experience-wishlink-5511641b1cbc)
  - [WrkSpot Senior](https://medium.com/@abhishek4075/frontend-interview-experience-in-wrkspot-senior-software-engineer-6a3b6fe48788)
- **Excluded:** [Flipkart SDE 2 (9 Feb 2026)](https://medium.com/@abhijeetkarmakar1920/flipkart-sde-2-interview-experience-e52db909af0b). The rounds were HM, machine coding, DSA (string Medium + graph DFS Medium), LLD of a booking system and HLD of a job scheduler, but the post never says it is a frontend role. The LLD/HLD topics look like a backend role, so it is excluded. It is listed here because it is a data point for "Flipkart SDE-2 has DSA".

### Inferences
- In this sample, a typical 2026 frontend loop is built around three frontend-specific round types: JS depth/polyfills, a machine-coding build, and frontend system design. DSA is a frequent fourth component (about half of loops) but rarely gets more than one dedicated round. Harness is the exception, with DSA in 4 of its 8 rounds.
- Because DSA often sits inside a mixed round ("short DSA problem" after JS output questions, or "DSA with a DOM polyfill"), a candidate can meet DSA even in loops that advertise themselves as JS/React-focused.
- The DSA bar seen here is roughly LeetCode Medium on arrays/strings (sliding window, prefix sum), graphs/trees (BFS/DFS) and greedy. DP showed up once, as a Hard (Burst Balloons), and it caused a rejection.

### Gaps
- The percentages rest on only 10 full-text loops, and **4 of the 10 come from one author** (yashpreetbathla: Headout, Harness, Adobe, Confluent) and 3 from another (anjaliraheja1850: SuperMoney, Kotak, Uber). The effective number of independent voices is about 5.
- Most *Frontend Army* posts, the largest pool by far (3 posts/week through 2026), are member-only. Their round contents could not be read beyond search summaries, so they could not go into the round tally.
- No US/EU loop was readable in full. The only US entries (Dropbox, Netflix) are metadata only.
- No Google or Meta frontend experience posts on Medium from the window turned up in search. The results were prep-guide sites, not candidate posts.

---

## Differences by experience level (especially ~2–4 YOE / SDE-2) and by company type

### Takeaway
- **By level:** the data is too thin for a reliable comparison. Only one full-text post is SDE-2 (UiPath), and it had a dedicated DSA round with a Hard problem that caused the rejection. Among partial SDE-2 posts (Angel One, Groww, Hiver, Nykaa, Okta, JioHotstar, Razorpay, Flipkart UI2, Swiggy SDE-2, PhonePe), DSA is mentioned in about 3 (Nykaa, Flipkart UI2, PhonePe) and explicitly absent in about 2 (Groww, Swiggy SDE-2).
- **By company type:** global product and big-tech loops (Postman, Harness, Adobe, UiPath, Uber-as-described) mostly included DSA; Confluent did not. Indian product loops were split: Kotak, Nykaa, Flipkart, PhonePe and Swiggy SDE-1 included DSA, while SuperMoney, Headout, Meesho, Groww, Razorpay and Swiggy SDE-2 did not. The 2 service-company posts (Quest Global, CGI) showed no DSA.

### Cited Findings
- **SDE-2 (full text):** UiPath Frontend SDE-2 had a React MC round, an LLD round and a dedicated DSA round (LC 312 Hard, LC 207 Medium), and the candidate was rejected "primarily due to the DSA round" — [UiPath](https://medium.com/@vaibhav11t/i-interviewed-at-uipath-frontend-sde-2-react-machine-coding-lld-dsa-one-brutal-reality-check-cbd08859e99d)
- **SDE-2 (partial):**
  - Groww SDE-2 reportedly had no heavy LeetCode-style round, with the focus on React/TypeScript and practical problem-solving — [Groww (Frontend Army)](https://medium.com/frontend-army/groww-sde-2-frontend-interview-experience-2026-eb7d16f9acc9) (search summary only)
  - Swiggy SDE-2 "bypassed abstract algorithmic puzzles" in favour of a ~2 h live UI build — [TechTrends Digest](https://medium.com/techtrends-digest/deconstructing-the-swiggy-frontend-sde-2-interview-loop-ba3cff71d2ac) (search summary only)
  - Nykaa SDE-2 R1 included linked-list/tree DSA — [Nykaa (Frontend Army)](https://medium.com/frontend-army/nykaa-frontend-interview-experience-sde-2-a244c8d81bd0) (search summary only; date unverified)
  - Flipkart UI Engineer 2 had a "DSA with a DOM polyfill" round among 5 rounds — [Flipkart (Frontend Army)](https://medium.com/frontend-army/my-flipkart-frontend-interview-experience-50-lpa-ui-engineer-2-eb698a323ecb) (search summary only; date unverified)
  - Razorpay SDE-2 had LLD (ATM), HLD, React MC and web fundamentals, with no DSA listed — [Razorpay SDE-2 (Frontend Army)](https://medium.com/frontend-army/razorpay-frontend-interview-experience-sde-2-c8281db61ed5) (search summary only)
  - Angel One SDE-2 focused on JS: this/call, prototypes, polyfills, currying, async — [Angel One (Frontend Army)](https://medium.com/frontend-army/angel-one-sde-2-frontend-interview-experience-2026-af0c1ee64a42) (search summary only)
- **Senior (full text):**
  - With DSA: Kotak (LC 3 Medium in a Bar Raiser round + a short DSA problem), Postman (Number of Islands), Harness (DSA in 4 of 8 rounds), Adobe CS1 (dedicated R1 DSA) — [Kotak](https://medium.com/@anjaliraheja1850/kotak-mahindra-bank-senior-frontend-engineer-interview-experience-fa350e29c85e), [Postman](https://saumyadip25.medium.com/postman-senior-engineer-frontend-interview-experience-feee8e512d9d), [Harness](https://medium.com/@yashpreetbathla/harness-senior-software-engineer-frontend-interview-experience-all-8-rounds-a06f8347dda5), [Adobe](https://medium.com/@yashpreetbathla/adobe-frontend-interview-experience-all-4-rounds-questions-how-i-cr)
  - No DSA: Headout, Confluent, SuperMoney SDE-3 — [Headout](https://medium.com/@yashpreetbathla/my-first-interview-in-3-years-senior-software-engineer-frontend-at-headout-4a6884ed4b07), [Confluent](https://medium.com/@yashpreetbathla/confluent-senior-frontend-interview-experience-all-5-rounds-why-thi), [SuperMoney](https://medium.com/@anjaliraheja1850/supermoney-by-flipkart-sde-3-frontend-interview-experience-05e3b99ebc1d)
  - **Every senior loop (7/7) had a frontend system design round** — same sources.
- **SDE-1 / junior (partial):** Swiggy SDE-1's online test mixed basic DSA with JS, React MC and CSS — [Swiggy SDE-1 (Frontend Army)](https://medium.com/frontend-army/swiggy-frontend-interview-experience-sde-1-a53609d5c3bd). Amazon FEE-I included "algorithm-focused interviews" — [Amazon (Frontend Army)](https://medium.com/frontend-army/amazon-frontend-engineer-interview-experience-2026-a81e237279aa)
- **Service companies:**
  - Quest Global's single interview covered resume, web APIs, React hooks, auth flow and an HTML/CSS recreation task, with no DSA — [Quest Global](https://medium.com/@deeksha.gverma11/my-quest-global-frontend-interview-experience-3dd1fa7f1fcb)
  - CGI round 2 was React, async, API, security and performance — [CGI](https://medium.com/@anil-singh/cgi-frontend-interview-experience-round-2-2c6aa8c1e5b3) (search summary only)
- **Company-type cross-tab (Tier F + P where DSA status is known):**
  - Global product / big tech: Postman Y, Harness Y, Adobe CS1 Y, UiPath Y, Amazon Y (P), Uber Y-as-described, Confluent N → **6/7 with DSA**.
  - Indian product / fintech: Kotak Y, Nykaa Y (P), Flipkart UI2 Y (P), PhonePe Y (P), Swiggy SDE-1 Y (P), SuperMoney N, Headout N, Meesho N (P), Groww N (P), Razorpay Senior N (P), Swiggy SDE-2 N (P) → **5/11 with DSA**.
  - Services: Quest Global N, CGI N (P) → **0/2**.
  - Sources: the tables above.

### Inferences
- In this small sample, global product companies and big tech (including their India offices) were the most likely to keep a DSA component in frontend loops. Indian product companies split about evenly, and several (Meesho, Groww, Swiggy SDE-2, Razorpay) were described specifically as having *no* DSA.
- For someone at ~2–4 YOE targeting SDE-2, the samples point to: (a) JS polyfills/async plus a machine-coding round as the near-certain core; (b) LLD/FE system design showing up even at SDE-2 (Hiver, Razorpay, UiPath, Nykaa); (c) DSA present at roughly half of companies, and decisive when present (UiPath).
- Seniors in this sample faced FE system design in every loop, which suggests system design takes more of the weight with seniority, while DSA did not clearly decline with seniority (Harness and Adobe were senior loops heavy in DSA).

### Gaps
- There are no posts with an explicitly stated 2–4 YOE in the in-window full-text set. YOE was rarely stated, so level comes from titles (SDE-2/Senior). The only explicit "2.5 YOE" post is from 2024.
- Comparisons by company type mix Tier F with search-summary Tier P data, which may omit rounds. "DSA not mentioned" is not the same as "no DSA".
- Atlassian, Swiggy Senior, CRED, Intuit, Walmart, Stripe and Microsoft SWE-2 posts exist in the window, but their content was behind the paywall.
- Service-company coverage is 2 posts. The comparison for that segment is not meaningful.

---

## What authors say about how much DSA mattered

### Takeaway
Authors split clearly. Those who hit a DSA round (UiPath, Harness, Adobe) say it is "non-negotiable" or part of a "widening" senior bar, and the UiPath rejection was explicitly blamed on DSA. Authors at companies without DSA (Meesho, Swiggy SDE-2, Confluent) frame frontend loops as moving away from LeetCode toward JS depth, UI building and product-minded design. Everyone agrees that "React alone isn't enough".

### Cited Findings
- UiPath SDE-2 author: "DSA is non-negotiable, even for frontend-focused roles"; "Strong React/TypeScript skills help — but they don't compensate for weak DSA"; "The rejection was primarily due to the DSA round"; the stated weakness was "DP and graph fundamentals" — [UiPath](https://medium.com/@vaibhav11t/i-interviewed-at-uipath-frontend-sde-2-react-machine-coding-lld-dsa-one-brutal-reality-check-cbd08859e99d)
- Adobe CS1 author: "The senior frontend bar is widening. It's not enough to be great at React anymore. DSA, system design, and a real, thoughtful relationship with AI tooling are all part of the conversation now." On the DSA round: "It's less about whether you can solve a problem and more about whether you can reason through one… Whiteboard-level grinding isn't enough" — [Adobe](https://medium.com/@yashpreetbathla/adobe-frontend-interview-experience-all-4-rounds-questions-how-i-cr)
- Harness author: after the earlier Headout rejection, the author "Practiced harder. Built more. Read more. Solved more." The Harness R2 was "a vibe check on both algorithmic thinking and JS fluency"; R3 DSA was "not just 'solve it.' It was 'solve it, and then defend it.'" — [Harness](https://medium.com/@yashpreetbathla/harness-senior-software-engineer-frontend-interview-experience-all-8-rounds-a06f8347dda5)
- Same author on Confluent (no DSA): the questions were "not the recycled patterns you've already solved on LeetCode"; "vanilla JS still matters. Probably more than it used to"; "Frontend interviews are increasingly product conversations" — [Confluent](https://medium.com/@yashpreetbathla/confluent-senior-frontend-interview-experience-all-5-rounds-why-thi)
- Same author on Headout: the gaps identified were "Frontend system design depth" (listed first), not DSA, and he admits "the last time you opened LeetCode was when JavaScript itself was younger" — [Headout](https://medium.com/@yashpreetbathla/my-first-interview-in-3-years-senior-software-engineer-frontend-at-headout-4a6884ed4b07)
- Postman author, rejected on polyfill and system design rather than DSA, recommends "strong foundation in JavaScript and browser fundamentals while also spending time on React internals, DSA, web security, performance, and frontend system design" and says "senior frontend interviews aren't limited to React" — [Postman](https://saumyadip25.medium.com/postman-senior-engineer-frontend-interview-experience-feee8e512d9d)
- Kotak author summarised the process as "a good mix of DSA, JavaScript, frontend fundamentals, machine coding, system design, and problem solving" — [Kotak](https://medium.com/@anjaliraheja1850/kotak-mahindra-bank-senior-frontend-engineer-interview-experience-fa350e29c85e)
- Uber author: "a solution that simply works isn't necessarily enough"; she recommends "going beyond React-specific questions" toward JS internals, async, machine coding and frontend system design — [Uber](https://medium.com/@anjaliraheja1850/uber-senior-frontend-engineer-interview-experience-2026-ddc9dd742dbd)
- SuperMoney author: the interviewers cared about "production-quality code" and deep follow-ups, and there was no DSA at all — [SuperMoney](https://medium.com/@anjaliraheja1850/supermoney-by-flipkart-sde-3-frontend-interview-experience-05e3b99ebc1d)
- Meesho post (preview only): "If you're tired of cracking trees and graphs just to build buttons and modals, Meesho's frontend interview process feels like a breath of…" (title: "No DSA Drama, Just JavaScript Karma") — [Meesho](https://medium.com/@chauhan27.abhay/meesho-frontend-interview-experience-no-dsa-drama-just-javascript-karma-a8d4a9f6f4e7)
- Quest Global author: "knowing React alone isn't enough for a frontend interview at this level", with the emphasis on projects, browser/web concepts and HTML/CSS. DSA is not mentioned — [Quest Global](https://medium.com/@deeksha.gverma11/my-quest-global-frontend-interview-experience-3dd1fa7f1fcb)

### Inferences
- DSA seems to act as a gate where it exists: one weak DSA round sank an otherwise passing SDE-2 loop (UiPath). Where it is absent, failures are attributed to frontend system design structure (Postman, Headout) or JS/polyfill depth (Postman's getElementsByClassName).
- "No DSA" posts are the ones that advertise it in the title (Meesho). This hints that DSA-free frontend loops are notable enough to be called out, not the assumed default.

### Gaps
- No author gave a quantified estimate (e.g., "DSA was X% of the decision").
- Selection bias:
  - Medium posts skew toward India, mid/senior levels, and authors writing series. Frontend Army is a single member-only publication that posts secondhand ("shared by a candidate/friend") accounts with salary-headline titles.
  - Successful candidates are somewhat over-represented in Tier F (4 selected/offer vs 4 rejected/no-response, 2 unclear).
  - Search ranking also favours publications that are already popular.
  - These figures describe what Medium authors chose to write about, not hiring practice in general.
