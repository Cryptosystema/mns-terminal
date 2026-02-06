# Smoke Checks — Phase 22.4
## Manual Verification Procedures

**Purpose:** Verify delivery infrastructure works correctly in live environment  
**Scope:** Integration testing only — no E2E automation  
**Prerequisites:** Backend running on `localhost:8080`

---

## Setup

### 1. Install Dependencies

```bash
cd /path/to/mns-terminal
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 3. Backend Configuration

Ensure backend is running with:
- SSE endpoint: `GET http://localhost:8080/stream`
- REST endpoint: `GET http://localhost:8080/api/v1/latest`

---

## Test 1: SSE Primary Mode (Happy Path)

**Scenario:** SSE available, normal operation

### Steps

1. Ensure backend `/stream` endpoint is running
2. Open browser to `http://localhost:3000`
3. Open browser DevTools console

### Expected Results

✅ **UI Indicator:** `Status: LIVE` displayed at top of terminal  
✅ **Console logs:** `[DeliveryController] Starting delivery controller`  
✅ **Console logs:** `[DeliveryController] Starting SSE primary mode`  
✅ **Console logs:** `[SSEClient] Connecting to /stream`  
✅ **Console logs:** `[SSEClient] Connection opened`  
✅ **Console logs:** `[DeliveryController] Mode transition: SSE_PRIMARY → SSE_PRIMARY` (or stable)  
✅ **NAV display:** Shows market data packets as they arrive  

### Failure Indicators

❌ UI shows `Status: DEGRADED` instead of `LIVE`  
❌ Console shows SSE errors  
❌ No NAV data displayed  

---

## Test 2: Degradation to REST Fallback

**Scenario:** SSE fails, system degrades to REST polling

### Steps

1. Start application with backend running (verify Test 1 passes)
2. **Stop backend `/stream` endpoint** (keep `/api/v1/latest` running)
3. Wait 5-10 seconds
4. Observe UI and console

### Expected Results

✅ **UI Indicator:** Transitions from `Status: LIVE` to `Status: DEGRADED`  
✅ **Console logs:** `[SSEClient] Connection error`  
✅ **Console logs:** `[DeliveryController] SSE failure detected - degrading to REST`  
✅ **Console logs:** `[DeliveryController] Starting REST degraded mode`  
✅ **Console logs:** `[DeliveryController] Mode transition: SSE_PRIMARY → REST_DEGRADED`  
✅ **REST polling:** Console shows periodic REST requests (every 2 seconds)  
✅ **NAV display:** Continues showing data from REST snapshots  

### Failure Indicators

❌ UI remains `Status: LIVE` after SSE failure  
❌ No REST polling initiated  
❌ NAV display freezes or shows stale data  
❌ Console shows errors but no mode transition  

---

## Test 3: Recovery to SSE Primary

**Scenario:** SSE recovers, system switches back from REST to SSE

### Steps

1. Ensure system is in REST_DEGRADED mode (from Test 2)
2. **Restart backend `/stream` endpoint**
3. Wait up to 35 seconds (SSE recovery interval = 30s + margin)
4. Observe UI and console

### Expected Results

✅ **UI Indicator:** Transitions from `Status: DEGRADED` back to `Status: LIVE`  
✅ **Console logs:** `[DeliveryController] Attempting SSE recovery`  
✅ **Console logs:** `[DeliveryController] Stopping REST polling`  
✅ **Console logs:** `[DeliveryController] Starting SSE primary mode`  
✅ **Console logs:** `[SSEClient] Connection opened`  
✅ **Console logs:** `[DeliveryController] Mode transition: REST_DEGRADED → SSE_PRIMARY`  
✅ **REST polling:** Stops (no more REST requests in console)  
✅ **NAV display:** Resumes real-time SSE updates  

### Failure Indicators

❌ UI remains `Status: DEGRADED` after SSE available  
❌ REST polling continues alongside SSE (mutual exclusion violated)  
❌ SSE recovery not attempted after 30 seconds  
❌ Console shows SSE connection but mode doesn't switch  

