/**
 * Vectorium Engine - Main Entry Point
 * Export all public APIs for external use
 */

// Core Engine
export { Vectorium, Scene } from './vectorium/core/Engine';
export type { Entity } from './vectorium/core/Engine';

// 🎨 Display Objects (PixiJS-inspired API)
export { DisplayObject, Sprite, Graphics } from './vectorium/display';

// 🚀 State Machine System
export { StateMachine } from './vectorium/core/StateMachine';

// 🍭 Syntax Sugar: Builders & Presets
export { VectoriumBuilder } from './vectorium/core/EngineBuilder';
export { SceneBuilder, createScene } from './vectorium/core/SceneBuilder';

export { Viewport } from './vectorium/core/Viewport';

export { FeatureDetector } from './vectorium/core/FeatureDetector';
export type { BrowserCapabilities } from './vectorium/core/FeatureDetector';

// Configuration
export { EngineConfig } from './vectorium/config/EngineConfig';
export { BUNNYMARK_CONFIG } from './vectorium/config/BunnymarkConfig';
export { RuntimeConfig } from './vectorium/core/RuntimeConfig';
export type { RenderingSettings, PhysicsSettings, DebugSettings, QualitySettings as RuntimeQualitySettings, AnimationSettings } from './vectorium/core/RuntimeConfig';
export { WebGLBatchRenderer } from './vectorium/rendering/WebGLBatchRenderer';
// Sprite type removed (not implemented)

export { TextRenderer } from './vectorium/rendering/TextRenderer';
export type { TextStyle } from './vectorium/rendering/TextRenderer';

// Memory Management
export { ObjectPool, BufferPool, bufferPool } from './vectorium/memory/Pooling';

// Performance
export { PerformanceMonitor } from './vectorium/performance/PerformanceMonitor';
export type { QualityLevel, QualitySettings, PerformanceMetrics } from './vectorium/performance/PerformanceMonitor';
export { PerformanceBenchmark, BENCHMARK_SUITES } from './vectorium/performance/PerformanceBenchmark';
export type { BenchmarkConfig, BenchmarkResult, BenchmarkSuite } from './vectorium/performance/PerformanceBenchmark';
export { PerformanceAnalyzer } from './vectorium/performance/PerformanceAnalyzer';
export type { OptimizationOpportunity, AnalysisReport } from './vectorium/performance/PerformanceAnalyzer';

// Debug Tools
export { DebugPanel } from './vectorium/debug/DebugPanel';

// Particle System
export { ParticleSystemManager, ParticleEmitter } from './vectorium/particles/ParticleSystem';
export type { ParticleEmitterConfig } from './vectorium/particles/ParticleSystem';
