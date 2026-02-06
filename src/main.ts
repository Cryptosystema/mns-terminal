/**
 * MNS Terminal — Main Entry Point
 * Phase 22.4: Integration Wiring + UX Signals
 * 
 * Purpose: Bootstrap delivery infrastructure and wire to UI
 */

import { createDeliveryController, DeliveryMode, DeliveryControllerHandlers } from './infrastructure/delivery/deliveryController.js';
import { MarketPacket } from './infrastructure/sse/sseClient.js';

/* ============================================
   CRYPTOGRAPHIC ANCHORS (IMMUTABLE)
   ============================================ */

const TRUSTED_KEYS: Record<string, string> = Object.freeze({
  "key_001": "REPLACE_WITH_BASE64_44_CHARS_KEY1",
  "key_002": "REPLACE_WITH_BASE64_44_CHARS_KEY2"
});

const MAX_SKEW_MS = 30000;

if (Object.keys(TRUSTED_KEYS).length > 2) {
  throw new Error("Invariant violation: max 2 trusted keys");
}

/* ============================================
   STATIC NAV PACKET (TIER 0)
   ============================================ */

const STATIC_NAV_PACKET = Object.freeze({
  regime: "COMPRESSION",
  risk: "NORMAL",
  confidence: "MEDIUM",
  status: "LIVE",
  scope: "PUBLIC"
});

/* ============================================
   CATALOGS (IMMUTABLE)
   ============================================ */

const REGIMES = Object.freeze([
  "ACCUMULATION",
  "EXPANSION",
  "DISLOCATION",
  "EXHAUSTION",
  "COMPRESSION"
]);

const RISK_LEVELS = Object.freeze([
  "LOW",
  "NORMAL",
  "HIGH"
]);

const CONFIDENCE_LEVELS = Object.freeze([
  "LOW",
  "MEDIUM",
  "HIGH"
]);

const BIAS_LEVELS = Object.freeze([
  "BULLISH",
  "BEARISH",
  "NEUTRAL"
]);

const STABILITY_LEVELS = Object.freeze([
  "FORMING",
  "MATURE",
  "WEAKENING"
]);

const DRIVER_TYPES = Object.freeze([
  "LIQUIDITY_SURGE",
  "MOMENTUM_SHIFT",
  "VOLATILITY_SPIKE",
  "VOLUME_EXPANSION",
  "SENTIMENT_REVERSAL"
]);

const BLOCKER_TYPES = Object.freeze([
  "RESISTANCE_ZONE",
  "LIQUIDITY_DROUGHT",
  "MOMENTUM_EXHAUSTION",
  "VOLATILITY_COLLAPSE"
]);

const GAP_TYPES = Object.freeze([
  "INFORMATION_ASYMMETRY",
  "STRUCTURAL_IMBALANCE",
  "TEMPORAL_DISLOCATION"
]);

/* ============================================
   REENTRANCY LOCK
   ============================================ */

let validationEpoch = 0;

/* ============================================
   DOM REFERENCES
   ============================================ */

const deliveryModeEl = document.getElementById("delivery-mode") as HTMLDivElement;
const navEl =document.getElementById("nav") as HTMLDivElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

/* ============================================
   CRYPTOGRAPHIC VALIDATION
   ============================================ */

function decodeBase64ToUint8(base64: string): Uint8Array {
  try {
    if (typeof base64 !== 'string') {
      throw new Error("Not a string");
    }
    const normalized = base64.replace(/\s/g, '').trim();
    if (normalized.length === 0) {
      throw new Error("Empty Base64");
    }
    if (normalized.length < 4) {
      throw new Error("Base64 too short");
    }
    
    const binaryString = atob(normalized);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    throw new Error("Invalid Base64");
  }
}

async function importPublicKey(base64: string): Promise<CryptoKey> {
  try {
    const keyData = decodeBase64ToUint8(base64);
    return await crypto.subtle.importKey(
      "raw",
      keyData as BufferSource,
      {
        name: "Ed25519",
        namedCurve: "Ed25519"
      } as any,
      false,
      ["verify"]
    );
  } catch (err) {
    throw new Error("Key import failed");
  }
}

async function verifySignature(
  payloadUint8: Uint8Array,
  signatureUint8: Uint8Array,
  publicKey: CryptoKey
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      signatureUint8 as BufferSource,
      payloadUint8 as BufferSource
    );
  } catch (err) {
    return false;
  }
}

