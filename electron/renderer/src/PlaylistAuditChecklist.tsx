/**
 * Playlist Audit Checklist
 *
 * Shows all items in a playlist with their stage display verification status.
 * Organized by content type (songs, sermon, videos, service elements, etc.)
 *
 * Example visual:
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  STAGE DISPLAY CHECKLIST           Readiness: [████████░░] 80%     │
 * │  Sunday Morning Service - 2 Feb 2026                                │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                      │
 * │  SONGS (3 items)                              2/3 verified          │
 * │  ┌────────────────────────────────────────────────────────────────┐ │
 * │  │ ✅ Amazing Grace              │ Lyrics Layout  │ Verified      │ │
 * │  │ ✅ How Great Thou Art         │ Lyrics Layout  │ Verified      │ │
 * │  │ ❓ Be Thou My Vision          │ Lyrics Layout  │ Not Checked   │ │
 * │  └────────────────────────────────────────────────────────────────┘ │
 * │                                                                      │
 * │  SERMON (1 item)                              0/1 verified          │
 * │  ┌────────────────────────────────────────────────────────────────┐ │
 * │  │ ⚠️ Sermon Slides              │ Sermon Layout  │ Needs Setup   │ │
 * │  └────────────────────────────────────────────────────────────────┘ │
 * │                                                                      │
 * │  SERVICE ELEMENTS (4 items)                   4/4 verified          │
 * │  ┌────────────────────────────────────────────────────────────────┐ │
 * │  │ ✅ Announcements              │ Service Layout │ Verified      │ │
 * │  │ ✅ Birthday Blessings         │ Service Layout │ Verified      │ │
 * │  │ ✅ Prayer Together            │ Service Layout │ Verified      │ │
 * │  │ ✅ The Grace                  │ Service Layout │ Verified      │ │
 * │  └────────────────────────────────────────────────────────────────┘ │
 * │                                                                      │
 * │  SCRIPTURE (1 item)                           1/1 verified          │
 * │  ┌────────────────────────────────────────────────────────────────┐ │
 * │  │ ✅ Luke 12:35-40 (NIV)        │ Scripture      │ Verified      │ │
 * │  └────────────────────────────────────────────────────────────────┘ │
 * │                                                                      │
 * │  VIDEO (1 item)                               1/1 verified          │
 * │  ┌────────────────────────────────────────────────────────────────┐ │
 * │  │ ✅ Kids Song - Christ Tomlin  │ Video Layout   │ Verified      │ │
 * │  └────────────────────────────────────────────────────────────────┘ │
 * │                                                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo } from 'react';

// Types matching src/types/stage-audit.ts
type StageLayoutType = 'lyrics' | 'scripture' | 'video' | 'sermon' | 'service_content' | 'blank' | 'custom' | 'unknown';
type VerificationStatus = 'verified' | 'unverified' | 'needs_setup' | 'not_applicable';
type ContentType = 'song' | 'scripture' | 'sermon' | 'video' | 'announcements' | 'prayer' | 'service_element' | 'header' | 'unknown';

interface AuditItem {
  playlistItemUuid: string;
  playlistItemName: string;
  presentationUuid: string | null;
  presentationName: string;
  contentType: ContentType;
  isHeader: boolean;
  status: VerificationStatus;
  expectedLayout: StageLayoutType;
  needsAttention: boolean;
  recommendation: string;
}

interface AuditSummary {
  total: number;
  verified: number;
  unverified: number;
  needsSetup: number;
  notApplicable: number;
  headers: number;
  byContentType: Record<ContentType, { total: number; verified: number }>;
}

interface PlaylistAuditChecklistProps {
  playlistName: string;
  items: AuditItem[];
  summary: AuditSummary;
  readinessScore: number;
  onMarkVerified: (presentationUuid: string, layoutType: StageLayoutType, contentType: ContentType) => void;
  onMarkNeedsSetup: (presentationUuid: string, layoutType: StageLayoutType, contentType: ContentType) => void;
  onMarkNotApplicable: (presentationUuid: string, contentType: ContentType) => void;
}

const STATUS_ICONS: Record<VerificationStatus, string> = {
  verified: '✅',
  unverified: '❓',
  needs_setup: '⚠️',
  not_applicable: '➖',
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  song: 'Songs',
  scripture: 'Scripture',
  sermon: 'Sermon',
  video: 'Videos',
  announcements: 'Announcements',
  prayer: 'Prayer',
  service_element: 'Service Elements',
  header: 'Headers',
  unknown: 'Other Items',
};

const CONTENT_TYPE_ORDER: ContentType[] = [
  'song',
  'sermon',
  'scripture',
  'service_element',
  'announcements',
  'prayer',
  'video',
  'unknown',
];

const LAYOUT_LABELS: Record<StageLayoutType, string> = {
  lyrics: 'Lyrics Layout',
  scripture: 'Scripture Layout',
  sermon: 'Sermon Layout',
  video: 'Video Layout',
  service_content: 'Service Layout',
  blank: 'Blank/None',
  custom: 'Custom Layout',
  unknown: 'Unknown',
};

const LAYOUT_OPTIONS: StageLayoutType[] = ['lyrics', 'scripture', 'sermon', 'video', 'service_content', 'blank'];

export function PlaylistAuditChecklist({
  playlistName,
  items,
  summary,
  readinessScore,
  onMarkVerified,
  onMarkNeedsSetup,
  onMarkNotApplicable,
}: PlaylistAuditChecklistProps): JSX.Element {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<StageLayoutType>('lyrics');
  const [showVerifiedItems, setShowVerifiedItems] = useState(true);

  // Group items by content type (excluding headers)
  const groupedItems = useMemo(() => {
    const groups: Record<ContentType, AuditItem[]> = {
      song: [],
      scripture: [],
      sermon: [],
      video: [],
      announcements: [],
      prayer: [],
      service_element: [],
      header: [],
      unknown: [],
    };

    for (const item of items) {
      if (!item.isHeader) {
        groups[item.contentType].push(item);
      }
    }

    return groups;
  }, [items]);

  // Get visible content types (only those with items)
  const visibleContentTypes = useMemo(() => {
    return CONTENT_TYPE_ORDER.filter(type => groupedItems[type].length > 0);
  }, [groupedItems]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'good';
    if (score >= 50) return 'warning';
    return 'bad';
  };

  const renderItem = (item: AuditItem) => {
    const isExpanded = expandedItem === item.playlistItemUuid;

    // Skip verified items if hidden
    if (!showVerifiedItems && item.status === 'verified') {
      return null;
    }

    return (
      <div
        key={item.playlistItemUuid}
        className={`audit-item ${item.needsAttention ? 'needs-attention' : ''} ${isExpanded ? 'expanded' : ''}`}
      >
        <div
          className="audit-item-row"
          onClick={() => setExpandedItem(isExpanded ? null : item.playlistItemUuid)}
        >
          <span className="status-icon">{STATUS_ICONS[item.status]}</span>
          <span className="item-name">{item.playlistItemName}</span>
          <span className="layout-badge">{LAYOUT_LABELS[item.expectedLayout]}</span>
          <span className={`status-label status-${item.status}`}>
            {item.status === 'verified' ? 'Verified' :
             item.status === 'needs_setup' ? 'Needs Setup' :
             item.status === 'not_applicable' ? 'N/A' : 'Not Checked'}
          </span>
          {item.presentationUuid && (
            <span className="expand-icon">{isExpanded ? '▾' : '▸'}</span>
          )}
        </div>

        {isExpanded && item.presentationUuid && (
          <div className="audit-item-actions">
            <p className="action-prompt">{item.recommendation}</p>

            <div className="layout-select-row">
              <label>Stage Layout:</label>
              <select
                value={selectedLayout}
                onChange={(e) => setSelectedLayout(e.target.value as StageLayoutType)}
              >
                {LAYOUT_OPTIONS.map(layout => (
                  <option key={layout} value={layout}>{LAYOUT_LABELS[layout]}</option>
                ))}
              </select>
            </div>

            <div className="action-buttons">
              <button
                className="btn-verify"
                onClick={() => {
                  onMarkVerified(item.presentationUuid!, selectedLayout, item.contentType);
                  setExpandedItem(null);
                }}
              >
                ✅ Mark Verified
              </button>
              <button
                className="btn-needs-setup"
                onClick={() => {
                  onMarkNeedsSetup(item.presentationUuid!, selectedLayout, item.contentType);
                  setExpandedItem(null);
                }}
              >
                ⚠️ Needs Setup
              </button>
              <button
                className="btn-na"
                onClick={() => {
                  onMarkNotApplicable(item.presentationUuid!, item.contentType);
                  setExpandedItem(null);
                }}
              >
                ➖ N/A
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContentGroup = (contentType: ContentType) => {
    const groupItems = groupedItems[contentType];
    if (groupItems.length === 0) return null;

    const stats = summary.byContentType[contentType];
    const allVerified = stats.verified === stats.total;

    return (
      <div key={contentType} className={`content-group ${allVerified ? 'all-verified' : ''}`}>
        <div className="group-header">
          <span className="group-title">{CONTENT_TYPE_LABELS[contentType]}</span>
          <span className="group-count">({groupItems.length} items)</span>
          <span className={`group-progress ${allVerified ? 'complete' : ''}`}>
            {stats.verified}/{stats.total} verified
          </span>
        </div>
        <div className="group-items">
          {groupItems.map(renderItem)}
        </div>
      </div>
    );
  };

  return (
    <div className="playlist-audit-checklist">
      {/* Header */}
      <div className="checklist-header">
        <div className="header-left">
          <h3>Stage Display Checklist</h3>
          <span className="playlist-name">{playlistName}</span>
        </div>
        <div className={`readiness-score ${getScoreColor(readinessScore)}`}>
          <div className="score-bar">
            <div className="score-fill" style={{ width: `${readinessScore}%` }} />
          </div>
          <span className="score-text">{readinessScore}% Ready</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="checklist-summary">
        <div className="stat verified">
          <span className="stat-value">{summary.verified}</span>
          <span className="stat-label">Verified</span>
        </div>
        <div className="stat unverified">
          <span className="stat-value">{summary.unverified}</span>
          <span className="stat-label">To Check</span>
        </div>
        <div className="stat needs-setup">
          <span className="stat-value">{summary.needsSetup}</span>
          <span className="stat-label">Need Setup</span>
        </div>
        <div className="stat total">
          <span className="stat-value">{summary.total}</span>
          <span className="stat-label">Total Items</span>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="checklist-filters">
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showVerifiedItems}
            onChange={(e) => setShowVerifiedItems(e.target.checked)}
          />
          Show verified items
        </label>
      </div>

      {/* Instructions */}
      <div className="checklist-instructions">
        <p>
          <strong>How to use:</strong> Click an item to expand it. Check/set the stage display
          in ProPresenter, then mark it as verified here. The app remembers your verifications
          for future services.
        </p>
      </div>

      {/* Content groups */}
      <div className="content-groups">
        {visibleContentTypes.map(renderContentGroup)}
      </div>

      {/* All verified message */}
      {readinessScore === 100 && (
        <div className="all-verified-message">
          ✅ All items verified! Stage displays are ready for this service.
        </div>
      )}
    </div>
  );
}

