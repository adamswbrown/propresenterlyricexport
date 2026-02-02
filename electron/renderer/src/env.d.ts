/// <reference types="vite/client" />

import type { ElectronAPI } from '../../preload';

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
