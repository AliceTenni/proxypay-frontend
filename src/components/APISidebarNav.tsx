/**
 * API Sidebar Navigation Component
 * Shows API tag structure and endpoints for navigation
 * Integrates with Redoc for synchronized navigation
 */

import React, { useMemo, useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import {
  toEndpointLink,
  toTagLink,
  parseDeepLink,
  onHashChange,
} from '../utils/redocDeepLink';
import type { ParsedEndpoint, TagGroup } from '../utils/apiSpecParser';
import { BookmarkManager, type Bookmark } from '../utils/bookmarkManager';
import styles from './APISidebarNav.module.css';

export interface APISidebarNavProps {
  endpoints: ParsedEndpoint[];
  tagGroups?: TagGroup[];
  onEndpointClick?: (endpoint: ParsedEndpoint) => void;
  onTagClick?: (tagName: string) => void;
  selectedEndpointId?: string;
  expandedTags?: string[];
  onTagToggle?: (tag: string) => void;
  enableDeepLinking?: boolean;
}

/**
 * HTTP method color mapper
 */
function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    get: 'info',
    post: 'success',
    put: 'warning',
    patch: 'warning',
    delete: 'danger',
    options: 'secondary',
    head: 'secondary',
  };
  return colors[method.toLowerCase()] || 'secondary';
}

/**
 * HTTP method badge
 */
function MethodBadge({ method }: { method: string }): React.JSX.Element {
  const color = getMethodColor(method);
  return <span className={`${styles.methodBadge} ${styles[color]}`}>{method.toUpperCase()}</span>;
}

/**
 * Truncate text with ellipsis if longer than maxLength
 */
function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * API Sidebar Navigation Component
 */
