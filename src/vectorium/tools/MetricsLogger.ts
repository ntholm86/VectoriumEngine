/**
 * Simple console logger for performance metrics
 */

import type { PerformanceMetrics } from './PerformanceMonitor';

export class MetricsLogger {
  private lastLogTime = 0;
  private logInterval = 1000;

  logMetrics(metrics: PerformanceMetrics): void {
    const now = performance.now();
    if (now - this.lastLogTime < this.logInterval) return;
    this.lastLogTime = now;

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  VECTORIUM PERFORMANCE METRICS                                ║
╟──────────────────────────────────────────────────────────────╢
║  FPS: ${metrics.fps.toFixed(1).padEnd(10)} Frame: ${metrics.frameTime.toFixed(2)}ms            ║
║  Draw Calls: ${(metrics.drawCalls || 0).toString().padEnd(6)} Entities: ${(metrics.entitiesRendered || 0).toLocaleString().padEnd(8)} ║
║  WebGL: ${(metrics.webglDrawCalls || 0).toString().padEnd(5)}  Vertices: ${(metrics.verticesRendered || 0).toLocaleString().padEnd(8)} ║
║  GPU: ${((metrics.gpuUtilization || 0) * 100).toFixed(0)}%         Physics: ${(metrics.physicsTime || 0).toFixed(2)}ms        ║
╚══════════════════════════════════════════════════════════════╝
    `.trim());
  }
}
