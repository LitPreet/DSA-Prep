# Multi-step Form / KYC Onboarding (e.g. Groww / CRED account opening)

> **Difficulty:** Medium · **Asked at:** fintech and investing apps (Groww, Zerodha, CRED, Upstox, Paytm Money, Jupiter), lending/insurance (Bajaj Finserv, PolicyBazaar, Acko), and any product with seller/partner onboarding (Swiggy, Zepto, Flipkart) · **Time in interview:** 45 min
> Not on GreatFrontEnd's list; matches the products of Indian product companies.

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- Which product and which steps? → Assume: stock-broking account opening: Mobile OTP → PAN → Personal details → Address (Aadhaar / DigiLocker) → Bank account → Selfie + signature → Nominee → Review & e-sign. About 7–8 steps.
- Are steps fixed, or can the backend change them (A/B tests, regulation changes)? → Assume: **backend-driven**. Compliance changes often; we want to ship changes without an app release.
- Can users stop and come back later, maybe on another device? → Assume: yes. Progress is saved on the server against their account (phone number).
- Which devices? → Assume: mostly mobile web and in-app webview on mid/low-end Android; desktop too.
- What validation does the server do? → Assume: PAN check with the tax database (NSDL), IFSC lookup, penny-drop bank verification, face match for selfie. Some take seconds.
- Document uploads? → Assume: selfie (camera), signature (draw or upload photo), optional income proof PDF. Max 5 MB each.
- Languages? → Assume: English + Hindi, so labels come from config/i18n keys.
- Is there a human review step? → Assume: yes, ops can reject a document later ("Selfie unclear"), and the user must fix only that step.

## 1. Requirements

### Functional
- Show one step at a time with a progress bar ("Step 3 of 7").
- Steps and fields come from a **JSON schema** sent by the server.
- **Conditional steps/fields**: e.g. "Nominee details" only if user picks "Add nominee"; "FATCA details" only if "tax resident outside India = yes".
- **Back and Next** navigation. Back keeps entered data.
- Client validation on blur and on Next. Async validation for PAN, IFSC, and pincode.
- **Autosave** progress; **resume** from the last step on any device.
- Selfie via camera, signature via canvas or upload, document upload with progress and retry.
- Review screen showing all answers (masked PII) with "Edit" links per step.
- Show server-side rejections ("PAN name does not match bank name") on the right field.
- Final submit, then status page ("Under review, usually 24 hours").

### Non-functional (performance, accessibility, devices, network)
- First step interactive in **under 2 s on 4G** on a low-end Android. Initial JS under **150 KB gzipped**.
- Each step change feels instant (**< 100 ms**) because the next step's code is prefetched.
- Works on **flaky networks**: autosave queues and retries; no data lost on refresh or app kill.
- **Security / privacy:** PAN, Aadhaar, bank details are PII. Do not log them, do not keep them unencrypted in localStorage, mask them on screen.
- Accessible: real labels, errors announced to screen readers, focus moves to the first error, full keyboard use. WCAG 2.1 AA.
- Uploads up to 5 MB; compress images on device to ~200–300 KB before upload.

### Out of scope
- The actual KYC backend (NSDL, CKYC, DigiLocker integrations, face match ML).
- Ops/admin review dashboard.
- Native app screens (same design applies, but we build mobile web / webview).
- Building a general form-builder UI for ops.

