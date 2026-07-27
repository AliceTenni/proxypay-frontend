import React from 'react';
import { RedocStandalone } from 'redoc';

declare global {
  // Inlined by webpack.DefinePlugin in docusaurus.config.ts so the value
  // is a literal string in the final bundle. If the spec file is missing
  // the constant falls back to 'dev' so the URL is still well-formed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const __OPENAPI_VERSION__: string;
}

const SPEC_VERSION: string = __OPENAPI_VERSION__ || 'dev';

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
    </div>
  );
}