export default function APISidebarNav({
  endpoints,
  tagGroups: providedTagGroups,
  onEndpointClick,
  onTagClick,
  selectedEndpointId: propSelectedEndpointId,
  expandedTags = [],
  onTagToggle,
  enableDeepLinking = true,
}: APISidebarNavProps): React.JSX.Element {
  const [localExpandedTags, setLocalExpandedTags] = useState<Set<string>>(
    new Set(expandedTags)
  );
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | undefined>(
    propSelectedEndpointId
  );
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(true);

  /**
   * Load bookmarks on mount
   */
  useEffect(() => {
    setBookmarks(BookmarkManager.getBookmarks());
  }, []);

  /**
   * Group endpoints by tag if not provided
   */
  const tagGroups = useMemo<TagGroup[]>(() => {
    if (providedTagGroups) {
      return providedTagGroups;
    }

    const groups: Record<string, ParsedEndpoint[]> = {};

    endpoints.forEach((endpoint) => {
      const tag = endpoint.tag || 'Other';
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(endpoint);
    });

    return Object.entries(groups)
      .map(([tag, eps]) => ({
        name: tag,
        endpoints: eps.sort((a, b) => a.path.localeCompare(b.path)),
      }))
      .sort((a, b) => {
        if (a.name === 'Other') return 1;
        if (b.name === 'Other') return -1;
        return a.name.localeCompare(b.name);
      });
  }, [endpoints, providedTagGroups]);

  /**
   * Sync with deep-link changes
   */
  useEffect(() => {
    if (!enableDeepLinking) return;

    const unsubscribe = onHashChange((deepLink) => {
      if (!deepLink) return;

      if (deepLink.type === 'endpoint') {
        setSelectedEndpointId(deepLink.target);
      } else if (deepLink.type === 'tag') {
        setLocalExpandedTags((prev) => new Set([...prev, deepLink.target]));
      }
    });

    return unsubscribe;
  }, [enableDeepLinking]);

  /**
   * Handle tag expansion toggle
   */
  const handleTagToggle = (tag: string) => {
    const newSet = new Set(localExpandedTags);
    if (newSet.has(tag)) {
      newSet.delete(tag);
    } else {
      newSet.add(tag);
    }
    setLocalExpandedTags(newSet);
    if (onTagToggle) {
      onTagToggle(tag);
    }
  };

  /**
   * Handle endpoint click — select, update hash, and scroll target into view.
   *
   * Fix #228: After updating the hash, scan the page for the Redoc-rendered
   * section element and scroll it into view so the TOC link actually
   * navigates to the corresponding section.
   */
  const handleEndpointClick = (endpoint: ParsedEndpoint) => {
    setSelectedEndpointId(endpoint.id);
    if (onEndpointClick) {
      onEndpointClick(endpoint);
    }
    if (enableDeepLinking) {
      window.location.hash = toEndpointLink(endpoint.id);
    }

    // Attempt a direct scroll to the Redoc-rendered section.
    // Redoc may use several ID patterns; try each in order.
    requestAnimationFrame(() => {
      const candidates = [
        endpoint.id,
        endpoint.id.toLowerCase().replace(/\s+/g, '-'),
        // Redoc <= 2.x uses "tag/<Tag>/<method><Path>" patterns
        `tag/${endpoint.tag || 'default'}/${endpoint.method.toLowerCase()}${endpoint.path}`,
      ];

      for (const candidateId of candidates) {
        try {
          const el =
            document.querySelector(`[id="${CSS.escape(candidateId)}"]`) ||
            document.querySelector(`[data-section-id="${CSS.escape(candidateId)}"]`) ||
            document.getElementById(candidateId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        } catch {
          // Malformed selector — skip.
        }
      }
    });
  };

  /**
   * Handle tag click — expand, update hash, and scroll tag heading into view.
   *
   * Fix #228: After expanding the tag group and updating the hash, scroll
   * the Redoc tag-section heading into view so the TOC link is functional.
   */
  const handleTagClick = (tag: string) => {
    // Expand the tag if not already expanded
    if (!localExpandedTags.has(tag)) {
      handleTagToggle(tag);
    }
    if (onTagClick) {
      onTagClick(tag);
    }
    if (enableDeepLinking) {
      window.location.hash = toTagLink(tag);
    }

    // Scroll to the Redoc-rendered tag section heading.
    requestAnimationFrame(() => {
      const slugTag = tag.toLowerCase().replace(/\s+/g, '-');
      const candidates = [
        tag,
        slugTag,
        `tag/${tag}`,
        `tag/${slugTag}`,
      ];
      for (const candidateId of candidates) {
        try {
          const el =
            document.querySelector(`[id="${CSS.escape(candidateId)}"]`) ||
            document.querySelector(`[data-section-id="${CSS.escape(candidateId)}"]`) ||
            document.getElementById(candidateId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        } catch {
          // Malformed selector — skip.
        }
      }
    });
  };

  /**
   * Handle bookmark toggle
   */
  const handleBookmarkToggle = (endpoint: ParsedEndpoint) => {
    const success = BookmarkManager.toggleBookmark({
      id: endpoint.id,
      path: endpoint.path,
      method: endpoint.method,
      summary: endpoint.summary,
      tag: endpoint.tag,
    });

    if (success) {
      setBookmarks(BookmarkManager.getBookmarks());
    }
  };

  /**
   * Handle bookmark click
   */
  const handleBookmarkClick = (bookmark: Bookmark) => {
    setSelectedEndpointId(bookmark.id);
    if (enableDeepLinking) {
      window.location.hash = toEndpointLink(bookmark.id);
    }

    // Scroll to the bookmarked endpoint in Redoc
    requestAnimationFrame(() => {
      const candidates = [
        bookmark.id,
        bookmark.id.toLowerCase().replace(/\s+/g, '-'),
        `tag/${bookmark.tag || 'default'}/${bookmark.method.toLowerCase()}${bookmark.path}`,
      ];

      for (const candidateId of candidates) {
        try {
          const el =
            document.querySelector(`[id="${CSS.escape(candidateId)}"]`) ||
            document.querySelector(`[data-section-id="${CSS.escape(candidateId)}"]`) ||
            document.getElementById(candidateId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        } catch {
          // Malformed selector — skip.
        }
      }
    });
  };

  /**
   * Handle remove bookmark
   */
  const handleRemoveBookmark = (e: React.MouseEvent, bookmarkId: string) => {
    e.stopPropagation();
    const success = BookmarkManager.removeBookmark(bookmarkId);
    if (success) {
      setBookmarks(BookmarkManager.getBookmarks());
    }
  };

  /**
   * Handle clear all bookmarks
   */
  const handleClearAllBookmarks = () => {
    if (window.confirm('Clear all bookmarks?')) {
      BookmarkManager.clearAll();
      setBookmarks([]);
    }
  };

  return (
    <nav className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>API Endpoints</h3>
        <span className={styles.count}>{endpoints.length}</span>
      </div>

      {bookmarks.length > 0 && (
        <div className={styles.bookmarksSection}>
          <div className={styles.bookmarksHeader}>
            <h4 className={styles.bookmarksTitle}>★ Bookmarks ({bookmarks.length})</h4>
            <button
              className={styles.clearBookmarksBtn}
              onClick={handleClearAllBookmarks}
              title="Clear all bookmarks"
              aria-label="Clear all bookmarks"
            >
              Clear
            </button>
          </div>
          <div className={styles.bookmarksList}>
            {bookmarks.map((bookmark) => (
              <button
                key={bookmark.id}
                className={styles.bookmarkItem}
                onClick={() => handleBookmarkClick(bookmark)}
                title={`${bookmark.method} ${bookmark.path}: ${bookmark.summary}`}
                aria-label={`Go to bookmarked ${bookmark.method} ${bookmark.path}`}
              >
                <span className={`${styles.bookmarkItemMethod} ${styles[getMethodColor(bookmark.method)]}`}>
                  {bookmark.method.toUpperCase()}
                </span>
                <span className={styles.bookmarkItemPath}>{bookmark.path}</span>
                <button
                  className={styles.bookmarkItemRemove}
                  onClick={(e) => handleRemoveBookmark(e, bookmark.id)}
                  title="Remove bookmark"
                  aria-label={`Remove ${bookmark.path} from bookmarks`}
                >
                  ×
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.tagGroups}>
        {tagGroups.map((group) => (
          <div key={group.name} className={styles.tagGroup}>
            {/* Tag Header */}
            <button
              className={styles.tagHeader}
              onClick={() => handleTagClick(group.name)}
              aria-expanded={localExpandedTags.has(group.name)}
              data-tag-name={group.name}
            >
              <span className={styles.tagToggle}>
                {localExpandedTags.has(group.name) ? '▼' : '▶'}
              </span>
              <span className={styles.tagName}>{group.name}</span>
              <span className={styles.tagCount}>{group.endpoints.length}</span>
            </button>

            {/* Endpoints List */}
            {localExpandedTags.has(group.name) && (
              <div className={styles.endpointsList}>
                {group.endpoints.map((endpoint) => {
                  const truncatedSummary = truncateText(endpoint.summary);
                  const isTruncated = truncatedSummary !== endpoint.summary;
                  const isBookmarked = bookmarks.some(b => b.id === endpoint.id);
                  
                  return (
                    <div key={endpoint.id} className={styles.endpointItemContainer} style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        className={`${styles.endpointItem} ${
                          selectedEndpointId === endpoint.id ? styles.selected : ''
                        }`}
                        onClick={() => handleEndpointClick(endpoint)}
                        title={endpoint.summary}
                        data-endpoint-id={endpoint.id}
                        aria-label={`${endpoint.method} ${endpoint.path}: ${endpoint.summary}`}
                        style={{ flex: 1 }}
                      >
                        <MethodBadge method={endpoint.method} />
                        <span className={styles.endpointPath}>
                          {endpoint.path}
                          {isTruncated && <span aria-hidden="true"> …</span>}
                        </span>
                      </button>
                      <button
                        className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarked : ''}`}
                        onClick={() => handleBookmarkToggle(endpoint)}
                        title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                        aria-label={isBookmarked ? `Remove ${endpoint.path} from bookmarks` : `Add ${endpoint.path} to bookmarks`}
                        aria-pressed={isBookmarked}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        {isBookmarked ? '★' : '☆'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {endpoints.length === 0 && (
        <div className={styles.empty}>
          <p>No endpoints found</p>
        </div>
      )}
    </nav>
  );
}
