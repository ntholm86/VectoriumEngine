/**
 * Vectorium AssetLoader - Phase 1
 * High-level asset loading with progress tracking
 * 
 * Features:
 * - Promise-based API
 * - Parallel loading (6 concurrent)
 * - Automatic retry on failure
 * - Manifest loading
 * 
 * Performance:
 * - Non-blocking parallel downloads
 * - Progress callbacks for UI
 * - Automatic texture/atlas detection
 */

import { TextureManager } from '../rendering/TextureManager';
import { LoadingManager } from './LoadingManager';

export interface AssetManifest {
  textures?: string[];
  atlases?: Array<{ texture: string; json: string }>;
}

export class AssetLoader {
  private textureManager: TextureManager;
  private loadingManager: LoadingManager;
  private maxConcurrent = 6;  // Browser limit
  private retryAttempts = 3;

  constructor(textureManager: TextureManager, loadingManager: LoadingManager) {
    this.textureManager = textureManager;
    this.loadingManager = loadingManager;
  }

  /**
   * Load all assets from manifest
   */
  async loadAll(manifest: AssetManifest): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Register all assets first
    if (manifest.textures) {
      for (const url of manifest.textures) {
        this.loadingManager.registerAsset(url);
      }
    }
    
    if (manifest.atlases) {
      for (const atlas of manifest.atlases) {
        this.loadingManager.registerAsset(atlas.texture);
        this.loadingManager.registerAsset(atlas.json);
      }
    }
    
    // Load textures
    if (manifest.textures) {
      for (const url of manifest.textures) {
        promises.push(this.loadTextureWithRetry(url));
        
        // Limit concurrency
        if (promises.length >= this.maxConcurrent) {
          await Promise.race(promises);
        }
      }
    }
    
    // Load atlases
    if (manifest.atlases) {
      for (const atlas of manifest.atlases) {
        promises.push(this.loadAtlasWithRetry(atlas.texture, atlas.json));
        
        // Limit concurrency
        if (promises.length >= this.maxConcurrent) {
          await Promise.race(promises);
        }
      }
    }
    
    // Wait for all to complete
    await Promise.allSettled(promises);
  }

  /**
   * Load single texture with retry
   */
  private async loadTextureWithRetry(url: string, attempt = 1): Promise<void> {
    this.loadingManager.startLoading(url);
    
    try {
      await this.textureManager.loadTexture(url);
      this.loadingManager.assetLoaded(url);
    } catch (error) {
      if (attempt < this.retryAttempts) {
        console.warn(`Retrying texture load (${attempt}/${this.retryAttempts}): ${url}`);
        await this.delay(1000 * attempt);
        return this.loadTextureWithRetry(url, attempt + 1);
      } else {
        this.loadingManager.assetFailed(url, error as Error);
        throw error;
      }
    }
  }

  /**
   * Load atlas with retry
   */
  private async loadAtlasWithRetry(
    textureUrl: string,
    jsonUrl: string,
    attempt = 1
  ): Promise<void> {
    this.loadingManager.startLoading(textureUrl);
    
    try {
      await this.textureManager.loadAtlas(textureUrl, jsonUrl);
      this.loadingManager.assetLoaded(textureUrl);
      this.loadingManager.assetLoaded(jsonUrl);
    } catch (error) {
      if (attempt < this.retryAttempts) {
        console.warn(`Retrying atlas load (${attempt}/${this.retryAttempts}): ${textureUrl}`);
        await this.delay(1000 * attempt);
        return this.loadAtlasWithRetry(textureUrl, jsonUrl, attempt + 1);
      } else {
        this.loadingManager.assetFailed(textureUrl, error as Error);
        this.loadingManager.assetFailed(jsonUrl, error as Error);
        throw error;
      }
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set max concurrent downloads
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, Math.min(max, 10));
  }

  /**
   * Set retry attempts
   */
  setRetryAttempts(attempts: number): void {
    this.retryAttempts = Math.max(0, attempts);
  }
}