function isFresh(issuedAtISO: string): boolean {
  try {
    if (typeof issuedAtISO !== 'string') return false;
    
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!iso8601Pattern.test(issuedAtISO)) return false;
    
    const issued = Date.parse(issuedAtISO);
    if (isNaN(issued)) return false;
    
    const now = Date.now();
    const skew = Math.abs(now - issued);
    
    const maxReasonable = 365 * 24 * 60 * 60 * 1000;
    if (skew > maxReasonable) return false;
    
    return skew <= MAX_SKEW_MS;
  } catch (err) {
    return false;
  }
}

/* ============================================
   STRUCTURAL VALIDATION
   ============================================ */

function unifiedStructuralGuard(packet: any): boolean {
  try {
    if (!packet || typeof packet !== 'object') return false;
    if (packet.__proto__ !== Object.prototype && packet.__proto__ !== null) return false;
    
    const tier = packet.meta?.tier ?? 0;
    if (![0, 1, 2].includes(tier)) return false;
    
    if (!packet.nav || typeof packet.nav !== 'object') return false;
    if (typeof packet.nav.regime !== 'string' || !REGIMES.includes(packet.nav.regime)) return false;
    if (typeof packet.nav.risk !== 'string' || !RISK_LEVELS.includes(packet.nav.risk)) return false;
    if (typeof packet.nav.confidence !== 'string' || !CONFIDENCE_LEVELS.includes(packet.nav.confidence)) return false;
    
    if (tier === 0) {
      if (packet.nav.bias || packet.nav.stability || packet.navigator) return false;
      if (packet.meta?.signature || packet.meta?.kid) return false;
    }
    
    if (tier === 1) {
      if (!packet.meta?.signature || !packet.meta?.kid || !packet.meta?.issued_at) return false;
      if (typeof packet.nav.bias !== 'string' || !BIAS_LEVELS.includes(packet.nav.bias)) return false;
      if (typeof packet.nav.stability !== 'string' || !STABILITY_LEVELS.includes(packet.nav.stability)) return false;
      if (packet.navigator) return false;
    }
    
    if (tier === 2) {
      if (!packet.meta?.signature || !packet.meta?.kid || !packet.meta?.issued_at) return false;
      if (typeof packet.nav.bias !== 'string' || !BIAS_LEVELS.includes(packet.nav.bias)) return false;
      if (typeof packet.nav.stability !== 'string' || !STABILITY_LEVELS.includes(packet.nav.stability)) return false;
      if (!packet.navigator || typeof packet.navigator !== 'object') return false;
      
      if (!Array.isArray(packet.navigator.drivers)) return false;
      if (packet.navigator.drivers.length > 3) return false;
      for (const d of packet.navigator.drivers) {
        if (typeof d !== 'string' || !DRIVER_TYPES.includes(d)) return false;
      }
      
      if (!Array.isArray(packet.navigator.blockers)) return false;
      if (packet.navigator.blockers.length > 2) return false;
      for (const b of packet.navigator.blockers) {
        if (typeof b !== 'string' || !BLOCKER_TYPES.includes(b)) return false;
      }
      
      if (!Array.isArray(packet.navigator.gaps)) return false;
      if (packet.navigator.gaps.length > 2) return false;
      for (const g of packet.navigator.gaps) {
        if (typeof g !== 'string' || !GAP_TYPES.includes(g)) return false;
      }
    }
    
    return true;
  } catch (err) {
    return false;
  }
}

function buildGlobalPayload(packet: any): Uint8Array {
  try {
    const tier = packet.meta?.tier ?? 0;
    const regime = packet.nav?.regime ?? "";
    const risk = packet.nav?.risk ?? "";
    const confidence = packet.nav?.confidence ?? "";
    const bias = packet.nav?.bias ?? "";
    const stability = packet.nav?.stability ?? "";
    const drivers = packet.navigator?.drivers ? packet.navigator.drivers.join(",") : "";
    const blockers = packet.navigator?.blockers ? packet.navigator.blockers.join(",") : "";
    const gaps = packet.navigator?.gaps ? packet.navigator.gaps.join(",") : "";
    const kid = packet.meta?.kid ?? "";
    const issued_at = packet.meta?.issued_at ?? "";
    
    const payload = 
      String(tier) +
      regime +
      risk +
      confidence +
      bias +
      stability +
      drivers +
      blockers +
      gaps +
      kid +
      issued_at;
    
    const encoder = new TextEncoder();
    return encoder.encode(payload);
  } catch (err) {
    throw new Error("Global payload build failed");
  }
}

