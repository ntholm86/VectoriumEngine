/**
 * Vectorium Runtime Configuration
 * Professional-grade settings system for performance tuning and debugging
 * Inspired by Unity Inspector, Three.js renderer options, and dat.GUI
 */

import { ConfigEventEmitter, type ConfigEventType, type ConfigEventHandler, type UnsubscribeFunction } from './ConfigEventSystem';

export interface RenderingSettings {
  resolution: { width: number; height: number }; // Canvas resolution
  batchSize: number;              // Sprites per batch (16K-65K)
  enableFrustumCulling: boolean;  // Viewport culling
  enableBatching: boolean;        // Batch rendering vs individual draws
  clearColor: [number, number, number, number]; // RGBA background
  vsync: boolean;                 // Wait for VSync (affects FPS cap)
}

export interface PhysicsSettings {
  gravity: { x: number; y: number };
  boundsMultiplier: number;       // World size vs viewport (1.0 = world=viewport, 2.0 = world is 2x larger)
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
    resolution: { width: 1280, height: 720 },
    batchSize: 65000,
    enableFrustumCulling: true,
    enableBatching: true,
    clearColor: [0, 0, 0, 1],
    vsync: true
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

  private storageKey = 'vectorium-runtime-config';
  
  // 🚀 Typed event system
  private eventEmitter = new ConfigEventEmitter();

  constructor() {
    this.load();
  }
  
  /**
   * Subscribe to specific configuration changes
   * Returns unsubscribe function
   */
  on<T = any>(event: ConfigEventType, handler: ConfigEventHandler<T>): UnsubscribeFunction {
    return this.eventEmitter.on(event, handler);
  }
  
  /**
   * Unsubscribe from configuration changes
   */
  off<T = any>(event: ConfigEventType, handler: ConfigEventHandler<T>): void {
    this.eventEmitter.off(event, handler);
  }
  
  /**
   * Subscribe to an event that fires only once
   */
  once<T = any>(event: ConfigEventType, handler: ConfigEventHandler<T>): void {
    this.eventEmitter.once(event, handler);
  }



  /**
   * Update rendering settings
   */
  setRendering(settings: Partial<RenderingSettings>): void {
    // Emit specific events for changed properties
    if (settings.resolution && settings.resolution !== this.rendering.resolution) {
      this.eventEmitter.emit('rendering.resolution', settings.resolution);
    }
    if (settings.clearColor && settings.clearColor !== this.rendering.clearColor) {
      this.eventEmitter.emit('rendering.clearColor', settings.clearColor);
    }
    
    Object.assign(this.rendering, settings);
    this.eventEmitter.emit('rendering', this.rendering);
    this.save();
  }

  /**
   * Update physics settings
   */
  setPhysics(settings: Partial<PhysicsSettings>): void {
    // Emit specific events
    if (settings.gravity && settings.gravity !== this.physics.gravity) {
      this.eventEmitter.emit('physics.gravity', settings.gravity);
    }
    if (settings.velocityDamping !== undefined && settings.velocityDamping !== this.physics.velocityDamping) {
      this.eventEmitter.emit('physics.damping', settings.velocityDamping);
    }
    
    Object.assign(this.physics, settings);
    this.eventEmitter.emit('physics', this.physics);
    this.save();
  }

  /**
   * Update debug settings
   */
  setDebug(settings: Partial<DebugSettings>): void {
    // Emit specific events
    if (settings.showStats !== undefined && settings.showStats !== this.debug.showStats) {
      this.eventEmitter.emit('debug.showStats', settings.showStats);
    }
    if (settings.showBounds !== undefined && settings.showBounds !== this.debug.showBounds) {
      this.eventEmitter.emit('debug.showBounds', settings.showBounds);
    }
    
    Object.assign(this.debug, settings);
    this.eventEmitter.emit('debug', this.debug);
    this.save();
  }

  /**
   * Update quality settings
   */
  setQuality(settings: Partial<QualitySettings>): void {
    // Emit specific events
    if (settings.targetFPS !== undefined && settings.targetFPS !== this.quality.targetFPS) {
      this.eventEmitter.emit('quality.targetFPS', settings.targetFPS);
    }
    if (settings.enableAdaptiveQuality !== undefined && settings.enableAdaptiveQuality !== this.quality.enableAdaptiveQuality) {
      this.eventEmitter.emit('quality.enableAdaptiveQuality', settings.enableAdaptiveQuality);
    }
    
    Object.assign(this.quality, settings);
    this.eventEmitter.emit('quality', this.quality);
    this.save();
  }

  /**
   * Update animation settings
   */
  setAnimation(settings: Partial<AnimationSettings>): void {
    Object.assign(this.animation, settings);
    this.save();
  }

  /**
   * Update camera settings
   */
  setCamera(settings: Partial<CameraSettings>): void {
    // Emit specific events
    if (settings.minZoom !== undefined && settings.minZoom !== this.camera.minZoom) {
      this.eventEmitter.emit('camera.minZoom', settings.minZoom);
    }
    if (settings.maxZoom !== undefined && settings.maxZoom !== this.camera.maxZoom) {
      this.eventEmitter.emit('camera.maxZoom', settings.maxZoom);
    }
    if (settings.smoothFactor !== undefined && settings.smoothFactor !== this.camera.smoothFactor) {
      this.eventEmitter.emit('camera.smoothing', settings.smoothFactor);
    }
    if (settings.cullingMargin !== undefined && settings.cullingMargin !== this.camera.cullingMargin) {
      this.eventEmitter.emit('camera.cullingMargin', settings.cullingMargin);
    }
    
    Object.assign(this.camera, settings);
    this.eventEmitter.emit('camera', this.camera);
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
      resolution: { width: 1280, height: 720 },
      batchSize: 65000,
      enableFrustumCulling: true,
      enableBatching: true,
      clearColor: [0, 0, 0, 1],
      vsync: true
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
