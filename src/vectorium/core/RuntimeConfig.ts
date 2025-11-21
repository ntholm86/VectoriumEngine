/**
 * Vectorium Runtime Configuration
 * Professional-grade settings system for performance tuning and debugging
 * Inspired by Unity Inspector, Three.js renderer options, and dat.GUI
 */

export interface RenderingSettings {
  batchSize: number;              // Sprites per batch (16K-65K)
  enableFrustumCulling: boolean;  // Viewport culling
  enableBatching: boolean;        // Batch rendering vs individual draws
  clearColor: [number, number, number, number]; // RGBA background
  vsync: boolean;                 // Wait for VSync (affects FPS cap)
  resolution: { width: number; height: number }; // Canvas resolution
}

export interface PhysicsSettings {
  gravity: { x: number; y: number };
  boundsMultiplier: number;       // World size vs viewport (1.0 = exact, 10.0 = huge world)
  enableBounce: boolean;          // Bounce off boundaries
  velocityDamping: number;        // 0.0-1.0 (friction)
}

export interface DebugSettings {
  showProfiler: boolean;          // Press P to toggle
  showStats: boolean;             // FPS counter only
  showBounds: boolean;            // Draw frustum/world bounds
  showGrid: boolean;              // Draw grid
  logPerformanceWarnings: boolean;
  enableHotReload: boolean;       // Auto-reload on code changes
}

export interface QualitySettings {
  enableAdaptiveQuality: boolean;
  targetFPS: number;
  minQuality: 'potato' | 'low' | 'medium' | 'high' | 'ultra';
  maxQuality: 'potato' | 'low' | 'medium' | 'high' | 'ultra';
}

export interface AnimationSettings {
  enableRotation: boolean;
  enablePulse: boolean;
  enableWobble: boolean;
  animationSpeed: number;         // 0.0-2.0 multiplier
}

export interface CameraSettings {
  // Zoom
  zoom: number;
  minZoom: number;
  maxZoom: number;
  
  // Smooth movement
  smooth: boolean;
  smoothFactor: number;
  
  // Follow
  followEnabled: boolean;
  followLerp: number;
  followDeadzoneX: number;
  followDeadzoneY: number;
  
  // Shake
  shakeDecay: number;
  
  // Bounds
  clampToBounds: boolean;
  
  // Culling
  cullingMargin: number;
}

/**
 * RuntimeConfig - Live-tweakable settings
 * Can be modified during gameplay for performance tuning
 */
export class RuntimeConfig {
  rendering: RenderingSettings = {
    batchSize: 65000,
    enableFrustumCulling: true,
    enableBatching: true,
    clearColor: [0, 0, 0, 1],
    vsync: true,
    resolution: { width: 800, height: 600 }
  };

  physics: PhysicsSettings = {
    gravity: { x: 0, y: 0 },
    boundsMultiplier: 1.0,
    enableBounce: true,
    velocityDamping: 0.0
  };

  debug: DebugSettings = {
    showProfiler: false,
    showStats: false,
    showBounds: false,
    showGrid: false,
    logPerformanceWarnings: true,
    enableHotReload: false
  };

  quality: QualitySettings = {
    enableAdaptiveQuality: true,
    targetFPS: 60,
    minQuality: 'medium',
    maxQuality: 'ultra'
  };

  animation: AnimationSettings = {
    enableRotation: true,
    enablePulse: true,
    enableWobble: true,
    animationSpeed: 1.0
  };

  camera: CameraSettings = {
    zoom: 1.0,
    minZoom: 0.1,
    maxZoom: 10.0,
    smooth: true,
    smoothFactor: 0.1,
    followEnabled: false,
    followLerp: 0.1,
    followDeadzoneX: 100,
    followDeadzoneY: 100,
    shakeDecay: 0.95,
    clampToBounds: false,
    cullingMargin: 50
  };

  private changeCallbacks: Array<(config: RuntimeConfig) => void> = [];
  private storageKey = 'vectorium-runtime-config';

  constructor() {
    this.load();
  }