---

## Test 4: Mutual Exclusion Verification

**Scenario:** Verify SSE and REST never run simultaneously

### Steps

1. Monitor console logs during degradation (Test 2) and recovery (Test 3)
2. Check for overlapping SSE and REST activity

### Expected Results

✅ **Strict ordering:** REST starts AFTER SSE stops  
✅ **Strict ordering:** SSE starts AFTER REST stops  
✅ **No overlap:** No simultaneous SSE messages and REST polls  
✅ **Console logs:** "Stopping X mode" always precedes "Starting Y mode"  

### Failure Indicators

❌ Console shows both SSE messages and REST polls at same time  
❌ Multiple delivery modes active simultaneously  
❌ Race conditions or timing issues  

---

## Test 5: Clean Shutdown

**Scenario:** Verify graceful shutdown on page unload

### Steps

1. Start application (Test 1)
2. Wait for SSE connection (Status: LIVE)
3. Close browser tab or navigate away
4. Check console logs before tab closes

### Expected Results

✅ **Console logs:** `[DeliveryController] Stopping delivery controller`  
✅ **SSE connection:** Closed cleanly  
✅ **REST polling:** Stopped if active  
✅ **No errors:** Clean shutdown without exceptions  

### Failure Indicators

❌ Console shows errors during shutdown  
❌ SSE connection remains open  
❌ Memory leaks or hanging timers  

---

## Test 6: Backend Completely Unavailable

**Scenario:** Both SSE and REST endpoints down

### Steps

1. **Stop entire backend** (both `/stream` and `/api/v1/latest`)
2. Open browser to `http://localhost:3000`
3. Observe behavior

### Expected Results

✅ **UI Indicator:** Shows `Status: DEGRADED` (attempts REST, fails gracefully)  
✅ **Console logs:** SSE connection errors  
✅ **Console logs:** REST polling errors (HTTP failures)  
✅ **NAV display:** Shows static Tier0 packet (fallback state)  
✅ **No crashes:** Application remains stable  
✅ **Recovery attempts:** SSE recovery still attempted every 30s  

### Failure Indicators

❌ Application crashes or freezes  
❌ Infinite error loops  
❌ UI shows incorrect state  
❌ Console flooded with errors (should be rate-limited)  

---

## Pass Criteria

**All tests must pass for Phase 22.4 to be considered complete.**

| Test | Status | Notes |
|------|--------|-------|
| Test 1: SSE Primary Mode | ⬜ | |
| Test 2: Degradation to REST | ⬜ | |
| Test 3: Recovery to SSE | ⬜ | |
| Test 4: Mutual Exclusion | ⬜ | |
| Test 5: Clean Shutdown | ⬜ | |
| Test 6: Backend Unavailable | ⬜ | |

---

## Troubleshooting

### Issue: UI shows "Status: INITIALIZING" forever

**Cause:** DeliveryController not starting  
**Fix:** Check console for errors in `src/main.ts` init()

### Issue: No SSE connection established

**Cause:** Backend not running or proxy misconfigured  
**Fix:** 
- Verify backend on `localhost:8080`
- Check `vite.config.ts` proxy settings
- Test direct access: `curl http://localhost:8080/stream`

### Issue: REST polling never starts

**Cause:** SSE degradation logic not triggered  
**Fix:**
- Verify SSE enters ERROR state (check console)
- Check `handleSSEStateChange` callback in main.ts

### Issue: Mode stuck in DEGRADED

**Cause:** SSE recovery not attempting or failing  
**Fix:**
- Wait full 30 seconds for first recovery attempt
- Check backend `/stream` is actually available
- Verify SSE recovery timer in DeliveryController

---

## Next Steps

After smoke checks pass:
- Proceed to Phase 22.5 (E2E test automation)
- Or proceed to Phase 23 (Product UI features)

**Note:** E2E tests (Playwright, Cypress) are out of scope for Phase 22.4.
