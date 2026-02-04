/**
 * Stage Audit Panel
 *
 * Shows which playlist items have verified stage display settings
 * and allows operators to mark items as verified after checking in ProPresenter.
 *
 * THE WORKFLOW:
 * 1. New items appear as "Unverified" (we don't know their settings)
 * 2. Operator opens item in ProPresenter, checks/fixes stage settings
 * 3. Operator clicks "Mark Verified" here
 * 4. App remembers this permanently - next time that song appears, it's already ✅
 */

import React, { useState } from 'react';

// Types matching src/types/stage-audit.ts
type StageLayoutType = 'lyrics' | 'scripture' | 'video' | 'message' | 'blank' | 'custom' | 'unknown';
type VerificationStatus = 'verified' | 'unverified' | 'needs_setup' | 'not_applicable';

interface AuditItem {
  playlistItemUuid: string;
  playlistItemName: string;
  presentationUuid: string | null;
  status: VerificationStatus;
  expectedLayout: StageLayoutType;
  needsAttention: boolean;
}

interface StageAuditPanelProps {
  playlistName: string;
  items: AuditItem[];
  readinessScore: number;
  onMarkVerified: (presentationUuid: string, layoutType: StageLayoutType) => void;
  onMarkNeedsSetup: (presentationUuid: string, layoutType: StageLayoutType) => void;
  onMarkNotApplicable: (presentationUuid: string) => void;
}

const STATUS_ICONS: Record<VerificationStatus, string> = {
  verified: '✅',
  unverified: '❓',
  needs_setup: '⚠️',
  not_applicable: '➖',
};

const STATUS_LABELS: Record<VerificationStatus, string> = {
  verified: 'Verified',
  unverified: 'Not Checked',
  needs_setup: 'Needs Setup',
  not_applicable: 'N/A',
};

const LAYOUT_LABELS: Record<StageLayoutType, string> = {
  lyrics: 'Lyrics Layout',
  scripture: 'Scripture Layout',
  video: 'Video Layout',
  message: 'Message Layout',
  blank: 'Blank/None',
  custom: 'Custom Layout',
  unknown: 'Unknown',
};