async function validatePacket(packet: any, epoch: number): Promise<{ tier: number; packet: any }> {
  try {
    if (epoch !== validationEpoch) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    const tier = packet.meta?.tier ?? 0;
    
    if (tier === 0) {
      if (!unifiedStructuralGuard(packet)) {
        return { tier: 0, packet: STATIC_NAV_PACKET };
      }
      return { tier: 0, packet: packet };
    }
    
    if (!unifiedStructuralGuard(packet)) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    if (epoch !== validationEpoch) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    const kid = packet.meta.kid;
    if (!TRUSTED_KEYS[kid]) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    if (!isFresh(packet.meta.issued_at)) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    const payloadBytes = buildGlobalPayload(packet);
    if (payloadBytes.length === 0 || payloadBytes.length > 2048) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    const signatureBytes = decodeBase64ToUint8(packet.meta.signature);
    if (signatureBytes.length !== 64) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    if (epoch !== validationEpoch) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    const publicKey = await importPublicKey(TRUSTED_KEYS[kid]);
    
    if (epoch !== validationEpoch) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    const valid = await verifySignature(payloadBytes, signatureBytes, publicKey);
    
    if (epoch !== validationEpoch) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    if (!valid) {
      return { tier: 0, packet: STATIC_NAV_PACKET };
    }
    
    return {
      tier: tier,
      packet: Object.freeze({
        nav: Object.freeze({ ...packet.nav }),
        navigator: packet.navigator ? Object.freeze({
          drivers: Object.freeze([...packet.navigator.drivers]),
          blockers: Object.freeze([...packet.navigator.blockers]),
          gaps: Object.freeze([...packet.navigator.gaps])
        }) : undefined,
        meta: Object.freeze({ ...packet.meta }),
        status: packet.status ? Object.freeze({ ...packet.status }) : undefined
      })
    };
    
  } catch (err) {
    return { tier: 0, packet: STATIC_NAV_PACKET };
  }
}

/* ============================================
   ST STATE MANAGEMENT
   ============================================ */

let currentPacket: any = null;

function sanitizeAll(): void {
  try {
    validationEpoch++;
    
    currentPacket = null;
    
    currentPacket = Object.freeze({
      regime: STATIC_NAV_PACKET.regime,
      risk: STATIC_NAV_PACKET.risk,
      confidence: STATIC_NAV_PACKET.confidence,
      status: "STALE",
      scope: STATIC_NAV_PACKET.scope
    });

    renderNAV(0, currentPacket);

  } catch (err) {
    validationEpoch++;
    currentPacket = null;
    triggerFailSafe();
  }
}

async function updateState(packet: MarketPacket): Promise<void> {
  const currentEpoch = ++validationEpoch;
  
  try {
    if (!packet || typeof packet !== 'object') {
      sanitizeAll();
      return;
    }
    
    const result = await validatePacket(packet, currentEpoch);
    
    if (currentEpoch !== validationEpoch) {
      return;
    }
    
    currentPacket = result.packet;
    renderNAV(result.tier, currentPacket);
    
  } catch (err) {
    sanitizeAll();
    triggerFailSafe();
  }
}

/* ============================================
   RENDERING
   ============================================ */

function sanitizeForTier0(state: any): any {
  try {
    const sanitized = {
      regime: state.regime,
      risk: state.risk,
      confidence: state.confidence,
      status: state.status,
      scope: state.scope
    };

    if (!REGIMES.includes(sanitized.regime)) {
      throw new Error("Invalid regime");
    }
    if (!RISK_LEVELS.includes(sanitized.risk)) {
      throw new Error("Invalid risk");
    }
    if (!CONFIDENCE_LEVELS.includes(sanitized.confidence)) {
      throw new Error("Invalid confidence");
    }
    if (sanitized.status !== "LIVE" && sanitized.status !== "UNKNOWN" && sanitized.status !== "STALE") {
      throw new Error("Invalid status");
    }
    if (sanitized.scope !== "PUBLIC" && sanitized.scope !== undefined) {
      throw new Error("Invalid scope");
    }

    return sanitized;

  } catch (err) {
    return {
      regime: "UNKNOWN",
      risk: "NORMAL",
      confidence: "LOW",
      status: "UNKNOWN",
      scope: "PUBLIC"
    };
  }
}

