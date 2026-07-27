import React, { useEffect, useRef, useCallback, useState } from 'react';
import { RedocStandalone } from 'redoc';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'loaded' | 'error';

interface ApiError {
  type: 'network' | 'timeout' | 'cors' | 'json' | 'unknown';
  message: string;
  hint?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCROLL_KEY = 'proxypay-sidebar-scroll';
const FETCH_TIMEOUT_MS = 15_000;
const SPEC_URL = '/proxypay-frontend/openapi.yaml';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Classify a fetch error into a user-friendly shape */
function classifyError(err: unknown, timedOut: boolean): ApiError {
  if (timedOut) {
    return {
      type: 'timeout',
      message: 'Request timed out after 15 seconds.',
      hint: 'The API server may be slow or unreachable. Try again in a moment.',
    };
  }

  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
      return {
        type: 'network',
        message: 'Network error — could not reach the API.',
        hint: 'Check your internet connection or VPN settings.',
      };
    }
    if (msg.includes('cors') || msg.includes('cross-origin')) {
      return {
        type: 'cors',
        message: 'CORS error — the request was blocked by the browser.',
        hint:
          'The API server must include the correct Access-Control-Allow-Origin header. ' +
          'If you are testing locally, try a proxy or configure the server to allow your origin.',
      };
    }
  }

  if (err instanceof SyntaxError) {
    return {
      type: 'json',
      message: 'The API returned malformed data.',
      hint: 'The response could not be parsed as valid JSON/YAML. Check the spec file for syntax errors.',
    };
  }

  return {
    type: 'unknown',
    message: err instanceof Error ? err.message : 'An unexpected error occurred.',
    hint: 'Open the browser console for more details.',
  };
}

