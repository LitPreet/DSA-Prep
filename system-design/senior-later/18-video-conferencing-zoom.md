# Video Conferencing (e.g. Zoom / Google Meet web)

> **Difficulty:** Hard · **Asked at:** Big tech and collaboration-product companies (Google, Microsoft, Zoom, Atlassian, Indian SaaS with calling features like Freshworks/Zoho, edtech with live classes) · **Time in interview:** 45 min
> Practise question: https://www.greatfrontend.com/questions/system-design

**How to use this file:** set a 35-minute timer, answer on paper or Excalidraw while talking out loud, then read below and note what you missed in "My mistakes" at the bottom.

## 0. Clarifying questions to ask first

- How many people in one call?
  → Assume: up to 50 with video, up to a few hundred listen-only. Typical call is 2–8.
- Which features: video, audio, screen share, chat, reactions, recording?
  → Assume: video, audio, mute, screen share, chat, raise hand / reactions. Recording is server-side, out of scope.
- Is this the web client only?
  → Assume: yes, desktop browsers first (Chrome, Edge, Firefox, Safari), mobile web is "works but basic".
- Do we design the media server, or only the frontend?
  → Assume: frontend focus. We pick the architecture (SFU) and define how the client talks to it.
- Join flow: lobby / pre-join screen, waiting room?
  → Assume: yes — pre-join screen with camera preview and device selection; host can enable waiting room.
- Layouts?
  → Assume: grid view and speaker view, plus screen-share layout.
- End-to-end encryption needed?
  → Assume: transport encryption always (WebRTC requires it); E2EE optional, mention only.

## 1. Requirements

### Functional

- Create / join a meeting by link (`/m/abc-defg-hij`).
- Pre-join screen: preview camera, choose mic/camera/speaker, set name.
- In call: see others' video, hear audio, mute/unmute mic, turn camera on/off.
- Grid view and active-speaker view; pin a participant.
- Screen share (one presenter at a time).
- Chat, raise hand, emoji reactions.
- Participant list; host can mute others, remove people, admit from waiting room.
- Leave call; rejoin if the connection drops.

### Non-functional (performance, accessibility, devices, network)

- **Latency:** audio/video end-to-end delay < 300 ms (conversation feels natural below this). Join in < 3 s.
- **Performance:** 25 tiles on screen without freezing the tab; CPU usage low enough that laptop fans don't scream. UI stays responsive while video decodes.
- **Network:** works on 1 Mbps; degrade video before audio (audio is most important); handle Wi-Fi to 4G switch; reconnect automatically.
- **Accessibility:** live captions, keyboard shortcuts (mute, camera), screen-reader announcements for join/leave/hand raise, visible focus, labelled buttons.
- **Devices:** laptops with webcams, external headsets, multiple monitors; handle device unplug.
- **Privacy:** clear camera/mic indicators, permissions asked only when needed.

### Out of scope

- Media server internals (SFU code), recording, transcoding.
- Phone dial-in, breakout rooms, whiteboard.
- Scheduling / calendar integration.

## 2. Architecture

```text
+-------------------------------------------------------------------------+
|                          Browser (React app)                            |
|                                                                         |
|  +-----------------+    +-------------------------------------------+   |
|  | Pre-join screen |    |            Meeting Room UI                |   |
|  | (preview,       |    |  +-----------+ +---------+ +-----------+  |   |
|  |  device pick)   |    |  | VideoGrid | | Toolbar | | SidePanel |  |   |
|  +-----------------+    |  | (tiles)   | | mute,cam| | chat,     |  |   |
|                         |  +-----------+ +---------+ | people    |  |   |
|                         +---------------------------+-----------+--+  |
|                                      |  reads / dispatch                |
|                                      v                                  |
|  +-------------------------------------------------------------------+  |
|  | Meeting Store (Zustand): participants, tracks map, layout, chat   |  |
|  +-------------------------------------------------------------------+  |
|          |                         |                        |           |
|          v                         v                        v           |
|  +---------------+   +-------------------------+   +-----------------+  |
|  | Media Manager |   | RTC Connection Manager  |   | Signaling Client|  |
|  | getUserMedia, |   | RTCPeerConnection,      |   | WebSocket:      |  |
|  | devices,      |   | simulcast, stats,       |   | join, offer/    |  |
|  | screen share  |   | subscribe layers        |   | answer, ICE,    |  |
|  +---------------+   +-------------------------+   | chat, events    |  |
|                               |   ^                +-----------------+  |
+-------------------------------|---|--------------------------|----------+
                                |   | UDP (SRTP media)          | WSS
                                v   |                           v
                      +---------------------+         +------------------+
                      |  SFU media server   |<------->| Signaling server |
                      |  (forwards streams) |         | (rooms, auth)    |
                      +---------------------+         +------------------+
                                |
                      +---------------------+
                      | STUN / TURN servers |
                      +---------------------+
```

