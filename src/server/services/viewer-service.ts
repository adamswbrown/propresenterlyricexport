/**
 * Viewer Service — polls ProPresenter for slide status and broadcasts via SSE.
 *
 * Used by the public /viewer route so congregation members can follow along
 * on their phones/tablets without authentication.
 */

import { EventEmitter } from 'events';
import http from 'http';
import { getConnectionConfig } from './settings-store';

interface SlideStatus {
  presentationUuid: string | null;
  slideIndex: number;
  currentText: string;
  nextText: string;
}

class ViewerService extends EventEmitter {
  private pollInterval: NodeJS.Timeout | null = null;
  private currentPresentationUuid: string | null = null;
  private currentSlideIndex: number = -1;
  private currentText: string = '';
  private connected: boolean = false;
  private version: string | null = null;

  /** Start polling ProPresenter for slide changes. */
  start(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => this.poll(), 1500);
    this.poll(); // immediate first poll
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getVersion(): string | null {
    return this.version;
  }

  getStatus(): { connected: boolean; version: string | null } {
    return { connected: this.connected, version: this.version };
  }

  getCurrentSlide(): SlideStatus & { connected: boolean } {
    return {
      connected: this.connected,
      presentationUuid: this.currentPresentationUuid,
      slideIndex: this.currentSlideIndex,
      currentText: this.currentText,
      nextText: '',
    };
  }

  private getBaseUrl(): string | null {
    const { host, port } = getConnectionConfig();
    if (!host) return null;
    return `http://${host}:${port}`;
  }

  private async fetchJson(urlPath: string): Promise<any> {
    const base = this.getBaseUrl();
    if (!base) throw new Error('Not configured');

    return new Promise((resolve, reject) => {
      const req = http.get(`${base}${urlPath}`, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  private async poll(): Promise<void> {
    try {
      const [slideIndex, active, slideStatus] = await Promise.all([
        this.fetchJson('/v1/presentation/slide_index'),
        this.fetchJson('/v1/presentation/active'),
        this.fetchJson('/v1/status/slide'),
      ]);

      if (!this.connected) {
        // First successful poll — fetch version
        try {
          const ver = await this.fetchJson('/v1/version');
          const major = ver?.major ?? '7';
          const minor = ver?.minor ?? '0';
          const patch = ver?.patch ?? '0';
          this.version = `${major}.${minor}.${patch}`;
        } catch { /* ignore */ }
      }

      this.connected = true;

      const newIndex = slideIndex?.presentation_index?.index ?? -1;
      const newUuid = active?.presentation?.id?.uuid || null;
      const currentText = slideStatus?.current?.text || '';
      const nextText = slideStatus?.next?.text || '';

      const changed = newIndex !== this.currentSlideIndex
        || newUuid !== this.currentPresentationUuid
        || currentText !== this.currentText;

      this.currentSlideIndex = newIndex;
      this.currentPresentationUuid = newUuid;
      this.currentText = currentText;

      if (changed) {
        const status: SlideStatus = {
          presentationUuid: newUuid,
          slideIndex: newIndex,
          currentText,
          nextText,
        };
        this.emit('slideChange', status);
      }
    } catch {
      if (this.connected) {
        this.connected = false;
        this.emit('disconnected');
      }
    }
  }
}

export const viewerService = new ViewerService();
