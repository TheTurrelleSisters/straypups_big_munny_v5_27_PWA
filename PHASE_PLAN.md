# WABC Master — Phase Plan
## Repo: WABC-Master
## Source of truth: zip archives. GitHub is behind.

---

## Current Version: v1.18 (cache: wabc-v1.18)

---

## Repo Overview
Wide Area Ball Caller operator tool. VIEW ONLY. Shows the authoritative 75-ball sequence from DB that all players use. Shows connected player count. One functional control: Force All Players to Local.

## WABC Design Rules (permanent — never violate)
- Ball sequence lives in ball_call table, game_id='WABC'
- Sequence auto-renews when ball 75 is called OR Cover All occurs (triggered by games, not operator)
- Ball position is per-player local only — NEVER written to DB, NEVER broadcast
- WABC tool shows DB sequence snapshot — not live player positions
- Only operator control: Force Local (disconnects all players from WABC)
- No manual NEW CALL button — sequence is fully automatic

---

## Phase History

### v1.0 — Initial Build
- Splash + PIN screen
- Caller tab: ball grid display
- Status tab: connected players
- Controls tab: Force Local, Restore Wide, New Call button

### v1.1 — Presence Fix + WABC Code Removal from Progressive Operator
- Removed RESET POS button
- Presence re-sync fixed
- wabc_operator excluded from player presence count

### v1.2 — Architecture Correction
- Removed cmdNewCall() entirely — sequence is auto-managed by games
- Removed pos broadcast listener — ball position is per-player local, never reported
- Ball grid now shows full 75-ball sequence always visible (yellow=1-40, white=41-75)
- No position dimming — WABC tool does not track player positions
- renderCaller updated: shows connected players + sequence issued time
- _updateBallHeader updated: shows sequence metadata not position
- Controls tab: only Force Local / Restore Wide remain
- Cache bust: wabc-v1.2

---

## Pending
- [ ] Connected player count verified live with multiple game clients
- [ ] Force Local tested end-to-end — games switch to local, badge updates
- [ ] Restore Wide tested — games reconnect to WABC sequence
- [ ] New sequence auto-display when games trigger renewal at ball 75

---

## Rules
- ES5 only
- View only tool — no game state modifications except Force Local/Restore Wide
- Cache bust on every single build

### v1.3 — PIN Pad Fix
- Fixed killSplash using cssText += which was unreliable on Samsung Browser
- Now sets each style property individually (opacity, pointerEvents, touchAction)
- Fixes PIN pad unresponsive / lockup after splash on Samsung devices
- Cache bust: wabc-v1.3

### v1.4 — PIN Pad Fix Take 2
- killSplash now removes splash element from DOM entirely instead of hiding it
- Eliminates any possibility of invisible splash overlay blocking PIN pad touches
- Previous approach (opacity:0 + display:none) was still leaving element in DOM
  on Samsung Browser which intercepted touch events despite being invisible
- Cache bust: wabc-v1.4

### v1.5 — Splash + PIN Fix Final
- Splash animation and connection status preserved
- Splash fades out (0.8s opacity transition) then removed from DOM
- Removal happens AFTER fade completes — no visible difference to user
- Fixed duplicate id="loading-text" attribute on splash status element
- Cache bust: wabc-v1.5

### v1.6 — Splash Error + Retry + DOM Removal
- splashError() added — red error state + RETRY button on connection failure
- All setTimeout retry loops removed — user must press RETRY
- killSplash removes splash from DOM entirely (not just hidden)
- Duplicate splash div removed from Progressive Operator (pre-existing issue)
- Cache bust: wabc-v1.6

### v1.7 — SDK Cleanup
- window.supabase cleared before each retry to prevent stale SDK instance
- window._sbScriptEl tracks script element for proper cleanup
- Cache bust: wabc-v1.7

### v1.8 — maybeSingle() Fix
- _fetchBallCallState was using .single() which throws error when WABC row missing
- Changed to .maybeSingle() — handles missing row gracefully, creates it automatically
- Added .catch() handler for network errors
- Cache bust: wabc-v1.8

---

## Current Version: v1.8 (cache: wabc-v1.8)

## Pending
- [ ] Confirm WABC connects and shows LIVE
- [ ] Ball grid displays correctly with yellow/white zones
- [ ] Player count updates when games connect
- [ ] Force Local tested end-to-end

### v1.9 — CRITICAL: Legacy JWT Anon Key Fix
- Same fix — sb_publishable_ broken for Realtime WebSocket
- Cache bust: wabc-v1.9

### v1.10 — CRITICAL: Fixed Page-Breaking Syntax Error
- Uncaught SyntaxError: Unexpected identifier 'Arial' on line 787
- 'Arial Black' used literal single quotes inside a single-quoted JS string,
  terminating the string early and breaking the ENTIRE script block
- This is why initSupabase() NEVER RAN — splash was stuck on "Connecting"
  forever because the JS parser failed before any code executed
