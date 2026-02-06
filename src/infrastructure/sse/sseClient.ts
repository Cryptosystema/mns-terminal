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
      
      this.eventSource = new EventSource(this.config.endpoint);
      
      // Standard EventSource events
      this.eventSource.onopen = this.handleOpen.bind(this);
      this.eventSource.onerror = this.handleError.bind(this);
      
      // Custom event types (backend-specific)
      this.eventSource.addEventListener("nav_update", this.handleNavUpdate.bind(this));
      this.eventSource.addEventListener("keep_alive", this.handleKeepAlive.bind(this));
      
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
    this.setState(SSEConnectionState.CONNECTED);
    
    if (this.handlers.onOpen) {
      this.handlers.onOpen();
    }
  }
  
  private handleError(_event: Event): void {
    this.logLifecycle("Connection error");
    this.setState(SSEConnectionState.ERROR);
    
    if (this.handlers.onError) {
      this.handlers.onError(new Error("EventSource error"));
    }
    
    // Note: Browser EventSource will attempt auto-reconnection
    // We transition back to CONNECTING when reconnection starts
  }
  
  private handleNavUpdate(event: MessageEvent): void {
    try {
      const now = Date.now();
      
      // Throttle check (prevent overwhelming state layer)
      if (now - this.lastMessageTime < this.config.throttleMs) {
        // Silent drop (per contract, no logging of packet content)
        return;
      }
      
      // Payload size check
      const data = event.data;
      if (!data || typeof data !== "string") {
        this.logError("nav_update: invalid data type", null);
        return;
      }
      
      if (data.length > this.config.maxPayloadSize) {
        this.logError("nav_update: payload too large", null);
        return;
      }
      
      // Parse JSON
      let packet: MarketPacket;
      try {
        packet = JSON.parse(data);
      } catch (parseErr) {
        this.logError("nav_update: JSON parse failed", parseErr);
        return;
      }
      
      // Basic structural validation (tier check)
      if (!this.isValidPacketStructure(packet)) {
        this.logError("nav_update: invalid packet structure", null);
        return;
      }
      
      // Update throttle timestamp
      this.lastMessageTime = now;
      
      // Forward to state layer
      this.handlers.onMessage(packet);
      
    } catch (err) {
      this.logError("nav_update: handler failed", err);
    }
  }
  
  private handleKeepAlive(_event: MessageEvent): void {
    // Keep-alive ping from backend (no action required)
    if (this.handlers.onKeepAlive) {
      this.handlers.onKeepAlive();
    }
  }
  
  /* ============================================
     PRIVATE: VALIDATION
     ============================================ */
  
  /**
   * Basic packet structure validation
   * 
   * Note: This is NOT cryptographic validation.
   * This only checks that the packet has the expected shape.
   * Signature verification is delegated to the state layer.
   */
  private isValidPacketStructure(packet: any): packet is MarketPacket {
    try {
      if (!packet || typeof packet !== "object") {
        return false;
      }
      
      // Check for nav field
      if (!packet.nav || typeof packet.nav !== "object") {
        return false;
      }
      
      // Determine tier (default to 0 if not specified)
      const tier = packet.meta?.tier ?? 0;
      
      // Validate tier is 0, 1, or 2
      if (![0, 1, 2].includes(tier)) {
        return false;
      }
      
      // Tier 0: unsigned, minimal fields
      if (tier === 0) {
        return (
          typeof packet.nav.regime === "string" &&
          typeof packet.nav.risk === "string" &&
          typeof packet.nav.confidence === "string"
        );
      }
      
      // Tier 1/2: signed, with meta
      if (tier === 1 || tier === 2) {
        if (!packet.meta || typeof packet.meta !== "object") {
          return false;
        }
        
        if (
          typeof packet.meta.signature !== "string" ||
          typeof packet.meta.kid !== "string" ||
          typeof packet.meta.issued_at !== "string"
        ) {
          return false;
        }
        
        // Tier 1: includes bias/stability
        if (
          typeof packet.nav.bias !== "string" ||
          typeof packet.nav.stability !== "string"
        ) {
          return false;
        }
        
        // Tier 2: includes navigator
        if (tier === 2) {
          if (!packet.navigator || typeof packet.navigator !== "object") {
            return false;
          }
          
          if (
            !Array.isArray(packet.navigator.drivers) ||
            !Array.isArray(packet.navigator.blockers) ||
            !Array.isArray(packet.navigator.gaps)
          ) {
            return false;
          }
        }
      }
      
      return true;
      
    } catch (err) {
      return false;
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
