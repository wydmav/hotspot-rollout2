import type { AuthSession } from '../types';

/**
 * In-memory Admin Session & Safe Authenticated Fetch Layer.
 * - Never persists signed session tokens or credentials to localStorage/sessionStorage.
 * - Sends HttpOnly session cookies (`credentials: 'include'`), X-Requested-With header,
 *   and Bearer token automatically on same-origin `/api/*` requests.
 * - Notifies listeners cleanly whenever a 401 session expiry occurs (2-hour inactivity timeout).
 */
let currentSession: AuthSession | null = null;
let fetchPatched = false;
type SessionExpiredListener = (reason: string) => void;
const expiredListeners = new Set<SessionExpiredListener>();

export function getInMemoryAuthSession(): AuthSession | null {
  return currentSession;
}

export function getInMemoryAuthToken(): string {
  return currentSession?.token ? String(currentSession.token).trim() : '';
}

export function setInMemoryAuthSession(session: AuthSession | null): void {
  currentSession = session;
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.removeItem('tconnect_auth_session_v2');
    } catch {}
  }
}

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

function notifySessionExpired(reason: string): void {
  if (!currentSession) return;
  currentSession = null;
  expiredListeners.forEach((fn) => {
    try {
      fn(reason);
    } catch {}
  });
}

function performAuthFetch(
  originalFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getInMemoryAuthToken();
  let urlStr = '';
  if (typeof input === 'string') {
    urlStr = input;
  } else if (input instanceof URL) {
    urlStr = input.toString();
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    urlStr = input.url;
  }

  const isSameOriginApi =
    urlStr.startsWith('/api/') ||
    (typeof window !== 'undefined' &&
      Boolean(window.location?.origin) &&
      urlStr.startsWith(`${window.location.origin}/api/`));

  if (!isSameOriginApi) {
    return originalFetch(input, init);
  }

  const headers = new Headers(
    init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined)
  );

  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'TConnect-ControlTower');
  }

  if (token && !headers.has('Authorization') && !headers.has('X-API-Key') && !headers.has('x-api-key')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const responsePromise = originalFetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers
  });

  // Detect 401 session expiration on authenticated API calls (excluding login/setup/invite routes)
  const isAuthBootstrapPath =
    urlStr.includes('/api/auth/login') ||
    urlStr.includes('/api/auth/setup-owner') ||
    urlStr.includes('/api/auth/setup-super-admin') ||
    urlStr.includes('/api/auth/status') ||
    urlStr.includes('/api/auth/complete-reset') ||
    urlStr.includes('/api/team/redeem-invite') ||
    urlStr.includes('/api/team/invite-preview');

  if (!isAuthBootstrapPath) {
    responsePromise
      .then((res) => {
        if (res.status === 401 && currentSession) {
          res
            .clone()
            .json()
            .then((data) => {
              const code = data?.error?.code || data?.code;
              if (code === 'SESSION_EXPIRED' || code === 'UNAUTHORIZED' || code === 'ACCOUNT_SUSPENDED') {
                notifySessionExpired(
                  data?.message ||
                    data?.error?.message ||
                    'Your session expired after 2 hours of inactivity. Please sign in again.'
                );
              }
            })
            .catch(() => {
              notifySessionExpired('Your session expired. Please sign in again.');
            });
        }
      })
      .catch(() => {});
  }

  return responsePromise;
}

export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const nativeFetch =
    typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
      ? globalThis.fetch.bind(globalThis)
      : window.fetch.bind(window);
  return performAuthFetch(nativeFetch, input, init);
}

export function installAuthFetchInterceptor(): void {
  if (fetchPatched || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }
  fetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  const wrappedFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    performAuthFetch(originalFetch, input, init);

  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!desc || desc.configurable) {
      Object.defineProperty(window, 'fetch', {
        value: wrappedFetch,
        writable: true,
        configurable: true
      });
    } else if (desc.writable) {
      window.fetch = wrappedFetch;
    }
  } catch {
    // Host environment froze window.fetch — callers using authFetch still attach headers & cookies
  }
}

installAuthFetchInterceptor();
