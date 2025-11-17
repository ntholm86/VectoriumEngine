/**
 * Vectorium Engine - Feature Detection
 * Detects browser capabilities and provides optimal configuration
 */

export interface BrowserCapabilities {
  hasWebGL2: boolean;
  hasWebGL: boolean;
  hasImageBitmap: boolean;
  hasOffscreenCanvas: boolean;
  hasWorkers: boolean;
  hasPerformanceMemory: boolean;
  supportsAVIF: boolean;
  supportsWebP: boolean;
  isMobile: boolean;
  gpuTier: 'high' | 'medium' | 'low';
  hasInstancing: boolean; // GPU instancing support
  hasInstancedArrays: boolean; // WebGL1 extension
}

export class FeatureDetector {
  readonly capabilities: BrowserCapabilities;

  constructor() {
    this.capabilities = this.detectCapabilities();
  }

  private detectCapabilities(): BrowserCapabilities {
    return {
      hasWebGL2: this.checkWebGL2(),
      hasWebGL: this.checkWebGL(),
      hasImageBitmap: this.checkImageBitmap(),
      hasOffscreenCanvas: this.checkOffscreenCanvas(),
      hasWorkers: this.checkWorkers(),
      hasPerformanceMemory: this.checkPerformanceMemory(),
      supportsAVIF: false, // Will be detected async
      supportsWebP: false, // Will be detected async
      isMobile: this.checkMobile(),
      gpuTier: this.estimateGPUTier(),
      hasInstancing: this.checkInstancing(),
      hasInstancedArrays: this.checkInstancedArraysExtension()
    };
  }

  private checkWebGL2(): boolean {
    if (!('WebGL2RenderingContext' in window)) return false;
    
    // iOS check
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const match = navigator.userAgent.match(/OS (\d+)_/);
      const version = match ? parseInt(match[1]) : 0;
      if (version < 15) return false;
    }
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return gl !== null;
    } catch (e) {
      return false;
    }
  }

  private checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    } catch (e) {
      return false;
    }
  }

  private checkImageBitmap(): boolean {
    return 'createImageBitmap' in window;
  }

  private checkOffscreenCanvas(): boolean {
    if (!('OffscreenCanvas' in window)) return false;
    
    // Safari check
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      const match = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
      const version = match ? parseFloat(match[1]) : 0;
      if (version < 16.4) return false;
    }
    
    try {
      const canvas = new OffscreenCanvas(1, 1);
      const ctx = canvas.getContext('2d');
      return ctx !== null;
    } catch (e) {
      return false;
    }
  }

  private checkWorkers(): boolean {
    return typeof Worker !== 'undefined';
  }

  private checkPerformanceMemory(): boolean {
    return 'memory' in performance;
  }

  private checkInstancing(): boolean {
    // WebGL2 has native instancing support
    if (this.checkWebGL2()) {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
        if (gl && 'drawArraysInstanced' in gl) {
          return true;
        }
      } catch (e) {
        return false;
      }
    }
    
    // WebGL1 needs ANGLE_instanced_arrays extension
    return this.checkInstancedArraysExtension();
  }

  private checkInstancedArraysExtension(): boolean {
    // Check for ANGLE_instanced_arrays extension in WebGL1
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const ext = gl.getExtension('ANGLE_instanced_arrays');
        return ext !== null;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  private checkMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  private estimateGPUTier(): 'high' | 'medium' | 'low' {
    const isMobile = this.checkMobile();
    const hasWebGL2 = this.checkWebGL2();
    
    if (isMobile) {
      // Mobile tier estimation
      if (hasWebGL2) return 'medium';
      return 'low';
    }
    
    // Desktop tier estimation
    if (hasWebGL2) return 'high';
    if (this.checkWebGL()) return 'medium';
    return 'low';
  }

  getOptimalConfig(): Partial<EngineConfig> {
    const { capabilities } = this;
    
    return {
      preferWebGL2: capabilities.hasWebGL2,
      useImageBitmap: capabilities.hasImageBitmap,
      useWorkers: capabilities.hasWorkers && !capabilities.isMobile,
      targetFPS: capabilities.isMobile ? 30 : 60,
      maxTextureSize: capabilities.gpuTier === 'high' ? 2048 : 1024,
      enableAdaptiveQuality: true,
      initialQuality: capabilities.gpuTier
    };
  }
}

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  preferWebGL2: boolean;
  useImageBitmap: boolean;
  useWorkers: boolean;
  targetFPS: number;
  maxTextureSize: number;
  enableAdaptiveQuality: boolean;
  initialQuality: 'high' | 'medium' | 'low';
  debugMode: boolean;
}
