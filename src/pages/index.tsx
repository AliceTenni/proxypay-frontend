import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>ProxyPay API Documentation Portal</h1>
        <p>
          This portal publishes a searchable, first-class API reference for partners using the
          canonical <code>openapi.yaml</code> in this repository.
        </p>
        {/* Internal link — uses Docusaurus <Link> which handles routing correctly */}
        <p>
          <Link className="button button--primary button--lg" to="/api">
            Open API Reference
          </Link>
        </p>
        {/* External links must open in new tab with noopener noreferrer (#231) */}
        <p>
          <a
            href="https://github.com/sublime247/proxypay"
            target="_blank"
            rel="noopener noreferrer"
            className="button button--secondary"
          >
            View on GitHub
          </a>
        </p>
      </main>
    </Layout>
  );
}
