/**
 * Vectorium Engine v2 - Immersive Physics Showcase
 * All UI rendered in-canvas with live graphs and interactive effects
 */

import { Vectorium, Scene, Entity } from './vectorium/core/Engine';
import { WebGLBatchRenderer } from './vectorium/rendering/WebGLBatchRenderer';
import { TextRenderer } from './vectorium/rendering/TextRenderer';

// Particle types
class Particle implements Entity {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  size = 8;
  rotation = 0;
  rotationSpeed = 0;
  alpha = 1.0;
  color = { r: 1, g: 1, b: 1 };
  animationType: 'rotate' | 'pulse' | 'wobble' | 'spin' | 'fade' = 'rotate';
  lifetime = -1; // -1 = infinite, otherwise counts down
  fadeRate = 0;
  gravity = 0;
  
  spawn(x: number, y: number, vx: number, vy: number, size: number, color: { r: number; g: number; b: number }, lifetime = -1): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.rotation = Math.floor(Math.random() * 360);
    this.rotationSpeed = Math.floor((Math.random() - 0.5) * 360);
    this.alpha = 1.0;
    this.animationType = 'rotate';
    this.lifetime = lifetime;
    this.fadeRate = lifetime > 0 ? 1 / lifetime : 0;
  }
  
  update(_dt: number): void {}
  render(_renderer: WebGLBatchRenderer, _textRenderer: TextRenderer): void {}
  destroy(): void {}
}

// Obstacle box
class Box implements Entity {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  size = 50;
  rotation = 0;
  rotationSpeed = 0;
  alpha = 0.8;
  color = { r: 0.2, g: 0.6, b: 1.0 };
  animationType: 'rotate' | 'pulse' | 'wobble' | 'spin' | 'fade' = 'rotate';
  width = 100;
  height = 100;
  
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.size = Math.max(width, height);
  }
  
  update(_dt: number): void {}
  render(renderer: WebGLBatchRenderer, _textRenderer: TextRenderer): void {
    renderer.drawRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height, 
      this.color, this.alpha);
  }
  destroy(): void {}
}

class ImmersiveScene extends Scene {
  private boxes: Box[] = [];
  private particlesToRemove: Particle[] = [];
  private fpsHistory: number[] = [];
  private updateTimeHistory: number[] = [];
  private graphMaxSamples = 60;
  private engineRef: Vectorium | null = null;
  
  setEngineRef(engine: Vectorium): void {
    this.engineRef = engine;
  }
  
  async load(): Promise<void> {
    // Set world bounds to canvas size for viewport-only rendering (default)
    // Entities will bounce off screen edges
    this.setWorldBoundsMultiplier(1.0);
    
    // Spawn initial particles
    this.spawnParticles(10);
  }
  