| Component | Responsibility |
| --- | --- |
| Pre-join screen | Ask permission, show camera preview, pick devices, test mic level. |
| Meeting Room UI | Layout of tiles, toolbar, side panels. Pure UI, reads from store. |
| VideoGrid / VideoTile | Render each participant's `MediaStream` into a `<video>`. Pause hidden tiles. |
| Meeting Store | Participants, their mute state, who is speaking, layout, pinned user, chat messages. |
| Media Manager | Local camera/mic/screen tracks, device list, device change, permission errors. |
| RTC Connection Manager | `RTCPeerConnection` to the SFU: publish our tracks, subscribe to others, choose quality, read stats. |
| Signaling Client | WebSocket. Exchanges SDP offers/answers, ICE candidates, room events, chat. |
| Signaling server | Auth, rooms, waiting room, tells clients who joined/left. |
| SFU | Receives each person's stream once and forwards it to everyone else. |
| STUN / TURN | STUN finds our public IP; TURN relays media when direct UDP is blocked. |

**Main flow — user joins a meeting:**

1. User opens `/m/abc-defg-hij`. Pre-join screen calls `getUserMedia({ audio: true, video: true })`, shows preview.
2. User clicks "Join". Signaling Client opens WebSocket, sends `join` with meeting ID and token.
3. Server replies `joined` with participant list and ICE server config (STUN/TURN URLs + short-lived credentials). Or `waiting` if waiting room is on.
4. RTC manager creates `RTCPeerConnection`, adds local tracks (video with 3 simulcast layers), creates an SDP **offer**, sends it via WebSocket.
5. SFU replies with an **answer**. Both sides exchange ICE candidates. A connection is found (direct UDP, or TURN fallback).
6. SFU announces other participants' tracks. Client subscribes; `ontrack` fires with remote `MediaStream`s, stored in a tracks map keyed by participant ID.
7. VideoGrid renders tiles. Each tile tells the RTC manager what size it is, so the SFU sends the right quality layer.

## 3. Data model

```ts
type ParticipantId = string;

interface Participant {
  id: ParticipantId;
  name: string;
  avatarUrl?: string;
  role: 'host' | 'cohost' | 'attendee';
  audioMuted: boolean;
  videoOff: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  joinedAt: number;
  connectionQuality: 'good' | 'fair' | 'poor' | 'unknown';
}

// MediaStreams are NOT serializable — keep them outside the main store
// or in a Map that components look up by id.
interface RemoteTracks {
  camera?: MediaStreamTrack;
  mic?: MediaStreamTrack;
  screen?: MediaStreamTrack;
}

interface LocalMediaState {
  micId: string | null;
  cameraId: string | null;
  speakerId: string | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenTrack: MediaStreamTrack | null;
  permission: 'prompt' | 'granted' | 'denied' | 'no-device';
}

type Layout = 'grid' | 'speaker' | 'screenshare';

interface RoomState {
  meetingId: string;
  selfId: ParticipantId;
  status: 'prejoin' | 'waiting' | 'connecting' | 'connected' | 'reconnecting' | 'ended';
  participants: Record<ParticipantId, Participant>;
  order: ParticipantId[];          // display order
  activeSpeakerId: ParticipantId | null;
  pinnedId: ParticipantId | null;
  layout: Layout;
  page: number;                    // grid page when > 25 people
}

interface ChatMessage {
  id: string;                      // client-generated (for dedupe / optimistic)
  from: ParticipantId;
  text: string;
  sentAt: number;
  status: 'sending' | 'sent' | 'failed';
}
```