## 2. Architecture

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Browser / WebView                                                         │
│                                                                           │
│  Router (/onboarding/:stepId)                                             │
│        │                                                                  │
│        ▼                                                                  │
│  ┌────────────────────┐   reads    ┌──────────────────────────────────┐   │
│  │ OnboardingShell    │──────────► │ Flow engine (state machine)      │   │
│  │ progress, back/next│            │ - schema + answers → visible     │   │
│  └─────────┬──────────┘            │   steps, next/prev step          │   │
│            │ renders current step  └──────────┬───────────────────────┘   │
│            ▼                                  │                           │
│  ┌────────────────────┐   ┌────────────────┐  │  ┌─────────────────────┐  │
│  │ StepRenderer       │──►│ Field registry │  │  │ Draft store          │  │
│  │ (schema → fields)  │   │ text, select,  │  │  │ (Zustand / RHF state)│  │
│  │ React Hook Form +  │   │ pan, ifsc,     │  │  │ + encrypted local    │  │
│  │ Zod resolver       │   │ selfie (lazy)  │  │  │   backup (IndexedDB) │  │
│  └─────────┬──────────┘   └────────────────┘  │  └──────────┬──────────┘  │
│            │                                  │             │ autosave    │
│            ▼                                  ▼             ▼ (debounced) │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ API layer (React Query): schema, application, validate, upload     │   │
│  └─────────┬───────────────────────────────────────────┬──────────────┘   │
└────────────┼───────────────────────────────────────────┼──────────────────┘
             │ REST                                      │ PUT file (presigned)
             ▼                                           ▼
   ┌──────────────────────┐                     ┌──────────────────────┐
   │ Onboarding API       │──── verify ───────► │ Object storage (S3)  │
   │ schema, drafts,      │  PAN / IFSC / bank  └──────────────────────┘
   │ validation, submit   │──► KYC vendors (NSDL, DigiLocker, penny drop)
   └──────────────────────┘
```

| Component | Responsibility |
|---|---|
| Router | Current step in URL (`/onboarding/bank`). Browser back works. Deep links from "Fix your selfie" emails. |
| OnboardingShell | Layout, progress bar, Back/Next buttons, save status ("Saved"). |
| Flow engine | Pure functions: given schema + answers, which steps are visible, what is next/previous, is a step allowed. |
| StepRenderer | Turns a step's JSON fields into React components. Uses React Hook Form + Zod schema built from JSON. |
| Field registry | Map of `type → component`. Heavy fields (camera, signature pad, PDF) lazy-loaded. |
| Draft store | Current answers. Autosaves to server; keeps a local encrypted backup for offline/refresh. |
| API layer | React Query for schema/application fetch, mutations for save, validate, upload, submit. |
| Onboarding API | Source of truth: schema version, saved answers, step status, server validation, rejections. |
| Object storage | Receives files directly via presigned URLs (files don't go through our API servers). |

**Data flow for "user fills Bank step and taps Next":**
1. URL is `/onboarding/bank`. StepRenderer renders fields `accountNumber`, `confirmAccountNumber`, `ifsc` from the schema.
2. User types IFSC `HDFC0001234`. After 400 ms debounce, `GET /ifsc/HDFC0001234` → shows "HDFC Bank, Koramangala".
3. While typing, the draft store autosaves every few seconds (`PATCH /applications/:id/steps/bank`, debounced 1.5 s).
4. User taps Next. Zod validates on the client. If errors → focus first error, announce. Stop.
5. If valid → `POST /applications/:id/steps/bank/submit`. Server runs penny drop (₹1 credit) and name match. Shows "Verifying your bank…" (2–10 s).
6. Server returns `{ status: 'verified', nextStepId: 'selfie' }` or field errors like `{ field: 'accountNumber', code: 'NAME_MISMATCH' }`.
7. On success, the flow engine moves to `selfie`; router pushes `/onboarding/selfie`. Selfie chunk was already prefetched.

## 3. Data model

```ts
// Sent by server. Versioned so old drafts can migrate.
type OnboardingSchema = {
  version: number;                 // 14
  steps: StepSchema[];
};

type StepSchema = {
  id: string;                      // "bank"
  titleKey: string;                // i18n key: "steps.bank.title"
  fields: FieldSchema[];
  showIf?: Condition;              // conditional step
  submitMode: 'local' | 'server';  // server = needs server verification on Next
};

type FieldSchema = {
  name: string;                    // "ifsc"
  type: 'text' | 'number' | 'date' | 'select' | 'radio' | 'checkbox'
      | 'pan' | 'ifsc' | 'pincode' | 'selfie' | 'signature' | 'file';
  labelKey: string;
  required?: boolean;
  rules?: {
    pattern?: string;              // "^[A-Z]{4}0[A-Z0-9]{6}$"
    minLength?: number;
    maxLength?: number;
    min?: number; max?: number;
    equalsField?: string;          // confirmAccountNumber
  };
  asyncValidate?: 'pan' | 'ifsc' | 'pincode';
  options?: { value: string; labelKey: string }[];
  showIf?: Condition;
  sensitive?: boolean;             // mask on review, never log
  accept?: string[];               // ["image/jpeg","application/pdf"]
  maxSizeMb?: number;
};

