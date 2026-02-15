/**
 * Web entry point — bootstraps the same React app as Electron,
 * but with fetch-based API + auth gating.
 *
 * Strategy: shim window.api with webApi so the existing App.tsx
 * and ServiceGeneratorView.tsx work without modification.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { installWebApiShim } from '../gui/api-client';
import { AuthGate } from './AuthGate';
import '@electron/styles.css';
import './web-overrides.css';

// Install the shim BEFORE any React component accesses window.api
installWebApiShim();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
);