| Entity | Lives in | Why |
| --- | --- | --- |
| Participants, mute/video flags | Client store (Zustand), updated from signaling events | Server is source of truth; many components read it. |
| Remote `MediaStreamTrack`s | Plain `Map` in RTC manager (or ref), not React state | Not serializable; changes must not re-render the whole tree. |
| Local devices + permission | Client store + localStorage (last used device IDs) | Remember user's headset next time. |
| Active speaker, layout, pin | Client store | UI-wide, changes often but small. |
| Audio levels (per frame) | Refs / rAF, not state | Changes many times per second. |
| Chat messages | Server (relayed), client store for this session | Usually not persisted for ad-hoc meetings. |
| Meeting ID | URL (`/m/:id`) | Share the link. |
| Panel open, hover on tile | Component state | Local UI only. |
| Display name | localStorage | Pre-fill on next join. |

## 4. Interface (API)

### Component API (props of the key components)

```ts
interface VideoTileProps {
  participantId: string;
  track?: MediaStreamTrack;        // camera or screen
  isLocal: boolean;                // mirror self-view, mute own audio
  isActiveSpeaker: boolean;        // green border
  fit: 'cover' | 'contain';        // screen share must be 'contain'
  onVisibleSizeChange?: (id: string, size: { w: number; h: number } | null) => void;
}

interface VideoGridProps {
  participantIds: string[];
  maxTiles?: number;               // default 25 (5x5)
  layout: Layout;
  pinnedId?: string | null;
}

interface ToolbarProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  isSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onShareScreen: () => void;
  onLeave: () => void;
}

interface DevicePickerProps {
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
  devices: MediaDeviceInfo[];
  selectedId: string | null;
  onChange: (deviceId: string) => void;
}
```

### Server API (endpoints, method, params, example JSON, pagination; real-time channels / signaling messages where relevant)

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/meetings` | POST | Create meeting → `{ id, joinUrl }`. |
| `/meetings/:id` | GET | Title, host, settings (waiting room, E2EE). |
| `/meetings/:id/token` | POST | Short-lived join token + ICE servers (TURN creds). |
| `/meetings/:id/chat?before=<cursor>&limit=50` | GET | Chat history for late joiners (cursor pagination). |

```json
// POST /meetings/abc-defg-hij/token
{
  "token": "eyJhbGciOi...",
  "signalingUrl": "wss://sig-ap-south-1.example.com/v1",
  "iceServers": [
    { "urls": "stun:stun.example.com:3478" },
    { "urls": ["turn:turn.example.com:3478?transport=udp",
               "turns:turn.example.com:443?transport=tcp"],
      "username": "1732600000:u42", "credential": "x9f..." }
  ]
}
```

**Signaling messages (WebSocket, JSON):**

```json
// client -> server
{ "type": "join", "meetingId": "abc-defg-hij", "token": "...", "name": "Preet" }
{ "type": "offer", "sdp": "v=0..." }
{ "type": "ice", "candidate": { "candidate": "candidate:1 1 udp ...", "sdpMid": "0" } }
{ "type": "subscribe", "participantId": "p7", "layer": "low" }
{ "type": "mute", "kind": "audio", "muted": true }
{ "type": "chat", "id": "c-uuid", "text": "Can you hear me?" }
{ "type": "reaction", "emoji": "👍" }