type Condition =
  | { field: string; equals: string | boolean }
  | { field: string; in: string[] }
  | { all: Condition[] }
  | { any: Condition[] };

type StepStatus = 'not_started' | 'in_progress' | 'completed' | 'rejected';

type Application = {
  id: string;
  schemaVersion: number;
  currentStepId: string;
  answers: Record<string, unknown>;          // flat by field name
  steps: Record<string, {
    status: StepStatus;
    rejection?: { field?: string; code: string; messageKey: string };
  }>;
  updatedAt: string;                         // for conflict detection
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
};

type UploadedFile = {
  fileId: string;
  field: string;                             // "selfie"
  status: 'compressing' | 'uploading' | 'uploaded' | 'failed';
  progress: number;                          // 0–100
  previewUrl?: string;                       // object URL, revoke on unmount
};
```

| Entity | Lives in | Why |
|---|---|---|
| OnboardingSchema | Server; cached in React Query (and HTTP cache by version) | Backend controls steps. Cache because it rarely changes. |
| Application (answers, step status) | Server | Source of truth; enables resume on another device. |
| Current step id | URL (`/onboarding/:stepId`) | Back button, refresh, deep links all work. Validated against the flow engine. |
| Current step's form values + errors | Component state (React Hook Form) | Fast typing without re-rendering the whole app. |
| All answers draft (between steps) | Client store (Zustand) | Needed by conditions and Review page. |
| Local backup of draft | IndexedDB, **encrypted**, non-sensitive fields only, or localStorage for non-PII | Survives refresh / app kill on bad network. |
| Uploaded file progress | Component state | UI only. |
| Raw image before upload | Memory (Blob) | Never stored; too large and sensitive. |
| Save status ("Saving…") | Client store | Shown in shell header. |

## 4. Interface (API)

### Component API

```tsx
<OnboardingFlow
  applicationId={string}
  schema={OnboardingSchema}
  onComplete={() => void}
/>

<StepRenderer
  step={StepSchema}
  defaultValues={Record<string, unknown>}
  serverErrors?={Record<string, string>}     // from server rejections
  onSubmit={(values) => Promise<void>}
  onChange={(values) => void}                // feeds autosave
/>

<Field
  schema={FieldSchema}
  control={Control}                          // React Hook Form
/>

<PanInput
  name="pan"
  onVerified={(nameOnPan: string) => void}   // "RAHUL KUMAR"
/>

<SelfieCapture
  onCapture={(blob: Blob) => void}
  maxWidth={1080}
  quality={0.8}
  fallbackToFileInput={boolean}
/>

<FileUpload
  field="incomeProof"
  accept={['application/pdf', 'image/jpeg']}
  maxSizeMb={5}
  onUploaded={(fileId: string) => void}
/>

