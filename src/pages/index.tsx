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
        <p>
          <Link className="button button--primary button--lg" to="/api" style={{ marginRight: 12 }}>
            Open API Reference
          </Link>
          <Link className="button button--secondary button--lg" to="/sdk-guides">
            SDK Guides
          </Link>
        </p>
      </main>
    </Layout>
  );
}
