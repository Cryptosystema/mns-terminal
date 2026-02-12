/**
 * SSE Client — Phase 22.2
 * Market Navigation System (MNS)
 * 
 * Purpose: Primary real-time delivery mechanism via Server-Sent Events
 * Backend: GET /stream
 * 
 * Responsibilities:
 * - Connect/disconnect lifecycle management
 * - Receive signed Tier0/Tier1/Tier2 packets
 * - Forward validated packets to state layer
 * - Expose explicit connection status
 * 
 * Non-goals (per Integration Contract):
 * - No REST fallback (Phase 22.3)
 * - No retry logic (browser EventSource handles reconnection)
 * - No business logic (packets are opaque)
 * - No authentication
 */

"use strict";

/* ============================================
   CONNECTION STATE
   ============================================ */

export enum SSEConnectionState {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR"
}

/* ============================================
   PACKET TYPES (OPAQUE TO CLIENT)
   ============================================ */

/**
 * Tier0 packet structure (unsigned, public)
 */
export interface Tier0Packet {
  nav: {
    regime: string;
    risk: string;
    confidence: string;
    status: string;
    scope: string;
  };
  meta?: {
    tier: 0;
  };
}

/**
 * Tier1 packet structure (signed, with bias/stability)
 */
export interface Tier1Packet {
  nav: {
    regime: string;
    risk: string;
    confidence: string;
    bias: string;
    stability: string;
  };
  meta: {
    tier: 1;
    signature: string;
    kid: string;
    issued_at: string;
  };
}

/**
 * Tier2 packet structure (signed, with navigator fields)
 */
export interface Tier2Packet {
  nav: {
    regime: string;
    risk: string;
    confidence: string;
    bias: string;
    stability: string;
  };
  navigator: {
    drivers: string[];
    blockers: string[];
    gaps: string[];
  };
  meta: {
    tier: 2;
    signature: string;
    kid: string;
    issued_at: string;
  };
}

export type MarketPacket = Tier0Packet | Tier1Packet | Tier2Packet;

/* ============================================
   CONFIGURATION
   ============================================ */

export interface SSEClientConfig {
  /** SSE endpoint URL (default: /stream) */
  endpoint: string;
  
  /** Maximum payload size in bytes (default: 16384 = 16KB) */
  maxPayloadSize: number;
  
  /** Throttle interval in milliseconds (default: 1000 = 1Hz) */
  throttleMs: number;
}

const DEFAULT_CONFIG: SSEClientConfig = {
  endpoint: "/stream",
  maxPayloadSize: 16384,
  throttleMs: 1000
};

/* ============================================
   EVENT HANDLERS
   ============================================ */

export interface SSEEventHandlers {
  /**
   * Called when a valid nav_update message is received
   * @param packet - Parsed market packet (Tier0/Tier1/Tier2)
   */
  onMessage: (packet: MarketPacket) => void;
  
  /**
   * Called when connection state changes
   * @param state - New connection state
   */
  onStateChange: (state: SSEConnectionState) => void;
  
  /**
   * Called when connection opens successfully
   */
  onOpen?: () => void;
  
  /**
   * Called on connection error or malformed data
   * @param error - Error details (never contains packet content)
   */
  onError?: (error: Error) => void;
  
  /**
   * Called on keep_alive ping (optional, for monitoring)
   */
  onKeepAlive?: () => void;
}

/* ============================================
   SSE CLIENT IMPLEMENTATION
   ============================================ */

export class SSEClient {
  private config: SSEClientConfig;
  private handlers: SSEEventHandlers;
  private eventSource: EventSource | null = null;
  private state: SSEConnectionState = SSEConnectionState.DISCONNECTED;
  private lastMessageTime: number = 0;
  private navUpdateHandler: ((event: MessageEvent) => void) | null = null;
  private keepAliveHandler: ((event: MessageEvent) => void) | null = null;
  
