/**
 * 🔍 Performance Analysis Tool
 * Analyzes benchmark results to identify optimization opportunities
 */

import type { BenchmarkResult, BenchmarkSuite } from './PerformanceBenchmark';

export interface OptimizationOpportunity {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'rendering' | 'physics' | 'memory' | 'cpu' | 'gpu';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  affectedTests: string[];
  metrics: Record<string, number>;
}

export interface AnalysisReport {
  summary: {
    totalTests: number;
    avgFPS: number;
    criticalIssues: number;
    highPriorityIssues: number;
    overallScore: number;
  };
  opportunities: OptimizationOpportunity[];
  insights: string[];
  comparisons: {
    name: string;
    winner: string;
    difference: string;
    recommendation: string;
  }[];
}

export class PerformanceAnalyzer {
  /**
   * Analyze benchmark suite and identify optimization opportunities
   */
  analyze(suite: BenchmarkSuite): AnalysisReport {
    const opportunities: OptimizationOpportunity[] = [];
    const insights: string[] = [];
    const comparisons: any[] = [];
    
    // 1. Collision Scaling Analysis
    const collisionTests = suite.results.filter(r => r.config.collision && r.config.name.includes('Collision'));
    if (collisionTests.length >= 2) {
      this.analyzeCollisionScaling(collisionTests, opportunities, insights);
    }
    
    // 2. Rendering Scaling Analysis
    const renderTests = suite.results.filter(r => !r.config.collision && r.config.name.includes('Render'));
    if (renderTests.length >= 2) {
      this.analyzeRenderScaling(renderTests, opportunities, insights);
    }
    
    // 3. Shape Complexity Analysis
    const shapeTests = suite.results.filter(r => 
      r.config.name.includes('Circles') || 
      r.config.name.includes('Squares') || 
      r.config.name.includes('Stars')
    );
    if (shapeTests.length >= 2) {
      this.analyzeShapeComplexity(shapeTests, opportunities, insights, comparisons);
    }
    
    // 4. Spawn Pattern Analysis
    const patternTests = suite.results.filter(r => r.config.name.includes('Pattern'));
    if (patternTests.length >= 2) {
      this.analyzeSpawnPatterns(patternTests, opportunities, insights, comparisons);
    }
    
    // 5. GPU Bottleneck Analysis
    const gpuBottlenecks = suite.results.filter(r => r.metrics.gpuBottleneck);
    if (gpuBottlenecks.length > 0) {
      this.analyzeGPUBottlenecks(gpuBottlenecks, opportunities, insights);
    }
    
    // 6. Memory Analysis
    this.analyzeMemory(suite.results, opportunities, insights);
    
    // 7. Frame Spike Analysis
    this.analyzeFrameSpikes(suite.results, opportunities, insights);
    
    // Calculate summary
    const avgFPS = suite.results.reduce((sum, r) => sum + r.metrics.avgFPS, 0) / suite.results.length;
    const criticalIssues = opportunities.filter(o => o.priority === 'critical').length;
    const highPriorityIssues = opportunities.filter(o => o.priority === 'high').length;
    const overallScore = Math.round(avgFPS / 60 * 100);
    
    // Sort opportunities by priority
    opportunities.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return {
      summary: {
        totalTests: suite.results.length,
        avgFPS,
        criticalIssues,
        highPriorityIssues,
        overallScore
      },
      opportunities,
      insights,
      comparisons
    };
  }
  
