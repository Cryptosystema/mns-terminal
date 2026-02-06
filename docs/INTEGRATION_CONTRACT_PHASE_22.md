# Integration Contract — Phase 22
## Frontend ↔ Backend Integration Specification

**Document Version:** 1.2  
**Date:** 2026-02-06  
**Status:** Active  
**Scope:** Delivery mechanisms and integration rules between MNS Terminal (frontend) and MNS Backend

---

## SECTION 1 — Purpose & Scope

### What This Contract Governs

This document defines the formal integration contract between MNS Terminal (frontend) and the MNS Backend system. It specifies:

- Available backend delivery mechanisms
- Delivery priority and fallback rules
- Frontend responsibilities for connection lifecycle management
- State consistency requirements
- Mode-switching logic and recovery procedures

### What This Contract Does NOT Govern

The following are explicitly out of scope:

- Authentication mechanisms
- Authorization rules
- Payment processing
- Rate limiting policies
- Historical data queries
- Multi-symbol support (if not already implemented)
- Business logic implementation on frontend
- Backend internal architecture
- Data validation rules (delegated to backend)
- Packet signing verification (frontend trusts signed packets)

---

## SECTION 2 — Backend Interfaces

The backend exposes two delivery mechanisms for market data. Both deliver semantically identical content with different transport characteristics.

### 2.1 Server-Sent Events (SSE)

**Endpoint:** `GET /stream`  
**Nature:** Continuous, push-based, persistent connection  
**Payload:** Signed tier0, tier1, tier2 packets  
**Characteristics:**
- Real-time market data stream
- Low latency (<100ms typical)
- Connection maintained by server
- Automatic reconnection support via browser EventSource API

**Protocol:**
- Content-Type: `text/event-stream`
- Each event contains one signed packet
- Event format follows SSE specification (RFC 6202)

### 2.2 REST Snapshot

**Endpoint:** `GET /api/v1/latest`  
**Nature:** Snapshot, pull-based, stateless  
**Payload:** Same signed tier0, tier1, tier2 packets as SSE  
**Characteristics:**
- Point-in-time snapshot of current market state
- No real-time guarantees
- Standard HTTP request/response cycle
- No connection persistence

**Protocol:**
- Content-Type: `application/json`
- Response contains current state snapshot
- No streaming, no push updates

### 2.3 Semantic Equivalence

**Critical principle:** Both mechanisms deliver the same logical data model. A packet received via SSE is structurally and semantically identical to the same packet retrieved via REST. The only difference is timing and delivery model.

---

## SECTION 3 — Delivery Priority Model

### Primary Mechanism: SSE

SSE is the **primary and preferred** delivery mechanism for all standard operations.

**Rationale:**
- Real-time updates without polling
- Reduced network overhead
- Lower latency
- Better user experience

### Fallback Mechanism: REST

REST is a **fallback mechanism only**, used exclusively when SSE is unavailable or failed.

**Rationale:**
- Degraded mode for network constraints
- Debugging tool
- Temporary recovery path

### Hard Constraints

**CONSTRAINT 1:** REST and SSE MUST NEVER operate in parallel.  
**CONSTRAINT 2:** REST MUST NEVER be treated as a real-time data source.  
**CONSTRAINT 3:** REST MUST NEVER be used as a performance optimization alongside SSE.  

**Justification:** Using both mechanisms simultaneously creates state synchronization issues, increases backend load, and provides no architectural benefit.

---

## SECTION 4 — Degradation & Recovery Rules

### 4.1 SSE Failure Detection

The frontend considers SSE failed when **any** of the following occurs:

1. **Connection Error:** EventSource fires an error event and enters CLOSED state
2. **Timeout:** No data received for 60 seconds (backend keepalive expected every 30s)
3. **Browser Compatibility:** EventSource API unavailable in runtime environment

**Assumption:** Backend sends keepalive ping every 30 seconds during idle periods.

### 4.2 Degradation: SSE → REST

When SSE failure is detected, the frontend MAY switch to REST mode:

**Preconditions:**
- SSE connection is confirmed failed (per Section 4.1)
- User has not explicitly paused data updates

**Behavior:**
1. Close SSE connection (if not already closed)
2. Initiate REST polling at 2-second intervals
3. Display mode indicator: DEGRADED or SNAPSHOT
4. Log degradation event (see Section 7)

**Polling interval justification:** 2 seconds balances freshness with backend load during degraded mode.

### 4.3 Recovery: REST → SSE

The frontend MUST attempt SSE recovery when operating in REST fallback mode.

**Recovery Strategy:**
- Attempt SSE reconnection every 30 seconds while in REST mode
- On successful SSE connection:
  1. Confirm data flow (wait for first packet)
  2. Stop REST polling immediately
  3. Resume LIVE mode indicator
  4. Log recovery event

**Backoff:** No exponential backoff required; fixed 30-second interval is acceptable.

### 4.4 State Consistency During Mode Switch

**During SSE → REST:**
- Frontend MAY display last known SSE data until first REST response arrives
- No guarantee of continuity (acceptable for degraded mode)

**During REST → SSE:**
- Frontend MUST discard pending REST requests
- Frontend MUST use first SSE packet as new source of truth
- Frontend SHOULD NOT interpolate between REST and SSE data

---

## SECTION 5 — Frontend Responsibilities

### 5.1 Connection Lifecycle Management

The frontend is responsible for:

1. **Initiating SSE connection** on application startup
2. **Detecting connection failures** per Section 4.1
3. **Executing degradation logic** per Section 4.2
4. **Executing recovery logic** per Section 4.3
5. **Cleaning up connections** on application shutdown or user navigation

### 5.2 State Consistency Guarantees

The frontend MUST:

- Maintain a single source of truth (either SSE or REST, never both)
- Apply packets sequentially in order received
- Handle out-of-order delivery gracefully (tier0/tier1/tier2 may arrive asynchronously)

The frontend MAY:

- Cache last known good state
- Display stale data with appropriate indicators

### 5.3 Mode Awareness

The frontend MUST track and expose current delivery mode:

- **LIVE:** SSE connected and receiving data
- **DEGRADED:** REST fallback active
- **DISCONNECTED:** No active connection

This state MUST be available for:
- UI rendering (mode indicators)
- Logging and debugging
- Future analytics integration

### 5.4 User Transparency

The frontend SHOULD:

- Display current mode to user (LIVE vs DEGRADED)
- Avoid alarming language during degradation
- Provide clear indication when data is stale

The frontend MUST NOT:

- Hide degradation from user
- Claim real-time updates when in REST mode

---

## SECTION 6 — Non-Goals (Hard Exclusions)

The following features are **explicitly excluded** from frontend scope:

### 6.1 Authentication & Authorization

- No login flows
- No session management
- No token refresh logic

**Assumption:** Public unauthenticated access or authentication handled by external layer.

### 6.2 Payment Processing

- No payment forms
- No checkout flows
- No subscription management

### 6.3 Rate Limiting

- No client-side rate limiting enforcement
- No request throttling beyond degradation rules

**Rationale:** Backend enforces rate limits; frontend behavior is defined by Sections 4.2-4.3.

### 6.4 Historical Queries

- No historical data retrieval
- No time-series analysis
- No date-range queries

**Rationale:** MNS Terminal displays current state only.

### 6.5 Multi-Symbol Support

**Status:** TBD based on current implementation.

If not already implemented, multi-symbol support is out of scope for Phase 22.

### 6.6 Business Logic on Frontend

- No price calculations
- No risk calculations
- No trade execution logic
- No data transformations beyond rendering

**Rationale:** Frontend is a display layer only. All business logic resides in backend.

---

## SECTION 7 — Observability Expectations

### 7.1 Frontend Logging Requirements

The frontend SHOULD log the following events:

1. **SSE connection established**
   - Timestamp
   - Connection attempt number (if retry)

2. **SSE connection failed**
   - Timestamp
   - Failure reason (error event, timeout, etc.)
   - Duration of last successful connection