<ProgressBar current={number} total={number} labels={string[]} />
```

Field registry:

```ts
const fieldRegistry: Record<FieldSchema['type'], React.ComponentType<FieldProps>> = {
  text: TextField,
  number: TextField,
  select: SelectField,
  pan: PanField,
  ifsc: IfscField,
  selfie: lazy(() => import('./fields/SelfieCapture')),
  signature: lazy(() => import('./fields/SignaturePad')),
  file: lazy(() => import('./fields/FileUpload')),
  // ...
};
```

### Server API

| Endpoint | Method | Purpose |
|---|---|---|
| `/onboarding/schema?version=latest` | GET | Steps and fields JSON. |
| `/applications/me` | GET | Current application (answers, step status, current step). Creates one if none. |
| `/applications/:id/steps/:stepId` | PATCH | Autosave draft for a step. Body: partial answers + `updatedAt`. |
| `/applications/:id/steps/:stepId/submit` | POST | Validate + verify a step on server. Returns next step or field errors. |
| `/validate/pan` | POST | `{ pan }` → `{ valid, nameOnPan }` |
| `/ifsc/:code` | GET | `{ bank, branch, city }` |
| `/pincode/:code` | GET | `{ city, state }` |
| `/uploads/presign` | POST | `{ field, contentType, size }` → `{ uploadUrl, fileId, expiresIn }` |
| `/uploads/:fileId/complete` | POST | Confirm upload; server checks file and runs face match. |
| `/applications/:id/submit` | POST | Final submit / e-sign. |

```json
// POST /applications/app_9/steps/bank/submit  → 422
{
  "status": "rejected",
  "errors": [
    { "field": "accountNumber", "code": "NAME_MISMATCH",
      "message": "Name on bank account (R KUMAR) does not match PAN name (RAHUL KUMAR)." }
  ]
}
```

```json
// → 200
{ "status": "completed", "nextStepId": "selfie", "updatedAt": "2026-11-26T10:12:03Z" }
```

## 5. Optimizations and deep dives

### 5.1 Schema-driven rendering

The backend sends JSON. The frontend has a **field registry** and a **renderer**. Product/compliance can add a field or reorder steps without a frontend deploy.

```tsx
function StepRenderer({ step, defaultValues, onSubmit }: Props) {
  const zodSchema = useMemo(() => buildZod(step.fields), [step]);
  const form = useForm({ defaultValues, resolver: zodResolver(zodSchema), mode: 'onBlur' });
  const values = form.watch();

  return (
    <form onSubmit={form.handleSubmit(onSubmit, focusFirstError)} noValidate>
      {step.fields
        .filter((f) => !f.showIf || evaluate(f.showIf, values))
        .map((f) => {
          const Comp = fieldRegistry[f.type];
          return (
            <Suspense key={f.name} fallback={<FieldSkeleton />}>
              <Comp schema={f} control={form.control} />
            </Suspense>
          );
        })}
      <button type="submit">Continue</button>
    </form>
  );
}
```

Limits I'd state:
- Keep the schema **declarative** (no JS code from the server — no `eval`). Conditions are a small JSON language (`equals`, `in`, `all`, `any`).
- Unknown field type → show a safe fallback + log an error, so an old client doesn't crash on a new schema. Server sends a `minClientVersion` if needed.
- Very custom screens (DigiLocker redirect, e-sign) are **"custom step" types** with hand-written components. Schema-driven for 80%, custom for 20%.

### 5.2 Step state machine, conditional steps, back navigation, URL

The flow engine is pure functions, easy to unit test:

```ts
function visibleSteps(schema: OnboardingSchema, answers: Answers) {
  return schema.steps.filter((s) => !s.showIf || evaluate(s.showIf, answers));
}

function nextStep(schema, answers, currentId) {
  const steps = visibleSteps(schema, answers);
  const i = steps.findIndex((s) => s.id === currentId);
  return steps[i + 1]?.id ?? 'review';
}

