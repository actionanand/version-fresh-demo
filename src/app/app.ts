import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { APP_VERSION_GENERATED_AT } from '../version';
import { VersionService } from './services/version.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly versionService = inject(VersionService);

  protected readonly appVersion = this.versionService.currentVersion;
  protected readonly latestServerVersion = this.versionService.latestServerVersion;
  protected readonly lastCheckedAt = this.versionService.lastCheckedAt;
  protected readonly mismatchDetected = this.versionService.mismatchDetected;
  protected readonly generatedAt = APP_VERSION_GENERATED_AT;

  protected readonly statusLabel = computed(() => {
    switch (this.versionService.status()) {
      case 'checking':
        return 'Checking';
      case 'latest':
        return 'Latest';
      case 'mismatch':
        return 'Mismatch';
      case 'refreshing':
        return 'Refreshing';
      case 'error':
        return 'Check failed';
    }
  });

  protected readonly isRefreshing = computed(() => this.versionService.status() === 'refreshing');

  constructor() {
    // Starts one app-wide version polling loop as soon as the root component is ready.
    this.versionService.startVersionChecks();
  }

  protected checkNow(): void {
    this.versionService.checkForLatestVersion();
  }

  protected refreshNow(): void {
    void this.versionService.clearBrowserCacheAndReload('Manual footer action');
  }
}