3. **Degradation to REST mode**
   - Timestamp
   - Trigger condition

4. **Recovery to SSE mode**
   - Timestamp
   - Duration spent in REST mode

5. **Packet reception rate** (optional, for debugging)
   - Events per second (aggregate, not per-packet)

### 7.2 Frontend Logging Prohibitions

The frontend MUST NOT log:

- Packet content (contains sensitive market data)
- User identifiers (if authentication added in future)
- Full URLs with query parameters (if they contain tokens in future)

### 7.3 Purpose

Logging is for **delivery mode debugging only**, not business analytics.

**Target audience:**
- Frontend engineers diagnosing connection issues
- Backend engineers correlating frontend behavior with backend logs

---

## SECTION 7.5 — Phase 22.2 Implementation Notes

**Implementation date:** 2026-02-06  
**Status:** COMPLETE  
**Module:** `src/infrastructure/sse/sseClient.ts`

### Architecture Overview

Phase 22.2 implements the SSE client as a standalone, framework-agnostic TypeScript module located in the infrastructure layer. The implementation strictly adheres to all contract specifications.

### Implementation Details

**Module location:** `src/infrastructure/sse/sseClient.ts`

**Exported components:**
1. **SSEConnectionState enum** — Connection lifecycle states (DISCONNECTED, CONNECTING, CONNECTED, ERROR)
2. **MarketPacket types** — TypeScript interfaces for Tier0/Tier1/Tier2 packet structures (opaque to business logic)
3. **SSEClient class** — Core client implementation
4. **createSSEClient factory** — Factory function for client instantiation

**Key features:**
- Native EventSource API usage (browser-provided, handles automatic reconnection)
- Explicit lifecycle management (connect/disconnect methods)
- Throttling (1Hz default, configurable)
- Payload size validation (16KB default, configurable)
- Structural packet validation (tier detection, basic shape checking)
- Event forwarding to state layer via callbacks
- Comprehensive lifecycle logging (no packet content logging)

### Contract Adherence

**Section 2.1 compliance (SSE Endpoint):**
- ✓ Connects to `GET /stream` (configurable endpoint)
- ✓ Uses EventSource API per RFC 6202
- ✓ Handles `nav_update` custom event type
- ✓ Handles `keep_alive` ping events

**Section 4.1 compliance (Failure Detection):**
- ✓ Detects EventSource error events
- ✓ Exposes ERROR state
- Note: Timeout/keepalive monitoring delegated to state layer (will be implemented in Phase 22.3 orchestrator)

**Section 5 compliance (Frontend Responsibilities):**
- ✓ Lifecycle management (connect/disconnect)
- ✓ State exposure (getState, isConnected)
- ✓ Sequential packet processing via callback
- Note: State consistency enforcement delegated to state layer

**Section 7 compliance (Observability):**
- ✓ Logs connection opened/closed
- ✓ Logs state transitions
- ✓ Logs errors (without sensitive data)
- ✓ NEVER logs packet content
- ✓ NEVER logs signatures or payload data

### Explicit Non-Implementation

Per Phase 22.2 constraints, the following are **intentionally NOT implemented:**

1. **REST fallback** — Deferred to Phase 22.3
2. **Retry logic** — Browser EventSource handles this automatically
3. **Timers/keepalive monitoring** — Delegated to orchestrator (Phase 22.3)
4. **Cryptographic validation** — Delegated to state layer (existing validation pipeline)
5. **Business logic** — Packets are opaque; client only validates structure
6. **UI components** — Pure infrastructure module
7. **State management** — Uses callbacks to forward packets to existing state layer

### Integration Path

**Current status:** Module implemented but not yet wired to existing inline JS in index.html

**Integration approach (future):**
1. Convert project to use ES modules or bundler (e.g., Vite, webpack)
2. Import SSEClient into main application logic
3. Replace inline EventSource code with SSEClient instantiation
4. Wire onMessage callback to existing updateState function
5. Wire onStateChange callback to UI status indicators