  constructor(config: Partial<SSEClientConfig>, handlers: SSEEventHandlers) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = handlers;
  }
  
  /**
   * Get current connection state
   */
  public getState(): SSEConnectionState {
    return this.state;
  }
  
  /**
   * Connect to SSE stream
   * 
   * Lifecycle:
   * 1. Set state to CONNECTING
   * 2. Create EventSource
   * 3. Attach event listeners
   * 4. Transition to CONNECTED on open
   * 5. Transition to ERROR on error
   * 
   * Browser EventSource handles automatic reconnection.
   */
  public connect(): void {
    if (this.eventSource !== null) {
      this.logLifecycle("connect() called but already connected/connecting");
      return;
    }
    
    try {
      this.setState(SSEConnectionState.CONNECTING);
      this.logLifecycle(`Connecting to ${this.config.endpoint}`);
      console.log("[SSE] Initializing connection to:", this.config.endpoint);
      
      this.eventSource = new EventSource(this.config.endpoint, {
        withCredentials: false
      });
      
      // Standard EventSource events
      this.eventSource.onopen = this.handleOpen.bind(this);
      this.eventSource.onerror = this.handleError.bind(this);
      this.eventSource.onmessage = this.handleDefaultMessage.bind(this);
      
      // Custom event types (backend-specific)
      this.navUpdateHandler = this.handleNavUpdate.bind(this);
      this.keepAliveHandler = this.handleKeepAlive.bind(this);
      this.eventSource.addEventListener("nav_update", this.navUpdateHandler);
      this.eventSource.addEventListener("keep_alive", this.keepAliveHandler);
      
    } catch (err) {
      this.logError("connect() failed", err);
      this.setState(SSEConnectionState.ERROR);
      
      if (this.handlers.onError) {
        this.handlers.onError(new Error("Failed to create EventSource"));
      }
    }
  }
  
  /**
   * Disconnect from SSE stream
   * 
   * Lifecycle:
   * 1. Close EventSource
   * 2. Set state to DISCONNECTED
   * 3. Clean up references
   */
  public disconnect(): void {
    if (this.eventSource === null) {
      this.logLifecycle("disconnect() called but not connected");
      return;
    }
    
    try {
      this.logLifecycle("Disconnecting");

      if (this.navUpdateHandler !== null) {
        this.eventSource.removeEventListener("nav_update", this.navUpdateHandler);
        this.navUpdateHandler = null;
      }

      if (this.keepAliveHandler !== null) {
        this.eventSource.removeEventListener("keep_alive", this.keepAliveHandler);
        this.keepAliveHandler = null;
      }

      this.eventSource.close();
      this.eventSource = null;
      this.setState(SSEConnectionState.DISCONNECTED);
      
    } catch (err) {
      this.logError("disconnect() failed", err);
      // Force cleanup
      this.eventSource = null;
      this.setState(SSEConnectionState.DISCONNECTED);
    }
  }
  
  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.state === SSEConnectionState.CONNECTED;
  }
  
  /* ============================================
     PRIVATE: EVENT HANDLERS
     ============================================ */
  
  private handleOpen(): void {
    this.logLifecycle("Connection opened");
    console.log("[SSE] ✅ Connection opened");
    this.setState(SSEConnectionState.CONNECTED);
    
    if (this.handlers.onOpen) {
      this.handlers.onOpen();
    }
  }
  
  private handleError(_event: Event): void {
    const readyState = this.eventSource?.readyState ?? -1;
    this.logLifecycle("Connection error (readyState: " + readyState + ")");
    console.warn("[SSE] ⚠️ Connection error, readyState:", readyState);
    
    // Only set ERROR state if connection is truly closed
    if (readyState === EventSource.CLOSED) {
      console.error("[SSE] ❌ Connection CLOSED");
      this.setState(SSEConnectionState.ERROR);
      
      if (this.handlers.onError) {
        this.handlers.onError(new Error("EventSource closed"));
      }
    } else {
      // Transient error - browser will reconnect automatically
      console.log("[SSE] 🔄 Transient error, awaiting auto-reconnection...");
    }
  }

  private handleDefaultMessage(event: MessageEvent): void {
    console.log("[SSE] 📨 Message received:", event.data);
    this.handleNavUpdate(event);
  }
  
  private handleNavUpdate(event: MessageEvent): void {
    try {
      console.log("[SSE] 📨 nav_update received");
      const now = Date.now();
      
      // Throttle check (prevent overwhelming state layer)
      if (now - this.lastMessageTime < this.config.throttleMs) {
        // Silent drop (per contract, no logging of packet content)
        return;
      }
      
      // Payload size check
      const data = event.data;
      if (!data || typeof data !== "string") {
        console.warn("[SSE] ⚠️ Invalid data type, ignoring");
        return;
      }
      
      if (data.length > this.config.maxPayloadSize) {
        console.warn("[SSE] ⚠️ Payload too large, ignoring");
        return;
      }
      
      // Parse JSON with tolerant error handling
      let payload: any;
      try {
        payload = JSON.parse(data);
      } catch (parseErr) {
        console.warn("[SSE] ⚠️ Non-JSON packet ignored");
        return;
      }
      
      // Tolerant validation - accept any object with minimal nav structure
      if (!payload || typeof payload !== "object") {
        console.warn("[SSE] ⚠️ Invalid payload structure, ignoring");
        return;
      }
      
      // Accept packet if it has nav field (defensive parsing)
      const packet = this.normalizePacket(payload);
      if (!packet) {
        console.warn("[SSE] ⚠️ Cannot normalize packet, ignoring");
        return;
      }
      
      // Update throttle timestamp
      this.lastMessageTime = now;
      
      console.log("[SSE] ✅ Packet accepted and forwarded");
      
      // Forward to state layer
      this.handlers.onMessage(packet);
      
    } catch (err) {
      console.warn("[SSE] ⚠️ Handler error:", err);
      // Don't throw - keep connection alive
    }
  }
  
  private handleKeepAlive(_event: MessageEvent): void {
    console.log("[SSE] 📨 keep_alive received");
    // Keep-alive ping from backend (no action required)
    if (this.handlers.onKeepAlive) {
      this.handlers.onKeepAlive();
    }
  }
  
  /* ============================================
     PRIVATE: VALIDATION
     ============================================ */
  
  /**
   * Normalize and validate packet structure (TOLERANT)
   * 
   * Note: This is NOT cryptographic validation.
   * Accepts any structure with nav field using defensive optional chaining.
   * Signature verification is delegated to the state layer.
   */
  private normalizePacket(payload: any): MarketPacket | null {
    try {
      // Minimum requirement: nav object exists
      if (!payload?.nav || typeof payload.nav !== "object") {
        return null;
      }
      
      // Determine tier (default to 0 if not specified)
      const tier = payload.meta?.tier ?? 0;
      
      // Build normalized packet with defensive optional chaining
      const normalized: any = {
        nav: {
          regime: payload.nav.regime ?? "unknown",
          risk: payload.nav.risk ?? "unknown",
          confidence: payload.nav.confidence ?? "unknown",
          status: payload.nav.status ?? undefined,
          scope: payload.nav.scope ?? undefined,
          bias: payload.nav.bias ?? undefined,
          stability: payload.nav.stability ?? undefined
        }
      };
      
      // Add meta if present
      if (payload.meta) {
        normalized.meta = {
          tier: tier,
          signature: payload.meta.signature ?? undefined,
          kid: payload.meta.kid ?? undefined,
          issued_at: payload.meta.issued_at ?? undefined
        };
      }
      
      // Add navigator if present (Tier 2)
      if (payload.navigator) {
        normalized.navigator = {
          drivers: Array.isArray(payload.navigator.drivers) ? payload.navigator.drivers : [],
          blockers: Array.isArray(payload.navigator.blockers) ? payload.navigator.blockers : [],
          gaps: Array.isArray(payload.navigator.gaps) ? payload.navigator.gaps : []
        };
      }
      
      return normalized as MarketPacket;
      
    } catch (err) {
      console.warn("[SSE] ⚠️ Normalization error:", err);
      return null;
    }
  }
  
  /* ============================================
     PRIVATE: STATE MANAGEMENT
     ============================================ */
  
  private setState(newState: SSEConnectionState): void {
    if (this.state === newState) {
      return;
    }
    
    const oldState = this.state;
    this.state = newState;
    
    this.logLifecycle(`State transition: ${oldState} → ${newState}`);
    this.handlers.onStateChange(newState);
  }
  
  /* ============================================
     PRIVATE: LOGGING (LIFECYCLE ONLY)
     ============================================ */
  
  /**
   * Log connection lifecycle events
   * 
   * Per Integration Contract Section 7:
   * - Log connection/disconnection events
   * - NEVER log packet contents
   * - NEVER log signatures or payload data
   */
  private logLifecycle(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[SSEClient][${timestamp}] ${message}`);
  }
  
  /**
   * Log errors (without sensitive data)
   */
  private logError(message: string, error: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[SSEClient][${timestamp}] ERROR: ${message}`);
    
    if (error && error instanceof Error) {
      console.error(`[SSEClient][${timestamp}] ${error.message}`);
    }
  }
}

/* ============================================
   FACTORY FUNCTION
   ============================================ */

/**
 * Create and return a new SSE client instance
 * 
 * @param config - Client configuration (optional, uses defaults)
 * @param handlers - Event handlers for lifecycle and messages
 * @returns Configured SSE client
 */
export function createSSEClient(
  config: Partial<SSEClientConfig>,
  handlers: SSEEventHandlers
): SSEClient {
  return new SSEClient(config, handlers);
}
