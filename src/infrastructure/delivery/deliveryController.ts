/**
 * Delivery Controller — Phase 22.3
 * Market Navigation System (MNS)
 * 
 * Purpose: Orchestrate primary (SSE) and fallback (REST) delivery mechanisms
 * Guarantee: Mutual exclusion - SSE and REST NEVER active simultaneously
 * 
 * Responsibilities:
 * - Manage delivery mode state (SSE_PRIMARY vs REST_DEGRADED)
 * - Switch to REST polling on SSE failure
 * - Attempt SSE recovery periodically
 * - Forward packets to state layer
 * 
 * Non-goals (per Integration Contract):
 * - No UI logic
 * - No data interpretation
 * - No cryptographic validation (delegated to state layer)
 * - No parallel delivery modes
 */

"use strict";

import {
  SSEClient,
  SSEConnectionState,
  SSEClientConfig,
  SSEEventHandlers,
  MarketPacket,
  createSSEClient
} from "../sse/sseClient.js";

/* ============================================
   DELIVERY MODE
   ============================================ */

/**
 * Delivery mode state
 * 
 * CRITICAL INVARIANT: Only ONE mode can be active at any time.
 * SSE_PRIMARY and REST_DEGRADED are mutually exclusive.
 */
export enum DeliveryMode {
  /** SSE active, REST inactive */
  SSE_PRIMARY = "SSE_PRIMARY",
  
  /** REST polling active, SSE inactive */
  REST_DEGRADED = "REST_DEGRADED"
}

/* ============================================
   CONFIGURATION
   ============================================ */

export interface DeliveryControllerConfig {
  /** SSE endpoint (default: /stream) */
  sseEndpoint: string;
  
  /** REST snapshot endpoint (default: /api/v1/latest) */
  restEndpoint: string;
  
  /** REST polling interval in milliseconds (default: 2000ms) */
  restPollingInterval: number;
  
  /** SSE recovery attempt interval in milliseconds (default: 30000ms = 30s) */
  sseRecoveryInterval: number;
  
  /** Maximum payload size for SSE (default: 16384 bytes) */
  maxPayloadSize: number;
  
  /** Throttle interval for SSE messages (default: 1000ms) */
  throttleMs: number;
}

const DEFAULT_CONFIG: DeliveryControllerConfig = {
  sseEndpoint: "/stream",
  restEndpoint: "/api/v1/latest",
  restPollingInterval: 2000,
  sseRecoveryInterval: 30000,
  maxPayloadSize: 16384,
  throttleMs: 1000
};

/* ============================================
   CALLBACK HANDLERS
   ============================================ */

export interface DeliveryControllerHandlers {
  /**
   * Called when a packet is received (from SSE or REST)
   * @param packet - Market packet (Tier0/Tier1/Tier2)
   * @param source - Delivery mode that provided the packet
   */
  onPacket: (packet: MarketPacket, source: DeliveryMode) => void;
  
  /**
   * Called when delivery mode changes
   * @param mode - New delivery mode
   */
  onModeChange: (mode: DeliveryMode) => void;
  
  /**
   * Called on errors (lifecycle only, no packet data)
   * @param error - Error details
   */
  onError?: (error: Error) => void;
}

/* ============================================
   DELIVERY CONTROLLER
   ============================================ */

export class DeliveryController {
  private config: DeliveryControllerConfig;
  private handlers: DeliveryControllerHandlers;
  
  // Delivery clients
  private sseClient: SSEClient | null = null;
  
  // State
  private currentMode: DeliveryMode = DeliveryMode.SSE_PRIMARY;
  private isStarted: boolean = false;
  
  // Retry logic with exponential backoff
  private sseErrorCount: number = 0;
  private maxRetries: number = 5;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Timers (mutually exclusive with SSE connection)
  private restPollingTimer: ReturnType<typeof setInterval> | null = null;
  private sseRecoveryTimer: ReturnType<typeof setInterval> | null = null;
  