  /**
   * Register callback for config changes (hot-reload)
   */
  onChange(callback: (config: RuntimeConfig) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Notify listeners of config change
   */
  private notifyChange(): void {
    this.changeCallbacks.forEach(cb => {
      if (typeof cb === 'function') {
        cb(this);
      }
    });
  }

  /**
   * Update rendering settings
   */
  setRendering(settings: Partial<RenderingSettings>): void {
    Object.assign(this.rendering, settings);
    this.notifyChange();
    this.save();
  }

  /**
   * Update physics settings
   */
  setPhysics(settings: Partial<PhysicsSettings>): void {
    Object.assign(this.physics, settings);
    this.notifyChange();
    this.save();
  }

  /**
   * Update debug settings
   */
  setDebug(settings: Partial<DebugSettings>): void {
    Object.assign(this.debug, settings);
    this.notifyChange();
    this.save();
  }

  /**
   * Update quality settings
   */
  setQuality(settings: Partial<QualitySettings>): void {
    Object.assign(this.quality, settings);
    this.notifyChange();
    this.save();
  }

  /**
   * Update animation settings
   */
  setAnimation(settings: Partial<AnimationSettings>): void {
    Object.assign(this.animation, settings);
    this.notifyChange();
    this.save();
  }

  /**
   * Update camera settings
   */
  setCamera(settings: Partial<CameraSettings>): void {
    Object.assign(this.camera, settings);
    this.notifyChange();
    this.save();
  }

  /**
   * Load config from localStorage
   */
  load(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.rendering) Object.assign(this.rendering, data.rendering);
        if (data.physics) Object.assign(this.physics, data.physics);
        if (data.debug) Object.assign(this.debug, data.debug);
        if (data.quality) Object.assign(this.quality, data.quality);
        if (data.animation) Object.assign(this.animation, data.animation);
        if (data.camera) Object.assign(this.camera, data.camera);
      }
    } catch (e) {
      console.warn('Failed to load RuntimeConfig from localStorage:', e);
    }
  }

  /**
   * Save config to localStorage
   */
  save(): void {
    try {
      const data = {
        rendering: this.rendering,
        physics: this.physics,
        debug: this.debug,
        quality: this.quality,
        animation: this.animation,
        camera: this.camera
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save RuntimeConfig to localStorage:', e);
    }
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.rendering = {
      batchSize: 65000,
      enableFrustumCulling: true,
      enableBatching: true,
      clearColor: [0, 0, 0, 1],
      vsync: true,
      resolution: { width: 1920, height: 1080 }
    };

    this.physics = {
      gravity: { x: 0, y: 0 },
      boundsMultiplier: 1.0,
      enableBounce: true,
      velocityDamping: 0.0
    };

    this.debug = {
      showProfiler: false,
      showStats: true,
      showBounds: false,
      showGrid: false,
      logPerformanceWarnings: true,
      enableHotReload: false
    };

    this.quality = {
      enableAdaptiveQuality: true,
      targetFPS: 60,
      minQuality: 'medium',
      maxQuality: 'ultra'
    };

    this.animation = {
      enableRotation: true,
      enablePulse: true,
      enableWobble: true,
      animationSpeed: 1.0
    };

    this.camera = {
      zoom: 1.0,
      minZoom: 0.1,
      maxZoom: 10.0,
      smooth: true,
      smoothFactor: 0.1,
      followEnabled: false,
      followLerp: 0.1,
      followDeadzoneX: 100,
      followDeadzoneY: 100,
      shakeDecay: 0.95,
      clampToBounds: false,
      cullingMargin: 50
    };

    this.notifyChange();
    this.save();
  }

  /**
   * Export config as JSON string
   */
  export(): string {
    return JSON.stringify({
      rendering: this.rendering,
      physics: this.physics,
      debug: this.debug,
      quality: this.quality,
      animation: this.animation,
      camera: this.camera
    }, null, 2);
  }

  /**
   * Import config from JSON string
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.rendering) this.setRendering(data.rendering);
      if (data.physics) this.setPhysics(data.physics);
      if (data.debug) this.setDebug(data.debug);
      if (data.quality) this.setQuality(data.quality);
      if (data.animation) this.setAnimation(data.animation);
      if (data.camera) this.setCamera(data.camera);
    } catch (e) {
      console.error('Failed to import RuntimeConfig:', e);
    }
  }
}