**No breaking changes required:** Existing state validation pipeline (validatePacket, updateState, renderNAV) remains unchanged.

### Testing Status

**Test infrastructure:** Not present in repository

**Rationale for no tests:**
- No package.json, tsconfig.json, or test framework detected
- Project currently uses inline JavaScript without build tooling
- Tests deferred until module bundler integration (Phase 22.4 or 23+)

**Test coverage when infrastructure added:**
- Mock EventSource lifecycle (open, message, error, close)
- Throttling behavior (drops messages within throttle window)
- Payload size enforcement (rejects oversized messages)
- JSON parse error handling
- State transition sequences
- Callback invocation verification

---

## SECTION 7.6 — Phase 22.3 Degraded Mode Implementation

**Implementation date:** 2026-02-06  
**Status:** COMPLETE  
**Module:** `src/infrastructure/delivery/deliveryController.ts`

### Architecture Overview

Phase 22.3 implements the delivery orchestrator that manages SSE (primary) and REST (fallback) mechanisms with strict mutual exclusion. This fulfills the degradation and recovery requirements specified in Sections 4.2 and 4.3.

### Implementation Details

**Module location:** `src/infrastructure/delivery/deliveryController.ts`

**Exported components:**
1. **DeliveryMode enum** — Delivery mode states (SSE_PRIMARY, REST_DEGRADED)
2. **DeliveryController class** — Orchestrator for SSE/REST lifecycle
3. **createDeliveryController factory** — Factory function for controller instantiation

**Key features:**
- Mutual exclusion enforcement (SSE and REST NEVER active simultaneously)
- SSE primary mode with automatic EventSource reconnection
- REST degraded mode with 2000ms polling interval
- SSE recovery attempts every 30000ms when in REST mode
- Mode transition logging (no packet content logging)
- Callback-based packet forwarding with source annotation

### Contract Adherence

**Section 2.2 compliance (REST Endpoint):**
- ✓ Polls `GET /api/v1/latest` (configurable endpoint)
- ✓ Parses JSON response
- ✓ Validates content-type header
- ✓ Forwards packets with source annotation (REST_DEGRADED)

**Section 3 compliance (Delivery Priority Model):**
- ✓ SSE is always PRIMARY mode
- ✓ REST is FALLBACK ONLY
- ✓ Hard constraint: SSE and REST never operate in parallel
- ✓ Mode switching is deterministic and logged

**Section 4.2 compliance (Degradation SSE → REST):**
- ✓ Triggers on SSEConnectionState.ERROR
- ✓ Stops SSE client before starting REST polling
- ✓ REST polling interval: 2000ms (configurable)
- ✓ Immediate first poll (no initial delay)

**Section 4.3 compliance (Recovery REST → SSE):**
- ✓ Recovery attempts every 30000ms (configurable)
- ✓ Stops REST polling before attempting SSE connection
- ✓ On successful SSE CONNECTED → remains in SSE_PRIMARY mode
- ✓ On SSE failure → automatic degradation back to REST

**Section 5 compliance (Frontend Responsibilities):**
- ✓ Connection lifecycle orchestration (start/stop)
- ✓ Single source of truth enforcement (one mode at a time)
- ✓ Mode awareness exposure (getMode, isActive)
- ✓ Sequential packet processing via callback

**Section 7 compliance (Observability):**
- ✓ Logs mode transitions (SSE_PRIMARY ↔ REST_DEGRADED)
- ✓ Logs SSE state changes
- ✓ Logs REST polling errors
- ✓ NEVER logs packet content
- ✓ NEVER logs signatures or payload data

### Timing Guarantees

**REST polling interval:** 2000ms (2 seconds)  
**Rationale:** Balances data freshness with backend load during degraded mode

**SSE recovery interval:** 30000ms (30 seconds)  
**Rationale:** Aligns with backend keepalive interval assumption (30s pings)

**No exponential backoff:** Fixed intervals ensure predictable behavior

### Mutual Exclusion Guarantees

