/**
 * Export Controls Component
 * Buttons and UI for exporting analytics reports with validation
 */

import React, { useState } from 'react';
import { AnalyticsResult } from '../analytics/analytics-engine';
import { ReportGenerator } from '../analytics/report-generator';

interface ExportControlsProps {
  analytics: AnalyticsResult;
  onError?: (error: string) => void;
  onSuccess?: (filename: string) => void;
}

/**
 * Validates that the analytics data has required structure and non-empty data
 */
function validateAnalyticsData(data: AnalyticsResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data) {
    errors.push('Analytics data is missing');
    return { valid: false, errors };
  }

  // Check required fields
  if (typeof data.totalRequests !== 'number' || data.totalRequests < 0) {
    errors.push('Invalid totalRequests field');
  }

  if (typeof data.totalErrors !== 'number' || data.totalErrors < 0) {
    errors.push('Invalid totalErrors field');
  }

  if (typeof data.errorRate !== 'number' || data.errorRate < 0 || data.errorRate > 100) {
    errors.push('Invalid errorRate field (must be 0-100)');
  }

  if (!data.dateRange || !data.dateRange.start || !data.dateRange.end) {
    errors.push('Invalid or missing dateRange');
  } else if (!(data.dateRange.start instanceof Date) || !(data.dateRange.end instanceof Date)) {
    errors.push('dateRange.start and dateRange.end must be Date objects');
  }

  if (!Array.isArray(data.topEndpoints)) {
    errors.push('topEndpoints must be an array');
  }

  if (!Array.isArray(data.topErrors)) {
    errors.push('topErrors must be an array');
  }

  if (!Array.isArray(data.usageByHour)) {
    errors.push('usageByHour must be an array');
  }

  if (!Array.isArray(data.statusCodeBreakdown)) {
    errors.push('statusCodeBreakdown must be an array');
  }

  if (!Array.isArray(data.topUsers)) {
    errors.push('topUsers must be an array');
  }

  if (!Array.isArray(data.topIPs)) {
    errors.push('topIPs must be an array');
  }

  if (typeof data.avgResponseTime !== 'number' || data.avgResponseTime < 0) {
    errors.push('Invalid avgResponseTime field');
  }

  if (typeof data.p95ResponseTime !== 'number' || data.p95ResponseTime < 0) {
    errors.push('Invalid p95ResponseTime field');
  }

  if (typeof data.p99ResponseTime !== 'number' || data.p99ResponseTime < 0) {
    errors.push('Invalid p99ResponseTime field');
  }

  // Warn if data is empty but don't fail
  if (data.totalRequests === 0) {
    errors.push('Warning: No request data available (totalRequests is 0)');
  }

  return { valid: errors.length === 0, errors };
}

export const ExportControls: React.FC<ExportControlsProps> = ({ analytics, onError, onSuccess }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getExtension = (format: string): string => {
    switch (format) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'html': return 'html';
      case 'markdown': return 'md';
      default: return 'txt';
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'html' | 'markdown') => {
    setError(null);

    try {
      setIsExporting(true);

      // Validate data before export
      const validation = validateAnalyticsData(analytics);
      if (!validation.valid) {
        const errorMessages = validation.errors
          .filter(e => !e.startsWith('Warning:'))
          .join('; ');
        const warnings = validation.errors.filter(e => e.startsWith('Warning:'));

        if (errorMessages) {
          const errorMsg = `Cannot export: ${errorMessages}`;
          setError(errorMsg);
          if (onError) {
            onError(errorMsg);
          }
          return;
        }

        // Log warnings but continue if only warnings
        if (warnings.length > 0) {
          console.warn('Export warnings:', warnings);
        }
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `logs-analytics-${timestamp}.${getExtension(format)}`;

      ReportGenerator.exportReport(analytics, {
        format,
        filename,
      });

      if (onSuccess) {
        onSuccess(filename);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during export';
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-controls">
      <span className="export-label">Export Report:</span>
      {error && <div className="export-error" role="alert" aria-live="polite">{error}</div>}
      <button
        className="export-btn json-btn"
        onClick={() => handleExport('json')}
        title="Download as JSON"
        disabled={isExporting}
        aria-busy={isExporting}
      >
        {isExporting ? '⏳' : '📋'} JSON
      </button>
      <button
        className="export-btn csv-btn"
        onClick={() => handleExport('csv')}
        title="Download as CSV"
        disabled={isExporting}
        aria-busy={isExporting}
      >
        {isExporting ? '⏳' : '📊'} CSV
      </button>
      <button
        className="export-btn html-btn"
        onClick={() => handleExport('html')}
        title="Download as HTML"
        disabled={isExporting}
        aria-busy={isExporting}
      >
        {isExporting ? '⏳' : '🌐'} HTML
      </button>
      <button
        className="export-btn md-btn"
        onClick={() => handleExport('markdown')}
        title="Download as Markdown"
        disabled={isExporting}
        aria-busy={isExporting}
      >
        {isExporting ? '⏳' : '📝'} Markdown
      </button>
    </div>
  );
};

export default ExportControls;
