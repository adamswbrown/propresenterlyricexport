import React from 'react';
import '../styles/ExportProgress.css';

interface ExportProgressProps {
  message: string;
}

export default function ExportProgress({ message }: ExportProgressProps) {
  const isError = message.includes('failed') || message.includes('error');
  const isSuccess = message.includes('completed') || message.includes('successfully');

  return (
    <div className={`export-progress ${isError ? 'error' : ''} ${isSuccess ? 'success' : ''}`}>
      <div className="progress-content">
        {!isSuccess && !isError && (
          <div className="spinner">
            <div className="spinner-ring"></div>
          </div>
        )}

        {isSuccess && <div className="success-icon">✓</div>}
        {isError && <div className="error-icon">✕</div>}

        <p className="progress-message">{message}</p>
      </div>
    </div>
  );
}