  /**
   * Analyze collision scaling (O(N²) vs O(N))
   */
  private analyzeCollisionScaling(
    tests: BenchmarkResult[],
    opportunities: OptimizationOpportunity[],
    insights: string[]
  ): void {
    // Sort by entity count
    tests.sort((a, b) => a.config.entityCount - b.config.entityCount);
    
    // Calculate scaling factor
    const first = tests[0];
    const last = tests[tests.length - 1];
    
    const entityRatio = last.config.entityCount / first.config.entityCount;
    const checksRatio = last.metrics.avgCollisionChecks / first.metrics.avgCollisionChecks;
    const fpsRatio = first.metrics.avgFPS / last.metrics.avgFPS;
    
    // Theoretical O(N²) would be entityRatio²
    const theoreticalChecks = entityRatio * entityRatio;
    const actualScaling = checksRatio / theoreticalChecks;
    
    insights.push(
      `📊 Collision checks scale ${checksRatio.toFixed(1)}x for ${entityRatio.toFixed(1)}x entities ` +
      `(theoretical O(N²) = ${theoreticalChecks.toFixed(1)}x)`
    );
    
    // Check if spatial hash is effective
    if (actualScaling < 0.5) {
      insights.push('✅ Spatial hash is effectively reducing O(N²) complexity');
    } else if (actualScaling > 0.8) {
      opportunities.push({
        priority: 'critical',
        category: 'physics',
        title: 'Collision Detection Approaching O(N²)',
        description: `Collision checks scale almost quadratically (${(actualScaling * 100).toFixed(0)}% of O(N²)). ` +
                    'Spatial hash may not be effective enough.',
        impact: `FPS drops ${((fpsRatio - 1) * 100).toFixed(0)}% when doubling entity count`,
        recommendation: 
          '1. Reduce spatial hash cell size for better distribution\n' +
          '2. Implement broad-phase culling (distance threshold)\n' +
          '3. Consider moving more collision logic to WASM\n' +
          '4. Add entity sleeping for stationary objects',
        affectedTests: tests.map(t => t.config.name),
        metrics: {
          entityRatio,
          checksRatio,
          actualScaling,
          fpsRatio
        }
      });
    }
    
    // Check if FPS drops below 60
    const failingTests = tests.filter(t => t.metrics.avgFPS < 60);
    if (failingTests.length > 0) {
      opportunities.push({
        priority: 'high',
        category: 'physics',
        title: 'Collision Performance Below 60 FPS',
        description: `${failingTests.length} test(s) failed to maintain 60 FPS with collision enabled.`,
        impact: `Lowest FPS: ${Math.min(...failingTests.map(t => t.metrics.avgFPS)).toFixed(1)}`,
        recommendation:
          '1. Optimize WASM collision kernel\n' +
          '2. Reduce collision check distance threshold\n' +
          '3. Implement collision groups/layers\n' +
          '4. Use fixed timestep for physics (decouple from render)',
        affectedTests: failingTests.map(t => t.config.name),
        metrics: {
          worstFPS: Math.min(...failingTests.map(t => t.metrics.avgFPS)),
          avgCollisionTime: failingTests.reduce((sum, t) => sum + t.metrics.avgPhysicsTime, 0) / failingTests.length
        }
      });
    }
  }
  
