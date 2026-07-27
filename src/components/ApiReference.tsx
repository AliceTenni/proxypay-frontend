import React, { useEffect } from 'react';
import { RedocStandalone } from 'redoc';
import { attachValidationObserver } from '../utils/codeValidator';

declare global {
  // Inlined by webpack.DefinePlugin in docusaurus.config.ts so the value
  // is a literal string in the final bundle. If the spec file is missing
  // the constant falls back to 'dev' so the URL is still well-formed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const __OPENAPI_VERSION__: string;
}

const SPEC_VERSION: string = __OPENAPI_VERSION__ || 'dev';

// Component that mounts the code-validation MutationObserver once Redoc
// has rendered its code samples. Returns null — purely a side-effect
// mount.
function CodeValidationMount(): null {
  useEffect(() => {
    // Redoc renders asynchronously after hydration. Wait for the wrap
    // element to appear, then attach the observer to it so we don't
    // pick up unrelated <pre> nodes from other parts of the page.
    let detach: (() => void) | null = null;
    let cancelled = false;

    const tryAttach = (): void => {
      if (cancelled) return;
      const wrap = document.querySelector('.redoc-wrap') as HTMLElement | null;
      if (!wrap) {
        // Schedule a brief retry — Redoc's render is microtask-deferred
        const id = window.setTimeout(tryAttach, 80);
        if (cancelled) window.clearTimeout(id);
        return;
      }
      detach = attachValidationObserver(wrap);
    };

    tryAttach();

    return () => {
      cancelled = true;
      if (detach) detach();
    };
  }, []);

  return null;
}

export default function ApiReference(): React.JSX.Element {
  return (
    <div className="api-reference-shell">
      <RedocStandalone
        specUrl={`/openapi.yaml?v=${SPEC_VERSION}`}
        options={{
          hideHostname: false,
          disableSearch: false,
          expandResponses: '200,201',
          requiredPropsFirst: true,
          sortPropsAlphabetically: true,
        }}
      />
      <CodeValidationMount />
    </div>
  );
}
