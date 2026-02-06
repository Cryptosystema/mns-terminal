# Integration Contract — Phase 22
## Frontend ↔ Backend Integration Specification

**Document Version:** 1.0  
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

---

**END OF CONTRACT**
