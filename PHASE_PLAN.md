# StrayPups Big Munny $1 — Phase Plan
## Repo: straypups_big_munny_v5_27_PWA
## Source of truth: zip archives. GitHub is behind.

---

---

---

---

## v5.90 — spinReel direction fix: bottom+column-reverse approach

### Problem
All previous CSS-transition spinReel attempts animated strip.top from 0 to a
large negative value. This moves the strip UP, making symbols appear to scroll
UPWARD — wrong direction.

### Fix
Switched to bottom+column-reverse positioning during spin:
- strip.style.flexDirection = 'column-reverse' (reverses visual symbol order)
- strip.style.bottom = startBottom (large positive, strip starts high)
- Animate bottom: startBottom -> targetBottom (decreasing = strip moves DOWN)
= symbols enter from TOP, scroll DOWNWARD through window ✓

After transitionend, rest strip is rebuilt using the original top positioning
(unchanged), so the at-rest display is unaffected.

This approach matches the working preview HTML that Sasha confirmed looked correct.

## v5.89 — spinReel direction fix (compositor ordering)

### Problem
CSS transition spinReel introduced in v5.87/v5.88 was still spinning upward
(wrong direction) on real devices. Root cause: `animateReels` was calling
`reel.classList.add('spinning')` on all 3 reels BEFORE `spinReel` ran,
promoting a compositor layer while the strip still had its old rest `top`
value. The double-rAF inside `spinReel` then animated FROM that old value
rather than from `top=0`, making it appear to spin upward.

### Fix
- Removed `reel.classList.add('spinning')` pre-call from `animateReels`
- Inside `spinReel`: set `top=0` and build strip DOM first (no classes active),
  then first rAF adds `spinning` class, then second rAF applies the CSS
  transition from `top=0` -> `targetY` (large negative = strip moves up =
  symbols scroll downward through window, correct direction)
- `transitionend` callback rebuilds rest strip cleanly with no overlap
- All bingo logic, ghost data, STRIPS untouched — reel animation only


## v5.92 — spinReel reverted to v5.87 (both games)

### Problem diagnosed
Post-v5.88 reel rewrites (v5.89/v5.90 spin-direction fix) introduced 3 regressions:
1. 3rd reel showing blank spaces (strip height/layout collapsing on the 3rd reel)
2. Visible snap/thud at reel stop (velocity mismatch: v5.90 startY/targetY
   calculation left the strip far off-position at frame 0, causing a jump)
3. Big lag during spinning (36-symbol strip + CSS transform on long strip caused
   GPU compositing cost; also positive-travel direction confused the phase timing)
4. Reels landing on wins with no matching bingo patterns (reel visual was
   decoupled from the underlying ghost/symbol data — blank reel = wrong symbol
   being displayed, so the 'win' animation fired on a mismatch)

### Fix: transplanted v5.87 spinReel verbatim from GitHub commit
-  game: commit 6470d5b (v5.87) spinReel
-  game: commit 2d3006a (v5.87) spinReel
The v5.87 spinReel uses 18 random scroll symbols followed by the 5 ghost symbols
at the END of the strip. centerIdx = spinSyms.length-3 (3rd from end). Strip
travels negative (upward) — the original working direction. Overshoot (~0.6
slots past target) + snap-back is present and intentional — gives the mechanical
'thud' feel that was always there through v5.87. All helpers (symSlotH,
blkSlotH, stripTopFor, stripTotalH, buildSlot, SLOT_H, SYM_PCT) are identical
between v5.87 and current, so the transplant is a clean drop-in with no
dependency changes.
All post-v5.87 work (progressive syntax fix, _forceArmed reset, Custom Bingo
Card Generator, WABC shared sequence, PROG_GAME_TITLES maxine entry, etc.)
is PRESERVED — only spinReel changed.
- Cache bust: spbm-v592
- Script query strings updated: game.js?v=v5.92, progressive.js?v=v5.92


## Current Version: v5.115

---

## Repo Overview
Class II bingo PWA. $1 denomination. All wins determined by bingo patterns. Reels are cosmetic. Connects to WABC for wide-area ball call and Progressive for WAP jackpot.

---

## Stack
- ES5 only — no arrow functions, const, let, backticks, async/await
- Supabase: gdmmoeggkqsvqnqyrubx.supabase.co
- Service worker cache: spbm-v551
- Key files: js/game.js, js/progressive.js, js/config.js, js/operator.js, wabc.js, broadcast-init.js
- Root copies of game.js and progressive.js must always stay in sync with js/ versions

---

## Phase History

### v5.40–v5.42 — WABC + Progressive Integration
- WABC.init() wired inside Progressive.init() callback
- Progressive symbol id:7 added to SPIN_SYM_IDS and VSTOP_TABLE (weight 500)
- _activeCallNext() stops at ball 75, sets seqExhausted=true
- generateCoverAllSpin() saves/restores usingServerBalls
- Progressive pattern pay:[0,0,0] — showcase shows WIDE AREA PROGRESSIVE
- armAndClaim() rewritten — inserts directly into progressive_commands, uses returned ID
- winPatterns sort — progressive pattern sorted LAST (pay:[0,0,0] would break basePat)
- rsPatterns filters out progressive pattern (handled separately, not run through Red Spin)

### v5.43 — Bug Fix Pass
- doBingoSpin: stop overwriting player ballPos from WABC.getBallPos()
- generateCoverAllSpin: restore usingServerBalls after call
- armAndClaim: rewritten to insert directly and use returned command ID (no Realtime timing dependency)
- Progressive pattern sorted to last position — basePat always lowest non-progressive pattern
- rsPatterns excludes progressive pattern from Red Spin

### v5.44 — Class II Reel Fix (REVERTED in v5.47)
- Removed evalSpin rejection loop — WRONG, caused cherries to show on losing spins

### v5.45 — Floor Manager Integration
- _writeGameHistory() added — writes every SPIN/CASH_IN/CASH_OUT to game_history table
- window._floorSupabaseClient exposed by progressive.js
- isProgressive and progAmount added to progressive jackpot opLog calls

### v5.46 — evalSpin Restored
- evalSpin rejection loop restored for no-bingo spins (Class II: visual must not contradict bingo result)
- Cherries on any reel rejected on no-bingo spins
- Wild+blank reordered correctly

### v5.47 — evalSpin Corrected
- Any wild (Scott id:0 or Progressive id:7) on payline always rejected on no-bingo spins
- 2x Progressive combos only appear via forcedSpinResult on bingo wins
- Scott+Progressive combo also correctly rejected

### v5.48 — WABC Channel Exposure (REVERTED in v5.50)
- WRONG: attempted to broadcast ball position — reverted

### v5.49 — Sequence Exhaustion (REVERTED in v5.50)
- WRONG architecture — reverted

### v5.50 — Correct Sequence Architecture
- updateBallPos() confirmed no-op — ball position per-player local only, never broadcast
- _requestNewWABCSequence() added — called when ball 75 hit OR Cover All occurs
- Calls upsert_ball_call RPC + broadcasts new_call to all players via wabc-ballpos channel
- wabc.js exposes window._wabcChannel after init for _requestNewWABCSequence to use

### v5.51 — Auto Sequence Renewal
- _activeCallNext() now calls _requestNewWABCSequence() immediately at ball 75
- New sequence broadcasting before player even presses spin
- doBingoSpin simplified — reads WABC.getSequence(), fallback _requestNewWABCSequence if still exhausted
- All root file copies synced (game.js, progressive.js, sw.js)
- Cache bust: spbm-v551

---

## Pending
- [ ] Player nickname device-to-device travel (via player_registry)
- [ ] Balance persistence across sessions
- [ ] game_history writes verified end-to-end with Floor Manager
- [ ] Full jackpot flow test: natural Cover All → armAndClaim → showProgJP → all patterns pay → Red Spin
- [ ] Connected players showing in Progressive Operator and WABC tool

---

## Rules
- Never modify RTP/math without Monte Carlo verification
- ES5 only throughout
- Version bumps: 0.1 per delivery
- Root copies of game.js and progressive.js must always match js/ versions
- Cache bust on every single build — no exceptions

### v5.52 — Duplicate WABC Channels Fix
- progressive.js now sets window._wabcSupabaseClient = _client
- wabc.js was looking for this but progressive.js only set _floorSupabaseClient
- Without it each game created its own Supabase client and wabc-ballpos channel
- This caused 4 separate WABC channels instead of 1 shared channel
- Cache bust: spbm-v552

### v5.53 — progressive_hits Insert Fix
- Added 500ms delay before progressive_hits insert after progressive_hit RPC
- RPC and insert were firing back-to-back causing silent insert failures
- Added .then() error logging for both _claimForceWin and hit() paths
- Cache bust: spbm-v553

### v5.54 — Presence Rate Limit Fix (CRITICAL)
- updateLastSpin() was calling _presenceChannel.track() on EVERY spin
- This caused ClientPresenceRateLimitReached errors flooding Supabase
- Rate limit terminated entire Realtime tenant — killed ALL tool connections
- Fixed: track() now throttled to max once per 30 seconds
- Last spin time stored locally on every spin, only broadcast every 30s
- Cache bust: spbm-v554

---

## Current Version: v5.115

## Pending
- [ ] Confirm operator tools connect after presence throttle fix
- [ ] Confirm single wabc-ballpos channel (not 4)
- [ ] progressive_hits records writing correctly
- [ ] Full jackpot flow end-to-end test
- [ ] Neon.tech migration planning

### v5.56 — Jackpot Card Generation Fix
- generateCoverAllSpin() rebuilt — now uses actual WABC sequence
- Builds special card from first 25 balls of BG.callSeq respecting column constraints
- B=1-15, I=16-30, N=31-45, G=46-60, O=61-75
- Cell 12 (free space) always null and always pre-daubed
- usingServerBalls stays true throughout — LIVE badge never changes
- Cover All triggers _requestNewWABCSequence for fresh sequence
- Removed unnecessary usingServerBalls save/restore
- Cache bust: spbm-v556

### v5.57 — CRITICAL: Legacy JWT Anon Key Fix
- sb_publishable_ key silently ignored by Supabase Realtime WebSocket server
- This broke ALL Realtime features: presence, broadcast, postgres_changes
- Symptoms: 0 players in operator, WABC not connecting, jackpot not detected
- Fixed: replaced sb_publishable_ with legacy eyJ... JWT anon key everywhere
- Cache bust: spbm-v557

### v5.58 — Force Jackpot Toast/Lockup/Notify Fixes
- onForceNotify/onForceWin converted to multi-listener arrays (were single-callback, getting overwritten)
- winner_game now mapped through PROG_GAME_TITLES (was showing raw game_id like 'straypups_1d')
- Fixed duplicate id="ac-amt"/"ac-jackpot-amt" on attitude-check overlay
- Added ac-game element showing which game won
- Force jackpot card generation wrapped in try/catch with fallback (prevents lockup if generateCoverAllSpin throws)
- Added 15s spin watchdog — force-unlocks game if spin never completes (DB hang, exception, etc.)
- Cache bust: spbm-v558

### v5.59 — CDC Connection Pool Exhaustion Fix
- prog-commands-XXXX (unique per-session channel) caused
  PoolingReplicationPreparationError: queue_timeout after 11+ seconds
- Each test reload created a new CDC replication slot subscription,
  exhausting the free tier's Realtime connection pool
- Fixed: shared 'prog-commands' channel name for all sessions
- Client-side filtering (winner_session !== _sessionKey) unchanged — still correct
- Cache bust: spbm-v559

### v5.60 — Mid-Sequence Join Sync (Ball Position)
- Joining players always started at ball 40 regardless of live caller's actual position
- ball_pos in DB is intentionally never updated (CDC pool protection from v5.39)
- Fixed via broadcast handshake on wabc-ballpos channel (zero DB writes):
  - New player sends 'sync_request' on join
  - Actively-calling player (BG.entTimer running) responds with 'sync_response' { pos }
  - New player fast-forwards card/strip/matchedCells to that position
  - If pos >= 40, joining player also starts their own active caller
- wabc.js: added setPosProvider(), onSyncResponse(), sync_request/sync_response handlers
- Cache bust: spbm-v560

### v5.61 — Jackpot Card Redesign + Duplicate Notification Fix
- generateCoverAllSpin() redesigned per Sasha's spec:
  - Pool is now first 40 balls (pre-called zone), not first 25
  - Picks 25 cells from this 40-ball pool respecting column constraints
  - 40-ball pool guarantees enough numbers per column (avg 8 vs 4-5 needed)
    -> eliminates the "not enough numbers" fallback bug from v5.56-v5.60
  - ALL 25 cells guaranteed daubed (within pre-called zone = already called)
  - BG.ballPos=40 (matches normal pre-called convention, was 25)
  - Natural-feeling: looks like a real Cover All within the pre-called zone
- Fixed duplicate "Attitude Check" popup for other players on force jackpot:
  - progressive_hits INSERT handler now skips notify when pattern==='Force Jackpot'
  - progressive_commands UPDATE handler already covers that case
- v5d: re-synced stale root game.js (was missing v5.60 sync code, unused
  duplicate — index.html loads from js/game.js, this was cosmetic cleanup)
- Cache bust: spbm-v561

### v5.62 — Cover All 40 / Cover All 75 Patterns Added
- Added 2 missing patterns to BINGO_PATTERNS (config.js):
  - 'Cover All 40' (balls:40, pay:[.01,.01,.01] all bets, reel:null)
    Natural Cover All within pre-called zone (1-40) — awards $0.01, ends sequence
  - 'Cover All 75' (balls:75, pay:[0,0,0], reel:null)
    Natural Cover All in entertainment zone (1-75) — no pay, ends sequence
- doBingoSpin()'s existing per-ball pattern loop picks these up automatically —
  no special-casing needed. If Cover All 25 (Progressive) occurs, Cover All 40
  and Cover All 75 both qualify too (25<=40<=75) -> all three stack/pay together
  per bingo rules, full celebration plays
- generateCoverAllSpin() winPatterns filter updated to include all 3 cover-all
  patterns (was excluding Cover All 75 due to balls<=40 filter)
- rsPatterns (Red Spin animation list) now excludes reel:null patterns —
  Cover All 40/75 have no reel stops per design, but their pay (e.g. $0.01)
  is still included via _allPatsBonus
- Cache bust: spbm-v562

### v5.63 — Cover All 40 Pay Always Credited
- In the non-progressive win branch, Cover All 40's $0.01 (and Cover All 75's
  $0, for symmetry) are now always added to baseAmt if present in winPatterns,
  even when basePat is a different pattern. Previously only paid if it
  happened to be winPatterns[0] (since reel:null excludes it from rsPatterns).
- Cache bust: spbm-v563

### v5.64 — Bug B: Cancel-Jackpot Reset
- _subscribeCommands UPDATE handler now also handles status==='cancelled':
  clears _forceArmed/_forceCommandId/_forceClaimed if matches this game's
  armed command id, so it stops trying to claim a dead command.
- _claimForceWin: when the won-update matches 0 rows (already claimed by
  another player OR cancelled), also clears _forceArmed/_forceCommandId
  (previously only _forceClaimed was reset, causing repeated retry attempts
  on every future spin).
- Cache bust: spbm-v564

### v5.65 — Splash Version Display Fix
- <title> and #splash-ver were hardcoded at "v5.39" for 25 versions —
  never updated despite cache-bust bumps. Now shows v5.65.
- PERMANENT RULE ADDED: every future version bump must also update the
  user-visible version display (splash/title), not just cache-busting.
- Cache bust: spbm-v565

### v5.66 — Progressive Jackpot Sequential Award Flow (Major Restructure)
Per Sasha's spec, the Cover-All-25 award sequence is now correctly ordered:
  1. Cover All 40 ($0.01) — instant toast + penny credited immediately
  2. All other winning patterns (balls<=40), sorted LOWEST pay -> HIGHEST,
     daubed/awarded via Red Spin reel-stacking animation (runRS)
  3. Progressive Jackpot — grand finale celebration (showProgJP)
  4. After celebration dismissed: full-card daub, win logged, sequence ends
     (stopActiveCaller + _requestNewWABCSequence) per Cover-All bingo rule

New function _finishProgressiveSpin() implements steps 1-3 and calls the
rewritten showProgJP() (now finale-only, handles step 4 on dismiss).
Previously showProgJP ran FIRST (celebration before other patterns) and
the ball sequence never ended after a progressive win — both fixed.

_allPatsBonus no longer double-counts Cover All 40 (now handled solely
inside _finishProgressiveSpin).

Applies to BOTH force jackpot and natural Cover-All-25 wins.
Cache bust: spbm-v566

### v5.67 — Progressive Celebration Dismiss-Collision Fix
- When Corporal Stripes ($800, reel:'jp') is the last Red Spin pattern before
  the Progressive finale, the player's tap-to-dismiss on the $800 JACKPOT
  overlay was also instantly dismissing the Progressive overlay that appeared
  right after (residual tap hit both full-screen tap-anywhere overlays).
- Fixed: showProgJP's dismiss handlers now activate only after a 600ms guard
  delay. Added a 300ms pause after the $800 JACKPOT overlay closes before
  continuing to the Progressive finale, so the two celebrations are visually
  distinct moments.
- Confirmed: Red Spin reel symbols correctly escalate low->high (Open Diamond
  cherry first, up through Corporal Stripes, then Progressive coverall) since
  each pattern uses its own reel type via REEL_SYMS[pat.reel].
- Cache bust: spbm-v567

### v5.68 — Pacing & Card Highlight Improvements
- Bingo card now highlights each pattern's winning cells AND shows its name
  in the pattern-name display during Red Spin (was previously silent —
  only the reels/payout updated, card stayed unchanged).
- Entertainment ball-call interval changed from fixed 1.5s to randomized
  3.2-3.5s (slower pace, more time to react to each ball).
- Spin animation lengthened: main reel stop delays 380/620/900ms ->
  600/1000/1450ms; Red Spin reel stop delays 320/520/720ms -> 500/800/1150ms.
- Cache bust: spbm-v568

### v5.69 — Progressive Jackpot Now Truly LAST in Sequence
- Main spin reels no longer forced to 'coverall'. Main reels now always show
  winPatterns[0] (lowest-pay pattern, e.g. Open Diamond) — Progressive plays
  during Red Spin as the FINAL entry instead.