  /**
   * Analyze pure rendering scaling
   */
  private analyzeRenderScaling(
    tests: BenchmarkResult[],
    opportunities: OptimizationOpportunity[],
    insights: string[]
  ): void {
    tests.sort((a, b) => a.config.entityCount - b.config.entityCount);
    
    const first = tests[0];
    const last = tests[tests.length - 1];
    
    const entityRatio = last.config.entityCount / first.config.entityCount;
    const fpsRatio = first.metrics.avgFPS / last.metrics.avgFPS;
    const drawCallsRatio = last.metrics.avgDrawCalls / first.metrics.avgDrawCalls;
    
    insights.push(
      `🎨 Rendering scales ${fpsRatio.toFixed(2)}x for ${entityRatio.toFixed(1)}x entities ` +
      `(draw calls: ${drawCallsRatio.toFixed(2)}x)`
    );
    
    // Check if rendering is O(1) (good batching)
    if (drawCallsRatio < 1.2) {
      insights.push('✅ Excellent batching: draw calls remain constant');
    } else if (drawCallsRatio > entityRatio * 0.5) {
      opportunities.push({
        priority: 'high',
        category: 'rendering',
        title: 'Draw Calls Scale with Entity Count',
        description: `Draw calls increase ${(drawCallsRatio * 100).toFixed(0)}% with ${(entityRatio * 100).toFixed(0)}% more entities. ` +
                    'Batching may be breaking.',
        impact: `FPS drops ${((fpsRatio - 1) * 100).toFixed(0)}% due to draw call overhead`,
        recommendation:
          '1. Investigate why batches are breaking\n' +
          '2. Increase vertex buffer size\n' +
          '3. Sort entities by texture/shape before rendering\n' +
          '4. Implement texture atlasing',
        affectedTests: tests.map(t => t.config.name),
        metrics: {
          drawCallsRatio,
          entityRatio,
          avgBatchSize: tests[tests.length - 1].config.entityCount / tests[tests.length - 1].metrics.avgDrawCalls
        }
      });
    }
    
    // Check GPU utilization
    const highGPUTests = tests.filter(t => t.metrics.avgGPUUtilization > 0.85);
    if (highGPUTests.length > 0) {
      opportunities.push({
        priority: 'high',
        category: 'gpu',
        title: 'GPU Bottleneck in Pure Rendering',
        description: `${highGPUTests.length} test(s) show GPU bottleneck (>85% utilization) without physics.`,
        impact: 'Fill rate or shader complexity limiting performance',
        recommendation:
          '1. Reduce entity size (fewer pixels per entity)\n' +
          '2. Implement LOD culling (skip entities < 4px)\n' +
          '3. Simplify fragment shader (SDF complexity)\n' +
          '4. Enable GPU instancing if available',
        affectedTests: highGPUTests.map(t => t.config.name),
        metrics: {
          avgGPUUtil: highGPUTests.reduce((sum, t) => sum + t.metrics.avgGPUUtilization, 0) / highGPUTests.length,
          avgVertices: highGPUTests.reduce((sum, t) => sum + t.metrics.avgVerticesRendered, 0) / highGPUTests.length
        }
      });
    }
  }
  
  /**
   * Analyze shape complexity impact
   */
  private analyzeShapeComplexity(
    tests: BenchmarkResult[],
    opportunities: OptimizationOpportunity[],
    insights: string[],
    comparisons: any[]
  ): void {
    const circleTest = tests.find(t => t.config.shapeType === 'circle');
    const starTest = tests.find(t => t.config.shapeType === 'star5');
    
    if (circleTest && starTest) {
      const fpsDiff = ((starTest.metrics.avgFPS - circleTest.metrics.avgFPS) / circleTest.metrics.avgFPS) * 100;
      
      comparisons.push({
        name: 'Circle vs Star',
        winner: fpsDiff > 0 ? 'Stars faster' : 'Circles faster',
        difference: `${Math.abs(fpsDiff).toFixed(1)}%`,
        recommendation: Math.abs(fpsDiff) < 5 
          ? 'Negligible difference - SDF shader cost is minimal'
          : 'Consider shape complexity in performance-critical scenarios'
      });
      
      if (Math.abs(fpsDiff) > 10) {
        opportunities.push({
          priority: 'medium',
          category: 'rendering',
          title: 'Shape Complexity Impact',
          description: `Stars perform ${Math.abs(fpsDiff).toFixed(1)}% ${fpsDiff > 0 ? 'better' : 'worse'} than circles.`,
          impact: 'SDF shader complexity affects performance',
          recommendation:
            '1. Use simpler shapes for large quantities\n' +
            '2. Implement shape LOD (distant = circles)\n' +
            '3. Consider pre-rasterized sprites for complex shapes',
          affectedTests: [circleTest.config.name, starTest.config.name],
          metrics: {
            circleFPS: circleTest.metrics.avgFPS,
            starFPS: starTest.metrics.avgFPS,
            difference: fpsDiff
          }
        });
      } else {
        insights.push('✅ SDF shader complexity has minimal performance impact (<10%)');
      }
    }
  }
  
