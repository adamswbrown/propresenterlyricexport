/**
 * Default ViewerService singleton for the web proxy server.
 * Separated from the class definition so the tray app can import
 * ViewerService without pulling in settings-store → pptx-exporter.
 */

import { ViewerService } from './viewer-service';
import { getConnectionConfig } from './settings-store';

export const viewerService = new ViewerService(getConnectionConfig);
