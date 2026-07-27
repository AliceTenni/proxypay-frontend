import React, { Suspense, lazy } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

// Code-split the heavy Redoc bundle so the route JS is loaded in parallel
// with the page itself. React.Suspense renders the skeleton until the
// module is ready, keeping first-paint snappy and avoiding a long
// synchronous `require()` after hydration.
const ApiReference = lazy(() => import('../components/ApiReference'));

function LoadingSkeleton(): React.JSX.Element {
  return (
    <div
      className="api-skeleton"
      role="status"
      aria-label="Loading API reference"
      style={{
        padding: '2rem',
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span>Loading API reference…</span>
    </div>
  );
}

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <BrowserOnly fallback={<LoadingSkeleton />}>
        {() => (
          <Suspense fallback={<LoadingSkeleton />}>
            <ApiReference />
          </Suspense>
        )}
      </BrowserOnly>
    </Layout>
  );
}