  /**
   * Analyze spawn pattern effects
   */
  private analyzeSpawnPatterns(
    tests: BenchmarkResult[],
    opportunities: OptimizationOpportunity[],
    _insights: string[],
    comparisons: any[]
  ): void {
    const randomTest = tests.find(t => t.config.pattern === 'random');
    const gridTest = tests.find(t => t.config.pattern === 'grid');
    
    if (randomTest && gridTest) {
      const fpsDiff = ((gridTest.metrics.avgFPS - randomTest.metrics.avgFPS) / randomTest.metrics.avgFPS) * 100;
      const collisionDiff = ((gridTest.metrics.avgCollisionChecks - randomTest.metrics.avgCollisionChecks) / 
                            randomTest.metrics.avgCollisionChecks) * 100;
      
      comparisons.push({
        name: 'Random vs Grid',
        winner: fpsDiff > 0 ? 'Grid faster' : 'Random faster',
        difference: `${Math.abs(fpsDiff).toFixed(1)}%`,
        recommendation: `Grid has ${Math.abs(collisionDiff).toFixed(0)}% ${collisionDiff > 0 ? 'more' : 'fewer'} collision checks`
      });
      
      if (Math.abs(fpsDiff) > 15) {
        opportunities.push({
          priority: 'medium',
          category: 'physics',
          title: 'Spawn Pattern Affects Performance',
          description: `Grid pattern performs ${Math.abs(fpsDiff).toFixed(1)}% ${fpsDiff > 0 ? 'better' : 'worse'} than random.`,
          impact: 'Spatial distribution affects collision detection efficiency',
          recommendation:
            '1. Optimize spatial hash cell size for typical distributions\n' +
            '2. Use adaptive cell size based on entity density\n' +
            '3. Consider hierarchical spatial partitioning',
          affectedTests: [randomTest.config.name, gridTest.config.name],
          metrics: {
            randomFPS: randomTest.metrics.avgFPS,
            gridFPS: gridTest.metrics.avgFPS,
            collisionDiff
          }
        });
      }
    }
  }
  
  /**
   * Analyze GPU bottlenecks
   */
  private analyzeGPUBottlenecks(
    tests: BenchmarkResult[],
    opportunities: OptimizationOpportunity[],
    insights: string[]
  ): void {
    const avgGPUUtil = tests.reduce((sum, t) => sum + t.metrics.avgGPUUtilization, 0) / tests.length;
    
    insights.push(`⚠️ ${tests.length} test(s) GPU-bottlenecked (${(avgGPUUtil * 100).toFixed(0)}% utilization)`);
    
    opportunities.push({
      priority: 'high',
      category: 'gpu',
      title: 'GPU Bottleneck Detected',
      description: `GPU utilization exceeds 85% in ${tests.length} test(s).`,
      impact: 'Rendering performance limited by GPU fill rate or shader complexity',
      recommendation:
        '1. Reduce entity sizes (8-12px instead of 12-36px)\n' +
        '2. Implement LOD culling (< 4px entities)\n' +
        '3. Enable GPU instancing\n' +
        '4. Consider lower-complexity shaders for distant objects',
      affectedTests: tests.map(t => t.config.name),
      metrics: {
        avgGPUUtilization: avgGPUUtil,
        avgVertices: tests.reduce((sum, t) => sum + t.metrics.avgVerticesRendered, 0) / tests.length
      }
    });
  }
  
  /**
   * Analyze memory usage
   */
  private analyzeMemory(
    tests: BenchmarkResult[],
    opportunities: OptimizationOpportunity[],
    insights: string[]
  ): void {
    const peakMemory = Math.max(...tests.map(t => t.metrics.peakMemory));
    const avgMemory = tests.reduce((sum, t) => sum + t.metrics.avgMemory, 0) / tests.length;
    
    insights.push(`💾 Peak memory: ${peakMemory.toFixed(1)} MB, Average: ${avgMemory.toFixed(1)} MB`);
    
    if (peakMemory > 500) {
      opportunities.push({
        priority: 'medium',
        category: 'memory',
        title: 'High Memory Usage',
        description: `Peak memory usage exceeds 500 MB (${peakMemory.toFixed(0)} MB).`,
        impact: 'May cause garbage collection pauses or mobile crashes',
        recommendation:
          '1. Implement object pooling for all allocations\n' +
          '2. Use TypedArrays instead of regular arrays\n' +
          '3. Reduce buffer sizes\n' +
          '4. Profile for memory leaks',
        affectedTests: tests.filter(t => t.metrics.peakMemory > 500).map(t => t.config.name),
        metrics: {
          peakMemory,
          avgMemory
        }
      });
    }
  }
  