  constructor(config: Partial<DeliveryControllerConfig>, handlers: DeliveryControllerHandlers) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = handlers;
  }
  
  /**
   * Get current delivery mode
   */
  public getMode(): DeliveryMode {
    return this.currentMode;
  }
  
  /**
   * Check if controller is started
   */
  public isActive(): boolean {
    return this.isStarted;
  }
  
  /**
   * Start delivery system
   * 
   * Lifecycle:
   * 1. Set started flag
   * 2. Attempt SSE connection (primary mode)
   * 3. If SSE fails, degradation handled by SSE error callback
   */
  public start(): void {
    if (this.isStarted) {
      this.logLifecycle("start() called but already started");
      return;
    }
    
    this.isStarted = true;
    this.logLifecycle("Starting delivery controller");
    
    // Always start with SSE (primary mode)
    this.startSSEMode();
  }
  
  /**
   * Stop delivery system
   * 
   * Lifecycle:
   * 1. Stop SSE client if active
   * 2. Stop REST polling if active
   * 3. Clear recovery timer
   * 4. Clear retry timer
   * 5. Clear started flag
   */
  public stop(): void {
    if (!this.isStarted) {
      this.logLifecycle("stop() called but not started");
      return;
    }
    
    this.logLifecycle("Stopping delivery controller");
    
    // Stop all active mechanisms
    this.stopSSEMode();
    this.stopRESTMode();
    
    // Clear retry timer
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    // Reset error counter
    this.sseErrorCount = 0;
    
    this.isStarted = false;
  }
  
  /* ============================================
     PRIVATE: SSE MODE MANAGEMENT
     ============================================ */
  
  /**
   * Start SSE primary mode
   * 
   * Preconditions:
   * - REST mode must be stopped
   * - Recovery timer must be cleared
   */
  private startSSEMode(): void {
    // Ensure REST is stopped (mutual exclusion)
    this.stopRESTMode();
    
    this.logLifecycle("Starting SSE primary mode");
    
    // Create SSE client
    const sseConfig: Partial<SSEClientConfig> = {
      endpoint: this.config.sseEndpoint,
      maxPayloadSize: this.config.maxPayloadSize,
      throttleMs: this.config.throttleMs
    };
    
    const sseHandlers: SSEEventHandlers = {
      onMessage: this.handleSSEMessage.bind(this),
      onStateChange: this.handleSSEStateChange.bind(this),
      onError: this.handleSSEError.bind(this)
    };
    
    this.sseClient = createSSEClient(sseConfig, sseHandlers);
    this.sseClient.connect();
    
    // Update mode
    this.setMode(DeliveryMode.SSE_PRIMARY);
  }
  
  /**
   * Stop SSE primary mode
   */
  private stopSSEMode(): void {
    if (this.sseClient !== null) {
      this.logLifecycle("Stopping SSE mode");
      this.sseClient.disconnect();
      this.sseClient = null;
    }
  }
  
  /**
   * Handle SSE message
   */
  private handleSSEMessage(packet: MarketPacket): void {
    // Reset error counter on successful message
    this.sseErrorCount = 0;
    
    // Forward to state layer with source annotation
    this.handlers.onPacket(packet, DeliveryMode.SSE_PRIMARY);
  }
  
  /**
   * Handle SSE state change
   * 
   * Critical logic:
   * - If SSE enters ERROR state → retry with exponential backoff
   * - If SSE enters CONNECTED state → reset error counter
   * - Only degrade to REST after MAX_RETRIES failures
   */
  private handleSSEStateChange(state: SSEConnectionState): void {
    console.log(`[DELIVERY] SSE state changed: ${state}`);
    
    if (state === SSEConnectionState.ERROR) {
      this.sseErrorCount++;
      console.warn(`[DELIVERY] ⚠️ SSE error #${this.sseErrorCount}/${this.maxRetries}`);
      
      // Check if we've exceeded max retries
      if (this.sseErrorCount >= this.maxRetries) {
        console.error(`[DELIVERY] ❌ SSE failed after ${this.maxRetries} attempts - degrading to REST`);
        this.degradeToRESTMode();
        return;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const backoffMs = Math.min(1000 * Math.pow(2, this.sseErrorCount - 1), 16000);
      console.log(`[DELIVERY] 🔄 Retrying SSE in ${backoffMs}ms...`);
      
      // Clear any existing retry timer
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
      }
      
      // Schedule retry with exponential backoff
      this.retryTimer = setTimeout(() => {
        console.log(`[DELIVERY] 🔄 Attempting SSE reconnection...`);
        this.stopSSEMode();
        this.startSSEMode();
      }, backoffMs);
    }
    
    if (state === SSEConnectionState.CONNECTED) {
      console.log("[DELIVERY] ✅ SSE connection established");
      
      // Reset error counter on successful connection
      this.sseErrorCount = 0;
      
      // Clear any pending retry timer
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      
      // Ensure we're in SSE_PRIMARY mode
      if (this.currentMode !== DeliveryMode.SSE_PRIMARY) {
        this.setMode(DeliveryMode.SSE_PRIMARY);
      }
    }
  }
  
  /**
   * Handle SSE error
   */
  private handleSSEError(error: Error): void {
    if (this.handlers.onError) {
      this.handlers.onError(error);
    }
  }
  
  /* ============================================
     PRIVATE: REST MODE MANAGEMENT
     ============================================ */
  
  /**
   * Degrade to REST polling mode
   * 
   * Preconditions:
   * - SSE must be stopped
   * 
   * Actions:
   * 1. Stop SSE client
   * 2. Start REST polling timer
   * 3. Start SSE recovery timer
   * 4. Update mode to REST_DEGRADED
   */
  private degradeToRESTMode(): void {
    // Ensure SSE is stopped (mutual exclusion)
    this.stopSSEMode();
    
    this.logLifecycle("Starting REST degraded mode");
    
    // Start REST polling
    this.restPollingTimer = setInterval(
      this.pollRESTEndpoint.bind(this),
      this.config.restPollingInterval
    );
    
    // Start SSE recovery attempts
    this.sseRecoveryTimer = setInterval(
      this.attemptSSERecovery.bind(this),
      this.config.sseRecoveryInterval
    );
    
    // Update mode
    this.setMode(DeliveryMode.REST_DEGRADED);
    
    // Immediate first poll (don't wait for first interval)
    this.pollRESTEndpoint();
  }
  
  /**
   * Stop REST polling mode
   */
  private stopRESTMode(): void {
    // Clear REST polling timer
    if (this.restPollingTimer !== null) {
      this.logLifecycle("Stopping REST polling");
      clearInterval(this.restPollingTimer);
      this.restPollingTimer = null;
    }
    
    // Clear SSE recovery timer
    if (this.sseRecoveryTimer !== null) {
      clearInterval(this.sseRecoveryTimer);
      this.sseRecoveryTimer = null;
    }
  }
  
  /**
   * Poll REST endpoint for snapshot
   * 
   * Lifecycle:
   * 1. Fetch GET /api/v1/latest
   * 2. Parse JSON
   * 3. Validate structure
   * 4. Forward to state layer
   */
  private async pollRESTEndpoint(): Promise<void> {
    try {
      // Fetch snapshot
      const response = await fetch(this.config.restEndpoint, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        this.logError(`REST poll failed: HTTP ${response.status}`, null);
        return;
      }
      
      // Check content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        this.logError("REST poll failed: invalid content-type", null);
        return;
      }
      
      // Parse JSON
      const data = await response.json();
      
      // Basic validation (structure only, no crypto)
      if (!this.isValidPacketStructure(data)) {
        this.logError("REST poll failed: invalid packet structure", null);
        return;
      }
      
      // Forward to state layer with source annotation
      this.handlers.onPacket(data as MarketPacket, DeliveryMode.REST_DEGRADED);
      
    } catch (err) {
      this.logError("REST poll failed", err);
    }
  }
  
  /**
   * Attempt to recover SSE connection
   * 
   * Called periodically when in REST_DEGRADED mode.
   * 
   * Lifecycle:
   * 1. Attempt SSE connection
   * 2. If successful, SSE state change handler will trigger mode switch
   * 3. If failed, remain in REST mode (next attempt in 30s)
   */
  private attemptSSERecovery(): void {
    this.logLifecycle("Attempting SSE recovery");
    
    // Stop REST mode (mutual exclusion)
    this.stopRESTMode();
    
    // Attempt SSE connection
    this.startSSEMode();
    
    // Note: If SSE connection fails immediately, handleSSEStateChange(ERROR)
    // will be called, which will call degradeToRESTMode() again.
  }
  
  /* ============================================
     PRIVATE: MODE MANAGEMENT
     ============================================ */
  
  /**
   * Update delivery mode
   * 
   * Ensures mode transitions are logged and callbacks invoked.
   */
  private setMode(newMode: DeliveryMode): void {
    if (this.currentMode === newMode) {
      return;
    }
    
    const oldMode = this.currentMode;
    this.currentMode = newMode;
    
    this.logLifecycle(`Mode transition: ${oldMode} → ${newMode}`);
    this.handlers.onModeChange(newMode);
  }
  
  /* ============================================
     PRIVATE: VALIDATION
     ============================================ */
  
  /**
   * Basic packet structure validation (copied from SSEClient)
   * 
   * Note: This is NOT cryptographic validation.
   * Signature verification is delegated to state layer.
   */
  private isValidPacketStructure(packet: any): boolean {
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
     PRIVATE: LOGGING (LIFECYCLE ONLY)
     ============================================ */
  
  /**
   * Log delivery lifecycle events
   * 
   * Per Integration Contract Section 7:
   * - Log mode transitions
   * - NEVER log packet contents
   * - NEVER log signatures or payload data
   */
  private logLifecycle(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[DeliveryController][${timestamp}] ${message}`);
  }
  
  /**
   * Log errors (without sensitive data)
   */
  private logError(message: string, error: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[DeliveryController][${timestamp}] ERROR: ${message}`);
    
    if (error && error instanceof Error) {
      console.error(`[DeliveryController][${timestamp}] ${error.message}`);
    }
  }
}

/* ============================================
   FACTORY FUNCTION
   ============================================ */

/**
 * Create and return a new delivery controller instance
 * 
 * @param config - Controller configuration (optional, uses defaults)
 * @param handlers - Event handlers for packets and mode changes
 * @returns Configured delivery controller
 */
export function createDeliveryController(
  config: Partial<DeliveryControllerConfig>,
  handlers: DeliveryControllerHandlers
): DeliveryController {
  return new DeliveryController(config, handlers);
}