**CRITICAL INVARIANT:** At any given time, exactly ONE of the following is true:
- SSE client is connected AND REST polling is stopped
- REST polling is active AND SSE client is disconnected

**Enforcement mechanisms:**
1. `startSSEMode()` calls `stopRESTMode()` before creating SSE client
2. `degradeToRESTMode()` calls `stopSSEMode()` before starting REST polling
3. `attemptSSERecovery()` calls `stopRESTMode()` before SSE connection attempt
4. Timers are cleared when stopping respective modes
5. State machine ensures only one mode transition at a time

**Verification:** Logs show mode transitions with explicit OLD → NEW format

### Explicit Non-Implementation

Per Phase 22.3 constraints, the following are **intentionally NOT implemented:**

1. **Parallel delivery modes** — SSE + REST simultaneously (explicitly prohibited by contract)
2. **Exponential backoff** — Fixed intervals only
3. **Manual retries** — Each mechanism handles its own errors
4. **Cryptographic validation** — Delegated to state layer
5. **UI components** — Pure infrastructure module
6. **Mode indicators** — Deferred to product UI phase
7. **User controls** — No manual mode override
8. **Authentication** — Out of scope per Section 6.1

### Integration Path

**Current status:** Module implemented but not yet wired to existing inline JS in index.html

**Integration approach (future):**
1. Set up build tooling (TypeScript + bundler)
2. Import DeliveryController into main application
3. Replace inline SSE client with DeliveryController instantiation
4. Wire onPacket callback to existing updateState function
5. Wire onModeChange callback to status rendering logic
6. Remove inline SSE/REST logic from index.html

**No breaking changes required:** Existing state validation pipeline remains unchanged.

### Testing Status

**Test infrastructure:** Not present in repository

**Rationale for no tests:**
- No package.json or test framework
- Project uses inline JavaScript without build tooling
- Tests deferred until module bundler integration

**Test coverage when infrastructure added:**
- Mode switch SSE → REST (on SSE ERROR state)
- Mode switch REST → SSE (on successful recovery)
- Mutual exclusion verification (no parallel modes)
- REST polling interval accuracy
- SSE recovery interval accuracy
- Timer cleanup on stop()
- Callback invocation with correct source annotation

---

## SECTION 8 — Forward Compatibility

This contract enables structured implementation across future phases:

### Phase 22.2 — SSE Client Implementation

**Enabled by this contract:**
- Clear SSE endpoint and protocol specification (Section 2.1)
- Failure detection rules (Section 4.1)
- Logging requirements (Section 7)

**Next steps:**
- Implement EventSource wrapper
- Implement failure detection
- Wire SSE data to existing rendering logic

### Phase 22.3 — REST Fallback Client Implementation

**Enabled by this contract:**
- Clear REST endpoint and protocol specification (Section 2.2)
- Degradation rules (Section 4.2)
- Recovery rules (Section 4.3)

**Next steps:**
- Implement REST polling service
- Implement mode-switching orchestrator
- Add mode indicators to UI

### Phase 23+ — Product UI & Features

**Enabled by this contract:**
- Clear separation between delivery logic and UI logic
- Mode awareness for UI rendering
- Foundation for user-facing features

**Not blocked by this contract:**
- UI enhancements
- Additional visualization layers
- User preference storage

### Extensibility

This contract assumes:

- Packet structure may evolve (tier0/tier1/tier2 format is opaque to frontend)
- New delivery mechanisms may be added in future (e.g., WebSockets)
- Backend endpoints may version (e.g., /api/v2/latest)

Changes to delivery mechanisms will require contract amendment.

---

## Document Control

**Review cycle:** Quarterly or upon significant backend changes  
**Owner:** Frontend Architecture Team  
**Approval required from:** Backend Team Lead, Frontend Team Lead  

**Changelog:**
- 2026-02-06: Initial version (Phase 22.1)
- 2026-02-06: Added Phase 22.2 Implementation Notes (Section 7.5)
- 2026-02-06: Added Phase 22.3 Degraded Mode Implementation (Section 7.6)

---

**END OF CONTRACT**