- runRS extended: when it reaches an isProgressive pattern (now always last),
  its 'coverall' reel symbols land, then showProgJP fires directly as the
  grand finale — no separate Progressive overlay before Red Spin anymore.
- Fixed double-counting: bonusTotal was being added to S.bal twice (once
  per-pattern during the loop, once again at the progressive finale).
- Safeguard: if no other pattern won (winPatterns[0] is itself Progressive),
  it's appended to the Red Spin sequence so showProgJP still fires.
- Correct order end-to-end: Open Diamond -> ... -> Corporal Stripes ->
  Progressive Jackpot (finale) -> sequence ends.
- Cache bust: spbm-v569

### v5.70 — Lazy-T Pattern + Progressive Symbol on Reel Strips (Bonanza Bingo)
- NEW dedicated Progressive trigger pattern "Lazy-T" replaces the old
  all-25-cells "Progressive Jackpot" entry. Cells = O column (4,9,14,19,24)
  + N/middle row (10,11,12,13,14) = 9 cells, matching Bonanza Bingo Lazy-T
  shape. reel:'coverall' (7-7-7), isProgressive:true, pay:[0,0,0].
- A Cover-All-25 card (from generateCoverAllSpin) satisfies Lazy-T
  automatically (9 cells are a subset of all-25) alongside Cover All 40/75
  and the ~20 paytable patterns — all stack as before.
- Symbol 7 (Progressive mascot) added to all 3 reel strips — now appears
  7 times per 50-symbol reel, evenly distributed alongside symbols 0-5.
  Previously symbol 7 existed only as an artificially-inserted result for
  forced 7-7-7 spins, never as a real spinning symbol.
- forcedSpinResult: for any NON-Lazy-T winning pattern that uses symbol 0
  (Scott) as a wild, each wild slot now randomly shows Scott(0) or
  Progressive(7) (50/50, shuffled per spin) — e.g. Tee can show
  Progressive+1Bar+1Bar, Hopscotch can show Progressive+Cherry+blank, etc.
  Lazy-T's fixed 7-7-7 is left untouched (not a substitution).
- Renamed 'Progressive Jackpot' -> 'Lazy-T' throughout (game.js _forcePat
  objects, progressive.js fallback pattern names).
- Cache bust: spbm-v570

### v5.71 — CRITICAL: Lazy-T Finale Never Reached (2 Bugs Fixed)
Root cause of "Lazy-T never awarded, sequence ended on Corporal Stripes,
wrong celebration amount, pot didn't reset visually":

Bug 1 — basePat selection: Cover All 40/75 (pay $0.01/$0, reel:null) were
included in the ascending-pay sort and landed at winPatterns[0] (lowest
pay), becoming basePat. Main reels then showed a no-win 'none' combo
(REEL_SYMS[null] fallback) instead of Open Diamond.
Fix: Cover All 40/75 are now pulled into a separate _sideAwards array,
excluded from basePat/Red-Spin-sequence selection entirely, but still
appended to winPatterns so the penny-toast scan in _finishProgressiveSpin
still finds them.

Bug 2 — runRS's Corporal Stripes ('jp' reel) branch called onDone()
directly after its $800 celebration, ending the ENTIRE Red Spin sequence
early. Since Lazy-T sorts after Corporal Stripes (appended last as the
progressive finale), it never played — sequence stopped at Corporal
Stripes, whose own "$800 JACKPOT" overlay was mistaken for the progressive
celebration (wrong amount, pot never visually updated).
Fix: 'jp' branch now calls playNext() to continue the sequence, so
Lazy-T (or anything else after Corporal Stripes) still plays and
showProgJP fires as the true finale.

Correct order restored: Open Diamond (main reels) -> ... -> Corporal
Stripes ($800 celebration) -> Lazy-T (Progressive finale, showProgJP) ->
sequence ends. Cover All 40/75 awarded silently via penny-toast, unaffected
by reel ordering.
Cache bust: spbm-v571

### v5.72 — Single Combined Celebration (Corporal Stripes + Lazy-T)
Per Sasha's feedback on v5.71 test: when BOTH Corporal Stripes AND Lazy-T
win in the same spin, only ONE final celebration should show.

