/**
 * Vectorium LoadingManager - Phase 1
 * Track asset loading progress across all loaders
 * 
 * Features:
 * - Global progress tracking
 * - Per-asset status
 * - Error reporting
 * - Progress callbacks
 */

export interface AssetProgress {
  total: number;
  loaded: number;
  failed: number;
  percent: number;
  currentAsset: string | null;
}

export class LoadingManager {
  private totalAssets = 0;
  private loadedAssets = 0;
  private failedAssets = 0;
  private currentAsset: string | null = null;
  private assetStatus = new Map<string, 'pending' | 'loading' | 'loaded' | 'failed'>();
  
  // Callbacks
  onProgress: ((progress: AssetProgress) => void) | null = null;
  onComplete: (() => void) | null = null;
  onError: ((url: string, error: Error) => void) | null = null;

  /**
   * Register asset to be loaded
   */
  registerAsset(url: string): void {
    if (!this.assetStatus.has(url)) {
      this.totalAssets++;
      this.assetStatus.set(url, 'pending');
    }
  }

  /**
   * Mark asset as loading
   */
  startLoading(url: string): void {
    this.assetStatus.set(url, 'loading');
    this.currentAsset = url;
    this.notifyProgress();
  }

  /**
   * Mark asset as loaded
   */
  assetLoaded(url: string): void {
    this.assetStatus.set(url, 'loaded');
    this.loadedAssets++;
    this.checkComplete();
  }

  /**
   * Mark asset as failed
   */
  assetFailed(url: string, error: Error): void {
    this.assetStatus.set(url, 'failed');
    this.failedAssets++;
    
    if (this.onError) {
      this.onError(url, error);
    }
    
    this.checkComplete();
  }

  /**
   * Get current progress
   */
  getProgress(): AssetProgress {
    return {
      total: this.totalAssets,
      loaded: this.loadedAssets,
      failed: this.failedAssets,
      percent: this.totalAssets > 0 
        ? Math.floor((this.loadedAssets / this.totalAssets) * 100)
        : 0,
      currentAsset: this.currentAsset
    };
  }

  /**
   * Check if all assets are loaded
   */
  isComplete(): boolean {
    return this.loadedAssets + this.failedAssets >= this.totalAssets && this.totalAssets > 0;
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.totalAssets = 0;
    this.loadedAssets = 0;
    this.failedAssets = 0;
    this.currentAsset = null;
    this.assetStatus.clear();
  }

  /**
   * Notify progress listeners
   */
  private notifyProgress(): void {
    if (this.onProgress) {
      this.onProgress(this.getProgress());
    }
  }

  /**
   * Check if loading is complete
   */
  private checkComplete(): void {
    this.notifyProgress();
    
    if (this.isComplete() && this.onComplete) {
      this.onComplete();
    }
  }
}
