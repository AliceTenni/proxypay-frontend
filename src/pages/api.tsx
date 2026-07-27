import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

/**
 * ApiPage
 *
 * Renders the Redoc-powered API reference inside the Docusaurus layout.
 *
 * BrowserOnly is required because RedocStandalone relies on browser APIs
 * (window, document) that are not available during SSR/static-site generation.
 * Without it, `npm run build` throws "window is not defined" errors (#229).
 */
export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading API reference…</div>}>
        {() => {
          // Dynamic require keeps Redoc out of the SSR bundle
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const ApiReference = require('../components/ApiReference').default;
          return <ApiReference />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