export function StageAuditPanel({
  playlistName,
  items,
  readinessScore,
  onMarkVerified,
  onMarkNeedsSetup,
  onMarkNotApplicable,
}: StageAuditPanelProps): JSX.Element {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<StageLayoutType>('lyrics');

  const verifiedCount = items.filter(i => i.status === 'verified').length;
  const needsAttentionCount = items.filter(i => i.needsAttention).length;

  return (
    <div className="stage-audit-panel">
      {/* Header with readiness score */}
      <div className="audit-header">
        <div className="audit-title">
          <h3>Stage Display Audit</h3>
          <span className="playlist-name">{playlistName}</span>
        </div>
        <div className={`readiness-score ${readinessScore >= 80 ? 'good' : readinessScore >= 50 ? 'warning' : 'bad'}`}>
          <span className="score-value">{readinessScore}%</span>
          <span className="score-label">Ready</span>
        </div>
      </div>

      {/* Summary bar */}
      <div className="audit-summary">
        <span className="summary-item verified">
          ✅ {verifiedCount} verified
        </span>
        <span className="summary-item attention">
          ⚠️ {needsAttentionCount} need checking
        </span>
      </div>

      {/* Instructions */}
      <div className="audit-instructions">
        <p>
          <strong>How this works:</strong> The ProPresenter API cannot read stage display
          settings from presentations. This checklist helps you track which items you've
          verified in ProPresenter.
        </p>
        <ol>
          <li>Click an item below to expand it</li>
          <li>Open that presentation in ProPresenter</li>
          <li>Check/set the correct stage display layout</li>
          <li>Come back here and click "Mark Verified"</li>
        </ol>
      </div>

      {/* Item list */}
      <div className="audit-items">
        {items.map(item => (
          <div
            key={item.playlistItemUuid}
            className={`audit-item ${item.needsAttention ? 'needs-attention' : ''} ${expandedItem === item.playlistItemUuid ? 'expanded' : ''}`}
          >
            <div
              className="audit-item-row"
              onClick={() => setExpandedItem(
                expandedItem === item.playlistItemUuid ? null : item.playlistItemUuid
              )}
            >
              <span className="status-icon">{STATUS_ICONS[item.status]}</span>
              <span className="item-name">{item.playlistItemName}</span>
              <span className="status-label">{STATUS_LABELS[item.status]}</span>
              <span className="expected-layout">{LAYOUT_LABELS[item.expectedLayout]}</span>
              <span className="expand-icon">{expandedItem === item.playlistItemUuid ? '▾' : '▸'}</span>
            </div>

            {expandedItem === item.playlistItemUuid && item.presentationUuid && (
              <div className="audit-item-actions">
                <p className="action-prompt">
                  After checking this item in ProPresenter, select the layout and mark as verified:
                </p>

                <div className="layout-select">
                  <label>Stage Layout:</label>
                  <select
                    value={selectedLayout}
                    onChange={(e) => setSelectedLayout(e.target.value as StageLayoutType)}
                  >
                    <option value="lyrics">Lyrics Layout</option>
                    <option value="scripture">Scripture Layout</option>
                    <option value="video">Video Layout</option>
                    <option value="message">Message Layout</option>
                    <option value="blank">Blank / None</option>
                  </select>
                </div>

                <div className="action-buttons">
                  <button
                    className="verify-btn primary"
                    onClick={() => {
                      onMarkVerified(item.presentationUuid!, selectedLayout);
                      setExpandedItem(null);
                    }}
                  >
                    ✅ Mark Verified
                  </button>
                  <button
                    className="needs-setup-btn warning"
                    onClick={() => {
                      onMarkNeedsSetup(item.presentationUuid!, selectedLayout);
                      setExpandedItem(null);
                    }}
                  >
                    ⚠️ Needs Setup
                  </button>
                  <button
                    className="na-btn ghost"
                    onClick={() => {
                      onMarkNotApplicable(item.presentationUuid!);
                      setExpandedItem(null);
                    }}
                  >
                    ➖ Not Applicable
                  </button>
                </div>

                <p className="hint">
                  Once verified, this presentation will show as ✅ in all future playlists.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      {needsAttentionCount > 0 && (
        <div className="bulk-actions">
          <p className="bulk-hint">
            Tip: Verify all songs at once by opening ProPresenter's library,
            selecting multiple items, and setting their stage display in bulk.
          </p>
        </div>
      )}
    </div>
  );
}

/*
CSS for this component (add to your styles):

.stage-audit-panel {
  background: var(--panel-bg);
  border-radius: 8px;
  padding: 16px;
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.readiness-score {
  text-align: center;
  padding: 8px 16px;
  border-radius: 8px;
}

.readiness-score.good { background: #d4edda; color: #155724; }
.readiness-score.warning { background: #fff3cd; color: #856404; }
.readiness-score.bad { background: #f8d7da; color: #721c24; }

.score-value {
  font-size: 24px;
  font-weight: bold;
  display: block;
}

.audit-item {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-bottom: 8px;
}

.audit-item.needs-attention {
  border-color: #ffc107;
  background: rgba(255, 193, 7, 0.1);
}

.audit-item-row {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  gap: 12px;
}

.audit-item-row:hover {
  background: rgba(0,0,0,0.05);
}

.status-icon {
  font-size: 18px;
}

.item-name {
  flex: 1;
  font-weight: 500;
}

.audit-item-actions {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  background: rgba(0,0,0,0.02);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.audit-instructions {
  background: rgba(0,0,0,0.03);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.audit-instructions ol {
  margin: 8px 0 0 20px;
  padding: 0;
}
*/
