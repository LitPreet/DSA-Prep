# Frontend System Design: Focused Prep

Companion to [PREP_PLAN.md](PREP_PLAN.md) and [QUESTION_BANK.md](QUESTION_BANK.md).

At 3 YOE, interviews test whether you can design a **frontend feature end to end**. You don't need every security header or test type.
Plan: learn 8 core topics (~12 hrs), skim the rest, then **practice problems daily**.

---

## 1. Core topics (learn these properly)

| # | Topic | What you must be able to explain | Time | Done |
|---|---|---|---|---|
| 1 | **Answer framework (RADIO)** | Requirements → Architecture → Data model → Interface (API) → Optimizations | 1h | [ ] |
| 2 | **Communication** | REST vs GraphQL; short polling, long polling, WebSockets, SSE, and when to pick each | 1.5h | [ ] |
| 3 | **Rendering patterns** | CSR, SSR, SSG, ISR, streaming, hydration; SEO vs dashboard trade-offs | 1.5h | [ ] |
| 4 | **Performance** | Core Web Vitals, code splitting, lazy loading, images, virtualization, debounce/throttle, bundle size | 2h | [ ] |
| 5 | **Caching & storage** | HTTP caching (Cache-Control, ETag), service worker, in-memory / React Query cache, localStorage vs IndexedDB vs cookies | 1.5h | [ ] |
| 6 | **State management** | Server vs client state, normalized data, optimistic updates and rollback | 1h | [ ] |
| 7 | **Security basics** | XSS, CSRF, CORS, CSP, auth token storage (cookie vs localStorage) | 1.5h | [ ] |
| 8 | **Accessibility & offline** | Keyboard nav, ARIA, focus management; offline action queue | 1h | [ ] |

### Skim or skip for now
- Every testing type in depth (just know unit, integration and e2e, and when to use each)
- Logging, monitoring and alerting (one line: "Sentry for errors, RUM for Web Vitals")
- Advanced security (SSRF, SRI, permissions policy, compliance)
- gRPC and server-side material
- Namaste LLD videos (accordion, pagination, infinite scroll, comments, slider). **Build them yourself** from QUESTION_BANK.md §1 instead
- Namaste HLD videos: **attempt the problem first, then watch** to compare

---

## 2. Resources

### Main resources (pick one per topic)
| Resource | What it's good for | Free? |
|---|---|---|
| [GreatFrontEnd: Front End System Design guide](https://www.greatfrontend.com) | RADIO framework + worked examples (autocomplete, feed, chat) | The guide and a few problems are free |
| [Front End Interview Handbook](https://www.frontendinterviewhandbook.com) | Short overview of what interviewers expect | Free |
| [Awesome Front End System Design](https://github.com/greatfrontend/awesome-front-end-system-design) | Curated articles + real company engineering blogs | Free |
| [FrontendGeek](https://www.frontendgeek.com) | System design cheat sheet, frequently asked questions, machine coding | Free |
| [Tech Interview Handbook: System Design](https://techinterviewhandbook.org/system-design/) | General system design interview overview | Free |

### Per topic
| Topic | Resource |
|---|---|
| 1. Framework (RADIO) | GreatFrontEnd guide, introduction chapters (~1h) |
| 2. Communication | **Hussein Nasser** (YouTube): long polling vs WebSockets vs SSE videos |
| 3. Rendering patterns | [patterns.dev](https://www.patterns.dev) rendering patterns + web.dev "Rendering on the Web" |
| 4. Performance | [web.dev](https://web.dev) Core Web Vitals (LCP, INP, CLS) + patterns.dev performance patterns |
| 5. Caching & storage | MDN "HTTP caching" + web.dev service worker caching strategies |
| 6. State management | TanStack Query docs: "Important defaults" + "Optimistic updates" |
| 7. Security | OWASP Cheat Sheets (XSS Prevention, CSRF Prevention) + MDN CORS |
| 8. Accessibility | [WAI-ARIA Authoring Practices (APG)](https://www.w3.org/WAI/ARIA/apg/patterns/): combobox, tabs, accordion, modal, carousel patterns |

### YouTube (search these names; not verified through search)
- **Chirag Goel**: frontend system design playlist (interview-style problems)
- **Roadside Coder**: machine coding + frontend interview videos (React)
- **Evgenii Ray**: in-depth frontend HLD walkthroughs
- **Namaste Frontend System Design** (Akshay Saini): keep the HLD problem videos, skip the long theory modules

---

## 3. Daily practice routine (1.5h)

1. **45 min:** design on paper / Excalidraw, **talking out loud** as if in an interview
2. **30 min:** compare with a reference (GreatFrontEnd, Namaste video, or Claude review)
3. **15 min:** write what you missed in the "Mistakes" log at the bottom

### Problems (about 2 days each, ~2 weeks for the core 10)
- [ ] 1. Autocomplete / typeahead (full prompt below)
- [ ] 2. News feed (infinite scroll)
- [ ] 3. Image carousel / photo gallery (Pinterest)
- [ ] 4. Chat app (WhatsApp Web)
- [ ] 5. AI chat interface (streaming responses)
- [ ] 6. E-commerce product listing + cart
- [ ] 7. Nested comments system
- [ ] 8. Notifications (toasts + inbox)
- [ ] 9. Collaborative editor (Google Docs)
- [ ] 10. Design system / component library

**Extra (after the core 10):**
- [ ] Real-time dashboard / stock ticker
- [ ] Video player (YouTube/Netflix)
- [ ] Travel booking flow
- [ ] Jira/Kanban board
- [ ] Analytics SDK
- [ ] Spreadsheet
- [ ] Micro-frontends

### Answer template (copy for each problem)
```
## Problem: <name>
### 1. Requirements
- Functional:
- Non-functional (perf, devices, a11y, i18n, offline):
- Questions to ask interviewer:
### 2. Architecture (components + responsibilities)
### 3. Data model (client state, cache shape)
### 4. Interface (component props + server API request/response)
### 5. Optimizations (perf, network, UX, a11y, security, edge cases)
```

---

## 4. Problem 1: Design an Autocomplete

> **Interviewer:** "Design a reusable search autocomplete component, like Google search or Flipkart product search. It will be used on several pages across our app. Walk me through your design."

Timebox: **45 min**. Write your answer with the template above, in `system-design/01-autocomplete.md`.

<details>
<summary>Self-check (open only after you've attempted it)</summary>

- Debounce input (~300ms) + minimum query length
- Cache results by query (Map with TTL or LRU limit); reuse cached prefix results
- **Race conditions:** an older, slower response must not overwrite a newer one (AbortController or comparing request IDs)
- Loading, error, empty and "no results" states
- Keyboard: up/down arrows, Enter, Escape; `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"`/`option`
- Highlight the matched text; truncate long items
- Props: `fetchSuggestions` (or `apiUrl`), `debounceMs`, `minChars`, `renderItem`, `onSelect`, `maxResults`, `placeholder`
- Server API: `GET /search?q=&limit=` returning `{ results: [{id, label, type}] }`
- Virtualize a long result list; close the list on click outside
- Recent searches from localStorage when the input is empty
- Mobile: touch targets, on-screen keyboard covering the list
- Network: retry with backoff, offline message
- Security: escape suggestion text (XSS); avoid `dangerouslySetInnerHTML` for highlighting
</details>

---

## 5. Mistakes log

| Date | Problem | What I missed | Fix / note |
|---|---|---|---|
| | | | |