/** Detect CORS errors from a Response */
function isCorsLikeError(res: Response): boolean {
  return res.type === 'opaque' || res.status === 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ErrorBannerProps {
  error: ApiError;
  onRetry: () => void;
}

function ErrorBanner({ error, onRetry }: ErrorBannerProps): React.JSX.Element {
  const retryRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the retry button when an error appears so keyboard users can act
  useEffect(() => {
    retryRef.current?.focus();
  }, [error]);

  // Allow Escape to dismiss focus back to the document body
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="api-error-banner"
      onKeyDown={handleKeyDown}
    >
      <div className="api-error-icon" aria-hidden="true">⚠️</div>

      <div className="api-error-body">
        <p className="api-error-title">
          <strong>Could not load API reference</strong>
          {error.type !== 'unknown' && (
            <span className="api-error-type"> ({error.type} error)</span>
          )}
        </p>

        <p className="api-error-message">{error.message}</p>

        {error.hint && (
          <p className="api-error-hint">{error.hint}</p>
        )}

        <button
          ref={retryRef}
          type="button"
          className="api-retry-button"
          onClick={onRetry}
          // Enter and Space are natively handled by <button>; no extra keyDown needed
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApiReference(): React.JSX.Element {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Sidebar scroll persistence (#214) ──────────────────────────────────────

  /** Find the Redoc sidebar DOM element (rendered after RedocStandalone mounts) */
  const getSidebar = (): Element | null =>
    wrapperRef.current?.querySelector('.menu-content, [data-role="sidebar"], .redoc-sidebar') ?? null;

  /** Save current sidebar scroll to sessionStorage */
  const saveScroll = useCallback(() => {
    const sidebar = getSidebar();
    if (sidebar) {
      sessionStorage.setItem(SCROLL_KEY, String(sidebar.scrollTop));
    }
  }, []);

  /** Restore sidebar scroll from sessionStorage */
  const restoreScroll = useCallback(() => {
    const sidebar = getSidebar();
    if (!sidebar) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      sidebar.scrollTop = Number(saved);
    }
  }, []);

  // Attach scroll listener and restore position whenever Redoc finishes rendering
  useEffect(() => {
    if (loadState !== 'loaded') return;

    // Redoc renders asynchronously; poll briefly for the sidebar element
    let attempts = 0;
    const intervalId = setInterval(() => {
      const sidebar = getSidebar();
      if (sidebar) {
        clearInterval(intervalId);
        restoreScroll();
        sidebar.addEventListener('scroll', saveScroll, { passive: true });
      }
      if (++attempts > 20) clearInterval(intervalId); // give up after ~2 s
    }, 100);

    // Also save on browser navigation away
    window.addEventListener('beforeunload', saveScroll);
    window.addEventListener('popstate', saveScroll);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', saveScroll);
      window.removeEventListener('popstate', saveScroll);
      getSidebar()?.removeEventListener('scroll', saveScroll);
    };
  }, [loadState, saveScroll, restoreScroll]);

  // ── Spec availability check with error handling (#215) ─────────────────────

  useEffect(() => {
    // Cancel any in-flight request when the component unmounts or retries
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    setLoadState('loading');
    setApiError(null);

    fetch(SPEC_URL, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);

        if (isCorsLikeError(res)) {
          throw Object.assign(new TypeError('CORS error'), { type: 'cors' });
        }

        if (!res.ok) {
          throw Object.assign(new Error(`HTTP ${res.status} ${res.statusText}`), {
            type: 'network',
          });
        }

        // Verify it's parseable text (YAML/JSON)
        return res.text().then((text) => {
          if (!text || text.trim().length === 0) {
            throw new SyntaxError('Empty response body');
          }
          return text;
        });
      })
      .then(() => {
        setLoadState('loaded');
      })
      .catch((err: unknown) => {
        clearTimeout(timeoutId);
        if ((err as { name?: string }).name === 'AbortError' && !timedOut) {
          // Component unmounted — ignore
          return;
        }
        setApiError(classifyError(err, timedOut));
        setLoadState('error');
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((n) => n + 1);
  }, []);

  // ── Keyboard navigation (#216) ─────────────────────────────────────────────

  /** Handle Escape key on the Redoc wrapper to close open dropdowns/modals */
  const handleWrapperKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // Close any open Redoc dropdowns by clicking outside them
      const activeEl = document.activeElement as HTMLElement | null;
      activeEl?.blur();

      // Also attempt to close expanded sections if Redoc exposes a close target
      const openDropdown = wrapperRef.current?.querySelector<HTMLElement>(
        '[aria-expanded="true"]'
      );
      if (openDropdown && openDropdown !== activeEl) {
        openDropdown.click();
      }
    }
  }, []);

  // Inject tabIndex and keyboard event support into Redoc's interactive elements
  // after the component renders (Redoc renders its own DOM)
  useEffect(() => {
    if (loadState !== 'loaded') return;

    let attempts = 0;
    const intervalId = setInterval(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      // Target interactive Redoc elements that may lack native keyboard support
      const interactiveSelectors = [
        'button:not([tabindex="-1"])',
        '[role="button"]',
        '[role="menuitem"]',
        '[role="tab"]',
        '[role="option"]',
        'a[href]',
        '[role="treeitem"]',
        '[role="link"]',
      ].join(',');

      const elements = wrapper.querySelectorAll<HTMLElement>(interactiveSelectors);

      elements.forEach((el) => {
        // Ensure all interactive elements are reachable by Tab
        if (!el.hasAttribute('tabindex')) {
          el.setAttribute('tabindex', '0');
        }

        // Add Enter/Space activation for role="button" elements that aren't real buttons
        if (
          (el.getAttribute('role') === 'button' ||
            el.getAttribute('role') === 'menuitem' ||
            el.getAttribute('role') === 'tab' ||
            el.getAttribute('role') === 'treeitem') &&
          !(el as HTMLButtonElement).disabled &&
          !el.dataset.kbPatched
        ) {
          el.dataset.kbPatched = 'true';
          el.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              el.click();
            }
          });
        }
      });

      // Stop polling once elements are found
      if (elements.length > 0 || ++attempts > 30) {
        clearInterval(intervalId);
      }
    }, 200);

    return () => clearInterval(intervalId);
  }, [loadState]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={wrapperRef}
      className="api-reference-wrapper"
      onKeyDown={handleWrapperKeyDown}
    >
      {loadState === 'loading' && (
        <div className="api-loading" role="status" aria-live="polite">
          <span>Loading API reference…</span>
        </div>
      )}

      {loadState === 'error' && apiError && (
        <ErrorBanner error={apiError} onRetry={handleRetry} />
      )}

      {/* Always render RedocStandalone so it can initialise; hide it on error */}
      <div
        style={{ display: loadState === 'loaded' ? 'block' : 'none' }}
        aria-hidden={loadState !== 'loaded'}
      >
        <RedocStandalone
          specUrl={SPEC_URL}
          options={{
            hideHostname: false,
            disableSearch: false,
            expandResponses: '200,201',
            requiredPropsFirst: true,
            sortPropsAlphabetically: true,
            // Redoc onLoaded callback isn't available via options — handled above via fetch pre-check
          }}
        />
      </div>
    </div>
  );
}
