import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { APP_VERSION } from '../../version';

type VersionStatus = 'checking' | 'latest' | 'mismatch' | 'refreshing' | 'error';

interface VersionPayload {
  version: string;
  generatedAt?: string;
  mode?: string;
}

const NO_CACHE_HEADERS = new HttpHeaders({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
});

@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly http = inject(HttpClient);
  private readonly refreshStorageKey = 'version-fresh-demo:last-refresh';
  private readonly pollingStarted = signal(false);
  private pollId: number | undefined;

  readonly currentVersion = signal(APP_VERSION);
  readonly latestServerVersion = signal<string | null>(null);
  readonly lastCheckedAt = signal<Date | null>(null);
  readonly status = signal<VersionStatus>('checking');

  readonly mismatchDetected = computed(() => {
    const serverVersion = this.latestServerVersion();
    return Boolean(serverVersion && serverVersion !== this.currentVersion());
  });

  constructor() {
    console.log(`[Version Fresh Demo] Application version: ${APP_VERSION}`);
  }

  startVersionChecks(): void {
    if (this.pollingStarted()) {
      return;
    }

    this.pollingStarted.set(true);
    this.checkForLatestVersion();

    // A long-running tab should discover a fresh deployment without user action.
    this.pollId = window.setInterval(() => {
      this.checkForLatestVersion();
    }, environment.versionCheckIntervalMs);
  }

  checkForLatestVersion(): void {
    this.status.set('checking');

    // Date.now() makes the version request independent from browser or proxy caches.
    const versionUrl = `${environment.versionCheckUrl}?cacheBust=${Date.now()}`;

    this.http.get<VersionPayload>(versionUrl, { headers: NO_CACHE_HEADERS }).subscribe({
      next: (payload) => this.handleVersionPayload(payload),
      error: (error) => {
        this.status.set('error');
        this.lastCheckedAt.set(new Date());
        console.warn('[Version Fresh Demo] Version check failed.', error);
      },
    });
  }

  async clearBrowserCacheAndReload(reason: string): Promise<void> {
    this.status.set('refreshing');
    console.log(`[Version Fresh Demo] Refresh requested: ${reason}`);
    await this.clearBrowserCaches();
    window.location.reload();
  }

  private handleVersionPayload(payload: VersionPayload): void {
    const serverVersion = payload.version;

    this.latestServerVersion.set(serverVersion);
    this.lastCheckedAt.set(new Date());
    console.log(`[Version Fresh Demo] Latest server version: ${serverVersion}`);

    if (!serverVersion || serverVersion === APP_VERSION) {
      this.status.set('latest');
      return;
    }

    void this.refreshForNewVersion(serverVersion);
  }

  private async refreshForNewVersion(serverVersion: string): Promise<void> {
    const refreshMarker = `${APP_VERSION}->${serverVersion}`;

    if (this.readRefreshMarker() === refreshMarker) {
      // Prevent an endless reload loop if the simulated server keeps reporting a mismatched version.
      this.status.set('mismatch');
      console.warn(
        `[Version Fresh Demo] Version mismatch remains after one reload: app ${APP_VERSION}, server ${serverVersion}.`,
      );
      return;
    }

    this.writeRefreshMarker(refreshMarker);
    this.status.set('refreshing');
    console.warn(
      `[Version Fresh Demo] Version mismatch detected. App ${APP_VERSION}, server ${serverVersion}.`,
    );
    await this.clearBrowserCaches();
    window.location.reload();
  }

  private async clearBrowserCaches(): Promise<void> {
    const cacheClearTasks: Promise<unknown>[] = [];

    if ('caches' in window) {
      cacheClearTasks.push(
        caches
          .keys()
          .then((cacheNames) =>
            Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))),
          ),
      );
    }

    if ('serviceWorker' in navigator) {
      cacheClearTasks.push(
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister())),
          ),
      );
    }

    await Promise.all(cacheClearTasks);
  }

  private readRefreshMarker(): string | null {
    try {
      return sessionStorage.getItem(this.refreshStorageKey);
    } catch {
      return null;
    }
  }

  private writeRefreshMarker(refreshMarker: string): void {
    try {
      sessionStorage.setItem(this.refreshStorageKey, refreshMarker);
    } catch {
      // Private browsing modes can block storage; reload once without the loop guard in that case.
    }
  }
}
