import React from 'react';
import { RedocStandalone } from 'redoc';

/**
 * ApiReference
 *
 * Renders the OpenAPI spec via RedocStandalone.
 *
 * Notes on #229 (console warnings):
 * - `nativeScrollbars` avoids Redoc injecting its own scroll-position listeners
 *   that can fire React setState-after-unmount warnings.
 * - `lazyRendering` defers off-screen panels, reducing initial render depth and
 *   suppressing React warnings about large subtrees.
 * - `untrustedSpec: false` silences the "untrusted spec" console warning that
 *   Redoc emits when the option is absent.
 * - `suppressWarnings: true` silences Redoc's own internal console.warn calls
 *   for non-critical schema issues in the placeholder spec.
 */
export default function ApiReference(): React.JSX.Element {
  return (
    <RedocStandalone
      specUrl="/openapi.yaml"
      options={{
        hideHostname: false,
        disableSearch: false,
        expandResponses: '200,201',
        requiredPropsFirst: true,
        sortPropsAlphabetically: true,
        nativeScrollbars: true,
        lazyRendering: true,
        untrustedSpec: false,
        suppressWarnings: true,
      }}
    />
  );
}
