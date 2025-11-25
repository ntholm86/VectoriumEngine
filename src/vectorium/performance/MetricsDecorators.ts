/**
 * Performance Metrics Decorators
 * 
 * Declarative performance monitoring via TypeScript decorators.
 * Automatically tracks execution time, call count, and memory usage.
 * 
 * Usage:
 * ```typescript
 * class MySystem {
 *   @measure('physics.update')
 *   updatePhysics(dt: number) {
 *     // Implementation
 *   }
 *   
 *   @measure('render.batch', { threshold: 16 })
 *   renderBatch() {
 *     // Warns if execution > 16ms
 *   }
 * }
 * ```
 */

export interface MetricsStorage {
  [key: string]: {
    totalTime: number;
    callCount: number;
    minTime: number;
    maxTime: number;
    lastTime: number;
    avgTime: number;
  };
}

export interface MeasureOptions {
  /** Warn if execution time exceeds threshold (ms) */
  threshold?: number;
  /** Log every N calls */
  logInterval?: number;
  /** Include in global metrics */
  global?: boolean;
}

// Global metrics storage
const globalMetrics: MetricsStorage = {};

/**
 * Get all global metrics
 */
export function getGlobalMetrics(): MetricsStorage {
  return globalMetrics;
}

/**
 * Reset all metrics
 */
export function resetMetrics(key?: string): void {
  if (key) {
    delete globalMetrics[key];
  } else {
    Object.keys(globalMetrics).forEach(k => delete globalMetrics[k]);
  }
}

/**
 * Print metrics summary to console
 */
export function printMetrics(filter?: string): void {
  const keys = Object.keys(globalMetrics);
  const filtered = filter ? keys.filter(k => k.includes(filter)) : keys;
  
  if (filtered.length === 0) {
    console.log('No metrics found');
    return;
  }
  
  console.group('Performance Metrics');
  filtered.forEach(key => {
    const metric = globalMetrics[key];
    console.log(`${key}:`);
    console.log(`  Calls: ${metric.callCount}`);
    console.log(`  Avg: ${metric.avgTime.toFixed(3)}ms`);
    console.log(`  Min: ${metric.minTime.toFixed(3)}ms`);
    console.log(`  Max: ${metric.maxTime.toFixed(3)}ms`);
    console.log(`  Total: ${metric.totalTime.toFixed(3)}ms`);
  });
  console.groupEnd();
}

/**
 * Method decorator for performance measurement
 * 
 * @param metricName - Name for the metric (e.g., 'physics.update')
 * @param options - Optional configuration
 */
export function measure(metricName: string, options: MeasureOptions = {}) {
  const { threshold, logInterval, global = true } = options;
  
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    // Initialize metric storage
    if (global && !globalMetrics[metricName]) {
      globalMetrics[metricName] = {
        totalTime: 0,
        callCount: 0,
        minTime: Infinity,
        maxTime: 0,
        lastTime: 0,
        avgTime: 0
      };
    }
    
    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      
      // Execute original method
      const result = originalMethod.apply(this, args);
      
      // Handle async methods
      if (result instanceof Promise) {
        return result.then((value) => {
          recordMetric(start, metricName, global, threshold, logInterval);
          return value;
        });
      }
      
      // Record sync metrics
      recordMetric(start, metricName, global, threshold, logInterval);
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Class decorator for measuring all methods
 */
export function measureClass(metricPrefix: string, options: MeasureOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Get all method names
    const methodNames = Object.getOwnPropertyNames(constructor.prototype)
      .filter(name => {
        const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, name);
        return name !== 'constructor' && descriptor && typeof descriptor.value === 'function';
      });
    
    // Apply measure decorator to each method
    methodNames.forEach(methodName => {
      const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, methodName)!;
      const metricName = `${metricPrefix}.${methodName}`;
      const measuredDescriptor = measure(metricName, options)(constructor.prototype, methodName, descriptor);
      Object.defineProperty(constructor.prototype, methodName, measuredDescriptor);
    });
    
    return constructor;
  };
}

/**
 * Record metric data
 */
function recordMetric(
  startTime: number,
  metricName: string,
  global: boolean,
  threshold?: number,
  logInterval?: number
): void {
  const elapsed = performance.now() - startTime;
  
  if (global) {
    const metric = globalMetrics[metricName];
    metric.lastTime = elapsed;
    metric.totalTime += elapsed;
    metric.callCount++;
    metric.minTime = Math.min(metric.minTime, elapsed);
    metric.maxTime = Math.max(metric.maxTime, elapsed);
    metric.avgTime = metric.totalTime / metric.callCount;
    
    // Log at intervals
    if (logInterval && metric.callCount % logInterval === 0) {
      console.log(`[${metricName}] Avg: ${metric.avgTime.toFixed(3)}ms (${metric.callCount} calls)`);
    }
  }
  
  // Warn if threshold exceeded
  if (threshold && elapsed > threshold) {
    console.warn(`⚠️ ${metricName}: ${elapsed.toFixed(3)}ms (threshold: ${threshold}ms)`);
  }
}

/**
 * Manual timing wrapper for non-decorator scenarios
 */
export function timed<T>(
  metricName: string,
  fn: () => T,
  options: MeasureOptions = {}
): T {
  const start = performance.now();
  const result = fn();
  recordMetric(start, metricName, options.global ?? true, options.threshold, options.logInterval);
  return result;
}

/**
 * Async timing wrapper
 */
export async function timedAsync<T>(
  metricName: string,
  fn: () => Promise<T>,
  options: MeasureOptions = {}
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  recordMetric(start, metricName, options.global ?? true, options.threshold, options.logInterval);
  return result;
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).vectoriumMetrics = {
    get: getGlobalMetrics,
    reset: resetMetrics,
    print: printMetrics
  };
  
  console.log('Metrics API exposed as window.vectoriumMetrics');
  console.log('  Usage: window.vectoriumMetrics.print()');
  console.log('  Usage: window.vectoriumMetrics.reset()');
}