  addEntities(count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = new Particle();
      const x = Math.random() * this.canvasWidth;
      const y = Math.random() * this.canvasHeight;
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 4 + Math.random() * 12;
      const color = { 
        r: Math.random(), 
        g: Math.random(), 
        b: Math.random() 
      };
      
      particle.spawn(x, y, vx, vy, size, color, -1);
      this.addEntity(particle);
    }
  }
  
  toggleFrustumCulling(enable: boolean): void {
    if (enable) {
      // Enable frustum culling with 10x world
      this.setWorldBoundsMultiplier(10.0);
    } else {
      // Disable - use viewport-only (entities bounce in visible area)
      this.setWorldBoundsMultiplier(1.0);
    }
  }
  
  update(dt: number): void {
    super.update(dt);
    
    // Update particle lifetimes
    this.particlesToRemove = [];
    for (const entity of this.entities) {
      if (entity instanceof Particle && entity.lifetime > 0) {
        entity.lifetime -= dt;
        entity.alpha = Math.max(0, entity.lifetime * entity.fadeRate);
        
        if (entity.lifetime <= 0) {
          this.particlesToRemove.push(entity);
        }
      }
    }
    
    // Remove dead particles
    this.particlesToRemove.forEach(p => this.removeEntity(p));
  }
  
  render(renderer: WebGLBatchRenderer, textRenderer: TextRenderer): void {
    super.render(renderer, textRenderer);
    
    // Render metrics and graphs in-canvas
    this.renderMetrics(renderer, textRenderer);
    this.renderGraphs(renderer);
    this.renderControls(textRenderer, renderer);
  }
  
  spawnParticles(count: number, x?: number, y?: number, effect?: string): void {
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      try {
        const particle = new Particle();
        const px = x ?? Math.random() * this.canvasWidth;
        const py = y ?? Math.random() * this.canvasHeight;
        
        let angle, speed, size, color, lifetime;
      
        switch (effect) {
        case 'flamethrower':
          angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // Cone shape
          speed = 300 + Math.random() * 400;
          size = 3 + Math.random() * 8;
          color = { 
            r: 1.0, 
            g: 0.3 + Math.random() * 0.4, 
            b: Math.random() * 0.2 
          };
          lifetime = 0.5 + Math.random() * 1.5;
          break;
          
        case 'water':
          angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
          speed = 200 + Math.random() * 300;
          size = 4 + Math.random() * 6;
          color = { 
            r: 0.2, 
            g: 0.5 + Math.random() * 0.3, 
            b: 0.8 + Math.random() * 0.2 
          };
          lifetime = 1 + Math.random() * 2;
          particle.gravity = 200;
          break;
          
        case 'explosion':
          angle = Math.random() * Math.PI * 2;
          speed = 400 + Math.random() * 600;
          size = 2 + Math.random() * 6;
          color = { 
            r: 1.0, 
            g: 0.5 + Math.random() * 0.5, 
            b: Math.random() * 0.3 
          };
          lifetime = 0.3 + Math.random() * 1.0;
          break;
          
        case 'snow':
          angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
          speed = 50 + Math.random() * 100;
          size = 2 + Math.random() * 4;
          color = { r: 0.9 + Math.random() * 0.1, g: 0.9 + Math.random() * 0.1, b: 1.0 };
          lifetime = 3 + Math.random() * 3;
          break;
          
        case 'sparkle':
          angle = Math.random() * Math.PI * 2;
          speed = 50 + Math.random() * 150;
          size = 1 + Math.random() * 3;
          color = { 
            r: 0.9 + Math.random() * 0.1, 
            g: 0.9 + Math.random() * 0.1, 
            b: 0.2 + Math.random() * 0.8 
          };
          lifetime = 0.5 + Math.random() * 1.5;
          break;
          
        case 'poison':
          angle = Math.random() * Math.PI * 2;
          speed = 100 + Math.random() * 200;
          size = 4 + Math.random() * 8;
          color = { 
            r: 0.2 + Math.random() * 0.3, 
            g: 0.7 + Math.random() * 0.3, 
            b: 0.1 
          };
          lifetime = 2 + Math.random() * 3;
          break;
          
        default: // Normal particles
          angle = Math.random() * Math.PI * 2;
          speed = 100 + Math.random() * 200;
          size = 4 + Math.random() * 12;
          color = { r: Math.random(), g: Math.random(), b: Math.random() };
          lifetime = -1;
        }
      
        particle.spawn(px, py, Math.cos(angle) * speed, Math.sin(angle) * speed, size, color, lifetime);
        this.addEntity(particle);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to spawn particle ${i + 1}/${count}:`, error.message);
        break; // Stop trying if we hit capacity
      }
    }
    
    if (successCount < count) {
      console.warn(`⚠️ Only spawned ${successCount}/${count} particles. Total: ${this.entities.length}`);
    }
  }
  
  addBox(x: number, y: number, width: number, height: number): void {
    const box = new Box(x, y, width, height);
    this.boxes.push(box);
    this.addEntity(box);
  }
  
  clearBoxes(): void {
    this.boxes.forEach(box => this.removeEntity(box));
    this.boxes = [];
  }
  
  clearParticles(): void {
    const entities = [...this.entities];
    entities.forEach(e => {
      if (e instanceof Particle) {
        this.removeEntity(e);
      }
    });
  }
  
  private renderMetrics(renderer: WebGLBatchRenderer, textRenderer: TextRenderer): void {
    if (!this.engineRef) return;
    
    const metrics = this.engineRef.performanceMonitor.getMetrics();
    const scenePerfMetrics = this.perfMetrics;
    
    // Update history for graphs
    this.fpsHistory.push(metrics.fps);
    this.updateTimeHistory.push(scenePerfMetrics.updateTotal || 0);
    if (this.fpsHistory.length > this.graphMaxSamples) {
      this.fpsHistory.shift();
      this.updateTimeHistory.shift();
    }
    
    const panelX = 20;
    const panelY = 20;
    const panelWidth = 280;
    const panelHeight = 680;
    
    // Draw semi-transparent background panel
    renderer.drawRect(panelX, panelY, panelWidth, panelHeight, { r: 0, g: 0, b: 0 }, 0.75);
    
    // Green border
    renderer.drawRect(panelX, panelY, panelWidth, 3, { r: 0, g: 1, b: 0 }, 1.0);
    renderer.drawRect(panelX, panelY + panelHeight - 3, panelWidth, 3, { r: 0, g: 1, b: 0 }, 1.0);
    renderer.drawRect(panelX, panelY, 3, panelHeight, { r: 0, g: 1, b: 0 }, 1.0);
    renderer.drawRect(panelX + panelWidth - 3, panelY, 3, panelHeight, { r: 0, g: 1, b: 0 }, 1.0);
    
    let yPos = panelY + 15;
    const leftCol = panelX + 10;
    const rightCol = panelX + panelWidth - 75;
    const lineHeight = 20;
    const sectionGap = 10;
    
    // Title
    textRenderer.drawText('VECTORIUM ENGINE', leftCol + 50, yPos, { fontSize: 12, color: '#0f0' });
    yPos += 30;
    
    // Frame Metrics Section
    renderer.drawRect(leftCol, yPos - 5, panelWidth - 20, 2, { r: 0, g: 1, b: 0 }, 0.5);
    yPos += 5;
    textRenderer.drawText('FRAME METRICS', leftCol, yPos, { fontSize: 11, color: '#ff0' });
    yPos += lineHeight;
    
    const fps = Math.round(metrics.fps);
    const fpsColor = fps >= 58 ? '#0f0' : fps >= 45 ? '#ff0' : '#f00';
    textRenderer.drawText('FPS:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(fps.toString(), rightCol + 20, yPos, { fontSize: 10, color: fpsColor });
    yPos += lineHeight;
    
    textRenderer.drawText('Frame Time:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${metrics.frameTime.toFixed(2)}ms`, rightCol, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Quality:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(metrics.quality.toUpperCase(), rightCol + 10, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight + sectionGap;
    
    // Update Breakdown Section
    renderer.drawRect(leftCol, yPos - 5, panelWidth - 20, 2, { r: 0, g: 1, b: 1 }, 0.5);
    yPos += 5;
    textRenderer.drawText('UPDATE BREAKDOWN', leftCol, yPos, { fontSize: 11, color: '#0ff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Total:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${(scenePerfMetrics.updateTotal || 0).toFixed(2)}ms`, rightCol, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Physics:', leftCol + 10, yPos, { fontSize: 9, color: '#aaa' });
    textRenderer.drawText(`${(scenePerfMetrics.updatePhysics || 0).toFixed(2)}ms`, rightCol, yPos, { fontSize: 9, color: '#aaa' });
    yPos += lineHeight - 3;
    
    textRenderer.drawText('Animation:', leftCol + 10, yPos, { fontSize: 9, color: '#aaa' });
    textRenderer.drawText(`${(scenePerfMetrics.updateAnimation || 0).toFixed(2)}ms`, rightCol, yPos, { fontSize: 9, color: '#aaa' });
    yPos += lineHeight - 3;
    
    textRenderer.drawText('Entity Sync:', leftCol + 10, yPos, { fontSize: 9, color: '#aaa' });
    textRenderer.drawText(`${(scenePerfMetrics.updateEntitySync || 0).toFixed(2)}ms`, rightCol, yPos, { fontSize: 9, color: '#aaa' });
    yPos += lineHeight;
    
    textRenderer.drawText('Custom Updates:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText((scenePerfMetrics.customUpdateCount || 0).toString(), rightCol + 20, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight + sectionGap;
    
    // Render Breakdown Section
    renderer.drawRect(leftCol, yPos - 5, panelWidth - 20, 2, { r: 1, g: 0, b: 1 }, 0.5);
    yPos += 5;
    textRenderer.drawText('RENDER BREAKDOWN', leftCol, yPos, { fontSize: 11, color: '#f0f' });
    yPos += lineHeight;
    
    textRenderer.drawText('Total:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${(scenePerfMetrics.renderTotal || 0).toFixed(2)}ms`, rightCol, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Batch:', leftCol + 10, yPos, { fontSize: 9, color: '#aaa' });
    textRenderer.drawText(`${(scenePerfMetrics.renderBatch || 0).toFixed(2)}ms`, rightCol, yPos, { fontSize: 9, color: '#aaa' });
    yPos += lineHeight - 3;
    
    textRenderer.drawText('Custom:', leftCol + 10, yPos, { fontSize: 9, color: '#aaa' });
    textRenderer.drawText(`${(scenePerfMetrics.renderCustom || 0).toFixed(2)}ms`, rightCol, yPos, { fontSize: 9, color: '#aaa' });
    yPos += lineHeight;
    
    textRenderer.drawText('Draw Calls:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(metrics.drawCalls.toString(), rightCol + 20, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight + sectionGap;
    
    // ECS Stats Section
    renderer.drawRect(leftCol, yPos - 5, panelWidth - 20, 2, { r: 1, g: 1, b: 0 }, 0.5);
    yPos += 5;
    textRenderer.drawText('ECS STATS', leftCol, yPos, { fontSize: 11, color: '#ff0' });
    yPos += lineHeight;
    
    textRenderer.drawText('Active:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText((scenePerfMetrics.ecsActiveEntities || 0).toLocaleString(), rightCol - 20, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Total:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText((scenePerfMetrics.ecsTotalEntities || 0).toLocaleString(), rightCol - 20, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    const ecsEff = scenePerfMetrics.ecsTotalEntities > 0 
      ? (scenePerfMetrics.ecsActiveEntities / scenePerfMetrics.ecsTotalEntities * 100).toFixed(0)
      : '100';
    textRenderer.drawText('Efficiency:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${ecsEff}%`, rightCol + 15, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Memory:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${metrics.memory.toFixed(1)}MB`, rightCol, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight + sectionGap;
    
    // Advanced Metrics Section
    renderer.drawRect(leftCol, yPos - 5, panelWidth - 20, 2, { r: 0, g: 1, b: 0.5 }, 0.5);
    yPos += 5;
    textRenderer.drawText('ADVANCED METRICS', leftCol, yPos, { fontSize: 11, color: '#0f8' });
    yPos += lineHeight;
    
    textRenderer.drawText('Vertices:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(metrics.verticesRendered.toLocaleString(), rightCol - 30, yPos, { fontSize: 9, color: '#fff' });
    yPos += lineHeight - 3;
    
    textRenderer.drawText('Triangles:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(metrics.trianglesRendered.toLocaleString(), rightCol - 30, yPos, { fontSize: 9, color: '#fff' });
    yPos += lineHeight - 3;
    
    textRenderer.drawText('Batch Eff:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${(metrics.batchEfficiency * 100).toFixed(1)}%`, rightCol + 10, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Buffer Upload:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${metrics.bufferUploadSize.toFixed(1)}MB`, rightCol, yPos, { fontSize: 9, color: '#fff' });
    yPos += lineHeight - 3;
    
    textRenderer.drawText('State Changes:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(metrics.stateChanges.toString(), rightCol + 20, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Time/Entity:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${metrics.timePerEntity.toFixed(3)}ms`, rightCol, yPos, { fontSize: 9, color: '#fff' });
    yPos += lineHeight;
    
    const bottleneckColor = metrics.bottleneck === 'balanced' ? '#0f0' : metrics.bottleneck === 'cpu' ? '#ff0' : '#f80';
    textRenderer.drawText('Bottleneck:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(metrics.bottleneck.toUpperCase(), rightCol + 5, yPos, { fontSize: 10, color: bottleneckColor });
    yPos += lineHeight;
    
    textRenderer.drawText('Perf Score:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(Math.round(metrics.performanceScore).toString(), rightCol + 20, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight + sectionGap;
    
    // Culling Metrics Section
    const inFrustum = metrics.entitiesInFrustum || 0;
    const culled = metrics.entitiesCulled || 0;
    const cullingEff = metrics.cullingEfficiency || 0;
    
    renderer.drawRect(leftCol, yPos - 5, panelWidth - 20, 2, { r: 1, g: 0.5, b: 0 }, 0.5);
    yPos += 5;
    textRenderer.drawText('CULLING METRICS', leftCol, yPos, { fontSize: 11, color: '#f80' });
    yPos += lineHeight;
    
    textRenderer.drawText('In Frustum:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(inFrustum.toLocaleString(), rightCol - 20, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    textRenderer.drawText('Culled:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(culled.toLocaleString(), rightCol - 20, yPos, { fontSize: 10, color: '#fff' });
    yPos += lineHeight;
    
    const cullingColor = cullingEff > 50 ? '#0f0' : cullingEff > 20 ? '#ff0' : '#f80';
    textRenderer.drawText('Efficiency:', leftCol + 5, yPos, { fontSize: 10, color: '#fff' });
    textRenderer.drawText(`${cullingEff.toFixed(1)}%`, rightCol + 10, yPos, { fontSize: 10, color: cullingColor });
  }
  
  private renderGraphs(renderer: WebGLBatchRenderer): void {
    const graphX = 20;
    const graphY = this.canvasHeight - 170;
    const graphWidth = 400;
    const graphHeight = 140;
    
    // FPS Graph with border
    renderer.drawRect(graphX - 3, graphY - 3, graphWidth + 6, graphHeight + 6, { r: 0, g: 1, b: 0 }, 1.0);
    this.drawGraph(renderer, graphX, graphY, graphWidth, graphHeight, 
      this.fpsHistory, 0, 120, 0, 1, 0, 1.0);
    
    // Update Time Graph with border
    const graphX2 = graphX + graphWidth + 30;
    renderer.drawRect(graphX2 - 3, graphY - 3, graphWidth + 6, graphHeight + 6, { r: 0, g: 1, b: 1 }, 1.0);
    this.drawGraph(renderer, graphX2, graphY, graphWidth, graphHeight,
      this.updateTimeHistory, 0, 20, 1, 1, 0, 0.9);
  }
  
  private drawGraph(renderer: WebGLBatchRenderer, x: number, y: number, width: number, height: number,
    data: number[], min: number, max: number, r: number, g: number, b: number, alpha: number): void {
    
    // Background
    renderer.drawRect(x, y, width, height, { r: 0, g: 0, b: 0 }, 0.7);
    
    // Draw data points as connected lines
    if (data.length > 1) {
      const step = width / (this.graphMaxSamples - 1);
      for (let i = 0; i < data.length - 1; i++) {
        const x1 = x + i * step;
        const normalizedY1 = Math.max(0, Math.min(1, (data[i] - min) / (max - min)));
        const y1 = y + height - (normalizedY1 * height);
        
        const x2 = x + (i + 1) * step;
        const normalizedY2 = Math.max(0, Math.min(1, (data[i + 1] - min) / (max - min)));
        const y2 = y + height - (normalizedY2 * height);
        
        // Draw vertical line segment (thicker for visibility)
        const lineHeight = Math.abs(y2 - y1) + 3;
        const lineY = Math.min(y1, y2);
        renderer.drawRect(x1, lineY, 3, lineHeight, { r, g, b }, alpha);
      }
    }
  }
  
  private renderControls(textRenderer: TextRenderer, renderer: WebGLBatchRenderer): void {
    const panelX = this.canvasWidth - 290;
    const panelY = 10;
    const panelWidth = 280;
    const panelPadding = 10;
    const lineHeight = 16;
    const buttonHeight = 28;
    
    let x = panelX + panelPadding;
    let y = panelY + panelPadding;
    
    // Draw semi-transparent background panel
    renderer.drawRect(panelX, panelY, panelWidth, 380, { r: 0, g: 0, b: 0 }, 0.85);
    // Cyan border
    renderer.drawRect(panelX, panelY, panelWidth, 2, { r: 0, g: 1, b: 1 }, 1.0);
    renderer.drawRect(panelX, panelY + 378, panelWidth, 2, { r: 0, g: 1, b: 1 }, 1.0);
    renderer.drawRect(panelX, panelY, 2, 380, { r: 0, g: 1, b: 1 }, 1.0);
    renderer.drawRect(panelX + panelWidth - 2, panelY, 2, 380, { r: 0, g: 1, b: 1 }, 1.0);
    
    textRenderer.drawText('🎮 CONTROLS', x + 80, y, { fontSize: 14, color: '#0ff' });
    y += lineHeight + 8;
    
    // Entity spawning buttons section
    textRenderer.drawText('ADD ENTITIES:', x, y, { fontSize: 12, color: '#ff0' });
    y += lineHeight + 4;
    
    // Draw buttons (visual only - actual functionality via keyboard)
    const buttonWidth = (panelWidth - 30) / 2;
    
    // Row 1: 100 and 1K
    this.drawButton(renderer, textRenderer, x, y, buttonWidth, buttonHeight, '+100 (Q)', '#0f0');
    this.drawButton(renderer, textRenderer, x + buttonWidth + 10, y, buttonWidth, buttonHeight, '+1K (W)', '#0f0');
    y += buttonHeight + 6;
    
    // Row 2: 10K and 100K
    this.drawButton(renderer, textRenderer, x, y, buttonWidth, buttonHeight, '+10K (E)', '#ff0');
    this.drawButton(renderer, textRenderer, x + buttonWidth + 10, y, buttonWidth, buttonHeight, '+100K (R)', '#f80');
    y += buttonHeight + 10;
    
    // Effects section
    textRenderer.drawText('EFFECTS:', x, y, { fontSize: 12, color: '#ff0' });
    y += lineHeight + 2;
    
    const effects = [
      '1 - Flamethrower (Hold)',
      '2 - Water Spray (Hold)',
      '3 - Explosion Burst',
      '4 - Snow Storm',
      '5 - Sparkle Trail',
      '6 - Poison Cloud'
    ];
    
    effects.forEach(effect => {
      textRenderer.drawText(effect, x + 5, y, { fontSize: 11, color: '#0f0' });
      y += lineHeight;
    });
    
    y += 6;
    
    // Other controls
    textRenderer.drawText('OTHER:', x, y, { fontSize: 12, color: '#ff0' });
    y += lineHeight + 2;
    
    const otherControls = [
      'B - Add Box Obstacle',
      'V - Clear Boxes',
      'C - Clear All Particles',
      'T - Toggle Throttling',
      'F - Toggle Frustum Culling',
      'G - Toggle Vertex Pulling',
      'SPACE - Pause/Resume'
    ];
    
    otherControls.forEach(control => {
      textRenderer.drawText(control, x + 5, y, { fontSize: 11, color: '#0f0' });
      y += lineHeight;
    });
    
    y += 6;
    textRenderer.drawText('Mouse - Spray Particles', x + 5, y, { fontSize: 11, color: '#0ff' });
  }
  
  private drawButton(renderer: WebGLBatchRenderer, textRenderer: TextRenderer, 
    x: number, y: number, width: number, height: number, text: string, color: string): void {
    // Button background
    renderer.drawRect(x, y, width, height, { r: 0, g: 0.2, b: 0.2 }, 0.8);
    // Button border
    const rgb = this.hexToRgb(color);
    renderer.drawRect(x, y, width, 2, rgb, 0.8);
    renderer.drawRect(x, y + height - 2, width, 2, rgb, 0.8);
    renderer.drawRect(x, y, 2, height, rgb, 0.8);
    renderer.drawRect(x + width - 2, y, 2, height, rgb, 0.8);
    
    // Button text (centered)
    textRenderer.drawText(text, x + width / 2 - text.length * 3, y + height / 2 - 5, { 
      fontSize: 11, 
      color 
    });
  }
  
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (hex === '#0f0') return { r: 0, g: 1, b: 0 };
    if (hex === '#ff0') return { r: 1, g: 1, b: 0 };
    if (hex === '#f80') return { r: 1, g: 0.5, b: 0 };
    if (hex === '#f00') return { r: 1, g: 0, b: 0 };
    return { r: 1, g: 1, b: 1 };
  }
}

// Main initialization
function init() {
  // Ensure body has relative positioning for text overlay
  document.body.style.position = 'relative';
  
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  
  const engine = new Vectorium({
    canvas,
    width: canvas.width,
    height: canvas.height,
    preferWebGL2: true,
    targetFPS: 60,
    enableAdaptiveQuality: true,
    initialQuality: 'high',
    debugMode: false
  });
  
  const scene = new ImmersiveScene('main', 2000000);
  engine.registerScene('main', scene);
  
  engine.loadScene('main').then(() => {
    scene.setEngineRef(engine);
    engine.start();
    setupControls(engine, scene, canvas);
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine.resize(canvas.width, canvas.height);
  });
}

function setupControls(engine: Vectorium, scene: ImmersiveScene, canvas: HTMLCanvasElement): void {
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;
  let currentEffect = 'normal';
  
  // Convert screen coordinates to canvas-relative coordinates
  const screenToCanvas = (screenX: number, screenY: number) => {
    const rect = canvas.getBoundingClientRect();
    return { 
      x: screenX - rect.left, 
      y: screenY - rect.top 
    };
  };
  
  // Mouse tracking
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    mouseX = canvasPos.x;
    mouseY = canvasPos.y;
    console.log(`Mouse down at canvas: (${mouseX.toFixed(1)}, ${mouseY.toFixed(1)})`);
  });
  
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    mouseX = canvasPos.x;
    mouseY = canvasPos.y;
  });
  
  // Mouse spray effect
  setInterval(() => {
    if (mouseDown) {
      scene.spawnParticles(50, mouseX, mouseY, currentEffect);
    }
  }, 16); // ~60 FPS spray rate
  
  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    switch(key) {
      // Entity spawning
      case 'q':
        scene.addEntities(100);
        break;
      case 'w':
        scene.addEntities(1000);
        break;
      case 'e':
        scene.addEntities(10000);
        break;
      case 'r':
        scene.addEntities(100000);
        break;
      
      // Effects
      case '1':
        currentEffect = 'flamethrower';
        scene.spawnParticles(100, mouseX, mouseY, 'flamethrower');
        break;
      case '2':
        currentEffect = 'water';
        scene.spawnParticles(100, mouseX, mouseY, 'water');
        break;
      case '3':
        scene.spawnParticles(500, mouseX, mouseY, 'explosion');
        break;
      case '4':
        currentEffect = 'snow';
        for (let i = 0; i < 10; i++) {
          scene.spawnParticles(50, Math.random() * canvas.width, 0, 'snow');
        }
        break;
      case '5':
        currentEffect = 'sparkle';
        scene.spawnParticles(200, mouseX, mouseY, 'sparkle');
        break;
      case '6':
        currentEffect = 'poison';
        scene.spawnParticles(300, mouseX, mouseY, 'poison');
        break;
      
      // Box obstacles
      case 'b':
        const boxWidth = 50 + Math.random() * 150;
        const boxHeight = 50 + Math.random() * 150;
        scene.addBox(mouseX, mouseY, boxWidth, boxHeight);
        break;
      case 'v':
        scene.clearBoxes();
        break;
      
      // Clear particles
      case 'c':
        scene.clearParticles();
        break;
      
      // Toggle throttling
      case 't':
        // Throttle toggle removed
        break;
      
      // Toggle frustum culling
      case 'f':
        // Toggle between viewport-only and 10x world
        const currentWorld = (scene as any).worldWidth;
        const isLargeWorld = currentWorld > scene.getWorldWidth() * 2;
        scene.toggleFrustumCulling(!isLargeWorld);
        console.log(`Frustum culling ${!isLargeWorld ? 'ENABLED' : 'DISABLED'} - World: ${(scene as any).worldWidth}x${(scene as any).worldHeight}`);
        break;
      
      // Toggle vertex pulling
      case 'g':
        const renderer = (engine as any).renderer;
        const currentlyEnabled = renderer.isVertexPullingActive();
        renderer.setVertexPullingEnabled(!currentlyEnabled);
        console.log(`🚀 Vertex Pulling ${!currentlyEnabled ? 'ENABLED' : 'DISABLED'} - GPU-side vertex generation`);
        break;
      
      // Pause/Resume
      case ' ':
        e.preventDefault();
        const engineRunning = (engine as any).running;
        if (engineRunning) {
          engine.stop();
        } else {
          engine.start();
        }
        break;
    }
  });
  
  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === '1' || key === '2') {
      currentEffect = 'normal';
    }
  });
}

init();