function renderNAV(tier: number, state: any): void {
  try {
    if (tier === 2) {
      const drivers = state.navigator?.drivers?.join(", ") || "";
      const blockers = state.navigator?.blockers?.join(", ") || "";
      const gaps = state.navigator?.gaps?.join(", ") || "";
      
      const navLine =
        `[NAV] REGIME: ${state.nav.regime}` +
        ` | BIAS: ${state.nav.bias}` +
        ` | STABILITY: ${state.nav.stability}` +
        ` | RISK: ${state.nav.risk}` +
        ` | CONFIDENCE: ${state.nav.confidence}\n` +
        `[NAVIGATOR] DRIVERS: ${drivers}` +
        ` | BLOCKERS: ${blockers}` +
        ` | GAPS: ${gaps}`;
      
      navEl.textContent = navLine;
    } else if (tier === 1) {
      const navLine =
        `[NAV] REGIME: ${state.nav.regime}` +
        ` | BIAS: ${state.nav.bias}` +
        ` | STABILITY: ${state.nav.stability}` +
        ` | RISK: ${state.nav.risk}` +
        ` | CONFIDENCE: ${state.nav.confidence}`;
      
      navEl.textContent = navLine;
    } else {
      const safeState = sanitizeForTier0(state);
      
      const navLine =
        `[NAV] REGIME: ${safeState.regime}` +
        ` | RISK: ${safeState.risk}` +
        ` | CONFIDENCE: ${safeState.confidence}` +
        ` | STATUS: ${safeState.status}` +
        ` | SCOPE: ${safeState.scope}`;
      
      navEl.textContent = navLine;
    }
    
  } catch (err) {
    navEl.textContent = "[NAV] STATE: UNKNOWN";
  }
}

function renderStatus(): void {
  try {
    const statusLine =
      `[STATUS] LIVE` +
      ` | SOURCE: PRESENT_STATE` +
      ` | MODE: READ_ONLY`;

    statusEl.textContent = statusLine;

  } catch (err) {
    statusEl.textContent = "[STATUS] OFFLINE";
  }
}

function triggerFailSafe(): void {
  try {
    navEl.textContent = "";
    statusEl.textContent = "";
    navEl.textContent = "[NAV] STATE: UNKNOWN";
    statusEl.textContent = "[STATUS] OFFLINE";
  } catch (err) {
    document.getElementById("terminal")!.innerHTML = "";
  }
}

/* ============================================
   UX SIGNAL: DELIVERY MODE INDICATOR
   ============================================ */

function updateDeliveryModeIndicator(mode: DeliveryMode): void {
  if (mode === DeliveryMode.SSE_PRIMARY) {
    deliveryModeEl.textContent = "Status: LIVE";
  } else if (mode === DeliveryMode.REST_DEGRADED) {
    deliveryModeEl.textContent = "Status: DEGRADED";
  }
}

/* ============================================
   PHASE 22.4: DELIVERY CONTROLLER WIRING
   ============================================ */

const handlers: DeliveryControllerHandlers = {
  onPacket: async (packet: MarketPacket, _source: DeliveryMode) => {
    await updateState(packet);
  },
  
  onModeChange: (mode: DeliveryMode) => {
    updateDeliveryModeIndicator(mode);
  },
  
  onError: (error: Error) => {
    console.error('[App] Delivery error:', error.message);
  }
};

const controller = createDeliveryController(
  {
    sseEndpoint: "/stream",
    restEndpoint: "/api/v1/latest",
    restPollingInterval: 2000,
    sseRecoveryInterval: 30000
  },
  handlers
);

/* ============================================
   BOOTSTRAP
   ============================================ */

function init(): void {
  try {
    // Render initial state
    renderNAV(0, STATIC_NAV_PACKET);
    renderStatus();
    
    // Start delivery controller
    controller.start();
    
    // Shutdown on page unload
    window.addEventListener('beforeunload', () => {
      controller.stop();
    });
    
  } catch (err) {
    triggerFailSafe();
  }
}

// Start application
init();
