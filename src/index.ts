/**
 * Vectorium Engine - Main Entry Point
 * Export all public APIs for external use
 */

// Core Engine
export { Vectorium, Scene } from './vectorium/core/Engine';
export type { Entity, EntityId, EntityFlags } from './vectorium/core/Engine';
export type { IEngine } from './vectorium/core/IEngine';

// 🎨 Display Objects (PixiJS-inspired API)
export { DisplayObject, Sprite, Graphics } from './vectorium/display';

// 🚀 State Machine System
export { StateMachine } from './vectorium/utils/StateMachine';

// 🍭 Syntax Sugar: Builders & Presets
export { VectoriumBuilder } from './vectorium/core/EngineBuilder';
export { SceneBuilder, createScene } from './vectorium/core/SceneBuilder';

export { Viewport } from './vectorium/core/Viewport';

export { FeatureDetector } from './vectorium/core/FeatureDetector';
export type { BrowserCapabilities } from './vectorium/core/FeatureDetector';

// Configuration
export { EngineConfig } from './vectorium/core/EngineConfig';
export { BUNNYMARK_CONFIG } from './vectorium/core/BunnymarkConfig';
export { WebGLBatchRenderer } from './vectorium/rendering/WebGLBatchRenderer';
// Sprite type removed (not implemented)

export { TextRenderer } from './vectorium/rendering/TextRenderer';
export type { TextStyle } from './vectorium/rendering/TextRenderer';

// Memory Management
export { ObjectPool, BufferPool, bufferPool } from './vectorium/utils/Pooling';

// Performance
export { PerformanceMonitor } from './vectorium/tools/PerformanceMonitor';
export type { QualityLevel, QualitySettings, PerformanceMetrics } from './vectorium/tools/PerformanceMonitor';

// Input
export { InputManager } from './vectorium/systems/InputManager';
export type { PointerState } from './vectorium/systems/InputManager';

// Particle System
export { ParticleSystemManager, ParticleEmitter } from './vectorium/systems/ParticleSystem';
export type { ParticleEmitterConfig } from './vectorium/systems/ParticleSystem';

// GPU Particle System (transform feedback — zero CPU physics/upload)
export { GpuParticleSystem } from './vectorium/systems/GpuParticleSystem';
export type { GpuParticleConfig } from './vectorium/systems/GpuParticleSystem';
export type { IParticleSystem } from './vectorium/systems/IParticleSystem';
