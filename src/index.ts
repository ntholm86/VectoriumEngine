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
export { PerformanceBenchmark, BENCHMARK_SUITES } from './vectorium/tools/PerformanceBenchmark';
export type { BenchmarkConfig, BenchmarkResult, BenchmarkSuite } from './vectorium/tools/PerformanceBenchmark';
export { PerformanceAnalyzer } from './vectorium/tools/PerformanceAnalyzer';
export type { OptimizationOpportunity, AnalysisReport } from './vectorium/tools/PerformanceAnalyzer';

// Particle System
export { ParticleSystemManager, ParticleEmitter } from './vectorium/systems/ParticleSystem';
export type { ParticleEmitterConfig } from './vectorium/systems/ParticleSystem';
