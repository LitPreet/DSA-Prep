# Frontend System Design: Solved Questions

All 20 GreatFrontEnd frontend system design questions, plus 8 more matched to Indian product companies. Each one is answered the way you would in a real 45-minute interview.
Companion to [SYSTEM_DESIGN.md](../SYSTEM_DESIGN.md) (theory and resources) and [PREP_PLAN.md](../PREP_PLAN.md).

Open any file in VS Code with **Cmd+Shift+V** for the formatted preview.

---

## How to practise (don't just read these)

Reading a solution feels like learning, but in the interview you have to **produce** the answer out loud. For each question:

1. **35 min:** set a timer. Answer on paper or [Excalidraw](https://excalidraw.com) and **talk out loud**, as if an interviewer were listening.
2. **20 min:** read the solution file and compare it with your answer.
3. **5 min:** write what you missed under **"My mistakes"** at the bottom of that file.
4. **2 days later:** redo the same question from scratch, without looking.

---

## The answer framework: RADIO

Every solution follows this order. The order matters, because interviewers fail candidates who start drawing components before they define the data.

| Step | What you do | Time (of 45 min) |
|---|---|---|
| **R**equirements | Ask clarifying questions. List functional, non-functional and out-of-scope items | ~5 min |
| **A**rchitecture | Draw boxes: components, stores, server. Explain the main data flow | ~8 min |
| **D**ata model | Define the entities **first**. Say where each lives (server, client store, component state, URL) | ~7 min |
| **I**nterface | Component props + server API (endpoints, pagination, real-time) | ~8 min |
| **O**ptimizations | Go deep on the 3 or 4 topics that matter most for *this* problem | ~15 min |

Things to say in **every** answer:
- **Performance:** lazy loading, virtualization, debounce, code splitting, images
- **Network:** caching, retries, pagination, race conditions
- **Accessibility:** keyboard navigation, ARIA roles, focus management
- **Security:** XSS (never inject raw HTML), auth tokens in httpOnly cookies
- **UX states:** loading, empty, error, offline

---

## Priority for my targets
Targets: Zepto, Blinkit, Flipkart, Swiggy, CRED, Groww, MakeMyTrip, Cleartrip, Razorpay (15–18 LPA band).

These companies weigh **machine coding and JS fundamentals** more than system design. Design questions mostly show up inside the React rounds ("how would you make this list fast?"). Razorpay has a full HLD round. Do Tier 1 well before touching anything else.

### Tier 1: must do (`my-level/`). These match the apps these companies build
| # | Question | Difficulty | Why for my targets | Done |
|---|---|---|---|---|
| 01 | [Autocomplete](my-level/01-autocomplete.md) | Medium | Search exists in every one of these apps | [ ] |
| 09 | [E-commerce (Amazon / Flipkart)](my-level/09-e-commerce.md) | Medium | Zepto, Blinkit, Flipkart and Swiggy are listings, cart and checkout | [ ] |
| 02 | [News feed (Facebook)](my-level/02-news-feed.md) | Medium | Infinite lists, like Swiggy's restaurant feed | [ ] |
| 14 | [Travel booking (Airbnb)](my-level/14-travel-booking-airbnb.md) | Medium | MakeMyTrip and Cleartrip are exactly this | [ ] |
| 19 | [Data table](my-level/19-data-table.md) | Medium | Dashboards at Groww, CRED and Razorpay | [ ] |
| 03 | [Image carousel](my-level/03-image-carousel.md) | Medium | Banners on every home page. Also a machine coding question | [ ] |
| 06 | [Modal dialog](my-level/06-modal-dialog.md) | Medium | Component design. Also machine coding practice | [ ] |
| 05 | [Dropdown menu](my-level/05-dropdown-menu.md) | Medium | Component design. Also machine coding practice | [ ] |

### Tier 1B: not on GreatFrontEnd, matched to my targets (`my-level/`)
Do these right after Tier 1. Before an interview at one of these companies, do its matching question first.
| # | Question | Difficulty | Why for my targets | Done |
|---|---|---|---|---|
| 21 | [Nested comments (Reddit / YouTube)](my-level/21-nested-comments.md) | Medium | Very common at 3 YOE. Recursion + tree data | [ ] |
| 23 | [AI chat interface (ChatGPT)](my-level/23-ai-chat-interface.md) | Medium | The common 2026 question: streaming, AbortController | [ ] |
| 25 | [Live order tracking (Swiggy / Zepto / Blinkit)](my-level/25-live-order-tracking.md) | Medium | Their exact product: real-time status + map | [ ] |
| 22 | [Notification system (toasts + inbox)](my-level/22-notification-system.md) | Medium | Common everywhere: SSE, toast queue, aria-live | [ ] |
| 24 | [Design system / component library](my-level/24-design-system.md) | Medium | CRED, Razorpay, Flipkart: tokens, theming, component APIs | [ ] |
| 26 | [Real-time stock dashboard (Groww / Zerodha)](my-level/26-stock-dashboard.md) | Medium-Hard | Groww's product: WebSocket ticks, throttled rendering | [ ] |
| 27 | [Payment checkout widget (Razorpay)](my-level/27-payment-checkout-widget.md) | Medium-Hard | Razorpay's product: iframe, postMessage, UPI status | [ ] |
| 28 | [Multi-step form / KYC onboarding](my-level/28-multi-step-form.md) | Medium | Groww and CRED onboarding: schema forms, autosave, uploads | [ ] |

### Tier 2: if time allows (`my-level/`)
| # | Question | Difficulty | Key topics | Done |
|---|---|---|---|---|
| 08 | [Chat app (Messenger / Slack)](my-level/08-chat-app.md) | Hard | WebSockets, ordering, optimistic send. Support chat at Swiggy and Zepto | [ ] |
| 13 | [Photo sharing (Instagram)](my-level/13-photo-sharing-instagram.md) | Medium | image upload, stories, optimistic likes | [ ] |
| 07 | [Pinterest (masonry layout)](my-level/07-pinterest.md) | Hard | masonry layout, image loading, virtualization | [ ] |
| 04 | [Poll widget](my-level/04-poll-widget.md) | Medium | embeddable widget, Shadow DOM / iframe, double voting | [ ] |

### Tier 3: big tech and senior loops. Skip for the targets above (`senior-later/`)
| # | Question | Difficulty | Key topics | Done |
|---|---|---|---|---|
| 10 | [Email client (Outlook)](senior-later/10-email-client.md) | Medium | virtualization, safe HTML rendering, offline sync | [ ] |
| 11 | [Video streaming (Netflix / YouTube)](senior-later/11-video-streaming.md) | Hard | adaptive bitrate (HLS/DASH), player states, browse rows | [ ] |
| 17 | [Music streaming (Spotify)](senior-later/17-music-streaming-spotify.md) | Hard | persistent player, queue, Media Session API | [ ] |
| 18 | [Video conferencing (Zoom)](senior-later/18-video-conferencing-zoom.md) | Hard | WebRTC, SFU, video tiles grid | [ ] |
| 12 | [Collaborative editor (Google Docs)](senior-later/12-collaborative-editor.md) | Hard | OT vs CRDT, presence, offline merge | [ ] |
| 15 | [Rich text editor (Medium)](senior-later/15-rich-text-editor.md) | Hard | document model vs contenteditable, commands, paste sanitizing | [ ] |
| 16 | [Design / drawing tool (Figma, Excalidraw)](senior-later/16-drawing-tool-figma.md) | Hard | scene graph, canvas vs SVG, hit testing, pan/zoom | [ ] |
| 20 | [Google Sheets](senior-later/20-google-sheets.md) | Hard | sparse cells, canvas grid, formula dependency graph | [ ] |

**Suggested pace:** one question every 2 days, so Tier 1 takes about 2–3 weeks alongside machine coding, JS and DSA.

**Before each interview:** ask the recruiter what the rounds are. Companies usually tell you.
