# Frontend Interview DSA Weightage and Prep-Time Split (Nov 2025 – Nov 2026)

Research date: 2026-11-26. Caveat for the report writer: several key pages could not be fetched. GreatFrontEnd returned HTTP 429, and namastedev.com, Medium, Blind and 1point3acres returned 403 or 402. Findings about those sources come from search-result snippets and are marked as such. **I found no measured frequency data (counts of questions by topic) for frontend interviews.** Every "frequency" ranking below is built from expert or curated guidance and candidate anecdotes. None of it is a dataset.

## 1. Which DSA topics are asked in frontend interviews, and how often?

### Takeaway
Curated sources agree on the core: arrays, strings, hash maps and sets, and especially trees with BFS/DFS traversal, because the DOM is a tree. The questions are usually easier than in general SWE loops. DP and graphs are rarely called core for frontend. One source treats them as mid or senior extras, and they show up mainly in Google/Meta-style loops, where frontend candidates sit the generic SWE algorithm rounds.

### Cited Findings
- The Frontend Interview Handbook (Yangshun Tay; "Last updated Oct 5, 2026") says basic algorithms and data structures are expected, with arrays, sets and maps as the common structures. **Trees are the stated priority** ("the DOM is a tree"): BFS, DFS and level-order traversal. Binary search and merge sort are named as algorithms to practice. — [Frontend Interview Handbook: Algorithms](https://www.frontendinterviewhandbook.com/algorithms)
- The same handbook says companies "tend to go easy on Front End Engineer candidates" and you "most likely won't get very tough or obscure algorithm problems." It gives no formal difficulty ranking. — [Frontend Interview Handbook: Algorithms](https://www.frontendinterviewhandbook.com/algorithms)
- The handbook's introduction lists the frontend interview formats: JavaScript coding, UI coding, algorithmic coding, quiz/trivia, and system design. It says "front end interviews have less emphasis on algorithms," that "you are probably going to get easier algorithmic questions," and that LeetCode grinding "is not all you need." — [Frontend Interview Handbook: Introduction](https://www.frontendinterviewhandbook.com/introduction) (updated Oct 5, 2026)
- GreatFrontEnd offers free JS/TS DSA practice covering stacks, queues, binary search and merge sort, and it hosts a "JavaScript DSA interview questions" list. — [Frontend Interview Handbook: Algorithms](https://www.frontendinterviewhandbook.com/algorithms); [GreatFrontEnd JS DSA questions](https://greatfrontend.com/questions/javascript-dsa-interview-questions)
- GreatFrontEnd's DSA guide (search snippet; the page itself returned 429) says good software engineers should master basic DSA, that some companies still include standard DSA questions for front-end roles, and that using JavaScript for algorithm questions saves prep time. — [GreatFrontEnd: DSA Interviews guide](https://www.greatfrontend.com/front-end-interview-guidebook/algorithms)
- GeeksforGeeks (updated 27 Jul 2025) puts arrays/objects, sorting/searching and hash maps as **high priority, basic depth (entry level)**, and recursion as medium. It lists graphs, DP and tree algorithms as **lower priority / advanced, for mid-level and senior roles** to "stand out." It gives no time split. — [GeeksforGeeks: DSA for FrontEnd Developer Interview](https://www.geeksforgeeks.org/?p=1040956)
- A search summary of GreatFrontEnd's "Data Structures Interview Questions for Senior Frontend Engineers" blog points to tree and DOM-like traversals as a recurring theme, plus choosing data structures for state management. The page itself was not fetched (429). — [GreatFrontEnd blog](https://www.greatfrontend.com/blog/data-structures-interview-questions-for-senior-frontend-engineers)
- Meta frontend candidate reports on Glassdoor (search snippets, undated in snippet) describe a mix of frontend and LeetCode-style questions. One reports "two leetcode questions, one hard one medium." Another says the candidate studied leetcode.com and frontendlead.com for about 4 months. These are anecdotes, not representative data. — [Glassdoor: Meta Frontend Engineer interview questions](https://www.glassdoor.com/Interview/Meta-Frontend-Engineer-Interview-Questions-EI_IE40772.0,4_KO5,22.htm)
- A Taro thread (search snippet) says many companies, especially startups, don't really ask DSA, while a Google L3/L4 loop "will be entirely DSA." — [Taro thread](https://www.jointaro.com/question/ZjW2FlY8jb2MW4HnHdcr/how-do-i-prep-for-frontend-job-interviews-do-i-apply-for-fullstack)

### Inferences
- **Ranked list.** This is inferred from how often each topic is emphasized across the sources above, not from measured question counts:
  1. **Arrays and strings** (including two pointers and sliding window). Easy to medium. Examples: Two Sum, Valid Anagram, Longest Substring Without Repeating Characters, Merge Intervals.
  2. **Hash maps and sets** (counting, grouping, dedup). Easy to medium. Examples: Group Anagrams, Top K Frequent, First Unique Character.
  3. **Trees and DOM-tree traversal** (BFS, DFS, level order; recursion). Easy to medium. Examples: Max Depth, Level Order Traversal, Invert Tree, plus frontend-flavoured versions: getElementsByClassName or getElementsByTagName, find a node in an identical DOM tree, flatten nested objects or arrays.
  4. **Stacks and queues.** Easy to medium. Examples: Valid Parentheses, Min Stack, implementing a queue in JS (JS has no built-in queue). The handbook and GreatFrontEnd both call out stacks and queues.
  5. **Binary search and sorting** (merge sort). Easy to medium. Examples: Binary Search, Search Insert Position, implementing merge sort.
  6. **Recursion and backtracking basics.** Medium. Examples: Permutations, Subsets, deep clone or flatten (these overlap with JS-utility questions).
  7. **Linked lists.** Easy. Examples: Reverse List, Merge Two Sorted Lists. These appear less often in frontend-specific guidance.
  8. **Graphs, heaps, DP and tries.** Medium to hard. These are mainly relevant for Google/Meta/big-tech loops that use generic SWE algorithm rounds. GeeksforGeeks calls them mid/senior differentiators, and the Frontend Interview Handbook does not list them as priorities.
- **Typical difficulty:** mostly easy to medium. Hard problems are reported mainly at Meta/Google-style loops.
- **Is DP or graphs commonly asked for frontend?** Not commonly at most companies, going by the sources' emphasis. Big-tech loops that share SWE algorithm rounds are the main exception.

### Gaps
- No measured frequency data (counts by topic from interview reports) was found for 2025–2026. LeetCode company tags are Premium-only and do not separate frontend roles.
- GreatFrontEnd's per-data-structure importance table (in its DSA guide) could not be retrieved this session because of HTTP 429. The writer should not quote specific importance labels from it unless they are verified.
- The 1point3acres Meta frontend question list (403) and the Blind "frontend interviews at FAANG DSA expectations" thread (402) could not be read.

## 2. What prep-time split do experts recommend for mid-level frontend roles?

### Takeaway
None of the credible sources I could access publishes a percentage split. The one concrete plan, Scrimba's 4-week plan (Jul 2026), spends no dedicated week on DSA and emphasizes JS fundamentals, timed component builds, React and system design, mocks, and behavioral. Expert guidance overall says to put most time into frontend-specific rounds and to set DSA depth by target company.

### Cited Findings
- **Scrimba, "Frontend Interview Prep Guide [2026]"** (Per Harald Borgen, 29 Jul 2026; vendor with courses to sell). Five stages: recruiter screen (20–30 min), technical screen (45–60 min, JS/framework depth), coding round (60–90 min or take-home, building a working, accessible UI), frontend system design (45–60 min), and behavioral (~45 min). 4-week plan:
  - Week 1: JS fundamentals, explained aloud
  - Week 2: timed component builds (45 min, no libraries)
  - Week 3: half React internals, half two system-design prompts
  - Week 4: two mock interviews, then rewrite behavioral stories

  With only one week, keep Weeks 1 and 4. If React is weak, plan in months. LeetCode questions are still asked "mostly at larger firms," and practice should lean toward component building unless the recruiter says the round is algorithmic. — [Scrimba](https://scrimba.com/articles/frontend-interview-prep-guide-2026/)
- The **Frontend Interview Handbook** gives no time allocation. It lists core concepts to be "extremely familiar" with: CSS (specificity, box model, layout, positioning), JS (`this`, prototypes, closures, async, promises, timers), design patterns (observer, module), HTML (event delegation, DOM traversal, form validation), and DOM manipulation. — [Frontend Interview Handbook: Introduction](https://www.frontendinterviewhandbook.com/introduction)
- **GreatFrontEnd** offers 1-week, 1-month and 3-month study plans, but their category breakdown could not be fetched (429). Search snippets say the industry is "gradually shifting away" from DSA for front-end candidates and that front-end engineers will be asked to design client apps and complex UI components. — [GreatFrontEnd Study Plans](https://www.greatfrontend.com/interviews/study-plans); [GreatFrontEnd DSA guide](https://www.greatfrontend.com/front-end-interview-guidebook/algorithms)
- A DEV Community post (search snippet) recommends spending "the bulk of your time" on component building and system design. — [DEV Community](https://dev.to/techresolve/solved-which-frontend-interview-prep-platform-is-best-532g)
- Dan Duan's Medium post "Prepare for the Frontend Interview in 50 Hours" exists, but it returned 403, so its hour split could not be verified. — [Medium](https://medium.com/@danduan/preparing-for-the-frontend-interview-in-50-hours-5b972d43a07c)
- GeeksforGeeks (Jul 2025): balance DSA with HTML/CSS/JS frameworks and tailor prep to the job description. No numbers. — [GeeksforGeeks](https://www.geeksforgeeks.org/?p=1040956)

### Inferences
- A working split for a ~3 YOE frontend developer targeting typical product companies or startups is my synthesis, **not a published figure**:
  - JS fundamentals and JS utility coding (debounce, throttle, promise.all, deep clone, event emitter): ~25–30%
  - Machine coding / UI builds: ~25–30%
  - DSA, easy/medium, core topics only: ~15–25%
  - Frontend system design: ~15%
  - Behavioral: ~5–10%
- Shift DSA up to ~35–40% for Google/Meta/Amazon-style loops.
- Both the Scrimba plan and the handbook imply that DSA is the most company-dependent component. Asking the recruiter which rounds the loop includes is the advice that recurs across sources.

### Gaps
- No percentage split from GreatFrontEnd, Yangshun Tay or Akshay Saini/NamasteDev could be verified. Their pages were blocked, and no published percentages surfaced in snippets.
- No YouTube video descriptions with prep splits were reviewed.

## 3. Trend: is DSA weight for frontend decreasing in 2026? (And Namaste DSA scope)

### Takeaway
Big tech is adding AI-assisted and practical rounds: Meta since Oct 2025, plus Google pilots and Canva, which replaced a CS-fundamentals screen. GreatFrontEnd describes a gradual shift away from DSA for frontend. But the LeetCode-style rounds have not gone away at large firms, and most organizations still ban AI in interviews. The evidence is qualitative. Namaste DSA is a full general-SWE DSA syllabus, broader than most frontend loops need.

### Cited Findings
- Meta began piloting an AI-enabled coding round in **October 2025**. It replaces one of the two onsite coding rounds and runs 60 minutes in CoderPad with a built-in AI assistant. — [interviewing.io](https://interviewing.io/blog/how-to-use-ai-in-meta-s-ai-assisted-coding-interview-with-real-prompts-and-examples); [Scrimba](https://scrimba.com/articles/frontend-interview-prep-guide-2026/)
- Google is piloting an AI-assisted round for junior/mid roles on select teams, plus a code-comprehension round. One source says DS&A rounds remain AI-free, and pilot dates vary across sources. — [Northeastern Careers, 13 May 2026](https://careers.northeastern.edu/blog/2026/05/13/googles-ai-assisted-coding-interview-2026-guide/); [Exponent](https://www.tryexponent.com/blog/google-ai-coding-interview)
- Canva replaced its "Computer Science Fundamentals" screen with an AI-Assisted Coding competency for backend and frontend roles (pilot). — reported via search summary of [igotanoffer](https://igotanoffer.com/en/advice/ai-assisted-coding-interview); primary Canva post not fetched
- A January 2026 Karat survey (as cited by Scrimba) found that 62% of organizations still prohibit AI in technical interviews, and that 71% of engineering leaders say AI makes technical skills harder to assess. This is measured survey data, but secondhand. — [Scrimba](https://scrimba.com/articles/frontend-interview-prep-guide-2026/)
- GreatFrontEnd (snippet): the industry is "gradually shifting away" from DSA questions for front-end candidates, though some companies still ask them. It also notes that at Google and Meta, strong algorithmic performance can offset weaker frontend-fundamentals answers. — [GreatFrontEnd DSA guide](https://www.greatfrontend.com/front-end-interview-guidebook/algorithms); [GreatFrontEnd: Google/Amazon/Meta process](https://www.greatfrontend.com/blog/frontend-interview-process-at-google-amazon-and-meta-what-to-expect)
- The Frontend Interview Handbook (Oct 2026) does **not** claim DSA is declining. It only says frontend loops emphasize algorithms less than SWE loops do. — [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/introduction)
- **Namaste DSA syllabus (23 sections, from a third-party mirror; reliability uncertain because namastedev.com returned 403):**
  1. Introduction
  2. Warm Up (loops, patterns)
  3. Time & Space Complexity
  4. Arrays
  5. Recursion
  6. Searching & Sorting
  7. Linked List
  8. Strings
  9. Stack & Queues
  10. Binary Search
  11. Two Pointers & Sliding Window
  12. Binary Tree
  13. BST
  14. Heap/Priority Queue
  15. Backtracking
  16. Greedy
  17. DP
  18. Graphs
  19. Tries
  20. Searching & Sorting (advanced, revisited)
  21. Arrays (advanced, revisited)
  22. Strings (advanced, revisited)
  23. Bonus (career)

  — [Mirror listing](https://unlockedcodingsite.vercel.app/teacher/akshay-saini/Namaste-DSA). The official page (snippet) describes "DSA from scratch" with arrays, linked lists, trees, graphs and DP, progressing "from fundamentals to advanced interview topics." — [NamasteDev: Namaste DSA](https://namastedev.com/learn/namaste-dsa)

### Inferences
- Trend: DSA weight for frontend looks **stable to gently declining**. Practical, AI-assisted and code-comprehension rounds are being added at big tech, but mostly as replacements for one round rather than the whole DSA component. Sources are prep vendors and career blogs, not company-wide data.
- **Namaste DSA scope vs frontend needs.** Sections 1–13 cover nearly all of the frontend-relevant ranked list above: arrays, strings, hashing (implicit), two pointers and sliding window, stack/queue, binary search, trees, recursion, and sorting. Sections 14–19 (heap, backtracking, greedy, DP, graphs, tries) go beyond what most frontend loops ask. They are worth it mainly for Google/Meta-style targets. A reasonable cut for a frontend candidate: finish through Binary Tree/BST, then do light coverage of backtracking basics and BFS on graphs/grids, and defer heavy DP.
- The course is taught in JavaScript (Akshay Saini's audience is JS developers; not verified on the blocked official page), which suits frontend interviews, where JS is the expected language.

### Gaps
- No quantitative data shows the share of frontend loops with a DSA round in 2025 vs 2026.
- No verified statement from Akshay Saini/NamasteDev on how much of Namaste DSA a frontend candidate needs.
- Namaste DSA's per-section problem lists and its language were not verifiable on the official site (403).