- runRS's 'jp' branch (Corporal Stripes) now checks progCtx:
  - If progCtx is set (Lazy-T also winning this spin): SKIP Corporal
    Stripes' own "$X JACKPOT" popup entirely. Silently add its pay to
    bonusTotal/S.bal and continue to the next entry. Lazy-T's showProgJP
    becomes the SINGLE finale, with Corporal Stripes' amount folded into
    the total (already added to the accumulative win via _allPatsBonus +
    bonusTotal -> Lazy-T's totalAmt).
  - If progCtx is null (no Lazy-T this spin): Corporal Stripes plays its
    own "$X JACKPOT" Congratulations celebration as the spin's finale,
    as before.

Result: exactly one celebration overlay per spin, regardless of whether
Corporal Stripes, Lazy-T, or both win. Progressive amount is always part
of the single accumulative total shown.
Cache bust: spbm-v572

### v5.73 — Pattern Name Position + Pot Reset Fix
- #bingo-pattern-name moved from full-width (above both card AND ball strip)
  to sit ONLY above the bingo card column (first child of #bingo-card-wrap).
  Font size/letter-spacing reduced (13px/3px -> 10px/1px) to fit the
  narrower card-width column, with ellipsis overflow for long pattern names.
- armAndClaim's !_connected/!_client fallback path now resets _localValue
  to _seed (and notifies listeners) after paying out — previously the pot
  meter stayed stuck at the pre-win value when this offline/disconnected
  path fired (likely related to the ongoing Realtime/0-players issue).
  Server-side DB reset still requires a working connection, but the
  player's own display is now consistent.
- Cache bust: spbm-v573

### v5.74 — Pot Reset Diagnostic + Player Nickname Fix
- _claimForceWin's progressive_hit RPC call (the server-side pot reset for
  Force Jackpot wins) NEVER checked rpcRes.error. Supabase RPC failures
  resolve with {error:...} rather than rejecting the promise, so a failed
  reset was silently treated as success — the winning player's LOCAL
  display reset to seed (false success), while the DB pot was never
  actually reset, explaining why other players/operator never saw a
  reset and why the player's own display reverted on the next refresh.
  Now logs a console.warn with the actual error message if this RPC fails
  — needed to diagnose root cause server-side (likely RPC permissions or
  signature mismatch in Supabase).
- Fixed progressive_hits insert: player_label now uses _playerNickname
  (player's chosen name) instead of the generic auto-assigned "Player N"
  label, for both Force Jackpot and natural hit records. Hit History will
  now show the player's actual nickname.
- Cache bust: spbm-v574

### v5.75 — CRITICAL: WABC Channel Reconnect Loop Fixed (likely root cause of 0-players)
- Log evidence showed an INFINITE loop: "Channel CHANNEL_ERROR — reconnecting
  in 2s" -> "Channel CLOSED — reconnecting in 4s" -> "Broadcast channel
  connected" -> CHANNEL_ERROR... repeating forever, with _onConnClose firing
  on the underlying WEBSOCKET connection itself (not just one channel).
- Root cause: _subscribe() called _client.removeChannel(_channel) WITHOUT
  awaiting its Promise, then immediately created a NEW channel with the SAME
  topic name ('wabc-ballpos'). Supabase Realtime rejected the duplicate join
  (CHANNEL_ERROR) before the old one finished leaving (CLOSED shortly after),
  triggering reconnect -> same race -> infinite loop.
- Fix: _subscribe() now awaits removeChannel()'s promise (via .then/.catch)
  before creating the new channel via new _doSubscribe().
- Since ALL Realtime channels (including presence-lobby) share ONE
  websocket, a socket that never stabilizes resets presence state on
  every 2-4s cycle — this is the most likely explanation for the
  persistent "0 connected players" across WABC/Progressive Operator/Floor
  Manager seen all session.
- Cache bust: spbm-v575

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


### v5.77 — game_history Diagnostic Logging + WABC/Progressive Banner Decoupling
- CONFIRMED via direct SQL query: game_history table has ZERO rows ever
  inserted. _writeGameHistory() (called via opLog on every spin/cash-in/
  cash-out) has never successfully completed.
- Added diagnostic console.warn logging to pinpoint exactly where it fails:
  - "[GameHistory] SKIPPED — Progressive not connected" if isConnected()=false
  - "[GameHistory] SKIPPED — window._floorSupabaseClient not set" if the
    shared client was never exposed
  - "[GameHistory] insert FAILED: <error>" if the DB rejects the row
    (schema/RLS/type mismatch)
- broadcast-init.js: force_local_ball / restore_wide_ball (WABC ball-call
  mode) no longer touch #prog-offline-banner / #prog-meter-lbl. These are
  owned exclusively by progressive.js connection state. Previously, forcing
  local ball call incorrectly showed "PROGRESSIVE JACKPOT UNAVAILABLE —
  RECONNECTING" even though Progressive itself was fine. Ball-call mode is
  already correctly shown via the LIVE/LOCAL badge.
- Cache bust: spbm-v577

NEXT STEP: do a few test spins, then check browser console for
"[GameHistory]" messages — this will tell us exactly why the table is
empty and let us apply the real fix.


### v5.78 — Red Spin Button-Mash Fixed (Watchdog Refresh)
- The 15s spin watchdog (added to catch genuine DB/exception hangs) was
  set ONCE at spin start and never refreshed. Full Lazy-T progressive
  sequences (multiple Red Spin patterns + finale celebrations) can
  legitimately run 20-40+ seconds, so the watchdog fired MID-SEQUENCE,
  force-set S.spinning=false and called setCtrl(true) -> re-enabled ALL
  buttons while runRS was still playing the celebration. Players could
  then press SPIN to start a new spin, interrupting/skipping the
  in-progress sequence.
- Added _refreshSpinWatchdog(): now called at the start of each Red Spin
  pattern in runRS, and again before each finale celebration (showJP /
  showProgJP). Watchdog now only fires if a SINGLE stage genuinely hangs
  >15s, not on cumulative multi-pattern sequence length.
- Cache bust: spbm-v578


### v5.79 — $5 Bet Display Fix (v5d), Lockup Fix, Presence Retry
- v5d ONLY: fmt() had a stray *DENOM (fmt(n){return "$"+(n*DENOM).toFixed(2);}),
  inflating ALL displayed dollar amounts (balance, bets, wins, jackpot
  popups) by 5x — e.g. a $15 max bet displayed/deducted as $75. S.bal,
  S.cpl*DENOM, pay[]*DENOM were ALREADY correct dollar values; fmt() was
  double-converting. Fixed to match v5_27_PWA (no *DENOM).
- Fixed "game locked up after progressive hit": the v5.78 watchdog-refresh
  fix still fired 15s after entering a player-dismissed celebration
  (showJP/showProgJP), force-unlocking controls (setCtrl(true)) while the
  celebration overlay was still visible/blocking. Waiting for a tap is
  normal, not "stuck". Now: watchdog is CLEARED (not refreshed) before
  these celebrations, and RE-ARMED at the start of the dismiss handler to
  still catch a genuine hang during post-celebration cleanup.
- PRESENCE FIX (root cause of "0 connected players" since early builds):
  _subscribePresence used a ONE-SHOT subscribe — if the first attempt
  returned CHANNEL_ERROR/TIMED_OUT/CLOSED (e.g. during Supabase free-tier
  Realtime tenant cold-start), .track() never fired and this player was
  PERMANENTLY invisible to presence for the session, with zero retries.
  Now retries with exponential backoff (2s->4s->8s...capped 30s) using the
  same removeChannel-then-resubscribe pattern as wabc.js.
- Cache bust: spbm-v579


### v5.80 — CRITICAL: Fixed Ball-Call Sequence Divergence (force_local_ball/restore_wide_ball race)
- Operator FORCE LOCAL / RESTORE WIDE buttons (WABC Master) fire on TWO
  channels for the same action: (1) wabc-ballpos broadcast (force_local/
  restore_wide), fully handled by WABC.onForceLocal/onRestoreWide in
  game.js — correct in every way. (2) progressive_commands INSERT
  (force_local_ball/restore_wide_ball), handled by broadcast-init.js,
  which for restore_wide_ball called fetchServerBallCall() ->
  Progressive.getBallCall() — a legacy v5.39 stub that ALWAYS returns a
  brand-new RANDOM LOCAL shuffle with isServer=false.
- These two handlers raced (different Realtime channels, different
  latency). Whichever ran LAST won. If broadcast-init.js's handler ran
  after WABC's correct one, it CLOBBERED the real shared WABC sequence
  with a random local shuffle and reset the badge to LOCAL — directly
  contradicting "restore wide area" and causing that game instance to
  diverge onto its own random ball sequence while WABC/other games
  continued on the shared one.
- Fix: removed force_local_ball/restore_wide_ball handling from
  broadcast-init.js entirely. WABC.onForceLocal/onRestoreWide are now the
  SOLE authority for ball-call mode switches.
- NOTE: fetchServerBallCall/refreshServerBallCall (game.js) and
  Progressive.getBallCall/refreshBallCall (progressive.js) are now
  UNREFERENCED legacy code — left in place pending confirmation before
  removal.
- Cache bust: spbm-v580


### v5.81 — Corporal Stripes Combo Fix, Lockup Safety Net, Ball-Call Freeze Fix
- Corporal Stripes (jp reel) substitution: kept independent per-symbol
  substitution (any Scott/Progressive mix is valid), but if the result
  happens to become ALL-Progressive on a non-Lazy-T combo, revert one
  symbol back to Scott. The all-Progressive combo is now EXCLUSIVE to the
  genuine Lazy-T trigger.
- Lockup safety net: wrapped showProgJP/showJP calls in try/catch. If
  either throws, the watchdog (just cleared, since waiting for a tap is
  normal) would otherwise leave the game PERMANENTLY locked with no
  recovery. Catch now logs the error, hides the relevant overlay, and
  restores controls (setCtrl(true)).
- Ball-call freeze fix: _activeCallNext's cover-all check now requires
  !BG.seqExhausted. Previously, a progressive/Lazy-T spin (which already
  satisfies all 25 cells from its initial 40-ball setup and already
  requested a new sequence via _handleCoverAll(true)) would freeze the
  entertainment caller at ball 41 on its first tick, because the
  redundant cover-all re-trigger called stopActiveCaller(). Now the
  caller keeps ticking 41-75 throughout Red Spin, in sync with the new
  shared sequence as it arrives via WABC.onNewCall — same as any other
  cover-all/WABC sequence switch.
- Removed the SECOND, redundant _requestNewWABCSequence() call in
  showProgJP's onDismiss handler — a new sequence was already requested
  and adopted at spin-result time (before Red Spin started); requesting
  another after the celebration was unnecessary. Being a
  progressive/Lazy-T win does not change the cover-all/WABC-switch flow.
- Cache bust: spbm-v581


### v5.82 — Presence Heartbeat (zombie-channel fix)
- updateLastSpin() already re-calls .track() every ~30s during active
  play, yet presence still showed 0 — meaning re-tracking on the SAME
  channel object is not enough. Hypothesis: the Supabase free-tier
  Realtime tenant repeatedly cold-starts/shuts down, and the underlying
  socket can silently reconnect WITHOUT this channel's status callback
  re-firing CHANNEL_ERROR/CLOSED. The channel becomes a "zombie" —
  .track() succeeds locally but the presence entry is gone server-side,
  with no visible error.
- Added a 25s heartbeat: fully removeChannel + recreate the presence
  channel (fresh join + fresh track()) on a fixed interval, regardless of
  whether an error was ever observed. Self-heals a zombie channel within
  ~25s.
- Cache bust: spbm-v582


### v5.83 — REVERT v5.82 Presence Heartbeat (caused console flood + lockup)
- v5.82's 25s full-teardown-recreate heartbeat for the presence channel
  caused the F12 console to flood with errors and locked up the system.
- Likely cause: the heartbeat raced with the EXISTING error-retry logic
  (both could attempt removeChannel+recreate on the same channel
  concurrently), and/or 25s-interval channel churn hit Supabase free-tier
  Realtime connection/rate limits, triggering CHANNEL_ERROR -> retry loops
  from both mechanisms simultaneously.
- REVERTED ENTIRELY. Presence subscribe is back to the v5.81/v3.17/v1.15
  state (one-shot subscribe + error-triggered retry with exponential
  backoff, no periodic heartbeat). The "0 players with active games"
  issue remains OPEN — needs a different approach.
- Cache bust: spbm-v583


### v5.84 — player_registry.last_seen Heartbeat (touch_player_last_seen)
- ROOT CAUSE for "0 players" on operator tools, identified: register_player
  RPC only re-fires on subsequent spins if a nickname is set
  (if(nickname && _client && _connected)). For nickname-less players (the
  majority), last_seen was frozen at first-connect time forever, even
  while actively spinning — making player_registry unusable as a
  "connected" signal.
- NEW SQL RPC touch_player_last_seen(p_session_key) — updates ONLY
  last_seen, kept separate from register_player to avoid any risk to the
  nickname field.
- updateLastSpin() now calls this RPC every ~30s (same throttle as the
  existing presence track), unconditionally regardless of nickname.
- This is part of a larger switch: all 3 operator tools (Progressive
  Operator, WABC Master, Floor Manager) now read player_registry instead
  of presence-lobby for Connected/Inactive counts and player lists — a
  durable DB table instead of ephemeral Realtime presence state, which
  has been unreliable all session.
- Cache bust: spbm-v584

  REQUIRED SQL (run once in Supabase SQL Editor):
  CREATE OR REPLACE FUNCTION public.touch_player_last_seen(p_session_key text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    UPDATE player_registry SET last_seen = now() WHERE session_key = p_session_key;
  END; $$;
  GRANT EXECUTE ON FUNCTION public.touch_player_last_seen(text) TO anon, authenticated;



### v5.85 — Progressive Symbol Replacement, Free Space Color, Reel Reshuffle, Ball-Call Freeze (Item 7), Celebration/Attitude Check CSS (Item 6), Pattern Cycling (Item 4), Winner Records
- **Progressive Jackpot symbol replaced**: New artwork (DJ-pup "PROGRESSIVE
  JACKPOT" mascot, user-supplied), background removed (flood-fill + isolated
  artifact cleanup), cropped to 863x1023, resized to 320x379, saved as
  assets/symbols/progressive_jackpot.png. Old assets/symbols/stray_pup_progressive.svg
  DELETED (fully replaced, no frame/border/separate text banner — blank
  canvas). game.js's IMG_PROG_JP preload updated to the new PNG path.
  Renders via existing mkSym id===7 -> object-fit:contain, no markup changes
  needed.
- **Free Space color fixed to blue**: .bc.free and .bc.free.daubed changed
  from gold gradient to the same blue gradient as .bc.daubed (#2255cc-#0033aa),
  text color changed from dark to light. Free space is always shown as
  daubed, so it should match daubed styling, not the un-daubed gold.
- **Reel strips reshuffled (no adjacent duplicates)**: All 3 STRIPS arrays in
  js/config.js reshuffled so the 50-symbol subsequence (even indices) has
  ZERO adjacent duplicates, circularly. Per-reel symbol counts preserved
  exactly. STRIPS is purely visual (above2/below2 "ghost" symbols next to
  the landing symbol) -- no effect on odds/RTP (VIRTUAL_STOP_TABLE /
  forcedSpinResult unchanged).

- **ITEM 7 FIX -- Ball-call freeze at ball 41 (ROOT CAUSE FOUND, CONFIRMED
  on v5.84)**: _handleCoverAll(true) (the progressive Cover-All-1-to-40
  setup, called from animateReels' callback) unconditionally called
  stopActiveCaller(), and NOTHING ever restarted it for Red Spin's balls
  41-75. The v5.81 !seqExhausted guard alone could not fix this -- even
  when the guard correctly prevented a second _handleCoverAll(false) call,
  _handleCoverAll(true) itself still stopped the caller with no restart path.
  TWO-PART FIX in js/game.js (both games):
    1. _continueSpinAfterClaim now sets BG.seqExhausted=true IMMEDIATELY
       (based on BG._coverAll1to40, already known synchronously from
       doBingoSpin) BEFORE calling startActiveCaller() -- closes the race
       where the first entertainment tick (~3.2s) could fire before
       _handleCoverAll(true) runs (animateReels' callback timing varies).
    2. _handleCoverAll(hasPenny) now only calls stopActiveCaller() when
       !hasPenny. For progressive spins (hasPenny=true), the active caller
       keeps running through Red Spin's balls 41-75; the seqExhausted guard
       in _activeCallNext prevents re-triggering _handleCoverAll(false).
       Non-progressive entertainment-phase cover-all (hasPenny=false)
       still freezes as designed (v5.40 behavior unchanged).

- **ITEM 6 FIX -- Celebration video / Attitude Check never appeared (ROOT
  CAUSE: missing CSS entirely)**: #force-win-cel and #attitude-check had
  ZERO CSS anywhere -- no display/position/z-index rules, so .classList.add
  ('show') did nothing visually. showProgJP and showAttitudeCheck were both
  firing correctly in JS; the overlays were just invisible/inert divs.
  Added full fullscreen-overlay CSS for both (css/styles.css, both games):
  fixed position, high z-index (250 / 240), flex-centered, #fw-video as a
  cover background behind text, gold/crimson text styling matching the
  existing #jp-ov jackpot popup, styled dismiss buttons.

- **ITEM 4 -- On-screen pattern cycling (resolved as a consequence of Item
  6)**: startPatternCycle(winPatterns) in showProgJP's onDismiss was already
  correctly designed to cycle through ALL achieved patterns every 2s -- it
  just never ran because onDismiss was unreachable (invisible dismiss
  button, per Item 6). No code change needed beyond the Item 6 CSS fix;
  verified no other stopPatternCycle() call interferes during Red
  Spin/celebration.

- **Winner name + real pattern names now recorded for every jackpot hit**:
  _claimForceWin (js/progressive.js, both games) previously HARDCODED
  pattern='Force Jackpot' and win_patterns='Force Jackpot' for EVERY hit,
  natural or forced -- Progressive Operator's "Last Hit"/history UI already
  displays these fields (win_patterns||pattern, player_label) but always
  showed the generic label. Now:
    - armAndClaim(winPatterns, onResult) -- new winPatterns param, passed
      through to _claimForceWin for natural Lazy-T wins (game.js's
      armAndClaim call site updated to pass winPatterns).
    - _claimForceWin(onClaimed, winPatterns) -- if winPatterns provided,
      records the real progressive pattern name (e.g. "Lazy-T") as
      `pattern` and ALL achieved pattern names joined as `win_patterns`.
      Genuine operator-forced jackpots (claimForce() called directly,
      before winPatterns exists for that spin) keep 'Force Jackpot' --
      accurate description of how that hit was triggered.
    - player_label continues to use _playerNickname||_playerLabel||_sessionKey.
  No UI changes needed in Progressive Operator -- it already reads these
  fields correctly.

- **Attitude Check now shows WHO won + how much**: progressive_commands
  gets a new `winner_label` column (SQL migration, see below), set by
  _claimForceWin alongside winner_session/winner_game/winner_amt.
  _subscribeCommands' UPDATE handler passes winner_label to
  onForceNotify listeners (3rd arg). showAttitudeCheck(amt, winnerGame,
  winnerLabel) (index.html inline script, both games) now populates a new
  #ac-winner element: "<name> Just Won The Progressive Jackpot!" (fixed a
  pre-existing duplicate #ac-sub id in the same edit -- second instance
  renamed #ac-sub2).

  REQUIRED SQL (run once in Supabase SQL Editor, BEFORE deploying v5.85):
  ALTER TABLE progressive_commands ADD COLUMN IF NOT EXISTS winner_label text;

- **Item 3 (operator-forced jackpots not recorded as a win/in history)**:
  root cause is the SAME as Item 6 -- onDismiss (which fires the opLog/
  game_history write with isProgressive/progAmount/patterns, AND the
  progressive_hits insert via _claimForceWin) never ran because the
  celebration overlay was invisible/undismissable, for BOTH natural and
  operator-forced wins. The Item 6 CSS fix applies equally to the forced
  path (_progPat._forceAmt branch -> same _finishProgressiveSpin ->
  runRS -> showProgJP -> onDismiss chain). No separate code change
  identified as additionally needed; please re-test operator-forced
  jackpots after this deploy and report back if still not recording.

- **DEAD CODE REMOVED**:
    - showForceWin / Progressive.onForceWin (index.html inline script +
      js/progressive.js): _onForceWinListeners was populated but NEVER
      fired anywhere -- the real winner celebration is showProgJP via
      game.js, called directly. Removed showForceWin(), CEL_VIDEOS/_celIdx,
      the onForceWin registration call, and onForceWin/_onForceWinListeners
      from progressive.js's exports entirely.
    - _subscribeHits' notify loop (js/progressive.js): now redundant --
      ALL real hits go through armAndClaim -> _claimForceWin, which updates
      progressive_commands (status='won') BEFORE the progressive_hits row
      is inserted; _subscribeCommands' UPDATE handler already notifies
      other players (with real pattern names + winner_label) for every
      hit. Disabled (always returns) to avoid a duplicate Attitude Check
      popup. Subscription left registered but inert, in case
      progressive_hits INSERT-based logic is needed again later.

- **ORPHANED DUPLICATE FILES DELETED** (root-level copies superseded by
  js/ versions, confirmed unreferenced by index.html <script> tags AND
  absent from the service-worker FILES cache list):
    - /game.js (root) -- index.html loads js/game.js
    - /progressive.js (root) -- index.html loads js/progressive.js; was
      uselessly cached, now removed from FILES too
    - /js/broadcast-init.js -- index.html loads root /broadcast-init.js
  GitHub still has these files from before this zip upload -- see
  GITHUB CLEANUP list (provided separately to Sasha) for the full set of
  files to delete manually from both repos (uploading a zip does not
  delete files).

- **service-worker.js FILES list fixed**: removed the now-deleted
  stray_pup_progressive.svg (would have made cache.addAll() fail entirely
  on next install/update -- it's atomic) and the now-removed root
  progressive.js; added assets/symbols/progressive_jackpot.png.

- Cache bust: spbm-v585. Splash/title version updated to v5.85.


### v5.86 — Random Trigger Odds wired up (must-hit-by-ceiling)
- **"Random Trigger Odds" setting (Progressive Operator) is now wired up**.
  Previously stored in the `progressive` table (column trigger_odds,
  default 500, UI label "1-in-N spins at seed (increases toward cap)") but
  NEVER READ by either game -- pure dead setting. Now:
    - js/progressive.js (both games): new _triggerOdds var, fetched in
      _fetchRow and kept current via _subscribeValue's UPDATE handler
      (same pattern as _seed/_ceiling/_contribRate).
    - contribute(betAmt) (called once per spin): if no force is currently
      armed and _triggerOdds>0 and ceiling>seed, rolls a random check each
      spin with odds interpolated linearly from 1-in-_triggerOdds when the
      pot is at seed to guaranteed (1-in-1) once the pot reaches the
      must-hit ceiling:
        progress = clamp((value-seed)/(ceiling-seed), 0, 1)
        chance   = (1/triggerOdds) + progress * (1 - 1/triggerOdds)
    - On success, new _armRandomTrigger() inserts a force_jackpot/'armed'
      row into progressive_commands with created_by='random_trigger' --
      the SAME mechanism the operator's manual Force Jackpot button uses.
      _subscribeCommands' existing INSERT handler picks this up for all
      connected clients exactly like an operator-armed command; takes
      effect starting the next spin (current spin's _forceJP was already
      evaluated before the async insert resolves).
    - Race safety: if _forceArmed becomes true from elsewhere (operator,
      natural Lazy-T armAndClaim, or another client's random trigger)
      while our insert is in flight, the newly-inserted row is immediately
      cancelled (status='cancelled') so it doesn't sit as an orphaned
      'armed' command.
  No Progressive Operator UI changes needed -- the existing "Random
  Trigger Odds" input already reads/writes the column this consumes.

  PRECAUTIONARY SQL (no-op if column already exists, run before deploy):
  ALTER TABLE progressive ADD COLUMN IF NOT EXISTS trigger_odds numeric DEFAULT 500;

- **Lazy-T pattern corrected in conversation/docs (no code change)**: cells
  [4,9,10,11,12,13,14,19,24] = the full O column (5 cells, incl. free
  space at 12) + the middle-row B/I/G cells (3 cells) = 8 numbers needed
  in the first 25 balls. Earlier description (N column + bottom row) was
  backwards -- code/config unaffected, this is just a documentation
  correction. Natural odds unchanged: ~1-in-15,599 per spin
  (C(67,17)/C(75,25)), independent of any operator action -- confirmed
  the natural armAndClaim(winPatterns,...) path is fully wired (same path
  fixed in v5.85).

- Cache bust: spbm-v586. Splash/title version updated to v5.86.


### v5.87 — Friendly game-name update (Stray Pups / Turrelle Sisters)
- PROG_GAME_TITLES (js/progressive.js): 'StrayPups Big Munny $1'/'$5' ->
  'Stray Pups Big Munny $1'/'$5'; 'turrelle': 'Turrelle Sisters' ->
  'The Turrelle Sisters Big Munny'. These feed game_title in
  progressive_hits/progressive_commands records and the Attitude Check
  "Won on <game>" display.
- _writeGameHistory's hardcoded _gameTitle (js/game.js) updated to match
  ('Stray Pups Big Munny $1'/'$5') -- feeds game_history.game_title, shown
  in Floor Manager.
- In-game <title>/#splash-ver branding ("StrayPups Big Munny vX.XX")
  UNCHANGED -- this rename is for cross-repo "friendly name" displays in
  the operator tools / hit records only, not the game's own branding.
- Companion changes this release: progressive_operator v3.21 (same
  PROG_GAME_TITLES rename), floor_manager v1.10 (GAMES map renamed + new
  'turrelle' entry so The Turrelle Sisters Big Munny / TSBIGMUNNY shows up
  correctly wherever Floor Manager displays per-game names), tsbigmunny
  v8.2.2 (same PROG_GAME_TITLES rename + new presence fix -- see
  tsbigmunny/PHASE_PLAN.md).
- Cache bust: spbm-v587. Splash/title version updated to v5.87.


### v5.88 — Forced-Jackpot-As-Natural Redesign, Claim-Timing Move, Corporal Stripes Fix, Custom Bingo Card Generator, Longer Reel Spins

Major redesign of the progressive jackpot flow based on live-testing
feedback. Five interlocking issues, all from the SAME root causes:

**ROOT CAUSE 1 — generateCoverAllSpin() set BG._coverAll1to40=false.**
This bypassed the v5.85 ball-call-continuation fix entirely for
operator-forced jackpots: at ball 41, _handleCoverAll(false) fired
prematurely (stopped the active caller, never restarted) and triggered an
extra _requestNewWABCSequence() outside the normal flow — the likely
source of two players seeing different ball calls.

**ROOT CAUSE 2 — armAndClaim/_claimForceWin fired BEFORE _finishProgressiveSpin
/runRS even started**, for natural AND forced wins alike. The DB claim
(which triggers Attitude Check for other players) happened before Red
Spin played Corporal Stripes/Cross Corners/etc and landed on Lazy-T —
"the jackpot occurred while player 1 was still in a red spin."

**ROOT CAUSE 3 — runRS's Corporal Stripes handling.** When pat.reel==='jp'
(Corporal Stripes) AND progCtx was set (Lazy-T also winning — ALWAYS true
for the old forced-jackpot path), the code added its payout and called
playNext() immediately, skipping setWin/flashCenter/pause entirely —
visually "Corporal Stripes completely skipped, Cross Corners straight to
Lazy-T."

**THE FIX:**

1. **generateCoverAllSpin() REPLACED with genBiasedBingoCard(N)**
   (js/game.js, both games, ~lines 701-790). Builds a card whose 24
   numbers are BIASED toward the first N balls of the EXISTING shared
   BG.callSeq — does NOT touch BG.callSeq/BG.ballPos/BG.matchedCells/
   BG._coverAll1to40 at all. doBingoSpin()'s normal ball-by-ball loop
   (unchanged) then evaluates this card against the real sequence —
   genuinely natural pattern detection. If a column's pool comes up short,
   the remainder is filled with random in-range numbers not already used
   (may land >N balls — "however the math falls out", per design).

   Every BINGO_PATTERNS entry has balls>=25 (Lazy-T=25, Corporal
   Stripes=27, ... up to 38, plus Cover All 40/75). So if all 24 numbered
   cells land by ~ball 24, EVERY pattern — including Lazy-T as the natural
   finale — is satisfied too. "24 balls + free space = 25 cells" is the
   same statement as "Lazy-T occurs naturally."

2. **doBingoSpin(biasedBalls)** — new optional param. doSpin() determines
   _biasedBalls: 24 if Progressive.contribute() returns _forceArmed
   (operator Force Jackpot or random-trigger), OR Progressive
   .getCustomCardBalls() if a custom_card command is armed (and
   immediately consumed via consumeCustomCard()). BG.card =
   biasedBalls ? genBiasedBingoCard(biasedBalls) : genBingoCard().

3. **doSpin() no longer calls Progressive.claimForce() upfront.** The old
   "claim async, then generate guaranteed Cover All" block at the end of
   doSpin is GONE — _continueSpinAfterClaim() is always called directly.
   _progPat._forceAmt / _forcePat / _forcePatFallback are GONE entirely —
   there is no separate forced-claim code path anymore.

4. **_finishProgressiveSpin signature changed**:
   _finishProgressiveSpin(winPatterns, basePat, cardSerial, balBefore,
   allPatsBonus) — takes allPatsBonus (sum of non-progressive winners'
   pay) instead of a pre-claimed progAmt. progCtx passed to runRS is now
   {allPatsBonus, pennyAmt, winPatterns, cardSerial, balBefore} (was
   {amt, ...}).

5. **runRS's progressive entry (pat.isProgressive&&progCtx) now calls
   Progressive.armAndClaim(progCtx.winPatterns, callback) itself** —
   right when Lazy-T lands (reels show 'coverall' symbols), AFTER
   Corporal Stripes/Cross Corners/etc have already played with the red
   overlay active. Inside the callback: _claimedAmt = _progAmt +
   progCtx.allPatsBonus; _totalAmt = pennyAmt + bonusTotal + _claimedAmt;
   S.bal += _claimedAmt; THEN showProgJP. This is the SINGLE claim point
   for every progressive win, natural or forced — other players' Attitude
   Check notifications now fire only at this moment.

6. **runRS Corporal Stripes fix**: `if(pat.reel==='jp'&&!progCtx)` keeps
   the old showJP-finale branch (Corporal Stripes is the ONLY/highest
   pattern, no Lazy-T this spin — unchanged). When progCtx IS set
   (Lazy-T also winning), Corporal Stripes now falls through to the SAME
   display as every other pattern (setWin/flashCenter/sound/1-2s pause).
   Red overlay (#red-ov) stays active throughout; playNext() carries
   straight into Lazy-T.

7. **armAndClaim(winPatterns, onResult) pre-armed-command check**
   (js/progressive.js, both games): if _forceArmed && _forceCommandId &&
   !_forceClaimed (operator Force Jackpot or random-trigger already armed
   a command), claim THAT existing command directly via _claimForceWin
   instead of inserting a new one. This is what makes
   "operator pre-arms -> player's naturally-generated winning card (via
   genBiasedBingoCard) converges and claims it after Red Spin" actually
   connect. _checkArmedCommand() now filters .eq('command','force_jackpot')
   so it doesn't also pick up an armed custom_card row.

8. **Attitude Check video** (index.html, both games): #attitude-check had
   no <video> element (only #force-win-cel/#fw-video did). Added
   #ac-video (same CEL_VIDS list: assets/videos/{josie_dance,sasha_dance,
   sasha_alt}.mp4, random pick), CSS (#ac-video absolute/cover/opacity .6,
   z-index 0; all #ac-* text given position:relative;z-index:1 +
   text-shadow for readability over the video).

9. **Custom Bingo Card Generator** (NEW — WABC Master operator menu, see
   wabc_master/PHASE_PLAN.md v1.19): operator arms a one-shot
   command:'custom_card', balls_to_use:N row in progressive_commands.
   js/progressive.js (both games): new _customCardArmed/_customCardBalls/
   _customCardCommandId state, populated via _checkArmedCommand +
   _subscribeCommands (separate from force_jackpot handling). New exports
   getCustomCardBalls() / consumeCustomCard(onDone) (marks status=
   'consumed', one-shot). No progressive-pot/claim logic attached — purely
   "deal this card to the next spinner."

   SQL (run before deploy, see add_custom_card_column.sql):
   ALTER TABLE progressive_commands ADD COLUMN IF NOT EXISTS balls_to_use integer;
   (also check command/status CHECK constraints allow 'custom_card' /
   'consumed' / 'cancelled' — see SQL file for details)

10. **Reel spin duration increased ~2x** (per Sasha's separate feedback —
    spins didn't look long enough). spinReel's scroll-symbol count 18->36;
    main spin STOP_DELAYS [600,1000,1450]->[1200,2000,2900]; Red Spin
    RS_STOP [500,800,1150]->[1000,1600,2300]. centerIdx/targetY computed
    dynamically from spinSyms.length, so geometry stays correct. Tune
    further after testing if it still doesn't feel like enough rotations.

Cache bust: spbm-v588. Splash/title version updated to v5.88.


### v5.89 — Smooth Reel Stop, Critical _forceArmed Reset Fix (2nd-spin freeze)

- **Smooth natural reel stop (no overshoot/snap)**: spinReel's stop
  animation previously scrolled past the target by 0.6 slots, held there
  briefly, then INSTANTLY SNAPPED back to the exact target ("mechanical
  thud"). Replaced with a single continuous motion: 70% of stopDelay at
  constant velocity, then 30% linear deceleration to exactly 0 velocity
  AT targetY — velocity-matched at the phase boundary (no jump), lands
  exactly on target with no overshoot and no snap. centerIdx/targetY/
  stopDelay all unchanged from v5.88 (still ~2x duration / 36 scroll
  symbols) — only the STOP MOTION changed.

- **CRITICAL FIX — "2nd spin freeze / blank card / ball call cells
  corrupted" bug**: root cause was in _claimForceWin (js/progressive.js,
  both games) — on a SUCCESSFUL claim, _forceArmed and _forceCommandId
  were NEVER reset (only _forceClaimed=true was set). This was harmless
  pre-v5.88 (the old claimForce path checked _forceClaimed directly), but
  v5.88's contribute() returns _forceArmed DIRECTLY to decide
  _biasedBalls=24 for genBiasedBingoCard -- so after ANY successful
  jackpot claim, EVERY subsequent spin kept biasing toward a 24-ball
  Cover-All. This made BG._coverAll1to40 true on nearly every spin,
  firing _handleCoverAll(true)/_requestNewWABCSequence() repeatedly,
  racing with the next spin's doBingoSpin and corrupting
  BG.callSeq/matchedCells -- "card goes blank, ball call cells affected,
  around the 2nd spin" (i.e. the spin AFTER any jackpot claim).
  Fix: _claimForceWin's success path now resets _forceArmed=false;
  _forceCommandId=null; immediately after a successful claim.

  IMPORTANT FOR THIS DEPLOY: if progressive_commands has any leftover
  status='armed' rows from EARLIER test sessions (before this fix
  existed), _checkArmedCommand() would still set _forceArmed=true from
  spin 1 of a fresh session. Before testing, run:
    SELECT id, command, status, created_by, created_at
      FROM progressive_commands WHERE status='armed';
  and cancel anything stale:
    UPDATE progressive_commands SET status='cancelled' WHERE id=<id>;

- **Pattern threshold review (no code change)**: BINGO_PATTERNS' balls
  thresholds (Pyramid=29, G Flat=36, Stepladder=36, etc.) were confirmed
  correct per Sasha's examples. Discussed the cumulative (stacking)
  nature of thresholds vs. an exclusive-tier model -- confirmed current
  cumulative/stacking design is intentional and stays as-is. Custom
  Bingo Card Generator's interaction with Lazy-T (it can stack the real
  progressive jackpot if Lazy-T naturally completes on a biased card)
  was flagged but left as-is per Sasha's direction ("leave it as is").

- Cache bust: spbm-v589. Splash/title version updated to v5.89.


### v5.90 — Reel Spin Direction Fix (downward) + Reduced Blur

Two follow-ups to v5.89's smooth-stop testing:

- **Spin direction reversed (was upward, now downward)**: the v5.89 smooth
  stop removed the old overshoot+snap, which exposed that the underlying
  scroll motion had ALWAYS been bottom-to-top ("upward") — the old snap-
  back at the very end was the only "downward" cue, masking it.
  Restructured spinReel's strip: the 5 final ghost symbols
  (above2/above/sym/below/below2, in that order) are now built FIRST (top
  of strip) followed by the 36 random scroll symbols. strip.top now
  INCREASES from startY to targetY (was 0 to targetY) — content now flows
  top-to-bottom: random symbols scroll down and exit below, while the
  ghosts enter from above and settle into the payline window in their
  correct relative positions. centerIdx is now fixed at 2 (the 'sym'
  ghost's index in the 5-ghost block). startY = spinTopOff -
  (spinSyms.length-1)*slotH; targetY unchanged formula
  (spinTopOff-centerIdx*slotH). The v5.89 velocity-matched
  constant-then-decelerate formula was generalized for travel=targetY-
  startY (now positive) with pos=startY+... — same smooth landing, just
  the opposite direction and a non-zero start position.

  Symbol-shuffle rules unaffected: the 5 ghosts keep their existing
  internal order/adjacency (above2,above,sym,below,below2) — only the
  WHOLE BLOCK moved from the end of the strip array to the front. The
  v5.85 STRIPS reshuffle (no two adjacent symbols identical, circularly)
  still guarantees finalGhost.above !== finalGhost.sym, so "no identical
  symbol shown directly above the payline and on the payline at the same
  time" still holds.

- **Reduced spin blur**: .reel.spinning .reel-strip blur 6px -> 2px
  (css/styles.css). With v5.88's ~2x longer spin duration and v5.89's
  continuous (non-jarring) motion, the full-strength blur was visible for
  the entire spin and read as excessive. 2px keeps a sense of motion
  without obscuring the strip.

Cache bust: spbm-v590. Splash/title version updated to v5.90.


### v5.93 — EMERGENCY: Service Worker Cache Fix (Splash Screen Lockout)

**ROOT CAUSE (audit finding):** Service worker listed `./icon-192.png` and
`./icon-512.png` in FILES cache list. These files DO NOT EXIST at the root of
this repo — they live at `./assets/icons/icon-192x192.png` etc. Since
`cache.addAll()` is atomic, ONE missing file causes the ENTIRE install to fail.
The PWA install never completed, leaving the old broken cache in place and the
game stuck at the splash screen on EVERY load.

Additionally: CACHE version was `spbm-v590` but the last delivered build was
v5.92 — cache was never bumped, so even if install had succeeded, browsers
would have served stale cached files.

**Fixes applied:**
- `service-worker.js`: corrected icon paths to `./assets/icons/icon-192x192.png`
  and `./assets/icons/icon-512x512.png` (files confirmed present)
- `service-worker.js`: bumped CACHE to `spbm-v593`
- `index.html`: updated `<title>`, `#splash-ver`, and all script `?v=` query
  strings to `v5.93`

**PERMANENT RULE REINFORCED:** Cache bust = CACHE string + ALL ?v= query strings
+ splash/title version display — all four must change together, every build.

- Cache bust: spbm-v593


### v5.94 — CRITICAL: Missing Closing Brace in runRS() (Syntax Error)

**ROOT CAUSE:** `function runRS()` (line 1262) was missing its closing `}`.
The nested `function playNext()` closed correctly at line 1373, but `runRS`
itself had no closing brace. This left brace depth at 2 instead of 1 at the
end of the file, causing V8 to reject the entire `game.js` with
`SyntaxError: Unexpected token ')'` at the final `}());` IIFE closure.

The game would not load past the splash screen on any deployed device.

**Fix:** Inserted a single `}` after line 1373 to close `runRS()`.
**Applied to:** both bingo games ($1 and $5) and Maxine's Wild Cherries.

- Cache bust: spbm-v594

---

### v5.106 — Comprehensive Fix Pass + Permanent Design Rules

Built from original uploaded files. All previous patch sessions discarded.

**All 14 fixes applied — see GAME_DESIGN_RULES section below for full details.**

- Cache bust: 'spbm-v5106'

**NOTE (added v5.112 audit):** the shipped build at the start of this audit
was v5.111 with no corresponding v5.107–v5.111 entries anywhere in this
document — those changes (whatever they were) went out without being
logged, breaking Rule 5 (read/update PHASE_PLAN before AND after every
build). Flagging this gap since the missing-brace regression below was
not caught by any documented review in that range.

---

### v5.112 — CRITICAL: Red Spin Permanent Lockup Fixed (runRS misplaced setTimeout)

**ROOT CAUSE:** Inside `runRS()` (js/game.js), the `setTimeout(playNext,200)`
call meant to kick off the Red Spin sequence exactly once was sitting on
the wrong side of `playNext`'s own closing brace, trapping it INSIDE
`playNext`'s body:

```
    function _onReelDone(){ ... }
  }                          // closed _onReelDone (correct)
  setTimeout(playNext,200);  // BUG: still inside playNext
}                             // closed playNext
}                             // closed runRS
```

Total brace count was balanced, so `node --check` never flagged this —
it's a structural placement bug, not a syntax error. Confirmed via a
brace-depth trace, not just inspection.

**SYMPTOM:** every call to `playNext()` re-scheduled itself again 200ms
later, regardless of whether the current pattern's reel animation
(500–1450ms `RS_STOP` delays) had actually finished. Since `runRS` only
ever runs when `rsPatterns.length>0` (2+ bingo patterns won on the same
spin — single-pattern wins never call `runRS` at all), this only ever
surfaced on multi-pattern Red Spin wins, matching the reported bug
exactly. The rogue timer raced `seqIdx` past `rsPatterns.length`,
`pat = rsPatterns[seqIdx]` became `undefined`, and the next `pat.*`
property access threw inside an uncaught async callback. `onDone()` never
ran, so `S.spinning` / `setCtrl(false)` (set at the top of `doSpin`) were
never reverted — permanent lockup, all controls dead, no recovery.

**FIX:** moved the closing `}` for `playNext` to immediately follow
`_onReelDone`'s closing brace, then placed `setTimeout(playNext,200)`
after it, at `runRS`'s own scope — so it now fires exactly once per
`runRS()` call, as originally intended.

**ALSO IN THIS BUILD:** Section 5 (RED SPIN RULES) corrected — it
previously said patterns play "ascending by pay," but the actual
`doSpin`/`doBingoSpin` code explicitly orders by ball-completion order
(with a code comment stating "DO NOT sort by pay — that breaks the
design"). The two usually coincide because lower-pay patterns are
configured with higher `balls` thresholds, but completion order is what
the code actually keys off. Section 5 wording updated to match the real
implementation; the flow/behavior itself was NOT changed.

**Verified:** `node --check` clean on all JS files; brace-depth trace
confirms `setTimeout(playNext,200)` now executes at `runRS`'s scope, not
`playNext`'s.

**NOT done in this build (flagged, not applied):** root-level
`progressive.js` (outside `js/`) is stale — still contains
`_subscribeCommands`/`_checkArmedCommand`/force-jackpot code this document
says was removed in v5.99+. `index.html` loads from `js/progressive.js`
exclusively, so this is dead weight rather than live, but it violates the
"root copies must stay in sync" rule. Left untouched pending separate
confirmation, since rewriting it is a larger change than the lockup fix.

- Cache bust: spbm-v5112

---

### v5.113 — Dead File Removal + Audit Findings (not yet fixed)

**Removed (confirmed unreferenced anywhere, exhaustively grep-checked
against every .html/.js/.css/.json file before deletion):**
- Root-level `progressive.js` (44K) — stale duplicate of `js/progressive.js`,
  not loaded by index.html or service-worker.js, still contained
  `_subscribeCommands`/`_checkArmedCommand`/force-jackpot code this document
  says was removed in v5.99+. Flagged in v5.112, deleted now.
- Root-level `credits_addup.wav`, `red_spin_music.mp3`, `ring1.mp3`,
  `scott_full.png`, `splash.jpg` — orphaned duplicates of files in
  `assets/`. Every actual reference (index.html, service-worker.js FILES
  list, paytable.js `asset:` field) uses the `assets/` path exclusively.
  ~1.6MB removed.
- Root-level `icon-192.png`, `icon-512.png` — zero references found
  anywhere (manifest.json and service-worker.js both use
  `assets/icons/icon-192x192.png` / `icon-512x512.png`). ~556KB removed.

**NOT removed:** root-level `bingo_pattern_mapper.html` — Section 11
explicitly documents this duplicate as intentional ("Same as assets
version"). Left in place.

**New issues found during this audit — documented here, NOT yet fixed,
pending confirmation:**

1. **`_scheduleResync()` (js/game.js) can never succeed.** After a WABC
   disconnect, this sets a 10s `setInterval` that calls
   `Progressive.getBallCall(cb)` and only clears itself / adopts the
   sequence `if(isServer)`. But `getBallCall()` (js/progressive.js) is a
   v5.39-era stub that unconditionally calls `cb(local, false, 0)` —
   `isServer` is hardcoded `false`, by its own doc comment. This means
   `_scheduleResync`'s interval can NEVER clear itself and NEVER adopts a
   real sequence through this path — it just discards a throwaway local
   shuffle every 10 seconds, forever, once triggered. Actual resync
   appears to happen separately via wabc.js's own reconnect + `WABC.onChange()`
   path, making this interval pure dead weight that also never stops
   running once started.

2. **`_claimForceWin`'s outer `.catch()` (js/progressive.js ~line 633)
   doesn't fully reset state.** Every other failure path resets
   `_forceClaimed`, `_forceArmed`, AND `_forceCommandId` together. This
   one only resets `_forceClaimed`, leaving `_forceArmed`/`_forceCommandId`
   stuck if the `.update()` call itself throws/rejects (vs. returning a
   normal response with 0 rows matched). Since `contribute()` returns
   `_forceArmed` directly and that value drives the forced-jackpot branch
   in `doSpin()`, a stuck `_forceArmed=true` would route every subsequent
   spin through the force-claim path until it either re-succeeds or hits
   the 0-rows-matched branch naturally. Narrow window (requires the update
   request itself to fail, not just return no match) but the asymmetry
   with the other four reset sites looks like an oversight.

3. **Stale comments describing removed features as currently active.**
   `armAndClaim()`'s v5.88 comment block still reads "if a force_jackpot
   is ALREADY armed (operator's manual Force Jackpot, or the
   random-trigger mechanism)..." — both of those triggering mechanisms
   are gone (no operator.js button, no `_armRandomTrigger`,
   no `_subscribeCommands`/`_checkArmedCommand` in the live file). The
   `_forceArmed` check itself is still legitimate (it now only protects
   against a race between two players' simultaneous natural Lazy-T wins),
   but the comment describes a scenario that can no longer happen and
   should be reworded to avoid misleading whoever edits this next.

4. **broadcast-init.js holds open a permanent no-op Realtime channel.**
   `subscribeSystemCommands()` subscribes to `progressive_commands` INSERT
   events on a `game-sys-commands` channel every page load, but
   `handleSystemCommand()` is a documented no-op (`return false;`) per the
   v5.80 fix. Functionally harmless today, but it's an extra open
   Realtime channel per player session doing nothing, on a project with
   a documented history of Realtime connection-pool exhaustion (v5.59)
   and duplicate-channel bugs (v5.52). Worth removing the subscription
   entirely rather than leaving an always-on no-op listener.

- Cache bust: spbm-v5113

---

### v5.114 — Red Spin Ascending-Pay Sort Fixed + Permanent Design Rule Locked

**BUG:** Red Spin was awarding patterns highest-to-lowest pay instead of
lowest-to-highest. Root cause: `rsPatterns` was built as `winPatterns.slice(1)`,
which preserves ball-completion order. Because high-paying patterns have low
`balls` thresholds (e.g. Corporal Stripes: balls:27, pay:$800) they complete
FIRST in `doBingoSpin`'s ball-by-ball loop, landing at the front of `winPatterns`.
After `basePat` takes `winPatterns[0]`, the remaining `rsPatterns` were still
high-to-low — the opposite of the intended excitement build.

**FIX:** Added `.sort(function(a,b){return a.pay[S.cpl-1]-b.pay[S.cpl-1];})` to
`rsPatterns` after the filter, sorting ascending by pay at the current bet level.
`basePat` (main reels) is unaffected — it remains `winPatterns[0]`, the first
pattern to complete (highest pay in normal configurations, correct behavior).
Red Spin now plays lowest→highest, building to the biggest win last.

**PERMANENT DESIGN RULE:** This ascending-pay sort for Red Spin is the ONLY
valid mechanism. Never change the sort direction, remove the sort, or revert
to completion order without explicit written confirmation from the owner.
See Section 5 (RED SPIN RULES) for the authoritative design spec.

Applied identically to all 3 games in the same build.

**Verified:** `node --check` clean on all three js/game.js files.

- Cache bust: spbm-v5114

---

### v5.115 — Cover All Redesign + Pattern Sort Fix + Dead Code Removal

**CHANGE 1 — Bug Fix: Pattern Award Order (lowest→highest, basePat included)**
Root cause: `doBingoSpin()` returns `winPatterns` in ball-completion order. High-paying
patterns have lower `balls` thresholds and complete first, landing at `[0]`. `basePat`
was therefore always the highest payer, shown on main reels BEFORE Red Spin ran.

Fix: `_reelPats` sorted ascending by `pay[S.cpl-1]` BEFORE `winPatterns` is reassembled.
`winPatterns[0]` (basePat) is now always the lowest-paying reel-bearing pattern.
Red Spin (`rsPatterns`) ascending sort preserved. Stale "DO NOT sort by pay" comments removed.
`_sideAwards` concept removed — Cover All 40 handled as event, not side award.

**CHANGE 2 — Cover All 40 Redesign (owner-confirmed rule)**

Confirmed flow:
1. Player presses Spin → card generated and daubed
2. Cover All + any additional patterns within ball threshold determined
3. Ball sequence end sent to DB (→ new WABC sequence for all players)
4. $0.01 credited to winning player + local toast
5. "GAME END — Cover All Achieved" broadcast to all connected players via `broadcast_messages`
6. Reels land on lowest reel-bearing winning pattern (or non-winning combo if Cover All alone)
7. Red Spin plays any additional reel-bearing patterns lowest→highest
8. Cover All itself NEVER appears as a Red Spin entry — it is the trigger/event only

Key code changes:
- `_handleCoverAll()`: `hasPenny` parameter removed. Responsibilities: stop caller,
  set exhausted, request new sequence, call `_broadcastCoverAll()`.
- `_broadcastCoverAll()`: new function. Credits $0.01, shows local toast, inserts into
  `broadcast_messages` (`type:'general'`, `created_by: playerNickname||'player'`).
- Cover All 40 excluded from `winPatterns` reel sequence (event-only, not reel slot).
- Cover All 40 excluded from `rsPatterns` filter by name check.
- `baseAmt` accumulation loop cleaned up — uses `p.reel` truthy check, no name guards.
- Cover All 75 concept fully removed from all code and comments.

**CHANGE 3 — Bug Fix: Blank Bingo Card on First/Early Spins**
Root cause: `exitDemo()` called `buildBingoCardNodes()` unconditionally, doing
`grid.innerHTML=''` every time — wiping card DOM nodes built at init, causing a
blank-card flash before `doBingoSpin()`/`renderBingoCard()` repopulated them.
Fix: `exitDemo()` now only rebuilds nodes if `_cardNodes === null || length < 25`.

**CHANGE 4 — Dead Code Removal**

`js/game.js` removed:
- `_forceJP` / `Progressive.contribute()` / Force Jackpot `if` block in `doSpin()`
- `generateCoverAllSpin()` function (≈85 lines)
- `refreshServerBallCall()` function (never called)
- `_scheduleResync()` + `_resyncTimer` (stub always returned isServer=false, interval never cleared)
- `checkPatterns()` function (zero call sites)
- All stale comments referencing Force Jackpot, Cover All 75, "DO NOT sort by pay"

`js/progressive.js` removed:
- `claimForce()` function + API entry
- `_onForceNotifyListeners` array + `onForceNotify()` function + API entry
- Rewrote `armAndClaim()` race-guard comment (now correctly describes simultaneous natural-hit protection)
- Rewrote `_claimForceWin()` comment (removed operator Force Jackpot references)
- `_forceArmed`/`_forceCommandId`/`_forceClaimed`/`_claimForceWin()` KEPT — used by `armAndClaim()` for natural jackpot race protection

`broadcast-init.js` removed:
- `subscribeSystemCommands()` — permanent no-op Realtime channel (wasted connection slot)
- `handleSystemCommand()` — always returned false
- `Progressive.onForceNotify()` handler — listener was never fired
- Version bumped: v1.2 → v1.3

**CHANGE 5 — paytable.js**
- Note 5 (Cover All 75) removed, notes renumbered
- Cover All 40 BINGO_PATTERNS comment updated to describe v5.115 behaviour

**Known deferred bug (NOT fixed in this build):**
When a new WABC ball sequence arrives mid-celebration via `WABC.onNewCall()`, the winning
card is re-daubed with the new sequence, overwriting the win highlight. The winning card
must remain frozen in its win state until the player presses Spin again.
Flagged for a future version.

- Cache bust: spbm-v5115

---

### v5.116 — Hotfix: Restore Accidentally Deleted Functions from v5.115

**Root cause:** The v5.115 dead-code removal pass deleted three functions from `game.js`
and the `onForceNotify` infrastructure from `progressive.js` that were NOT dead.

**Bug 1 — Blank bingo cards + `ReferenceError: stopPatternCycle is not defined`**
`checkPatterns()`, `startPatternCycle()`, and `stopPatternCycle()` were removed from
`game.js` under the assumption `checkPatterns()` had zero call sites. However
`startPatternCycle()` and `stopPatternCycle()` are called from 10+ locations in `game.js`
and are solely responsible for rendering bingo card patterns after every spin result.
Without them the game threw a ReferenceError on the first spin and all bingo cards
appeared blank.

Fix: All three functions restored to `game.js` at their original position (after the
ball-track clear block, before GAME STATE).

**Bug 2 — `TypeError: Progressive.onForceNotify is not a function`**
`onForceNotify()`, `_onForceNotifyListeners` array, and the public API export were removed
from `progressive.js`, but `index.html` line 209 still calls
`Progressive.onForceNotify(showAttitudeCheck)` on every page load, throwing a TypeError
on startup.

Fix: `_onForceNotifyListeners` array, `onForceNotify()` function, and its return-object
entry restored to `progressive.js`.

**Bug 3 — `showBroadcastToast` missing title arg (minor)**
`broadcast-init.js` v1.3 dropped the `msg.title` second argument from the toast call.
The function signature still accepts it. Restored `msg.title || ''` as second arg.

Files changed: `js/game.js`, `js/progressive.js`, `broadcast-init.js`
- Cache bust: spbm-v5116

---

### v5.130 — Fix: Balls 41-75 Frozen After Cover All (Stale WABC issued_at)

**Files changed:** `js/game.js`, `wabc.js`, `index.html`, `service-worker.js`

**Bug:** Introduced by the v5.129 fix. After Cover All, the triggering
player's own ball strip stopped advancing — balls 41-75 never animated
again on the new sequence (game appeared frozen at ball 40 for that
player only).

**Root cause:** v5.129 made `_requestNewWABCSequence()` update `BG.*`
locally for the triggering player instead of relying on `WABC.onNewCall`
(since that listener never fires for the sender — see v5.129). But
`wabc.js`'s OWN internal state (`_sequence`, `_ballPos`, `_issuedAt`) was
never updated to match — only `BG.*` in game.js was. The `pos` broadcast
handler in `wabc.js` guards every incoming position update by comparing
`payload.seq_issued_at` against its internal `_issuedAt`, silently
dropping any event that doesn't match. Since the triggering player's
internal `_issuedAt` still pointed at the OLD sequence, every
post-reshuffle `pos` event for them was filtered out.

**Fix:** Added `WABC.applyLocalNewCall(sequence, issuedAt)` — syncs
`wabc.js`'s internal `_sequence`/`_ballPos`/`_issuedAt` without re-firing
`onNewCall` listeners (the caller already applied its own UI update).
`_requestNewWABCSequence()` now calls this right after broadcasting, so
the triggering player's `seq_issued_at` guard matches the new sequence
and subsequent `pos` broadcasts for balls 41-75 are no longer dropped.

**No SQL changes required.**

- Cache bust: spbm-v5130

---

### v5.129 — Fix: WABC Cover All Lockup (Self-Broadcast Echo Never Received)

**Files changed:** `js/game.js`, `index.html`, `service-worker.js`

**Bug:** Two players playing simultaneously — when Player A hit Cover All
(40 or 75), the game locked up on "New ball sequence loading — please wait"
for Player A while Player B kept playing on the new sequence. When B later
hit Cover All, A unlocked and B locked instead. Players ping-ponged between
locked/unlocked depending on who triggered Cover All last.

**Root cause:** `wabc.js`'s `wabc-ballpos` channel is configured with
`broadcast: { self: false }`, so a client never receives its own broadcast
messages back. `_requestNewWABCSequence()` (called from `_handleCoverAll`/
`_handleCoverAll75`) sets `BG.awaitingNewSeq = true`, then broadcasts the
new sequence — but the ONLY place that cleared `awaitingNewSeq` was the
`WABC.onNewCall` listener, which never fires for the sender's own message.
The triggering player stayed locked forever; only another player's
unrelated Cover All broadcast (which they DO receive) would incidentally
clear it.

**Fix:** `_requestNewWABCSequence()` now applies the new sequence to `BG`
locally immediately after the `upsert_ball_call` RPC succeeds (resets
`awaitingNewSeq`, `seqExhausted`, `ballPos`, `_coverAll75Fired`, re-renders
card/strip), instead of relying on the broadcast echo. The broadcast to
other players is unchanged — they still pick it up via `WABC.onNewCall`
as before.

**No SQL changes required.**

- Cache bust: spbm-v5129

---

### v5.128 — Fix: Ball Strip Pre-filled on Game Load

**Files changed:** `js/game.js`, `index.html`, `service-worker.js`

**Bug:** On game load, WABC.init callback called renderBallStrip(BG.callSeq, 40)
unconditionally — filling the strip with 40 balls before player ever spun.

**Fix:** renderBallStrip in WABC init callback now gated on GS.state==='active'.
During idle (pre-spin) clearBallStrip() is called instead — strip stays empty
until player presses Spin.

**No SQL changes required.**

- Cache bust: spbm-v5128

---

### v5.127 — Pattern Showcase Speed: 1600ms → 3500ms

**Files changed:** `js/game.js`, `index.html`, `service-worker.js`

Pattern showcase was cycling too fast. Reverted to 3500ms per pattern.

- Cache bust: spbm-v5127

---

### v5.126 — Fix: Ball Call Architecture Alignment (Server Drives 41-75 Only)

**Files changed:** `js/game.js`, `index.html`, `service-worker.js`

**Architecture correction:**
The server (wabc-ball-ticker) now only broadcasts ball positions 41-75.
Balls 1-40 are the bingo evaluation zone — handled instantly by doBingoSpin().
The server starts every new sequence at ball_pos=40 and counts to 74.

**game.js changes:**
- BG.ballPos init: 0 → 40 (server starts at 40)
- onBallCallUpdate: BG.ballPos = 0 → 40 (new sequence starts at 40)
- All onNewCall/onBallCallUpdate resets: 0 → 40 (5 locations)
- _onServerBallPos: guard updated to newPos<=40 (reject anything ≤40)
- _onServerBallPos: removed redundant second <=40 check and startActiveCaller
  (entTimer flag set correctly by _continueSpinAfterClaim)

**SQL changes (already run):**
- upsert_ball_call v1.1: ball_pos starts at 40 not 0
- advance_ball_call v1.2: only advances 41-74, resets at 74
- ball_call row reset: UPDATE ball_call SET ball_pos=40

**No additional SQL required for this version.**

- Cache bust: spbm-v5126

---

### v5.125 — Fix: Ball Strip Pre-filled Before Spin + Reconnect Noise

**Files changed:** `js/game.js`, `wabc.js`, `index.html`, `service-worker.js`

**Bug 1 — Ball strip showed balls 1-40 before player spun:**
`onBallCallUpdate` was calling `renderBallStrip(BG.callSeq, 40, ...)` regardless
of `GS.state`. On game load, WABC fires `_notifyNewCall` which triggered
`onBallCallUpdate` which filled the strip with 40 balls even before spin.
Fix: gated `renderBingoCard` and `renderBallStrip` on `GS.state==='active'`.
During idle, `clearBallStrip()` is called instead.

**Bug 2 — Reconnect was firing _notifyNewCall on every reconnect:**
The reconnect handler called `_notifyNewCall()` unconditionally, which
re-triggered `onBallCallUpdate` and re-rendered the strip every time WABC
reconnected (e.g. after DB restart, network blip). Now only fires if
`issued_at` actually changed — meaning a genuinely new sequence was issued
while disconnected.

**No SQL changes required.**

- Cache bust: spbm-v5125

---

### v5.124 — Fix: Ball Strip Frozen at 40 (issued_at Format Mismatch)

**Files changed:** `wabc.js`, `supabase/advance_ball_call.sql`, `index.html`, `service-worker.js`

**Root cause:** Every `pos` broadcast event from the Edge Function was being
silently dropped by the seq_issued_at guard in wabc.js. Postgres returns
timestamps as "2026-06-20 00:33:58+00" but the Supabase REST API returns
"2026-06-20T00:33:58+00:00". String comparison failed so all pos events
were rejected, BG.ballPos never advanced, ball strip frozen at 40 forever.

**Fixes:**
1. wabc.js: normalize both timestamps to first 19 chars before comparing
2. advance_ball_call.sql v1.1: cast issued_at to ISO 8601 via to_char()

**SQL ACTION REQUIRED:** Run updated supabase/advance_ball_call.sql in
Supabase SQL Editor.

- Cache bust: spbm-v5124

---

### v5.122 — Heartbeat, Contribution Fix, WABC Reconnect Guard

**Files changed:** `js/game.js`, `js/progressive.js`, `wabc.js`, `index.html`, `service-worker.js`

**Bug fixes:**

1. **Ball caller pausing between spins** — `advance_ball_call()` was returning
   `idle` because `player_registry.last_seen` was only updated on spin press
   (throttled to 30s). Added a 20-second heartbeat (`_startHeartbeat`) in
   `progressive.js` that calls `touch_player_last_seen` every 20 seconds
   independently of spin activity. Starts immediately after player registers.
   Stops on page unload. Ball caller now stays active as long as game is open.

2. **Progressive pot not growing** — `Progressive.contribute()` was removed
   in v5.115 alongside Force Jackpot but should never have been removed.
   `contribute()` is what feeds the pot percentage from every bet. Restored
   at spin time in `doSpin()`.

3. **DB restart allowed play with stale sequence** — when DB restarted, WABC
   reconnected but `BG.callSeq` kept the old sequence with no guarantee it
   matched the current DB state. Two fixes: (a) `doBingoSpin()` now blocks
   spin if `WABC.getSequence()` returns empty/invalid; (b) `wabc.js` now
   calls `_fetchInitial()` on every SUBSCRIBED event (reconnect) to re-sync
   the sequence and ball_pos from DB.

**Also:** Stale null-nickname sessions in `player_registry` — run this SQL to clean up:
```sql
DELETE FROM player_registry
WHERE nickname IS NULL
AND last_seen < now() - interval '2 hours';
```

- Cache bust: spbm-v5122

---

### v5.121 — Server-Driven Ball Caller (wabc-ball-ticker Edge Function)

**Files changed:** `js/game.js`, `index.html`, `service-worker.js`, `PHASE_PLAN.md`
**New files:** `supabase/advance_ball_call.sql`, `supabase/wabc_tick_loop.sql`,
              `supabase/functions/wabc-ball-ticker/index.ts`

**Architecture change — ball position is now server-driven:**

Previously each game client ran its own `_activeCallNext` timer independently,
meaning every player was on a different ball in the sequence. This is now fixed.

The wabc-ball-ticker Edge Function runs every 2 seconds (via pg_cron looping),
increments ball_pos in the DB, and broadcasts 'pos' events to ALL connected
game clients simultaneously via Supabase Realtime. All players see the same
ball at the same time.

**Ball caller pauses when no players are connected:**
advance_ball_call() checks player_registry.last_seen within 60 seconds before
doing anything. If no active players, returns 'idle' and no broadcast is sent.
Ball calling resumes automatically when the next player connects and their
last_seen is updated.

**Known limitation — 60-second stutter:**
pg_cron minimum interval is 1 minute. wabc_tick_loop() runs 30 iterations
of 2-second sleeps within each minute window. There is a brief gap
(~milliseconds) at the 60-second boundary between job runs.
If players notice this, the fix is to use cron-job.org to call the
wabc-ball-ticker Edge Function directly every 2 seconds (no pg_cron needed).
See deployment instructions below.

**game.js changes:**
- startActiveCaller()/stopActiveCaller() simplified to boolean flag only
  (BG.entTimer = true/false) — no longer set timers
- _activeCallNext() removed — server drives position
- WABC.onChange() wired to _onServerBallPos() which handles daubing,
  rendering, and Cover All 75 detection
- setPosProvider() and onSyncResponse() removed — server is position authority
- _requestNewWABCSequence() kept for Cover All events only

**Deployment (Supabase Dashboard — no CLI needed):**
See step-by-step instructions in the game zip at:
  supabase/DEPLOYMENT_INSTRUCTIONS.md

**Fallback plan (if 60s stutter is unacceptable):**
Use cron-job.org (free) to POST to your Edge Function URL every 2 seconds.
URL: https://{project}.supabase.co/functions/v1/wabc-ball-ticker
Header: Authorization: Bearer {anon_key}
Schedule: Every 2 seconds (cron-job.org supports this)
Then delete the pg_cron job: SELECT cron.unschedule('wabc-ball-ticker');

- Cache bust: spbm-v5121

---

### v5.120 — Cover All 75 Restored, Showcase + Ball Caller Speed Tuning

**Files changed:** `js/game.js`, `index.html`, `service-worker.js`, `PHASE_PLAN.md`

**Changes:**

1. **Cover All 75 restored** — All 25 cells covered within balls 41-75 now awards $0.01 penny + toast ('Cover All — 75 Balls!') + new sequence request. Identical behavior to Cover All 40. Guards: only fires if Cover All 40 did NOT already fire this sequence (`BG._coverAll75Fired` flag + `BG.awaitingNewSeq` check). `_coverAll75Fired` resets to false when new sequence arrives via `onNewCall` and `onBallCallUpdate`. Detection uses `Object.keys(BG.matchedCells).length===25` inside `_activeCallNext` — safe here (no prior-spin contamination in entertainment phase). `_broadcastCoverAll()` updated to accept a `msg` parameter so both Cover All 40 and 75 show distinct toast messages.

2. **Pattern showcase speed** — 2500ms → fixed 1600ms per pattern.

3. **Active ball caller speed** — randomized 3200–3500ms → fixed 1800ms per ball.

- Cache bust: spbm-v5120

---

### v5.119 — Dead Code Removal, Bug Fixes, Hot Dog Pattern, Schema Cleanup

**Files changed:** `js/game.js`, `js/progressive.js`, `js/paytable.js`, `js/config.js`, `broadcast-init.js`, `index.html`, `service-worker.js`, `PHASE_PLAN.md`

**Bug fixes:**
1. **Cover All false-positive** — `BG._coverAll1to40` set via `matchedCells.length===25` included entertainment balls from prior spin. Replaced with authoritative `wonPatterns` loop using `isCoverAll` flag. Multiple Cover All triggers eliminated.
2. **Ball sequence never restarted after Cover All** — Added `BG.awaitingNewSeq` flag. `_handleCoverAll` sets it, `WABC.onNewCall` and `Progressive.onBallCallUpdate` clear it. `doSpin` blocks with toast until cleared.
3. **Pattern showcase wipe on load** — `sizeLayout()` nulled `_cardNodes` then rebuilt 100ms later, wiping active showcase render. Corporal Stripes (idx 0) and Pyramid (idx 2) always blank. Fixed: removed `_cardNodes=null`, added `_showNextPattern()` re-render after rebuild during idle.
4. **`_claimForceWin` outer `.catch()` incomplete reset** — only reset `_forceClaimed`, leaving `_forceArmed` and `_forceCommandId` stuck. Fixed: all three force state vars reset.

**Dead code removed (game.js):** `genBallCall()`, `startSilentCaller()`, `stopSilentCaller()`, `_silentTimer`, `startEntertainmentBalls()`, `stopEntertainmentBalls()`, `checkPatterns()`, `enterDemo()`, `exitDemo()`, `checkDemoTrigger()`, `onForceLocal` handler, BALL CALLER LIFECYCLE comment block, `GS.state='demo'`, all 8 dual idle/demo guards, `Progressive.updateBallPos()` per-tick call, `DENOM` -> `PROG_DENOM` (6 locations).

**Dead code removed (progressive.js):** `getBallCall()`, `refreshBallCall()`, `_localBallShuffle()`, removed from public API.

**New pattern:** Hot Dog added — `spjpch:[0,7,4]`, cells `[6,7,8,10,11,12,13,14,16,17,18]`, balls 39, pay `[40,80,120]`.

**Other:** `stopPatternShowcase()` clears card on stop. 3 inline watchdog IIFEs -> `_clearSpinWatchdog()`. Duplicate `Progressive.onMessage` in `broadcast-init.js` removed. Eruda removed. `paytable.js` and `manifest.json` added to SW cache. `config.js` stale sections removed.

**PHASE_PLAN:** Section 6 Hot Dog added. Section 7 `spjpch` added. Section 8 updated (local caller removed, active guard, Cover All 75 removed).

- Cache bust: spbm-v5119

---

### v5.117 — Fix: Stealth/Idle Pattern Showcase Labels

1. **Lazy-T (isProgressive)** showed `★ WIDE AREA PROGRESSIVE ★ — Cover All in 25 Balls`
   - Wrong on two counts: Lazy-T is NOT a Cover All (only 9 specific cells, not all 25), and
     the ★ WIDE AREA PROGRESSIVE ★ label conflated it with Cover All rules.
   - Fixed: now shows `LAZY-T — In 25 Balls | PROGRESSIVE POT` matching the same
     name/balls/award format as all other patterns. Gold color (#ffd700) retained.

2. **Cover All 40 (reel:null)** fell through to the generic `$pay[0]/$pay[1]/$pay[2]` branch
   which would display `$0.01/$0.01/$0.01` — correct but unformatted.
   - Fixed: dedicated `!pat.reel` branch formats penny as `$0.01` via `.toFixed(2)`.

**Clarification confirmed:** The showcase is a pure visual demo loop cycling all
`BINGO_PATTERNS[]` entries with dummy cells — zero game outcome. Each pattern shows its
name, ball threshold, and award amount exactly as the player would win it. Lazy-T's award
is the Progressive Pot (not a dollar figure), Cover All 40 awards a penny.

File changed: `js/game.js` (`_showNextPattern` label block only)
- Cache bust: spbm-v5117

---

# PERMANENT GAME DESIGN RULES

**ALL future engineers MUST read before making ANY changes.**

# ============================================================
# STRAYPUPS BIG MUNNY — PERMANENT GAME DESIGN RULES
# ============================================================
# 
# ⚠️  MANDATORY: Every engineer and developer MUST read this
#     document before making ANY changes to the game code.
#     These rules are LAW. Breaking them breaks the game.
# ============================================================

## 1. GAME TYPE
Class II Bingo game. The slot reels are ENTERTAINMENT ONLY.
All wins are determined by bingo outcomes, not reel outcomes.
The bingo evaluation runs FIRST. The reel result is then FORCED
to match the winning bingo pattern's assigned symbol combination.
On a no-win spin, the reels show a non-win combination that does
NOT visually look like a win.

---

## 2. SYMBOL TABLE

| ID | Symbol            | Type    | File/Render           |
|----|-------------------|---------|-----------------------|
| 0  | Stray Pup (SP)    | WILD    | scott_full.png        |
| 1  | Seven (7)         | Normal  | SVG inline            |
| 2  | Triple Bar (3B)   | Normal  | SVG inline            |
| 3  | Double Bar (2B)   | Normal  | SVG inline            |
| 4  | Single Bar (1B)   | Normal  | SVG inline            |
| 5  | Cherry (CHR)      | Normal  | SVG inline            |
| 6  | Blank             | Non-win | Empty slot (dark tape)|
| 7  | Progressive JP    | WILD    | progressive_jackpot.png|

### Wild Symbol Rules (SP and Progressive JP):
- **1 Wild**: Doubles the winning combination pay
- **2 Wilds**: Pays 4× the winning combination
- **3 Wilds (SP+SP+SP)**: Jackpot — Corporal Stripes pattern
- SP and Progressive JP are INTERCHANGEABLE wilds
- Any mix of SP and JP counts (e.g. SP+JP+Seven qualifies as 2-wild Seven)
- 3× Progressive JP exclusively = Lazy-T Progressive Jackpot
- Wilds NEVER appear on the payline during a no-win spin

### Blank Symbol Rules:
- Blank appears ONLY in Cherry-based wins and non-win stops
- Blank NEVER appears with Bar or Seven winning combinations
- Example valid combos: Cherry+Blank+Blank (Open Diamond), Blank+Cherry+Bar (Open Diamond)
- Example invalid: Seven+Blank+Seven (impossible — Blanks never with Sevens)

---

## 3. CHERRY WIN HIERARCHY (ascending pay)

| Pattern       | Qualifying Payline Combo              | Wilds |
|---------------|---------------------------------------|-------|
| Open Diamond  | 1 Cherry + any non-wild (incl. Blank) | None  |
| EII           | 2 Cherries + any non-wild (incl. Blank)| None |
| Baby Buggy    | 3 Cherries                            | None  |
| Hopscotch     | 1 Wild + 1 Cherry + any              | 1     |
| Make Cents    | 1 Wild + 2 Cherries                  | 1     |
| Poodle Dog    | 2 Wilds + 1 Cherry                   | 2     |

---

## 4. BAR/SEVEN WIN HIERARCHY

Bars and Sevens NEVER have Blank positions. All 3 reels must show
a non-blank symbol for any Bar or Seven combination to pay.

### Seven Patterns (descending wild count):
| Pattern          | Combo                    | Pay Tier |
|------------------|--------------------------|----------|
| Corporal Stripes | 3× Wild (any combo)       | JACKPOT  |
| Cross Corners    | 2× Wild + Seven          | High     |
| Pyramid          | 1× Wild + 2× Seven       | High     |
| Double Cross     | 3× Seven                 | High     |

### Triple Bar Patterns:
| Pattern   | Combo                    | Pay Tier |
|-----------|--------------------------|----------|
| The Kite  | 2× Wild + Triple Bar     | High     |
| Arrowhead | 1× Wild + 2× Triple Bar  | High     |
| G Flat    | 3× Triple Bar            | Mid      |

### Double Bar Patterns:
| Pattern          | Combo                    | Pay Tier |
|------------------|--------------------------|----------|
| Four Leaf Clover | 2× Wild + Double Bar     | High     |
| Valentine        | 1× Wild + 2× Double Bar  | Mid      |
| Christmas Tree   | 3× Double Bar            | Mid      |

### Single Bar Patterns:
| Pattern         | Combo                   | Pay Tier |
|-----------------|-------------------------|----------|
| Private Stripes | 2× Wild + Single Bar    | Mid      |
|                 | OR 3× Single Bar        | Mid      |
| Tee             | 1× Wild + 2× Single Bar | Mid      |

### Mixed Bar Patterns:
| Pattern      | Combo                              | Pay Tier |
|--------------|------------------------------------|----------|
| Stepladder   | 1× Wild + Triple Bar + Double Bar  | Mid      |
| Small Diamond| Triple Bar + Double Bar + Single Bar| Low     |

---

## 5. RED SPIN RULES (PERMANENT — NEVER CHANGE WITHOUT OWNER CONFIRMATION)

> ⚠️  **OWNER-CONFIRMED PERMANENT DESIGN (v5.115):**
> All winning reel-bearing patterns sorted **ascending by pay** (lowest first, highest last).
> `basePat` (main reels) = lowest-paying reel-bearing pattern.
> `rsPatterns` (Red Spin) = remaining patterns, also lowest→highest.
> Both use the same ascending `pay[S.cpl-1]` sort applied to `_reelPats` in `doSpin`.
> **Never change sort direction, remove sort, or revert to ball-completion order
> without explicit written confirmation from the owner.**

**Red Spin triggers when the player wins 2 or more reel-bearing patterns on the same spin.**
Cover All 40 alone does NOT trigger Red Spin. Cover All 40 + other patterns DOES trigger Red Spin
(the other patterns play via Red Spin; Cover All is the event/trigger, not a Red Spin entry).

**v5.115 — Authoritative flow:**
1. All reel-bearing patterns sorted ascending by `pay[S.cpl-1]`
2. `basePat = winPatterns[0]` = lowest-paying reel-bearing pattern → drives main reel visual
3. Screen turns RED (if 2+ reel-bearing patterns)
4. Red Spin plays remaining reel-bearing patterns in ascending pay order:
   - Reels spin and land on that pattern's symbol combo
   - Bingo card highlights that pattern's cells
   - Win amount added to Bonus Total
5. Red Spin ends → ALL won patterns cycle in a loop until player presses Spin

**Single reel-bearing pattern** = no Red Spin. Main reels show combo, win displays, game unlocks.
**Cover All 40 only** = no Red Spin. Reels land on non-winning combo. $0.01 credited.
  "GAME END — Cover All Achieved" broadcast to all connected players via `broadcast_messages`.
  New WABC ball sequence issued to all players.
**Cover All 40 + other patterns** = Cover All event fires (penny + broadcast + new sequence).
  Main reels show lowest reel-bearing pattern. Red Spin plays remaining patterns ascending.
  Cover All 40 does NOT appear as a Red Spin entry.
**Progressive (Lazy-T) win** = main reels show 3× Progressive JP, straight to jackpot celebration.

---

## 6. BINGO PATTERN DEFINITIONS

Cell index map (5×5 grid, row-major, 0=top-left):
```
  B   I   N   G   O
  0   1   2   3   4   ← row 1
  5   6   7   8   9   ← row 2
 10  11  12  13  14   ← row 3  (12 = FREE SPACE, always daubed)
 15  16  17  18  19   ← row 4
 20  21  22  23  24   ← row 5
```

| Pattern           | Balls | Pay (1/2/3)      | Reel Key | Cells                                     |
|-------------------|-------|------------------|----------|-------------------------------------------|
| Corporal Stripes  | 27    | 800/1600/2500    | jp       | 2,6,7,8,10,11,12,13,14,15,19             |
| Cross Corners     | 29    | 320/640/960      | 7w4      | 0,4,7,11,12,13,17,20,24                  |
| Pyramid           | 29    | 160/320/480      | 7w2      | 12,16,17,18,20,21,22,23,24               |
| The Kite          | 35    | 160/320/480      | 3bw4     | 0,1,2,5,6,7,10,11,12,18,24               |
| Double Cross      | 28    | 80/160/240       | 7        | 2,6,7,8,12,16,17,18,22                   |
| Arrowhead         | 30    | 80/160/240       | 3bw2     | 2,6,7,8,10,12,14,17,22                   |
| G Flat            | 36    | 40/80/120        | 3b       | 2,3,4,7,12,15,16,17,20,21,22             |
| Make Cents        | 29    | 40/80/120        | spchch   | 2,6,7,8,11,12,16,17,18,22                |
| Four Leaf Clover  | 34    | 100/200/300      | 2bw4     | 1,5,6,7,11,12,13,17,18,19,23             |
| Valentine         | 37    | 50/100/150       | 2bw2     | 4,6,8,10,12,14,16,18,20,22               |
| Tee               | 38    | 20/40/60         | 1bw2     | 0,1,2,3,4,7,12,17,22                     |
| Poodle Dog        | 35    | 20/40/60         | spspch   | 0,1,6,11,12,13,14,16,18,21,23            |
| Christmas Tree    | 38    | 25/50/75         | 2b       | 2,6,7,8,10,11,12,13,14,17,22             |
| Private Stripes   | 30    | 12/24/36         | 1b       | 2,6,8,10,12,14                           |
| Stepladder        | 36    | 10/20/30         | spmb     | 4,7,8,12,15,16,20                        |
| Hopscotch         | 38    | 10/20/30         | spch     | 1,3,7,11,12,13,17,21,23                  |
| Baby Buggy        | 35    | 10/20/30         | ch3      | 3,4,8,10,11,12,13,15,16,17,18,21,23      |
| Small Diamond     | 38    | 5/10/15          | mb       | 7,11,12,13,17                            |
| EII               | 38    | 4/8/12           | ch2      | 0,5,10,15,20,21,22,23,24                 |
| Open Diamond      | 38    | 2/4/6            | ch1      | 2,10,12,14,22                            |
| Hot Dog           | 39    | 40/80/120        | spjpch   | 6,7,8,10,11,12,13,14,16,17,18            |
| Lazy-T            | 25    | Progressive Pot  | coverall | 4,9,10,11,12,13,14,19,24                 |
| Cover All 40      | 40    | $0.01 (penny)    | null     | All 25 cells — trigger/event only, not Red Spin entry |

**Notes:**
- Cell 12 (free space) is always daubed. It's included in pattern cells for
  visual correctness but is SKIPPED in win evaluation (never blocks a win).
- Lazy-T = O column (4,9,14,19,24) + middle row (10,11,12,13,14) = 9 unique cells
- Cover All 40: penny + DB sequence reset signal. NO reel association.
- Cover All 75: natural end. Nothing happens. Ball caller runs to 75.

---

## 7. REEL KEY DEFINITIONS (REEL_SYMS)

The reel key is the QUALIFYING minimum combination. The actual reel
strip shuffles equivalent combinations each spin for variety.

| Key      | Symbols [R1,R2,R3] | Description              |
|----------|--------------------|--------------------------|
| jp       | [0,0,0]            | SP + SP + SP (Jackpot)   |
| 7w4      | [0,0,1]            | SP + SP + Seven          |
| 7w2      | [0,1,1]            | SP + Seven + Seven       |
| 7        | [1,1,1]            | Seven + Seven + Seven    |
| 3bw4     | [0,0,2]            | SP + SP + Triple Bar     |
| 3bw2     | [0,2,2]            | SP + Triple + Triple     |
| 3b       | [2,2,2]            | Triple + Triple + Triple |
| 2bw4     | [0,0,3]            | SP + SP + Double Bar     |
| 2bw2     | [0,3,3]            | SP + Double + Double     |
| 2b       | [3,3,3]            | Double + Double + Double |
| 1bw4     | [0,0,4]            | SP + SP + Single Bar     |
| 1bw2     | [0,4,4]            | SP + Single + Single     |
| 1b       | [4,4,4]            | Single + Single + Single |
| mb       | [2,3,4]            | Triple + Double + Single |
| spmb     | [0,2,3]            | SP + Triple + Double     |
| spch     | [0,5,4]            | SP + Cherry + Single     |
| ch3      | [5,5,5]            | Cherry + Cherry + Cherry |
| ch2      | [5,5,4]            | Cherry + Cherry + Single |
| ch1      | [5,4,3]            | Cherry + Single + Double |
| spspch   | [0,0,5]            | SP + SP + Cherry         |
| spchch   | [0,5,5]            | SP + Cherry + Cherry     |
| coverall | [7,7,7]            | JP + JP + JP (Lazy-T)    |
| spjpch   | [0,7,4]            | SP + JP + Single Bar (Hot Dog) |
| none     | [4,2,3]            | No-win (1B+3B+2B)        |

---

## 8. BALL CALLER RULES

- **WABC (Wide Area Ball Caller)**: Sole source of ball sequences. Shared across all games.
  All players see the same 75-ball sequence simultaneously.
  Local ball caller fallback has been permanently removed (v5.118).
- **ballPos 0-39**: Pre-called zone. Evaluated for bingo patterns on spin.
- **ballPos 40-75**: Entertainment zone. Balls called every 3.2-3.5s.
  No bingo evaluation — display only.
- **Cover All 40**: All 25 cells covered within balls 1-40 → penny + new sequence.
- **Ball 75**: Sequence exhausted naturally. WABC Master generates next sequence.

### Ghost Card Prevention:
- During idle state, NEVER render actual ball-matched cells on the bingo card.
- The showcase pattern highlight owns the card display during idle.
- `GS.state === 'active'` guard MUST wrap all
  `renderBingoCard(BG.card, BG.matchedCells, null)` calls in:
  - `_activeCallNext()`
  - `onBallCallUpdate()` handler
  - Any other handler that fires during idle

---

## 9. PROGRESSIVE JACKPOT RULES

- Pattern: **Lazy-T** (O column + middle row, 9 cells, ≤24 called balls)
- Class II compliant: bingo-determined, not RNG-determined
- Reel: 3× Progressive JP symbol (progressive_jackpot.png)
- When Lazy-T wins: main reels show coverall (7-7-7), straight to jackpot
- Sub-patterns that co-win are paid silently — no separate reel stops
- Must-hit-by ceiling: server-side threshold in `progressive` table
- `progressive_commands` force_jackpot mechanism: REMOVED (v5.99+)
- `_armRandomTrigger`: REMOVED (v5.99+)
- `_checkArmedCommand`: REMOVED (v5.99+)
- `_subscribeCommands`: REMOVED (v5.99+)

---

## 10. CODE RULES (ENFORCED)

1. **Cache bust every build**: Update title, splash-ver, ALL ?v= query strings,
   and service-worker.js CACHE string. All must match. Verify with grep.
2. **node --check before packaging**: Run syntax check on ALL modified JS files.
3. **Folder names in zips**: v1/ for $1 game, v5d/ for $5 game, maxine/ for Maxine.
4. **Multi-repo awareness**: Check if fixes apply across all 3 games.
5. **PHASE_PLAN.md**: Read and update before AND after every build.
6. **Clarify before building**: Explain changes, wait for explicit confirmation.
7. **No custom_card**: Feature permanently removed. Never re-add.
8. **No force_jackpot commands**: Operator force jackpot permanently removed.
9. **No _armRandomTrigger**: Client-side random trigger permanently removed.
10. **Red Spin design is FINAL**: Never change the Red Spin flow defined in Section 5.

---

## 11. TOOLS (in /assets/ folder of each game repo)

- `bingo_pattern_mapper.html` (v5): Original pattern mapper
- `bingo_pattern_mapper_v6.html` (v6): Updated with Progressive JP symbol,
  visual reel icons, Cherry/Bar/Seven hierarchy. Use v6 for all future mapping.
- `bingo_pattern_mapper.html` in root: Same as assets version.

**These tools are REFERENCE DOCUMENTS. Any pattern or reel assignment
changes MUST be validated in the mapper tool first, output shared for
approval, then applied to config.js. Never change reel assignments
or pattern cells without going through this process.**


---

## ✅ CONFIRMED STABLE BASELINE — v5.130

**Confirmed working as of this audit session (June 2026):**

| Item | Status |
|------|--------|
| WABC from Supabase — live ball sequence shared across all players | ✅ Confirmed |
| Balls 41-75 animate correctly after Cover All (v5.130 fix) | ✅ Confirmed |
| Cover All lockup resolved — self-broadcast echo never freezes triggering player | ✅ Confirmed |
| Ball strip empty on game load — only fills after first Spin | ✅ Confirmed |
| `node --check` clean on all JS files | ✅ Confirmed |
| All version strings consistent: CACHE, title, splash-ver, ?v= query strings | ✅ Confirmed |
| Service worker cache correct — no missing files that break atomic install | ✅ Confirmed |
| ES5 throughout — no arrow functions, const, let, backticks, async/await | ✅ Confirmed |
| `contribute()` restored (v5.122) — pot grows on every spin | ✅ Confirmed |
| Heartbeat active — ball caller stays live while game is open | ✅ Confirmed |
| Red Spin ascending-pay sort — lowest→highest (v5.114, owner-confirmed permanent) | ✅ Confirmed |
| `broadcast-init.js` v1.4 — no dead channels, no no-op subscriptions | ✅ Confirmed |

**SQL Schema confirmed (Supabase `gdmmoeggkqsvqnqyrubx.supabase.co`):**
Tables: `progressive`, `progressive_hits`, `progressive_commands`, `broadcast_messages`, `ball_call`, `player_registry`, `game_history`
RPCs: `progressive_contribute`, `progressive_hit`, `register_player`, `touch_player_last_seen`, `upsert_ball_call`

---

## VERSION GAP NOTE — v5.118 and v5.123

v5.118 is referenced in v5.119 ("local caller fallback permanently removed") but has no phase plan entry.
v5.123 is referenced as the version that resolved all outstanding issues after an out-of-process engineer made undocumented changes between v5.107–v5.111.
Both gaps are attributed to an engineer not following phase plan rules.
**Rule reinforced: NO build ships without a complete phase plan entry. This is non-negotiable.**

---

## DEFERRED ITEM — wabc.js sync handshake code

`wabc.js` still contains `setPosProvider()`, `onSyncResponse()`, and `sync_request`/`sync_response` broadcast handlers (lines ~183-211, 291-310). These were used by the old client-driven ball-caller sync architecture (pre-v5.121). Since v5.121 the server drives ball position exclusively.

**Reason not removed yet:** These methods may be consumed by an operator tool (WABC Master or Floor Manager) that uses `wabc.js` as a shared module. Must audit all operator tool repos before removing.

**Action:** When next updating operator tools, grep all tool repos for `setPosProvider` / `onSyncResponse` / `sync_request` / `sync_response`. If zero references found, remove from `wabc.js` in the same build.

---

## DEFERRED ITEM — `scott_full.png` missing from SW FILES cache

`assets/scott_full.png` (the SP Wild mascot, 103KB) is present on disk and referenced in `index.html` and `paytable.js` but is **not listed in the service worker FILES cache**. This means it will not load for offline players.

**Action:** Add `'./assets/scott_full.png'` to the FILES array in `service-worker.js`. Include in next cache-busting build.

---

## ARCHITECTURE FINDING — Progressive Jackpot Trigger Flow (WRONG — must fix in v6.0)

**Confirmed gap between intended design and live code:**

### Intended Design (Real Class II Progressive Controller)
1. Pot grows each spin via `progressive_contribute` RPC
2. When `value >= ceiling`, the **DB/controller arms the jackpot** by inserting a `progressive_commands` row
3. All game clients silently receive the armed command via Realtime and set internal armed state
4. Jackpot sits armed — waiting for a natural Lazy-T bingo outcome
5. When Lazy-T occurs (armed or not), the game reports the win to the DB/controller
6. If armed: full pot paid, pot resets to seed
7. If NOT armed (Lazy-T hit below ceiling): pot value still paid, pot resets — DB/controller notified

### Current Live Code (Wrong)
- `_subscribeCommands` — **REMOVED** (no listener for DB-armed commands)
- `_checkArmedCommand` — **REMOVED** (no startup check for pre-existing armed command)
- `armAndClaim()` — **game inserts its own `progressive_commands` row** and immediately claims it in the same call
- Result: game is simultaneously acting as both the controller AND the player client — bypasses the real controller pattern entirely
- `mustHit()` correctly detects `value >= ceiling` but **nobody calls it** — it is completely unused
- `trigger_odds` column exists in DB and is fetched/tracked but `_armRandomTrigger` was removed — column is dead

**This will be fully redesigned in v6.0. See build plan below.**

---

## v6.0 — Progressive Controller Redesign + Housekeeping

### Version: 6.0
### Cache bust: `spbm-v600`
### Applies to: ALL THREE GAMES simultaneously ($1, $5, Maxine)

---

### WHAT THIS BUILD FIXES

#### Primary: Progressive Jackpot — Correct Class II Controller Architecture

The jackpot trigger is moved out of the game client and into the DB/controller where it belongs. The game client becomes a pure receiver-and-reporter.

#### Secondary: Housekeeping

- `force_jackpot` command string → `lazy_t_claim` throughout
- Stale `'Force Jackpot'` fallback label → `'Lazy-T'`
- `contribute()` stale comment rewritten
- `armAndClaim()` comment rewritten (no longer self-inserts)
- `scott_full.png` added to SW cache
- All version strings bumped to `6.0`

---

### DETAILED BUILD PLAN

---

#### PART 1 — DB CHANGES (run in Supabase SQL Editor BEFORE deploying game code)

##### 1A — New Postgres trigger: `progressive_arm_on_ceiling`

This is the "controller." The moment `progressive.value` crosses `progressive.ceiling`, the DB automatically arms the jackpot — no client, no cron, no Edge Function involved.

```sql
-- 1. Function: inserts armed command if none already armed
CREATE OR REPLACE FUNCTION public.progressive_arm_jackpot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only fire when value crosses ceiling (was below, now at or above)
  IF NEW.value >= NEW.ceiling AND OLD.value < NEW.ceiling THEN
    -- Guard: don't insert if one is already armed (prevents duplicates on rapid contributions)
    IF NOT EXISTS (
      SELECT 1 FROM progressive_commands
      WHERE command = 'lazy_t_claim' AND status = 'armed'
    ) THEN
      INSERT INTO progressive_commands (command, status, created_by)
      VALUES ('lazy_t_claim', 'armed', 'progressive_controller');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION public.progressive_arm_jackpot() TO anon, authenticated;

-- 2. Trigger on progressive table UPDATE
DROP TRIGGER IF EXISTS progressive_arm_on_ceiling ON public.progressive;
CREATE TRIGGER progressive_arm_on_ceiling
  AFTER UPDATE OF value ON public.progressive
  FOR EACH ROW EXECUTE FUNCTION public.progressive_arm_jackpot();
```

##### 1B — Rename existing `force_jackpot` command values in DB

```sql
-- Clean up any historical rows with old command name
UPDATE progressive_commands
SET command = 'lazy_t_claim'
WHERE command = 'force_jackpot';
```

##### 1C — Verify `progressive_contribute` RPC still exists and works
No change needed — this RPC already updates `progressive.value` via UPDATE, which will now fire the new trigger automatically.

---

#### PART 2 — `js/progressive.js` CHANGES

##### 2A — Restore `_subscribeCommands()`

Re-add a Realtime listener on `progressive_commands` INSERT events. When a new `lazy_t_claim / armed` row appears, the game client sets its internal armed state.

```javascript
function _subscribeCommands() {
  _client.channel('prog-commands')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'progressive_commands',
      filter: "command=eq.lazy_t_claim"
    }, function(p) {
      if (!p.new) return;
      if (p.new.status !== 'armed') return;
      // Another client may have already claimed it — only arm if not already claimed
      if (_forceClaimed) return;
      _forceCommandId = p.new.id;
      _forceArmed     = true;
      _forceClaimed   = false;
      console.log('[Progressive] Jackpot armed by controller — command id:', _forceCommandId);
      _notifyArmed(true);  // NEW: notify game UI that jackpot is armed
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'progressive_commands',
      filter: "command=eq.lazy_t_claim"
    }, function(p) {
      if (!p.new) return;
      // If the row we're holding was won or cancelled by someone else — clear state
      if ((p.new.status === 'won' || p.new.status === 'cancelled') &&
          _forceCommandId === p.new.id) {
        if (!_forceClaimed) {  // we didn't win it
          _forceArmed     = false;
          _forceCommandId = null;
          _notifyArmed(false);
        }
      }
    })
    .subscribe();
}
```

##### 2B — Restore `_checkArmedCommand()` (startup check)

On init, after `_fetchRow`, check if a `lazy_t_claim / armed` row already exists (controller armed it before this player connected).

```javascript
function _checkArmedCommand() {
  if (!_client) return;
  _client.from('progressive_commands')
    .select('*')
    .eq('command', 'lazy_t_claim')
    .eq('status', 'armed')
    .limit(1)
    .then(function(res) {
      if (res.error || !res.data || !res.data.length) return;
      _forceCommandId = res.data[0].id;
      _forceArmed     = true;
      _forceClaimed   = false;
      console.log('[Progressive] Jackpot already armed on connect — command id:', _forceCommandId);
      _notifyArmed(true);
    });
}
```

##### 2C — Rewrite `armAndClaim()` — no longer self-inserts

`armAndClaim()` is now called by the game when Lazy-T is detected. It no longer inserts its own command row. Two cases:

- **Armed (controller pre-armed):** claim the existing row via `_claimForceWin()`
- **Not armed (Lazy-T hit below ceiling):** report directly — insert a `lazy_t_claim / won` row immediately (no armed intermediate state needed), pay the pot, reset

```javascript
function armAndClaim(winPatterns, onResult) {
  // ... local/offline fallback unchanged ...

  if (_forceArmed && _forceCommandId && !_forceClaimed) {
    // Controller had armed the jackpot — claim that pre-armed row
    _claimForceWin(function(didWin, claimedAmt) {
      _notifyArmed(false);
      if (onResult) onResult(didWin, didWin ? claimedAmt : parseFloat(_seed.toFixed(2)));
    }, winPatterns);
    return;
  }

  // Lazy-T hit but jackpot was NOT armed by controller (pot below ceiling)
  // Report the natural hit directly — pot still pays current value
  var hitAmt = parseFloat(_localValue.toFixed(2));
  _client.from('progressive_commands').insert({
    command:     'lazy_t_claim',
    status:      'won',          // goes straight to won — no armed intermediate
    winner_game: PROG_GAME_ID,
    winner_amt:  hitAmt,
    winner_session: _sessionKey,
    winner_label: _playerNickname || _playerLabel || _sessionKey,
    won_at:      new Date().toISOString(),
    created_by:  'natural_hit_below_ceiling'
  }).select().then(function(res) {
    if (res.error) {
      console.warn('[Progressive] natural hit insert error:', res.error.message);
    }
    // Pay regardless of insert success — player won fair and square
    _client.rpc('progressive_hit', { reset_to: _seed }).then(function(rpcRes) {
      if (rpcRes && rpcRes.error) {
        console.warn('[Progressive] progressive_hit RPC FAILED:', rpcRes.error.message);
      }
      _localValue = _seed; _notifyValue();
      _forceArmed = false; _forceCommandId = null;
      if (onResult) onResult(true, hitAmt);
    }).catch(function() {
      _localValue = _seed; _notifyValue();
      if (onResult) onResult(true, hitAmt);
    });
  }).catch(function(err) {
    console.warn('[Progressive] natural hit catch:', err);
    _localValue = _seed; _notifyValue();
    if (onResult) onResult(true, hitAmt);
  });
}
```

##### 2D — Add `_notifyArmed()` + `onArmed()` public API

Lets the game UI react to jackpot armed state (e.g. future "jackpot is hot" indicator).

```javascript
var _armedListeners = [];
function _notifyArmed(isArmed) {
  _armedListeners.forEach(function(fn) { try { fn(isArmed); } catch(e){} });
}
function onArmed(fn) { _armedListeners.push(fn); }
// Add onArmed to public API exports
```

##### 2E — Fix stale strings and comments

- `_claimForceWin` fallback label: `'Force Jackpot'` → `'Lazy-T'` (both occurrences, lines 540-541)
- `contribute()` comment lines 699-700: rewrite to "contribute() grows the pot. When value crosses ceiling, the DB trigger arms a lazy_t_claim command. This function no longer triggers the jackpot directly."
- `armAndClaim()` comment block: rewrite to describe new "receive armed command, claim it OR report natural hit below ceiling" design
- `_claimForceWin` section header comment: remove "FORCE WIN CLAIM" → "JACKPOT CLAIM"
- Any remaining "Force Jackpot" string → "Lazy-T"

##### 2F — Wire `_subscribeCommands` + `_checkArmedCommand` into `init()`

```javascript
// Inside init(), after _fetchRow callback, alongside _subscribeValue():
_subscribeCommands();
_checkArmedCommand();
```

---

#### PART 3 — `js/game.js` CHANGES

##### 3A — Remove the stale `_progPat._forceAmt` path in `_continueSpinAfterClaim`

The comment on line 1385 says `"Force win — amount confirmed by DB claim"` with a `_progPat._forceAmt` reference. This was the old operator-forced jackpot path. Since `armAndClaim()` now handles both armed and unarmed cases with a unified callback, the game's Lazy-T win path simplifies to a single call regardless:

```javascript
// BEFORE (two paths):
if (_progPat._forceAmt) {
  _finishProgressiveSpin(_progPat._forceAmt + _allPatsBonus, ...);
} else {
  Progressive.armAndClaim(winPatterns, function(didWin, _progAmt) {
    _finishProgressiveSpin(_progAmt + _allPatsBonus, ...);
  });
}

// AFTER (one path — armAndClaim handles both armed and unarmed):
Progressive.armAndClaim(winPatterns, function(didWin, _progAmt) {
  _finishProgressiveSpin(_progAmt + _allPatsBonus, winPatterns,
                          basePat, _spinCardSerial, _spinBalBefore);
});
```

##### 3B — Clean stale comments referencing Force Jackpot path in game.js
Lines 572-573, 1435-1436, 1437, 1472 — rewrite to reflect current design.

---

#### PART 4 — `service-worker.js` CHANGES

- Add `'./assets/scott_full.png'` to FILES array
- Bump CACHE to `'spbm-v600'`

---

#### PART 5 — VERSION BUMP (ALL FILES)

| File | Change |
|------|--------|
| `service-worker.js` | `CACHE = 'spbm-v600'` |
| `index.html` | `<title>StrayPups Big Munny v6.0</title>` |
| `index.html` | `#splash-ver` → `v6.0` |
| `index.html` | All `?v=` query strings → `?v=6.0` |
| `manifest.json` | `?v=6.0` if present |

---

#### PART 6 — APPLY TO $5 GAME AND MAXINE

All changes in Parts 1-5 apply identically to:
- `straypups_big_munny_5d` (`v5d/`) — PROG_GAME_ID `'straypups_5d'`, DENOM `5.00`
- `maxine/` — PROG_GAME_ID `'maxine'`, DENOM `2.00`

The DB changes (Part 1) are shared — the `progressive` table, trigger, and `progressive_commands` table are wide-area, one set of SQL runs once.

Game-specific differences to verify per repo:
- PROG_GAME_ID and PROG_DENOM in `index.html` inline script
- Cache bust string: `spbm-v600` ($1/$5), `maxine-v600` (Maxine)
- Title/splash-ver per game name

---

#### PART 7 — VERIFICATION CHECKLIST (post-deploy)

- [ ] Postgres trigger exists: `SELECT tgname FROM pg_trigger WHERE tgname='progressive_arm_on_ceiling';`
- [ ] Manually update `progressive.value` to exceed `progressive.ceiling` in SQL Editor — confirm a `lazy_t_claim / armed` row appears in `progressive_commands`
- [ ] Open game, open F12 console — confirm `[Progressive] Jackpot already armed on connect` log if a pre-armed row exists
- [ ] With jackpot armed: trigger a Lazy-T spin — confirm `progressive_commands` row updates to `status='won'`, `progressive_hits` row inserted, pot resets to seed in UI
- [ ] Without jackpot armed: trigger a Lazy-T spin — confirm `progressive_commands` row inserted directly as `status='won'` with `created_by='natural_hit_below_ceiling'`, pot pays and resets
- [ ] Confirm `scott_full.png` loads offline (kill network, reload, check SP Wild symbol renders)
- [ ] `node --check` clean on all modified JS files
- [ ] All three games verified simultaneously

---

### BUILD RULES REMINDER FOR v6.0

1. Read this plan fully before writing a single line of code
2. Run `node --check` on every modified JS file before packaging
3. Run the SQL (Part 1) in Supabase BEFORE deploying game code
4. Verify trigger fired correctly in Supabase before testing games
5. Package all three games in one zip delivery
6. Update this phase plan after delivery with confirmed results


---

## v6.1 — Two Reel Symbol Bugs Fixed

### Bug #1 — WABC race condition: phantom reel spin on cancelled first spin

**Root cause:** `doBingoSpin()` returned `[]` (empty array) when WABC was unavailable.
The bail-out path inside `doBingoSpin` correctly refunded the bet and re-enabled
controls (`S.spinning=false; S.bal+=S.cpl; setCtrl(true)`). However, `doSpin()`
called `_continueSpinAfterClaim()` unconditionally after `doBingoSpin()` returned —
with no way to distinguish "bail out" from "no bingo win". The continuation then ran
the no-win path (`genSpinResult()` → `animateReels()`), firing a phantom reel
animation on a cancelled, already-refunded spin. Controls were also re-enabled a
second time by `animateReels`' callback. On the very next spin (with WABC now
connected), the game behaved correctly — making spin #1 feel broken and spin #2 feel
like the "real" first spin.

**Fix:**
- `doBingoSpin()` bail-out returns `null` instead of `[]`
- `doSpin()` checks `if(winPatterns===null) return;` before calling `_continueSpinAfterClaim()`
- `[]` (empty array) remains the correct return for "no bingo win" — no other callers affected

**Files changed:** `js/game.js`

---

### Bug #2 — `REEL_SYMS['none']` = `[4,2,3]` (three bars) — showed win-looking reels on Cover All 40

**Root cause:** `REEL_SYMS['none']` was `[4,2,3]` (1Bar + 3Bar + 2Bar). This key is
used in `_continueSpinAfterClaim()` when `_reelPats` (reel-bearing patterns) is empty
but `winPatterns` is not — the only real case being Cover All 40 (which has `reel:null`
and is excluded from `_reelPats`). `forcedSpinResult([4,2,3])` shuffles three bars in
any order — all permutations pass `evalSpin`'s mixed-bar check (`isBar(L[0]) &&
isBar(L[1]) && isBar(L[2])`) → `{amt:1}` (win-looking). Forced spin results bypass the
`evalSpin` rejection loop (only no-win spins run that filter), so the reels always
showed 3 bars for a $0.01 Cover All event — visually indistinguishable from a
Small Diamond or mixed-bar pattern win.

**Fix:** Changed `REEL_SYMS['none']` from `[4,2,3]` to `[6,4,6]` (BLK / 1Bar / BLK).
A blank on the payline causes `evalSpin` to return `{amt:0}` — non-win-looking, which
is the correct visual for a $0.01 sequence-reset event. The cover-all penny credit and
new sequence logic are unaffected.

**Files changed:** `js/paytable.js`

---

### Statistical analysis note (not a bug — documented for record)

200,000-spin Monte Carlo simulation confirmed overall RTP at ~106% (bet $1 level).
This is known and intentional for the current phase. No pay table or `balls` values
were changed in this delivery. A full Monte Carlo recalibration pass is deferred to
a future phase per owner direction.

---

### Version bump
| File | Change |
|------|--------|
| `service-worker.js` | `CACHE = 'spbm-v610'` |
| `index.html` | title, splash-ver, all `?v=` → `v6.1` |

### Verification checklist
- [ ] On first load: dismiss splash early (within 1s) → Spin → confirm NO phantom reel animation fires, toast "Ball call unavailable" shows, balance unchanged
- [ ] After WABC connects: Spin → confirm normal reel animation and bingo result
- [ ] Induce Cover All 40 (dev: set card to match first 40 balls) → confirm reels show blank/bar/blank, NOT 3 bars; penny credited; toast fires
- [ ] No-win spin → confirm evalSpin still rejects win-looking combos (cherry, wild, 3oak, mixed-bar) — not broken by paytable change
- [ ] `node --check js/game.js js/paytable.js` — clean

---

## v6.4 — Messaging system migration + broadcast_messages removal

### Changes
- `js/paytable.js`: `REEL_SYMS['coverall']` renamed to `'lazyt'`; Lazy-T pattern `reel:'coverall'` → `reel:'lazyt'`; comment corrected to "25 balls drawn (24 called + free space)"
- `js/game.js`: `REEL_SYMS['coverall']` → `REEL_SYMS['lazyt']`; Red Spin comment updated
- `js/progressive.js`: Removed `broadcast_messages` subscription system (`_messageListeners`, `_lastSeenMessageId`, `_SEEN_KEY`, `_loadLastSeen`, `_saveLastSeen`, `_notifyMessage`, `_subscribeMessages`, `_checkUnreadMessages`, `onMessage`). Added operator inbox system: `_subscribeOpMessages()`, `_loadOpMessages()`, `onOpMessage()` reading from `public.messages`
- `index.html`: Added `op-msg-subject` element to banner HTML; `showNextMessage()` renders subject + icon + body; `Progressive.onMessage` wire replaced by `Progressive.onOpMessage`; all `?v=` → `6.4`

### Version bump
| File | Change |
|------|--------|
| `service-worker.js` | `CACHE = 'spbm-v640'` |
| `index.html` | title, splash-ver, all `?v=` → `6.4` |

---

## 6.5 — Trigger 2: Server-side progressive threshold + guaranteed Lazy-T card

### Changes
- `js/progressive.js`: Added `isForceArmed()` accessor exposing internal `_forceArmed && !!_forceCommandId && !_forceClaimed` state to game.js
- `js/game.js`: Added `_genGuaranteedLazyTCard(callSeq)` function — generates a valid bingo card guaranteed to hit Lazy-T within first 24 called balls by assigning Lazy-T cell values from balls already in the server WABC sequence. Falls back to normal `genBingoCard()` if insufficient matching balls. Added Trigger 2 check at top of `doBingoSpin()` after `genBingoCard()` — if `Progressive.isForceArmed()` true, replaces card with guaranteed card. Card serial prefixed `CARD-T2-` for audit trail.

### DB changes (trigger2_migration.sql — run separately)
- `progressive.must_hit_by` column added — random threshold between seed and ceiling
- `progressive_random_threshold()` helper RPC
- `fn_progressive_threshold_check()` trigger function — fires on every UPDATE of progressive.value, arms jackpot when value >= must_hit_by, picks new threshold
- `trg_progressive_threshold` trigger on progressive table
- `progressive_contribute()` RPC updated
- `progressive_hit()` RPC — resets pot, picks new threshold
- Current stuck pot at $26,800 unstuck: must_hit_by set to seed — fires on first spin after deploy

### Version bump
| File | Change |
|------|--------|
| `service-worker.js` | `CACHE = 'spbm-v650'` |
| `index.html` | title, splash-ver, all `?v=` → `6.5` |

---

## 6.6 — CRITICAL FIX: _checkArmedCommand on connect

**Root cause:** Game `progressive.js` never polled `progressive_commands` for
existing armed rows on connect. `_forceArmed` only set via realtime INSERT
event. Players who connected after Trigger 2 armed the command missed the
event entirely — `isForceArmed()` always returned false, guaranteed Lazy-T
card never generated, jackpot stuck indefinitely.

**Fix:** Added `_checkArmedCommand()` — polls `progressive_commands` for any
`force_jackpot/armed` row on connect and sets `_forceArmed/_forceCommandId`
immediately. Also re-checks every 30 seconds via `setInterval` to catch any
commands armed while the player is mid-session.

**Files changed:** `js/progressive.js`

### Version bump
| File | Change |
|------|--------|
| `service-worker.js` | `CACHE = 'spbm-v660'` |
| `index.html` | title, splash-ver, all `?v=` → `6.6` |

---

## 6.7 — Race condition fix + operator UI redesign

### Changes
- `js/progressive.js`: Added `tryAtomicClaim(onResult)` — atomically pre-claims armed `progressive_commands` row before guaranteed Lazy-T card is generated. Only one client can succeed; all others fall back to normal card. Prevents multiple simultaneous guaranteed Lazy-T wins.
- `js/game.js`: Trigger 2 check now calls `Progressive.tryAtomicClaim()` async before card generation. Added `_continueDoBingoSpin(prevBallPos)` to support the async path — extracts post-card evaluation logic so the spin can resume after the DB round-trip.

### Version bump
| File | Change |
|------|--------|
| `service-worker.js` | `CACHE = 'spbm-v670'` |
| `index.html` | title, splash-ver, all `?v=` → `6.7` |

---

## v6.4 — coverall → lazyt rename + Lazy-T comment fix
- `js/paytable.js`: `REEL_SYMS['coverall']` → `'lazyt'`; Lazy-T `reel:'coverall'` → `reel:'lazyt'`; comment corrected to "25 balls drawn (24 called + free space)"
- `js/game.js`: `REEL_SYMS['coverall']` → `REEL_SYMS['lazyt']`; Red Spin comment updated
- Cache: `spbm-v640`

## v6.5 — Trigger 2: server-side threshold + guaranteed Lazy-T card
- `js/progressive.js`: Added `isForceArmed()` accessor
- `js/game.js`: Added `_genGuaranteedLazyTCard(callSeq)` + Trigger 2 check in `doBingoSpin()`
- DB: `trigger2_migration.sql` — `must_hit_by` column, `progressive_random_threshold()`, `fn_progressive_threshold_check()` trigger, `progressive_hit()` RPC
- Cache: `spbm-v650`

## v6.6 — CRITICAL FIX: _checkArmedCommand on connect
- `js/progressive.js`: Added `_checkArmedCommand()` — polls `progressive_commands` for existing armed rows on connect and every 30s. Fixed bug where clients connecting after arm event missed `_forceArmed` entirely.
- Cache: `spbm-v660`

## v6.7 — Race condition fix: tryAtomicClaim + _continueDoBingoSpin
- `js/progressive.js`: Added `tryAtomicClaim(onResult)` — atomically pre-claims armed command before guaranteed card generation. Only one client wins the race; all others spin normally.
- `js/game.js`: Trigger 2 now calls `Progressive.tryAtomicClaim()` async. Added `_continueDoBingoSpin(prevBallPos)` to support async path.
- Cache: `spbm-v670`

## v6.8 — CRITICAL FIX: service-worker non-fatal pre-cache
- `service-worker.js`: Added `.catch()` to `c.addAll(FILES)` — a 404 on any asset (GitHub Pages) no longer hard-fails SW install and blocks game load. Pre-cache failures are now logged as warnings only.
- Cache: `spbm-v680`

---

## 6.9 — CRITICAL FIX: winPatterns undefined crash on spin
- `js/game.js`: `doBingoSpin()` return value renamed to `_spinResult`. Added null guard (WABC bail-out) and undefined guard (async Trigger 2 path). `_continueDoBingoSpin()` now calls `_continueSpinAfterClaim()` directly via typeof check. Removed duplicate `_continueSpinAfterClaim` invocation that caused double-spin on Trigger 2 path.
- Cache: `spbm-v690`

---

## 6.10 — CRITICAL FIX: Spin lockup from async Trigger 2 refactor
**Root cause:** `_continueSpinAfterClaim()` is defined inside `doSpin()` as a closure and cannot be called from the top-level `_continueDoBingoSpin()` function. The async Trigger 2 path silently failed because `typeof _continueSpinAfterClaim === 'function'` was always `false` outside `doSpin()`, so the spin continuation never ran. Every spin exited early — no reels, no win, no error.

**Fix:** Reverted Trigger 2 to a purely synchronous design. `tryAtomicClaim()` and the async DB round-trip removed entirely. `isForceArmed()` check runs synchronously — if true, `_genGuaranteedLazyTCard()` replaces the card in-place, then normal spin flow continues. Race protection is handled by `armAndClaim()` which already has an atomic race guard. `_continueDoBingoSpin()` no longer attempts to call `_continueSpinAfterClaim()`. `doSpin()` restored to original `var winPatterns=doBingoSpin()` + null check pattern.

**Files changed:** `js/game.js`, `js/progressive.js` (`tryAtomicClaim` removed from API)
- Cache: `spbm-v6100`

---

## 6.11 — FIX: Main reel shows basePat symbols on progressive + multi-pattern wins

**Root cause:** `spinData` was forced to `REEL_SYMS['lazyt']` ([7,7,7]) whenever `_progInWins` was true, regardless of what `basePat` was. When Open Diamond (or any other pattern) co-won with Lazy-T, the main reels showed 3× JP symbols instead of the correct basePat symbols. Player saw Open Diamond highlighted on the card with JP symbols on the reels — visually incorrect.

**Fix:** `spinData` now always uses `REEL_SYMS[_reelPats[0].reel]` (basePat) for the main reel display. Lazy-T correctly shows [7,7,7] during its own dedicated Red Spin stop in the runRS() sequence — not on the initial main reel result. This matches VGT Class II design: basePat always drives the initial reel stop; higher patterns play in ascending Red Spin sequence.

**Files changed:** `js/game.js`
- Cache: `spbm-v6110`

---

## v6.12 — FIX: Winning Bingo Card Replaced by New WABC Sequence Mid-Red Spin

**Bug (deferred since v5.115):** When a multi-pattern bingo win triggered Red Spin near
ball 75 (sequence boundary), a new WABC sequence arrived mid-celebration via
`WABC.onNewCall` or `_requestNewWABCSequence`. Both handlers overwrote `BG.card`,
`BG.callSeq`, `BG.matchedCells`, and `BG.cardNumSet` in place. `runRS` then called
`renderBingoCard(BG.card, BG.matchedCells, pat.cells)` — but `BG.card` was now a
completely different card (different numbers) daubed against the new sequence. Pattern
highlight cells pointed at the wrong positions. Players saw the Red Spin play out on a
card they had never seen, with daubs and highlights that made no sense.

**Root cause:** No lock existed to protect the winning card state during the Red Spin
sequence. The v6.2 `S.spinning` guard in `_onServerBallPos` only blocked
`renderBingoCard` (ball strip kept ticking — correct), but it did NOT prevent the
new-sequence handlers from overwriting the `BG` object itself.

**Fix — Atomic Win Snapshot + Red Spin Card Lock (`game.js` only):**

1. **Three new module-level vars:**
   - `_rsCardLocked`   — boolean flag, true while Red Spin / prog finale is in flight
   - `_rsCardSnapshot` — deep copy of `{card, callSeq, matchedCells, cardNumSet}` taken
                         at win-result time (before the 600ms pre-RS delay)
   - `_pendingNewSeq`  — new WABC sequence absorbed while locked; applied on release

2. **`_acquireRsCardLock()`** — sets flag, deep-copies BG card state into snapshot.
   Called at the moment `winPatterns.length > 0` is confirmed, before the 600ms
   pre-RS setTimeout in both the normal Red Spin path and `_finishProgressiveSpin`.

3. **`_releaseRsCardLock()`** — clears flag and snapshot; if `_pendingNewSeq` is set,
   applies it to BG (re-daubing current card against new sequence) and clears it.
   Called at every terminal path before `S.spinning = false / setCtrl(true)`:
   - Normal RS `onDone` callback
   - `showProgJP` `onDismiss`
   - `showJP` catch block (error recovery)
   - `showProgJP` catch block (error recovery)
   - Spin watchdog recovery (15s timeout)

4. **New-sequence handlers guarded:** `_requestNewWABCSequence` success callback and
   `WABC.onNewCall` handler both check `_rsCardLocked` first. If locked, new sequence
   is stored in `_pendingNewSeq`, BG flags are updated (awaitingNewSeq, seqExhausted,
   _coverAll75Fired), and the handler returns without touching BG.card or rendering.
   Ball strip continues updating live via `_onServerBallPos` — unchanged (Q2-A design).

5. **`runRS` uses snapshot:** `renderBingoCard` call inside `_onReelDone` switched from
   `BG.card / BG.matchedCells` to `_rsCardSnapshot.card / _rsCardSnapshot.matchedCells`.

6. **`showProgJP` uses snapshot:** `renderBingoCard` in `onDismiss` full-card daub also
   switched to use snapshot (lock is still held at that point; released immediately after).

**Design preserved:**
- Ball strip keeps ticking live during Red Spin (server position authoritative) ✓
- Card numbers and daubs stay frozen until Red Spin ends ✓
- New sequence absorbed silently and applied cleanly the moment lock releases ✓
- No changes to `paytable.js`, `config.js`, `wabc.js`, `progressive.js` ✓
- Full ES5 — no arrow functions, const/let, or backticks ✓

**Files changed:** `js/game.js`
- Cache: `spbm-v6120`
- index.html: title, splash-ver, all `?v=` → `v6.12`

---

## v6.13 — FIX: Win Celebration Card Re-Daubed by New WABC Sequence

**Bug:** On a normal (non-Red Spin) win near ball 75, the win celebration pattern
cycle (`startPatternCycle`) was rendering from live `BG.card` / `BG.matchedCells`.
When the new WABC sequence arrived, `BG.matchedCells` was reset to `{12:true}` and
re-daubed against the new sequence. The next `showNext` tick rendered the winning
pattern highlight on cells that no longer matched — showing the pattern on non-winning
cells. Simultaneously `_onServerBallPos` called `renderBingoCard(BG.card,
BG.matchedCells, null)` against the reset daub state, causing a visible flash to a
nearly-blank card.

**Root cause:** `startPatternCycle`'s `showNext` closure captured live `BG` references
with no snapshot protection. The `!S.spinning` gate in `_onServerBallPos` only blocked
`renderBingoCard` during Red Spin — `S.spinning` is cleared immediately when a plain
win celebration starts, leaving `_onServerBallPos` free to overwrite the card.

**Fix — Win Celebration Card Lock (`game.js` only):**

1. **Two new module-level vars** added alongside the RS card lock block:
   - `_celebCardLocked`   — true while the win celebration cycle is running
   - `_celebCardSnapshot` — frozen `{card, matchedCells}` copy taken at
                            `startPatternCycle` call time

2. **`startPatternCycle`** deep-copies `BG.card` and `BG.matchedCells` into
   `_celebCardSnapshot` and sets `_celebCardLocked = true` before starting the
   interval. `showNext` renders from `_celebCardSnapshot` — never live `BG`.

3. **`stopPatternCycle`** clears `_celebCardLocked` and `_celebCardSnapshot`.
   Called at the top of `doBingoSpin()` — lock releases exactly on next Spin press.

4. **`_onServerBallPos`** `renderBingoCard` gate extended:
   `!S.spinning` → `!S.spinning && !_celebCardLocked`.
   `BG.matchedCells` still gets daubed in the background — card stays silently
   current for the next spin. Only the render call is suppressed.

5. **`WABC.onNewCall`**, **`WABC.onRestoreWide`**, **`_requestNewWABCSequence`**,
   and the **WABC init block** all have their `renderBingoCard` calls guarded with
   `!_celebCardLocked`. Ball strip continues updating live in all cases.

**Design preserved:**
- Card frozen showing winning daubs + pattern highlights until next Spin press ✓
- Ball strip keeps ticking live ✓
- BG.matchedCells updated silently in background for next spin ✓
- ES5 only — no arrow functions, const/let, or backticks ✓

**Files changed:** `js/game.js`
- Cache: `spbm-v6130`
- index.html: title, splash-ver, all `?v=` → `v6.13`