- Fixed: 'Arial Black' -> &quot;Arial Black&quot; in the players-connected stat card
- Removed debug console.log statements after diagnosis
- Cache bust: wabc-v1.10

### v1.11 — Bug A: Player Count Exclusion Fix
- _updatePlayerCount and renderCaller/renderStatus now also exclude
  'floor_operator' (previously only excluded 'operator' and 'wabc_operator').
  Floor Manager being open no longer inflates WABC's connected-player count.
- Cache bust: wabc-v1.11

### v1.12 — CRITICAL: Channel Reconnect Loop Fixed (likely root cause of 0-players)
Same fix as StrayPups v5.75 — wabc.js _subscribe() now awaits removeChannel()
before rejoining the 'wabc-ballpos' topic, fixing an infinite
CHANNEL_ERROR/CLOSED reconnect loop that was destabilizing the entire
websocket (and therefore presence-lobby too).
Cache bust: wabc-v1.12

### Service Worker + Supabase Client Hardening (this batch)
- service-worker.js fetch handler rewritten with proper guards:
  - Non-GET requests (POST/PATCH/PUT/DELETE) are no longer intercepted at
    all -> eliminates "cache.put: Request method X is unsupported" errors
    on every Supabase RPC/insert/update.
  - ANY supabase.co request is passed straight to network, never cached ->
    eliminates risk of stale cached API responses masking live DB changes,
    and removes these requests from the JS/HTML cache-refresh branch.
  - 206 Partial Content responses (audio/video range requests) are no
    longer passed to cache.put -> eliminates "Partial response (206)
    unsupported" errors.
- createClient() calls now pass { auth: { persistSession:false,
  detectSessionInUrl:false, storage: <in-memory no-op> } } — avoids
  Supabase client touching localStorage at all, which browsers with
  Tracking Prevention (Safari ITP, Samsung Browser) were silently
  blocking ("Tracking Prevention blocked access to storage for
  ...supabase-js...") and which also triggered "Multiple GoTrueClient
  instances" warnings.
These changes target the console error noise seen across every tool in
this session's logs and may also help Realtime stability (all channels
share one client/connection). 0-players root cause still unconfirmed —
retest after this deploy with game + operator tool open simultaneously.

KNOWN OPEN ISSUE (not yet investigated): both StrayPups games appear to be
broadcasting DIFFERENT ball-call sequences again (regression) — possible
WABC/local-vs-wide-area switching issue. To be investigated next session.


### v1.14 — Removed "Ball Position" from Status tab (cosmetic, per Sasha)
Cache bust: wabc-v1.14

### v1.15 — Presence Retry Fix
Same one-shot-subscribe presence bug as games/Progressive Operator — fixed
with exponential backoff retry (2s->30s cap). Removed noisy [WABC-DEBUG]
console.log calls from presence sync (no longer needed for diagnosis).
Cache bust: wabc-v1.15

### v1.16 — Presence Heartbeat (zombie-channel fix)
Same hypothesis as the games: a zombie presence channel
(silent socket reconnect with no CHANNEL_ERROR/CLOSED) could leave this
tool unable to see other presences with no visible error. Added a 60s
heartbeat: fully removeChannel + recreate the presence channel on a fixed
interval.
Cache bust: wabc-v1.16

### REVERT — Presence Heartbeat removed (caused console flood + lockup)
v3.18/v1.16/v1.7's 60s heartbeat caused console flooding and a system
lockup, most likely from racing with the existing error-retry logic and/or
hitting free-tier Realtime rate limits via frequent channel churn.
REVERTED ENTIRELY — back to one-shot subscribe + error-triggered retry.
"0 players with active games" remains OPEN.
Cache bust: see service-worker.js

### v1.18 — CRITICAL: Presence State Never Populated on Subscribe (same root cause as prog-op v3.21 / floor-manager v1.10)
`_sync()` already correctly read `presenceState()` directly, so it was
structurally better than the operator — but still had the cold-start gap.

**Fixes:**
- Changed single `setTimeout(_sync, 1000)` in SUBSCRIBED callback to two
  passes: 500ms and 2000ms. The first covers the fast path; the second
  covers Supabase free-tier cold-start where channel hydration is delayed.
- Added `_presencePollTimer` — a `setInterval(_sync, 3000)` that starts
  after SUBSCRIBED and is cleared + restarted on every channel reconnect.
  WABC previously had NO periodic presence refresh at all — if the initial
  sync was missed and no player joined/left afterward, the count stayed 0
  forever. The 3s poll ensures `_presenceState` is always rebuilt from live
  channel state regardless of event delivery.
- Fixed stale JS comment block version string (`v1.0` → `v1.18`).

Cache bust: wabc-v1.18

---

## Current Version: v1.18 (cache: wabc-v1.18)

## Pending
- [ ] Connected player count verified live with multiple game clients
- [ ] Force Local tested end-to-end
- [ ] Restore Wide tested
- [ ] New sequence auto-display when games trigger renewal at ball 75
