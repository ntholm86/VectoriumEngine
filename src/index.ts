/**
 * Vectorium Engine - Main Entry Point
 * Export all public APIs for external use
 */

// Core Engine
export { Vectorium, Scene } from './vectorium/core/Engine';
export type { Entity } from './vectorium/core/Engine';

export { FeatureDetector } from './vectorium/core/FeatureDetector';
export type { EngineConfig, BrowserCapabilities } from './vectorium/core/FeatureDetector';

// Rendering
export { WebGLBatchRenderer } from './vectorium/rendering/WebGLBatchRenderer';
export type { Sprite } from './vectorium/rendering/WebGLBatchRenderer';

export { TextRenderer } from './vectorium/rendering/TextRenderer';
export type { TextStyle } from './vectorium/rendering/TextRenderer';

// Memory Management
export { ObjectPool, BufferPool, bufferPool } from './vectorium/memory/Pooling';

// Performance
export { PerformanceMonitor } from './vectorium/performance/PerformanceMonitor';
export type { QualityLevel, QualitySettings, PerformanceMetrics } from './vectorium/performance/PerformanceMonitor';