  /**
   * Analyze frame spikes
   */
  private analyzeFrameSpikes(
    tests: BenchmarkResult[],
    opportunities: OptimizationOpportunity[],
    insights: string[]
  ): void {
    const totalSpikes = tests.reduce((sum, t) => sum + t.metrics.totalSpikes, 0);
    const severeSpikes = tests.reduce((sum, t) => sum + t.metrics.severeSpikes, 0);
    
    if (totalSpikes > 0) {
      insights.push(`⚡ Frame spikes: ${totalSpikes} total, ${severeSpikes} severe (>33ms)`);
    }
    
    if (severeSpikes > tests.length * 5) { // More than 5 severe spikes per test
      opportunities.push({
        priority: 'high',
        category: 'cpu',
        title: 'Frequent Frame Spikes',
        description: `${severeSpikes} severe frame spikes (>33ms) detected across ${tests.length} tests.`,
        impact: 'Stuttering and poor user experience',
        recommendation:
          '1. Profile for blocking operations\n' +
          '2. Spread expensive calculations across frames\n' +
          '3. Move heavy work to Web Workers\n' +
          '4. Implement incremental updates',
        affectedTests: tests.filter(t => (t.metrics.severeSpikes || 0) > 10).map(t => t.config.name),
        metrics: {
          totalSpikes,
          severeSpikes,
          avgSpikesPerTest: severeSpikes / tests.length
        }
      });
    }
  }
  
  /**
   * Generate human-readable report
   */
  generateReport(analysis: AnalysisReport): string {
    let report = '═══════════════════════════════════════════════════════\n';
    report += '🔍 PERFORMANCE ANALYSIS REPORT\n';
    report += '═══════════════════════════════════════════════════════\n\n';
    
    // Summary
    report += '📊 SUMMARY\n';
    report += `   Tests Run: ${analysis.summary.totalTests}\n`;
    report += `   Average FPS: ${analysis.summary.avgFPS.toFixed(1)}\n`;
    report += `   Overall Score: ${analysis.summary.overallScore}/100\n`;
    report += `   Critical Issues: ${analysis.summary.criticalIssues}\n`;
    report += `   High Priority Issues: ${analysis.summary.highPriorityIssues}\n\n`;
    
    // Insights
    if (analysis.insights.length > 0) {
      report += '💡 KEY INSIGHTS\n';
      analysis.insights.forEach(insight => {
        report += `   ${insight}\n`;
      });
      report += '\n';
    }
    
    // Comparisons
    if (analysis.comparisons.length > 0) {
      report += '⚖️ COMPARISONS\n';
      analysis.comparisons.forEach(comp => {
        report += `   ${comp.name}: ${comp.winner} (${comp.difference})\n`;
        report += `      ${comp.recommendation}\n`;
      });
      report += '\n';
    }
    
    // Opportunities
    if (analysis.opportunities.length > 0) {
      report += '🎯 OPTIMIZATION OPPORTUNITIES\n\n';
      
      analysis.opportunities.forEach((opp, i) => {
        const priority = opp.priority.toUpperCase();
        const emoji = 
          opp.priority === 'critical' ? '🔴' :
          opp.priority === 'high' ? '🟠' :
          opp.priority === 'medium' ? '🟡' : '🟢';
        
        report += `${emoji} [${priority}] ${opp.title}\n`;
        report += `   Category: ${opp.category}\n`;
        report += `   Description: ${opp.description}\n`;
        report += `   Impact: ${opp.impact}\n`;
        report += `   Recommendation:\n`;
        opp.recommendation.split('\n').forEach(line => {
          report += `      ${line}\n`;
        });
        report += `   Affected Tests: ${opp.affectedTests.join(', ')}\n`;
        
        if (i < analysis.opportunities.length - 1) {
          report += '\n';
        }
      });
    } else {
      report += '✅ NO OPTIMIZATION OPPORTUNITIES FOUND\n';
      report += '   Performance is excellent!\n';
    }
    
    report += '\n═══════════════════════════════════════════════════════\n';
    
    return report;
  }
}
