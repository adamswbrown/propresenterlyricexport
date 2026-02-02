import React from 'react';
import '../styles/ExportOptions.css';

interface ExportOptionsProps {
  format: 'pptx' | 'text' | 'json';
  outputPath: string;
  onFormatChange: (format: 'pptx' | 'text' | 'json') => void;
  onOutputPathChange: (path: string) => void;
}

export default function ExportOptions({
  format,
  outputPath,
  onFormatChange,
  onOutputPathChange,
}: ExportOptionsProps) {
  return (
    <div className="export-options">
      <h2>Export Settings</h2>

      <div className="format-selection">
        <h3>Export Format</h3>
        <div className="format-options">
          <label className="format-option">
            <input
              type="radio"
              name="format"
              value="pptx"
              checked={format === 'pptx'}
              onChange={() => onFormatChange('pptx')}
            />
            <span className="format-name">PowerPoint</span>
            <span className="format-desc">Professional slides with styling</span>
          </label>

          <label className="format-option">
            <input
              type="radio"
              name="format"
              value="text"
              checked={format === 'text'}
              onChange={() => onFormatChange('text')}
            />
            <span className="format-name">Text</span>
            <span className="format-desc">Plain text with sections</span>
          </label>

          <label className="format-option">
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => onFormatChange('json')}
            />
            <span className="format-name">JSON</span>
            <span className="format-desc">Structured data format</span>
          </label>
        </div>
      </div>

      {format === 'pptx' && (
        <div className="input-group">
          <label htmlFor="output">Output Filename (optional)</label>
          <input
            id="output"
            type="text"
            value={outputPath}
            onChange={(e) => onOutputPathChange(e.target.value)}
            placeholder="service-lyrics-TIMESTAMP.pptx"
          />
        </div>
      )}

      <div className="format-info">
        {format === 'pptx' && (
          <p>
            <strong>PowerPoint Export:</strong> Creates a beautifully formatted presentation
            with styled lyrics, includes your logo if available.
          </p>
        )}
        {format === 'text' && (
          <p>
            <strong>Text Export:</strong> Plain text output organized by song and section,
            perfect for printing or editing.
          </p>
        )}
        {format === 'json' && (
          <p>
            <strong>JSON Export:</strong> Structured data with full metadata, ideal for
            programmatic use or data processing.
          </p>
        )}
      </div>
    </div>
  );
}
