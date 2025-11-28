/**
 * Simple console logger for performance metrics
 * Shows GPU instancing status prominently
 */

import type { PerformanceMetrics } from '../performance/PerformanceMonitor';

export class MetricsLogger {
  private lastLogTime = 0;
  private logInterval = 1000; // Log every 1 second

  /**
   * Log metrics to console with GPU instancing info
   */
  logMetrics(metrics: PerformanceMetrics): void {
    const now = performance.now();
    if (now - this.lastLogTime < this.logInterval) return;
    this.lastLogTime = now;

    // Build instancing status
    const instancingStatus = metrics.gpuInstancingEnabled 
      ? `🚀 INSTANCING ACTIVE (${metrics.instancedDrawCalls || 0} calls, ${metrics.instanceCount || 0} instances)`
      : '⚠️ Standard batch rendering';

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  VECTORIUM PERFORMANCE METRICS                                ║
╟──────────────────────────────────────────────────────────────╢
║  ${instancingStatus.padEnd(60)} ║
╟──────────────────────────────────────────────────────────────╢
║  FPS: ${metrics.fps.toFixed(1).padEnd(10)} Frame: ${metrics.frameTime.toFixed(2)}ms            ║
║  Draw Calls: ${(metrics.drawCalls || 0).toString().padEnd(6)} Entities: ${(metrics.entitiesRendered || 0).toLocaleString().padEnd(8)} ║
║  ${metrics.gpuInstancingEnabled ? `Instanced: ${(metrics.instancedDrawCalls || 0).toString().padEnd(5)}` : 'WebGL: ' + (metrics.webglDrawCalls || 0).toString().padEnd(5)}  Vertices: ${(metrics.verticesRendered || 0).toLocaleString().padEnd(8)} ║
║  GPU: ${((metrics.gpuUtilization || 0) * 100).toFixed(0)}%         Physics: ${(metrics.physicsTime || 0).toFixed(2)}ms        ║
╚══════════════════════════════════════════════════════════════╝
    `.trim());
  }

  /**
   * Log detailed instancing info once
   */
  logInstancingInfo(metrics: PerformanceMetrics): void {
    if (!metrics.gpuInstancingEnabled) {
      console.warn('⚠️ GPU Instancing NOT available - using standard batch rendering');
      console.log('   Reason: WebGL2 or drawElementsInstanced not supported');
      return;
    }

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 GPU INSTANCING ACTIVE                                     ║
╟──────────────────────────────────────────────────────────────╢
║  Status: ENABLED ✅                                            ║
║  Instanced Draw Calls: ${(metrics.instancedDrawCalls || 0).toString().padEnd(5)}                         ║
║  Total Instances: ${(metrics.instanceCount || 0).toLocaleString().padEnd(10)}                        ║
║  Expected Performance: 10-50x faster than standard           ║
╟──────────────────────────────────────────────────────────────╢
║  How It Works:                                                ║
║  • ONE draw call for all identical shapes                     ║
║  • Base quad (4 vertices) reused for ALL entities             ║
║  • Only instance data uploaded (20 bytes each)                ║
║  • GPU transforms each instance in parallel                   ║
╟──────────────────────────────────────────────────────────────╢
║  Press 'm' to toggle metrics panel                            ║
║  Press 'c' to open config panel                               ║
╚══════════════════════════════════════════════════════════════╝
    `.trim());
  }
}