function canEnter(stepId, app: Application, schema) {
  // allowed if all earlier visible steps are completed
  const steps = visibleSteps(schema, app.answers);
  const i = steps.findIndex((s) => s.id === stepId);
  return steps.slice(0, i).every((s) => app.steps[s.id]?.status === 'completed');
}
```

- **Step in URL** (`/onboarding/bank`): refresh keeps the step, browser back works, emails can deep link to `/onboarding/selfie`. On load, if `canEnter` is false, `replace` to the first incomplete step (users can't skip by typing a URL; server also enforces it).
- **Back** does not validate and does not lose data. The values are saved in the draft store.
- **Answer changes that hide steps**: if the user goes back and changes "Add nominee" from Yes to No, the Nominee step disappears. Keep its answers in the draft but **don't send them on submit** (or clear them with a confirm). The progress total updates ("Step 5 of 6").
- **Rejected step after review:** server marks `selfie: rejected`. On resume we route straight to that step with the reason shown at the top; other steps stay completed.
- Use `history.pushState` (router `navigate`) for step changes, and `replace` for redirects, so the back button doesn't get stuck in loops.

### 5.3 Validation: client (Zod) + server source of truth + async checks

Three layers:
1. **Client sync (Zod)** built from the JSON rules: required, regex, length, `confirmAccountNumber === accountNumber`. Instant feedback, saves server calls. Run on **blur** (not every keystroke, which feels aggressive) and on Next.
2. **Async field checks** with debounce and cancel:
   - PAN: format `^[A-Z]{5}[0-9]{4}[A-Z]$` passes first, then `POST /validate/pan` → shows "Name on PAN: RAHUL KUMAR".
   - IFSC: `^[A-Z]{4}0[A-Z0-9]{6}$`, then lookup bank and branch.
   - Pincode: 6 digits, then auto-fill city/state.
3. **Server on step submit** is the **source of truth** (penny drop, name match, duplicate PAN). Client checks are only for UX; anyone can bypass them.

```ts
function useAsyncCheck<T>(value: string, isFormatOk: boolean, fetcher: (v: string, s: AbortSignal) => Promise<T>) {
  const debounced = useDebounce(value, 400);
  return useQuery({
    queryKey: ['check', fetcher.name, debounced],
    queryFn: ({ signal }) => fetcher(debounced, signal),   // React Query aborts stale requests
    enabled: isFormatOk && debounced === value,
    staleTime: Infinity,                                    // same IFSC → same answer
    retry: 1,
  });
}
```

Show three states: "Checking…" spinner, green check with result, or error. If the async check **fails due to network**, don't block the user; let them continue and let the server re-check on submit.

Server errors map back to fields: `form.setError(err.field, { message })`, then focus that field.

### 5.4 Saving progress and resume

- **Autosave to server**: debounce **1.5 s** after the last change, plus save immediately on step change, on `visibilitychange → hidden`, and on `pagehide`. Use `fetch(..., { keepalive: true })` for the last one so it completes when the tab closes.
- **Optimistic concurrency**: send `updatedAt`. If the server has a newer version (user filled on laptop too), it returns `409` with the latest data. Simple rule: server copy wins for completed steps; for the current step, ask "You have newer changes on another device. Use those?"
- **Local backup** for flaky networks: keep a copy of non-sensitive draft answers locally. On load, compare with the server `updatedAt`; use the newer one. Queue failed saves and retry with backoff (1 s, 2 s, 4 s… max 30 s) and on `online` event.
- **Resume across devices**: the server stores answers and `currentStepId`. User logs in with mobile OTP on another phone → `GET /applications/me` → route to the first incomplete step.
- Show save status in the header: "Saving…", "Saved", "Offline — will save when connected". This builds trust in long forms.

### 5.5 Selfie and document upload

**Selfie with camera:**
```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: false,
});
videoRef.current!.srcObject = stream;
// capture
const canvas = document.createElement('canvas');
canvas.width = 1080 * (video.videoWidth / video.videoHeight) | 0; canvas.height = 1080;
canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.8));
stream.getTracks().forEach((t) => t.stop());   // turn camera off right away
```
- Needs HTTPS and permission. If denied or no camera (some webviews), **fallback** to `<input type="file" accept="image/*" capture="user">`, which opens the native camera.
- Show a face oval guide and tips ("good light, no glasses"). Optional on-device face detection to block blank photos, but the server does the real liveness check.

**Compress**: phone photos are 3–8 MB. Resize to max 1080 px and JPEG 0.8 → **~200–300 KB**. Do it in a Web Worker with `OffscreenCanvas` where supported, so the UI doesn't freeze on low-end phones. PDFs are not compressed; just check size ≤ 5 MB.

**Upload with presigned URL:**
1. `POST /uploads/presign { field: 'selfie', contentType: 'image/jpeg', size }` → `{ uploadUrl, fileId }` (valid 5 min).
2. `PUT uploadUrl` directly to S3. Use `XMLHttpRequest` (or axios) because `fetch` has no upload progress events. Show a progress bar.
3. `POST /uploads/:fileId/complete` → server checks the file type, virus scan, face match. Save `fileId` in answers.

Retry: on failure, retry up to 3 times with backoff; if the URL expired (403), get a new presigned URL. Keep the Blob in memory so the user doesn't retake the photo. Revoke object URLs (`URL.revokeObjectURL`) after use to free memory.

### 5.6 Sensitive data (PII)

- **Don't log PII**: analytics and error tools (Sentry) get field **names** and error codes, never values. Add a scrubber in `beforeSend` for patterns like PAN and 12-digit Aadhaar. Turn off session replay on these pages, or mask all inputs.
- **Don't keep PII unencrypted in localStorage.** It is readable by any script on the origin (XSS) and stays forever. Options: keep PAN/Aadhaar/bank only on the server and in memory; or if a local backup is needed, store in IndexedDB encrypted with a key from Web Crypto that is not stored next to it (e.g. a non-extractable `CryptoKey` in IndexedDB), and clear it on submit/logout.
- **Mask on screen**: Aadhaar as `XXXX XXXX 1234` (UIDAI rule: only last 4), PAN as `ABCXX1234X` on review, account number `XXXXXX6789`. Reveal button with an eye icon for the user's own edit.
- `autocomplete="off"` for Aadhaar; `autocomplete="cc-..."`-style hints only where helpful. `type="password"`-like masking not needed but avoid showing full values in URLs (never put PII in query params; they end up in logs).
- Short session timeout (e.g. 15 min idle) and clear in-memory state on logout.

### Also mention
- **Performance:** render only the current step; route-level `lazy()` per step and field-level `lazy()` for camera/signature/PDF. **Prefetch the next step's chunk** when the current step is valid or on idle (`requestIdleCallback`). Keep Zod schemas small; use React Hook Form (uncontrolled inputs) so typing doesn't re-render the whole step.
- **Accessibility:** every input has a `<label>`; errors in a `<p id>` linked with `aria-describedby` and `aria-invalid="true"`; on failed submit, move focus to the first invalid field and announce "2 errors on this page" in an `aria-live` region; on step change, move focus to the step `<h1>` and update `document.title` ("Bank details – Step 4 of 7"). Progress bar with `aria-valuenow`. Don't rely on color for errors.
- **Error states:** network errors (retry button, keep data), server field errors (on the field), step-level rejection (banner on top), vendor down ("PAN check is slow right now, we'll verify later" — let the user continue if business allows).
- **Analytics drop-off:** events `step_viewed`, `step_completed`, `field_error` (field name + error code), `async_check_failed`, `upload_failed`, `time_on_step`. Build a funnel per step and per device. Example: if 30% drop at Selfie on a certain Android version, it's likely a camera bug. A/B test step order through the schema.
- **i18n:** labels by key; Hindi strings are longer, so layouts must wrap.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
|---|---|---|---|
| Form definition | Schema-driven (JSON from server) | Hard-coded React per step | **Schema-driven for standard fields, custom components for special steps.** Compliance changes often; but a fully generic engine gets complex. |
| Form library | React Hook Form (uncontrolled) | Formik / controlled state | **RHF + Zod.** Fewer re-renders, good on low-end phones; Zod types shared with TS. |
| Current step | In URL | In component state | **URL.** Back button, refresh, deep links from emails. |
| Draft saving | Autosave (debounced) | Save only on Next | **Both:** autosave for long steps + definite save on Next. Users drop and return a lot. |
| Local backup | localStorage | IndexedDB encrypted / none | **No PII in localStorage.** Non-PII in localStorage; PII only on server (or encrypted IndexedDB if offline is a must). |
| Upload path | Through our API | Presigned URL to S3 | **Presigned.** Large files skip our servers; faster and cheaper. |
| Validation timing | On every keystroke | On blur + on submit | **On blur + submit**, then live re-validate once a field has an error (so it clears as they fix it). |
| Selfie capture | getUserMedia custom UI | `<input capture>` native camera | **getUserMedia** for guide overlay and control; **input capture as fallback** for webviews/denied permission. |

## 7. Likely follow-up questions

**Q: What if the schema changes while a user is halfway through?**
The application stores `schemaVersion`. Server either keeps serving the old version to that user until they finish, or migrates answers (new required field → that step becomes `in_progress` again). Client always renders the schema the server returns for that application.

**Q: How do you stop users from skipping steps by editing the URL?**
Client: `canEnter()` check redirects to the first incomplete step. Server: final submit and each step submit check that earlier steps are complete. Server is the real guard.

**Q: Why not keep all steps mounted and just hide them?**
More DOM and memory on low-end phones, and heavy steps (camera) would load early. Keep data in the store, not in mounted components. Mount only the current step.

**Q: How do you handle the PAN check taking 5 seconds or failing?**
Show "Checking PAN…" inline, don't block other fields. Abort stale requests. On timeout or 5xx, show "Couldn't verify right now" and let the user continue; server re-verifies on step submit and can mark the step rejected later.

**Q: The user fills the form on mobile and also opens it on desktop. Conflict?**
`updatedAt` on each save. Server returns 409 if stale. Completed steps take the server version. For the current step, ask the user which version to keep. Rare case, so a simple prompt is fine.

**Q: How do you test a schema-driven form?**
Unit test the flow engine (`visibleSteps`, `nextStep`, `canEnter`) and `buildZod` with many schemas. Component tests per field type. Contract tests that the server schema matches the client's known field types. E2E for the full happy path and the "rejected selfie" path.

**Q: How do you reduce drop-off?**
Fewer fields per step (5–6 max), pre-fill from PAN/DigiLocker/pincode, show time left ("2 min left"), save automatically, and send reminder notifications with a deep link to the exact step. Use the funnel data to find the worst step.

**Q: Where does the "Review" page get its data?**
From the draft store (synced with server answers). It walks `visibleSteps`, shows masked values, and each section has "Edit" that navigates to `/onboarding/:stepId?from=review`, so after saving it returns to Review.

## 8. If you only have 60 seconds

- Server sends a **JSON schema**; a **StepRenderer + field registry** turns it into React fields, with custom components for special steps.
- A pure **flow engine** decides visible steps, next/previous, and who can enter a step; **current step lives in the URL**.
- **React Hook Form + Zod** for client validation on blur/submit, **debounced async checks** for PAN/IFSC/pincode, and the **server is the source of truth** with errors mapped back to fields.
- **Autosave** (debounced 1.5 s + on step change + on `pagehide`) to the server so users can **resume on any device**; a local backup only for non-PII.
- **Selfie** via `getUserMedia` (file input fallback), compress to ~250 KB in a worker, upload by **presigned URL** with progress and retry.
- **PII**: never logged, never plain in localStorage, masked on screen.
- Only the current step is mounted, heavy steps lazy-loaded and prefetched; accessible errors with focus to the first error; **drop-off funnel per step**.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
|---|---|---|
| 0–4 | Clarify | Steps, backend-driven or not, resume across devices, uploads, devices. |
| 4–8 | Requirements | Functional list, perf targets, PII rules, a11y, flaky network. |
| 8–16 | Architecture | Router, shell, flow engine, renderer, draft store, API, S3. Walk "Next on Bank step". |
| 16–22 | Data model | Schema, Step, Field, Condition, Application, where each lives. |
| 22–26 | API | Schema, autosave PATCH, step submit with field errors, presign upload. |
| 26–40 | Deep dives | Schema rendering, flow engine + URL, validation layers, autosave/resume, upload, PII. |
| 40–45 | Wrap up | Trade-offs, a11y, perf, drop-off analytics. |

## Common mistakes

- Jumping to components (a `<Wizard>` with `<Step1/>`, `<Step2/>`) before defining data/entities like the schema, Application, and step status.
- Trusting client validation only; not showing how server rejections map back to the right field.
- Keeping the step index only in React state, so refresh or browser back throws the user to step 1.
- Saving PAN/Aadhaar/bank details in plain localStorage or sending them to analytics/Sentry.
- Uploading 6 MB raw photos through the API server with no compression, progress, or retry.
- Forgetting conditional steps change the step count and that hidden steps' answers must not be submitted.

## My mistakes

- [ ]
