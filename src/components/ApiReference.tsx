import React, { useState } from 'react';
import { RedocStandalone } from 'redoc';
import MockPanel from './MockPanel';
import SpecManager from './SpecManager';
import AnnotationsPanel from './AnnotationsPanel';
import MetricsPanel from './MetricsPanel';

type Tab = 'reference' | 'mock' | 'specs' | 'annotations' | 'metrics';

export default function ApiReference(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('reference');

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'reference', icon: '📖', label: 'Reference' },
    { key: 'mock', icon: '🧪', label: 'Mock' },
    { key: 'specs', icon: '🔄', label: 'Spec Manager' },
    { key: 'annotations', icon: '💬', label: 'Annotations' },
    { key: 'metrics', icon: '📊', label: 'Metrics' },
  ];

  return (
    <div className="api-dashboard">
      <nav className="api-toolbar">
        <div className="api-toolbar-brand">
          <span className="api-toolbar-logo">ProxyPay</span>
          <span className="api-toolbar-divider">|</span>
          <span className="api-toolbar-title">API Dashboard</span>
        </div>
        <div className="api-toolbar-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`api-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="api-tab-icon">{tab.icon}</span>
              <span className="api-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="api-content">
        {activeTab === 'reference' && (
          <div className="api-reference-wrapper">
            <RedocStandalone
              specUrl="/openapi.yaml"
              options={{
                hideHostname: false,
                disableSearch: false,
                expandResponses: '200,201',
                requiredPropsFirst: true,
                sortPropsAlphabetically: true,
              }}
            />
          </div>
        )}
        {activeTab === 'mock' && (
          <div className="api-panel-wrapper">
            <MockPanel />
          </div>
        )}
        {activeTab === 'specs' && (
          <div className="api-panel-wrapper">
            <SpecManager />
          </div>
        )}
        {activeTab === 'annotations' && (
          <div className="api-panel-wrapper">
            <AnnotationsPanel />
          </div>
        )}
        {activeTab === 'metrics' && (
          <div className="api-panel-wrapper">
            <MetricsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