// server -> client
{ "type": "joined", "selfId": "p1", "participants": [ { "id": "p7", "name": "Ankit", "audioMuted": false } ] }
{ "type": "answer", "sdp": "v=0..." }
{ "type": "participant_joined", "participant": { "id": "p9", "name": "Riya" } }
{ "type": "participant_left", "participantId": "p7" }
{ "type": "participant_updated", "id": "p9", "changes": { "handRaised": true } }
{ "type": "active_speaker", "participantId": "p9" }
{ "type": "chat", "id": "c-uuid", "from": "p9", "text": "Yes", "sentAt": 1732599000 }
{ "type": "waiting_room", "status": "admitted" }
{ "type": "removed", "reason": "host" }
```

## 5. Optimizations and deep dives

### 5.1 WebRTC basics, explained simply

WebRTC is the browser API for real-time audio/video. Four pieces:

- **`getUserMedia`** — asks for camera/mic, returns a `MediaStream` (a bundle of tracks).
- **`RTCPeerConnection`** — the actual connection that sends/receives media over UDP, encrypted (SRTP).
- **Signaling** — WebRTC does not say *how* two sides find each other. We use our own WebSocket to swap **SDP** (a text description: "I can send VP8 video and Opus audio") as an offer and an answer.
- **ICE / STUN / TURN** — ICE tries many network paths ("candidates"). **STUN** tells you your public IP so a direct path can work. **TURN** is a relay server used when firewalls block direct UDP (offices, some mobile networks) — about 10–20% of users. Always provide TURN over TCP/TLS on port 443 as last fallback.

```ts
async function connect(sig: SignalingClient, iceServers: RTCIceServer[], local: MediaStream) {
  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = e => e.candidate && sig.send({ type: 'ice', candidate: e.candidate });
  pc.ontrack = e => tracks.set(e.transceiver.mid!, e.track);      // remote media
  pc.onconnectionstatechange = () => store.setConn(pc.connectionState);

  local.getAudioTracks().forEach(t => pc.addTransceiver(t, { direction: 'sendonly' }));
  pc.addTransceiver(local.getVideoTracks()[0], {
    direction: 'sendonly',
    sendEncodings: [                                   // simulcast: 3 layers
      { rid: 'low',  scaleResolutionDownBy: 4, maxBitrate: 150_000 },
      { rid: 'mid',  scaleResolutionDownBy: 2, maxBitrate: 500_000 },
      { rid: 'high', maxBitrate: 1_500_000 },
    ],
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sig.send({ type: 'offer', sdp: offer.sdp });

  sig.on('answer', m => pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }));
  sig.on('ice', m => pc.addIceCandidate(m.candidate));
  return pc;
}
```

### 5.2 Mesh vs SFU vs MCU — why SFU

| | Mesh (peer-to-peer) | SFU (Selective Forwarding Unit) | MCU (Multipoint Control Unit) |
| --- | --- | --- | --- |
| How | Everyone connects to everyone | Everyone sends 1 stream to server; server forwards to others | Server decodes all, mixes into 1 video, re-encodes |
| Upload per user | N−1 streams | 1 (or 3 simulcast layers) | 1 |
| Download per user | N−1 | N−1 (but server picks quality) | 1 |
| Server cost | None | Low (no decode) | Very high (decode + encode) |
| Latency | Lowest | Low | Higher |
| Good for | 1:1 calls, 3–4 people | Group calls 4–100+ | Old devices, phone dial-in, recording |

With mesh and 8 people, each laptop uploads 7 videos — home upload speed can't handle it. MCU is expensive and gives no layout flexibility (one fixed mixed picture). **SFU** is the standard (Meet, Zoom, Teams use SFU-like designs): upload once, and the server can send each viewer a different quality. Many apps use **P2P for 1:1** and switch to SFU when a third person joins.

### 5.3 Simulcast and choosing quality per tile

- **Simulcast:** the sender encodes the camera at 3 sizes (e.g. 180p, 360p, 720p). The SFU forwards the right one to each viewer. (Alternative: SVC — one stream with layers inside; mention only.)
- **Client decides what it needs:** a 25-tile grid needs only `low` for each tile; the active speaker big tile needs `high`. Each `VideoTile` measures itself with `ResizeObserver` and reports size; the RTC manager maps size → layer and sends `subscribe` with the layer.
- **Bandwidth budget:** if download is weak (from `getStats()`), lower layers for non-speakers first. Order of priority: audio > screen share > active speaker > others.
- Debounce layer changes (~500 ms) so resizing the window doesn't spam the server.

```ts
function layerForSize(h: number): 'low' | 'mid' | 'high' | null {
  if (h === 0) return null;           // hidden → unsubscribe
  if (h < 200) return 'low';
  if (h < 480) return 'mid';
  return 'high';
}
```

### 5.4 Grid layout, active speaker, and rendering many tiles

**Grid math:** pick columns = `ceil(sqrt(n))`, rows = `ceil(n / cols)`; keep 16:9 tiles that fit the container. Above 25 tiles, paginate ("page 2 of 3"), and put the self-view and active speakers on page 1.

**Active speaker detection:**
- Server side is best: the SFU sees audio levels of all streams (RTP audio-level header) and sends `active_speaker` events. Consistent for everyone, cheap for clients.
- Client side fallback: `getStats()` / `RTCRtpReceiver.getSynchronizationSources()` gives `audioLevel` per stream; or Web Audio `AnalyserNode` for local mic (used for the "you are talking while muted" hint).
- **Avoid flicker:** someone coughing shouldn't jump the layout. Require speaking for ~1–1.5 s before switching, and keep the last speaker for a few seconds.
- Show speaking with a border on the tile driven by a CSS class, not by re-rendering the whole grid.

**Rendering efficiently:**
- Each tile is `React.memo`; attach the track with a ref: `videoRef.current.srcObject = new MediaStream([track])` in an effect. Never put `MediaStream` in props that change every render.
- **Pause off-screen tiles:** `IntersectionObserver` on each tile. When hidden (other page, scrolled away, sidebar covering), unsubscribe from the SFU (saves download + decode) and pause the `<video>`.
- When the tab is hidden (`document.visibilityState === 'hidden'`), drop all video to `low` or off, keep audio.
- **Audio:** play remote audio through one `<audio>` element per participant (or mixed via SFU). Audio must play even if the video tile is hidden or paginated away.
- Audio levels for the mic meter update via rAF + refs, not React state.

```tsx
const VideoTile = memo(function VideoTile({ participantId, track, isLocal, fit }: VideoTileProps) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    el.srcObject = new MediaStream([track]);
    return () => { el.srcObject = null; };
  }, [track]);
  useTileVisibility(ref, participantId); // IntersectionObserver + ResizeObserver → subscribe layer
  return (
    <video ref={ref} autoPlay playsInline muted /* audio played separately */
      className={isLocal ? 'mirror' : ''} style={{ objectFit: fit }} />
  );
});
```

### 5.5 Screen sharing, devices, and permission errors

**Screen share:**
```ts
const screen = await navigator.mediaDevices.getDisplayMedia({
  video: { frameRate: 15 }, audio: true,     // tab audio, Chrome only
});
const [track] = screen.getVideoTracks();
track.contentHint = 'detail';                // keep text sharp, lower fps is OK
screenSender = pc.addTrack(track);
track.onended = () => stopScreenShare();     // user clicked browser's "Stop sharing"
```
- Screen share is a **separate track** (not replacing camera) so others see both.
- Use `contentHint = 'detail'` and higher resolution / lower fps: text must be readable.
- Layout switches to `screenshare` with `object-fit: contain`. Warn the presenter of the "infinite mirror" if they share the meeting tab itself.
- Not supported on most mobile browsers — hide the button with feature detection.

**Device switching:**
- List with `enumerateDevices()` (labels only appear after permission is granted).
- Switch camera without renegotiation: get a new track and call `sender.replaceTrack(newTrack)`, then stop the old track.
- Listen to `navigator.mediaDevices.ondevicechange` — headset plugged in/out. If the current device disappears, fall back to default and show a toast.
- Speaker output: `audioEl.setSinkId(deviceId)` (not on all browsers — feature detect).
- Mute: `track.enabled = false` (fast, no camera light change). For camera off, stop the track so the camera LED turns off — users care about this for privacy.

**Permission errors (from `getUserMedia`):**

| Error name | Meaning | What UI shows |
| --- | --- | --- |
| `NotAllowedError` | User or OS blocked | Steps to allow in browser/OS settings; allow joining without camera/mic |
| `NotFoundError` | No device | "No camera found" — join audio-only |
| `NotReadableError` | Device in use by another app (another Zoom tab) | "Camera is used by another app" |
| `OverconstrainedError` | Asked for resolution the device can't do | Retry with fewer constraints |

Always let the user join even with no camera/mic (listen-only).

### 5.6 Network quality and reconnection

- Every 2 s call `pc.getStats()`: read `roundTripTime`, `packetsLost`, `jitter`, `availableOutgoingBitrate`, `framesPerSecond`. Map to good/fair/poor and show bars on each tile (others' quality comes from the server).
- On poor upload: browser's congestion control already lowers bitrate; we can also stop sending the `high` layer, and finally suggest "Turn off video to improve audio".
- **Reconnection** has two levels:
  1. **ICE restart** — network changed (Wi-Fi → 4G). On `iceconnectionstatechange === 'disconnected'` wait ~2–3 s, then `pc.restartIce()` and re-offer. Media resumes without re-joining.
  2. **Full rejoin** — if `failed` or WebSocket dropped long: reconnect WebSocket with exponential backoff + jitter, re-send `join` with a **resume token** so the server keeps our participant ID (no "Preet left / Preet joined" spam).
- Show a "Reconnecting…" banner; keep the last video frame frozen rather than a black tile.
- `window.addEventListener('online'/'offline')` as a hint; it's not reliable alone.

### 5.7 Chat and reactions — data channel or WebSocket?

- **WebSocket (via signaling server)** — I'd pick this for chat. The server can store history for late joiners, moderate, and it works even if media fails.
- **RTCDataChannel** — good for low-latency, high-frequency, non-critical things: reactions, cursor positions, "speaking while muted" — through the SFU's data channel.
- Chat details: client-generated message ID for optimistic UI and dedupe on reconnect; unread badge when panel closed; links sanitized (no raw HTML — XSS); `aria-live="polite"` region announces new messages; virtualize if very long.
- Reactions: show floating emoji for ~3 s; rate-limit per user so nobody floods the screen.

### Also mention

- **Accessibility:** live captions (server-side speech-to-text streamed over WebSocket, shown in a caption region); shortcuts (`Ctrl/Cmd+D` mic, `Ctrl/Cmd+E` camera, like Meet) with a shortcuts help dialog; announce join/leave/hand raised via `aria-live`; tiles have names as text, not only in the video; high-contrast speaking indicator, not just color.
- **Security:** WebRTC media is always encrypted (DTLS-SRTP) but the SFU can see it. True **E2EE** uses Insertable Streams / `RTCRtpScriptTransform` to encrypt frames with a key the server doesn't know. Waiting room, host controls, meeting passcodes, short-lived join tokens, TURN credentials that expire.
- **Browser support:** Safari differences (simulcast support, `setSinkId`), `playsInline` for iOS, autoplay rules (audio needs a user gesture — the "Join" click unlocks it). Use an adapter or a proven SDK (LiveKit, mediasoup-client) instead of raw APIs in production.
- **Performance extras:** background blur via WebGL/WebGPU + segmentation model in a Worker (`MediaStreamTrackProcessor`), turned off automatically on weak CPUs.
- **Analytics:** join time, join failure reason, % using TURN, average packet loss, freeze count, call drop rate.

## 6. Trade-offs

| Decision | Option A | Option B | What I'd pick and why |
| --- | --- | --- | --- |
| Topology | Mesh (P2P) | SFU | **SFU** for groups; P2P only for 1:1 to save server cost. |
| Quality per viewer | Single stream | Simulcast | **Simulcast.** Each tile gets a size-matched layer; weak users don't drag down others. |
| Active speaker | Client computes | Server sends events | **Server.** Same for everyone, no extra CPU on clients. |
| Chat transport | RTCDataChannel | WebSocket | **WebSocket.** History, moderation, works if media fails. Data channel for reactions. |
| Where media tracks live | React state | Map outside React + refs | **Outside React.** Not serializable, avoid re-renders. |
| Mute | `track.enabled = false` | Stop the track | **Mic: enabled=false** (fast unmute). **Camera off: stop** (LED off, privacy). |
| Hidden tiles | Keep receiving | Unsubscribe + pause | **Unsubscribe.** Big saving in bandwidth and CPU. |
| Build vs buy | Raw WebRTC | SDK (LiveKit, Daily, Agora) | For an interview, explain raw concepts; in real life an SDK saves months. |

## 7. Likely follow-up questions

1. **Why not just peer-to-peer for everyone?**
   Upload grows with N−1. At 6–8 people most home connections can't upload that many HD streams, and CPU must encode each separately. SFU makes upload constant.

2. **How do you support 300 people?**
   Only render ~25 tiles (paginate), subscribe only to visible + active speakers, most people are listen-only with video off. Server sends only top-3 speakers' audio. For webinars, attendees get a one-way, lower-cost stream.

3. **User is on a corporate network that blocks UDP — what happens?**
   ICE fails on direct paths and falls back to TURN over TCP/TLS on 443, which looks like normal HTTPS. Higher latency, but it works.

4. **How do you avoid the whole grid re-rendering when someone unmutes?**
   Store participants by ID; each tile subscribes with a selector to its own participant. Tracks live outside React. Tiles are memoized.

5. **The user's camera is used by another app — what do you show?**
   Catch `NotReadableError`, show a clear message and a "Try again" button, let them join with camera off.

6. **How does echo get prevented?**
   Browser's built-in echo cancellation (`echoCancellation: true` in constraints, on by default), local video tile is muted, and we never play our own audio back.

7. **How do you switch from Wi-Fi to mobile data without dropping?**
   ICE restart on the same `RTCPeerConnection`; the participant session is kept by a resume token so others see no leave/join.

8. **How would you add background blur?**
   Read camera frames (`MediaStreamTrackProcessor` or canvas), run a segmentation model (e.g. MediaPipe) in a Worker, blur background in WebGL, output a new track and `replaceTrack` it. Auto-disable if FPS drops.

9. **How do you show "You are muted" when the user talks?**
   Keep the mic track open but `enabled = false` for sending; analyse the local stream with an `AnalyserNode`; if level is high for ~1 s, show a toast.

10. **How do you test this?**
    Unit tests for store/reducers and grid math; Playwright with Chrome fake media flags (`--use-fake-device-for-media-stream`); network throttling tests; real-device matrix for Safari/Firefox.

## 8. If you only have 60 seconds

- WebRTC: `getUserMedia` for camera/mic, `RTCPeerConnection` for media, our WebSocket for signaling (SDP + ICE), STUN/TURN for NAT and firewalls.
- SFU topology: everyone uploads once, server forwards — mesh doesn't scale past ~4, MCU is too costly.
- Simulcast with 3 layers; each tile reports its size so the SFU sends the right quality; hidden tiles unsubscribe.
- Store holds participants and UI state; media tracks live outside React and attach to `<video>` via refs; tiles memoized.
- Active speaker from the server with hysteresis to avoid flicker; grid paginates at 25.
- Screen share via `getDisplayMedia` as a separate track; device switching via `replaceTrack`; clear permission error states.
- `getStats` for quality indicators; ICE restart then full rejoin with a resume token; chat over WebSocket, reactions over data channel.

## 9. How to spend 45 minutes

| Minutes | Section | What to cover |
| --- | --- | --- |
| 0–4 | Clarify | Call size, features, web only, frontend vs server scope. |
| 4–9 | Requirements | Functional list; latency < 300 ms, audio priority, a11y, bad networks. |
| 9–18 | Architecture | UI, store, media manager, RTC manager, signaling, SFU, STUN/TURN. Walk the join flow. |
| 18–23 | Data model | Participant, local media state, room state; tracks outside React. |
| 23–28 | API | Tile/grid props; token endpoint with ICE servers; signaling messages. |
| 28–42 | Deep dives | Mesh vs SFU, simulcast per tile, rendering many tiles, screen share + devices, reconnection. |
| 42–45 | Wrap up | Chat transport, E2EE, captions, trade-offs. |

## Common mistakes

- Jumping to components before defining data/entities — define participants, tracks and room status first, then the UI.
- Saying "use WebRTC" without explaining signaling, STUN/TURN, and that WebRTC has no built-in signaling.
- Choosing mesh for a 20-person call, or MCU without knowing its cost.
- Putting `MediaStream` objects in React state / Redux, causing re-renders and serialization errors.
- Rendering and decoding every participant's HD video even when tiles are tiny or off-screen.
- Forgetting permission-denied, no-device, and reconnection states — interviewers love asking "what if the network drops?"

## My mistakes

- [ ]
