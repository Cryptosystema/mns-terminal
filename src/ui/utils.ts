/**
 * UI Utilities - Loading States, Errors, Toasts
 * Phase 25: Professional UI/UX
 */

/* ============================================
   LOADING OVERLAY
   ============================================ */

export function showLoading(message: string = 'Loading...'): void {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  
  const textEl = overlay.querySelector('.loading-text');
  if (textEl) {
    textEl.textContent = message;
  }
  
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
}

export function hideLoading(): void {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

/* ============================================
   LOADING STATES FOR ELEMENTS
   ============================================ */

export function setElementLoading(elementId: string, isLoading: boolean): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (isLoading) {
    element.classList.add('loading');
    element.setAttribute('aria-busy', 'true');
  } else {
    element.classList.remove('loading');
    element.setAttribute('aria-busy', 'false');
  }
}

export function setElementUpdating(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  element.classList.add('updating');
  setTimeout(() => {
    element.classList.remove('updating');
  }, 500);
}

/* ============================================
   ERROR DISPLAY
   ============================================ */

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

interface ErrorConfig {
  title: string;
  message: string;
  action: string;
  icon: string;
}

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  [ErrorType.NETWORK_ERROR]: {
    title: 'Connection Issue',
    message: 'Unable to reach servers. Check your internet connection.',
    action: 'Retry',
    icon: '⚠️'
  },
  [ErrorType.API_ERROR]: {
    title: 'Service Temporarily Unavailable',
    message: 'Our servers are experiencing high load. Please try again.',
    action: 'Refresh',
    icon: '⚠️'
  },
  [ErrorType.PARSE_ERROR]: {
    title: 'Data Error',
    message: 'Received invalid data from server. This has been logged.',
    action: 'Reload',
    icon: '⚠️'
  },
  [ErrorType.TIMEOUT]: {
    title: 'Request Timed Out',
    message: 'The request took too long. Please try again.',
    action: 'Retry',
    icon: '⏱️'
  },
  [ErrorType.UNKNOWN]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Reload',
    icon: '❌'
  }
};

export function detectErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  
  if (message.includes('fetch') || message.includes('network')) {
    return ErrorType.NETWORK_ERROR;
  }
  if (message.includes('timeout')) {
    return ErrorType.TIMEOUT;
  }
  if (message.includes('parse') || message.includes('json')) {
    return ErrorType.PARSE_ERROR;
  }
  if (message.includes('api') || message.includes('status')) {
    return ErrorType.API_ERROR;
  }
  
  return ErrorType.UNKNOWN;
}

export function showError(
  error: Error,
  onRetry?: () => void,
  containerId: string = 'error-container'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const errorType = detectErrorType(error);
  const config = ERROR_CONFIGS[errorType];
  
  container.innerHTML = `
    <div class="error-container" role="alert">
      <div class="error-icon">${config.icon}</div>
      <h2 class="error-title">${config.title}</h2>
      <p class="error-message">${config.message}</p>
      <div class="error-actions">
        <button class="btn-retry" id="error-retry-btn">
          ${config.action}
        </button>
      </div>
    </div>
  `;
  
  container.style.display = 'block';
  
  // Add retry handler
  const retryBtn = document.getElementById('error-retry-btn');
  if (retryBtn && onRetry) {
    retryBtn.addEventListener('click', () => {
      hideError(containerId);
      onRetry();
    });
  }
  
  // Log error
  console.error(`[Error] ${errorType}:`, error);
}

export function hideError(containerId: string = 'error-container'): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.style.display = 'none';
  container.innerHTML = '';
}

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

let toastTimeout: number | null = null;

export function showToast(
  message: string,
  type: ToastType = ToastType.INFO,
  duration: number = 3000
): void {
  // Remove existing toast
  const existingToast = document.getElementById('toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Clear existing timeout
  if (toastTimeout !== null) {
    clearTimeout(toastTimeout);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  
  document.body.appendChild(toast);
  
  // Auto-remove after duration
  toastTimeout = window.setTimeout(() => {
    toast.remove();
    toastTimeout = null;
  }, duration);
}

/* ============================================
   FOCUS MANAGEMENT (Accessibility)
   ============================================ */

export function trapFocus(element: HTMLElement): void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  });
}

/* ============================================
   KEYBOARD SHORTCUTS
   ============================================ */

export function setupKeyboardShortcuts(handlers: Record<string, () => void>): void {
  document.addEventListener('keydown', (e) => {
    // Skip if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    
    const key = e.key.toLowerCase();
    const handler = handlers[key];
    
    if (handler) {
      e.preventDefault();
      handler();
    }
  });
}

/* ============================================
   DEBOUNCE UTILITY
   ============================================ */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = window.setTimeout(later, wait);
  };
}

/* ============================================
   THROTTLE UTILITY
   ============================================ */

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