/*
Add to your CSS:

.playlist-audit-checklist {
  background: var(--panel-bg);
  border-radius: 8px;
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
}

.checklist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.readiness-score {
  text-align: right;
}

.score-bar {
  width: 120px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.score-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.readiness-score.good .score-fill { background: #4caf50; }
.readiness-score.warning .score-fill { background: #ff9800; }
.readiness-score.bad .score-fill { background: #f44336; }

.checklist-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat {
  text-align: center;
  padding: 8px 16px;
  border-radius: 4px;
  background: #f5f5f5;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  display: block;
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  color: #666;
}

.stat.verified { background: #e8f5e9; color: #2e7d32; }
.stat.unverified { background: #fff3e0; color: #ef6c00; }
.stat.needs-setup { background: #ffebee; color: #c62828; }

.content-group {
  margin-bottom: 20px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f0f0;
  border-radius: 4px 4px 0 0;
  font-weight: 500;
}

.group-title {
  font-weight: 600;
}

.group-count {
  color: #666;
  font-size: 13px;
}

.group-progress {
  margin-left: auto;
  font-size: 13px;
  color: #666;
}

.group-progress.complete {
  color: #2e7d32;
}

.group-items {
  border: 1px solid #e0e0e0;
  border-top: none;
  border-radius: 0 0 4px 4px;
}

.audit-item {
  border-bottom: 1px solid #eee;
}

.audit-item:last-child {
  border-bottom: none;
}

.audit-item.needs-attention {
  background: rgba(255, 152, 0, 0.08);
}

.audit-item-row {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  gap: 10px;
  cursor: pointer;
}

.audit-item-row:hover {
  background: rgba(0, 0, 0, 0.03);
}

.status-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout-badge {
  font-size: 12px;
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 10px;
}

.status-label {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-label.status-verified { background: #e8f5e9; color: #2e7d32; }
.status-label.status-unverified { background: #fff3e0; color: #e65100; }
.status-label.status-needs_setup { background: #ffebee; color: #c62828; }

.audit-item-actions {
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #eee;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-verify {
  background: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-needs-setup {
  background: #ff9800;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-na {
  background: #9e9e9e;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.all-verified-message {
  text-align: center;
  padding: 16px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  font-weight: 500;
}

.checklist-instructions {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 13px;
}
*/
