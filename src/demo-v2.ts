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
    (this as any).worldWidth = this.canvasWidth;
    (this as any).worldHeight = this.canvasHeight;
    
    // Spawn initial particles
    this.spawnParticles(1000);
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
  
  clearParticles(): void {
    this.clear();
  }
  
  toggleFrustumCulling(enable: boolean): void {
    if (enable) {
      // Enable frustum culling with 10x world
      (this as any).worldWidth = this.canvasWidth * 10;
      (this as any).worldHeight = this.canvasHeight * 10;
    } else {
      // Disable - use viewport-only (entities bounce in visible area)
      (this as any).worldWidth = this.canvasWidth;
      (this as any).worldHeight = this.canvasHeight;
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
    this.renderMetrics(textRenderer, renderer);
    this.renderGraphs(renderer);
    this.renderControls(textRenderer, renderer);
  }
  
  spawnParticles(count: number, x?: number, y?: number, effect?: string): void {
    for (let i = 0; i < count; i++) {
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
  
  private renderMetrics(textRenderer: TextRenderer, renderer: WebGLBatchRenderer): void {
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
    
    const panelX = 10;
    const panelY = 10;
    const panelWidth = 280;
    const panelPadding = 10;
    const lineHeight = 16;
    const smallLineHeight = 14;
    
    let x = panelX + panelPadding;
    let y = panelY + panelPadding;
    
    // Draw semi-transparent background panel
    renderer.drawRect(panelX, panelY, panelWidth, 420, { r: 0, g: 0, b: 0 }, 0.85);
    // Green border
    renderer.drawRect(panelX, panelY, panelWidth, 2, { r: 0, g: 1, b: 0 }, 1.0); // Top
    renderer.drawRect(panelX, panelY + 418, panelWidth, 2, { r: 0, g: 1, b: 0 }, 1.0); // Bottom
    renderer.drawRect(panelX, panelY, 2, 420, { r: 0, g: 1, b: 0 }, 1.0); // Left
    renderer.drawRect(panelX + panelWidth - 2, panelY, 2, 420, { r: 0, g: 1, b: 0 }, 1.0); // Right
    
    // Title
    textRenderer.drawText('⚡ VECTORIUM ENGINE ⚡', x + 30, y, { 
      fontSize: 14, 
      color: '#0f0'
    });
    y += lineHeight + 8;
    
    // Frame Metrics Section
    renderer.drawRect(x - 5, y - 3, panelWidth - 20, 70, { r: 0, g: 0.4, b: 0 }, 0.2);
    renderer.drawRect(x - 5, y - 3, 3, 70, { r: 0, g: 1, b: 0 }, 0.8); // Left accent
    
    textRenderer.drawText('🎯 FRAME METRICS', x, y, { fontSize: 12, color: '#ff0' });
    y += lineHeight;
    
    const fps = Math.round(metrics.fps);
    const fpsColor = fps >= 55 ? '#0f0' : fps >= 30 ? '#ff0' : '#f00';
    textRenderer.drawText(`FPS:`, x + 5, y, { fontSize: 11, color: '#0f0' });
    textRenderer.drawText(`${fps}`, x + 160, y, { fontSize: 11, color: fpsColor });
    y += smallLineHeight;
    
    textRenderer.drawText(`Frame Time:`, x + 5, y, { fontSize: 11, color: '#0f0' });
    textRenderer.drawText(`${metrics.frameTime.toFixed(2)} ms`, x + 120, y, { fontSize: 11, color: '#0f0' });
    y += smallLineHeight;
    
    textRenderer.drawText(`Quality:`, x + 5, y, { fontSize: 11, color: '#0f0' });
    textRenderer.drawText(`${metrics.quality.toUpperCase()}`, x + 140, y, { fontSize: 11, color: '#0f0' });
    y += lineHeight + 6;
    
    // Update Breakdown Section
    renderer.drawRect(x - 5, y - 3, panelWidth - 20, 95, { r: 0, g: 0.4, b: 0.4 }, 0.2);
    renderer.drawRect(x - 5, y - 3, 3, 95, { r: 0, g: 1, b: 1 }, 0.8);
    
    textRenderer.drawText('⚙️ UPDATE BREAKDOWN', x, y, { fontSize: 12, color: '#0ff' });
    y += lineHeight;
    
    textRenderer.drawText(`Total:`, x + 5, y, { fontSize: 11, color: '#0ff' });
    textRenderer.drawText(`${(scenePerfMetrics.updateTotal || 0).toFixed(2)} ms`, x + 120, y, { fontSize: 11, color: '#0ff' });
    y += smallLineHeight;
    
    textRenderer.drawText(`├─ Physics:`, x + 10, y, { fontSize: 10, color: '#0cc' });
    textRenderer.drawText(`${(scenePerfMetrics.updatePhysics || 0).toFixed(2)} ms`, x + 120, y, { fontSize: 10, color: '#0cc' });
    y += smallLineHeight;
    
    textRenderer.drawText(`├─ Animation:`, x + 10, y, { fontSize: 10, color: '#0cc' });
    textRenderer.drawText(`${(scenePerfMetrics.updateAnimation || 0).toFixed(2)} ms`, x + 120, y, { fontSize: 10, color: '#0cc' });
    y += smallLineHeight;
    
    textRenderer.drawText(`└─ Entity Sync:`, x + 10, y, { fontSize: 10, color: '#0cc' });
    textRenderer.drawText(`${(scenePerfMetrics.updateEntitySync || 0).toFixed(2)} ms`, x + 120, y, { fontSize: 10, color: '#0cc' });
    y += smallLineHeight;
    
    textRenderer.drawText(`Custom Updates:`, x + 5, y, { fontSize: 10, color: '#0ff' });
    textRenderer.drawText(`${scenePerfMetrics.customUpdateCount || 0}`, x + 160, y, { fontSize: 10, color: '#0ff' });
    y += lineHeight + 6;
    
    // Render Breakdown Section
    renderer.drawRect(x - 5, y - 3, panelWidth - 20, 95, { r: 0.4, g: 0, b: 0.4 }, 0.2);
    renderer.drawRect(x - 5, y - 3, 3, 95, { r: 1, g: 0, b: 1 }, 0.8);
    
    textRenderer.drawText('🎨 RENDER BREAKDOWN', x, y, { fontSize: 12, color: '#f0f' });
    y += lineHeight;
    
    textRenderer.drawText(`Total:`, x + 5, y, { fontSize: 11, color: '#f0f' });
    textRenderer.drawText(`${(scenePerfMetrics.renderTotal || 0).toFixed(2)} ms`, x + 120, y, { fontSize: 11, color: '#f0f' });
    y += smallLineHeight;
    
    textRenderer.drawText(`├─ WebGL Setup:`, x + 10, y, { fontSize: 10, color: '#c0c' });
    textRenderer.drawText(`${(scenePerfMetrics.renderBatch || 0).toFixed(2)} ms`, x + 120, y, { fontSize: 10, color: '#c0c' });
    y += smallLineHeight;
    
    textRenderer.drawText(`├─ Entity Render:`, x + 10, y, { fontSize: 10, color: '#c0c' });
    textRenderer.drawText(`${(scenePerfMetrics.renderBatch || 0).toFixed(2)} ms`, x + 120, y, { fontSize: 10, color: '#c0c' });
    y += smallLineHeight;
    
    textRenderer.drawText(`├─ Batch Flush:`, x + 10, y, { fontSize: 10, color: '#c0c' });
    textRenderer.drawText(`${(scenePerfMetrics.renderBatch || 0).toFixed(2)} ms`, x + 120, y, { fontSize: 10, color: '#c0c' });
    y += smallLineHeight;
    
    textRenderer.drawText(`└─ Custom Render:`, x + 10, y, { fontSize: 10, color: '#c0c' });
    textRenderer.drawText(`${scenePerfMetrics.customRenderCount || 0}`, x + 160, y, { fontSize: 10, color: '#c0c' });
    y += lineHeight + 6;
    
    // ECS Stats Section
    renderer.drawRect(x - 5, y - 3, panelWidth - 20, 95, { r: 0.4, g: 0.4, b: 0 }, 0.2);
    renderer.drawRect(x - 5, y - 3, 3, 95, { r: 1, g: 1, b: 0 }, 0.8);
    
    textRenderer.drawText('📊 ECS STATS', x, y, { fontSize: 12, color: '#ff0' });
    y += lineHeight;
    
    textRenderer.drawText(`Active Entities:`, x + 5, y, { fontSize: 11, color: '#ff0' });
    textRenderer.drawText(`${(scenePerfMetrics.ecsActiveEntities || 0).toLocaleString()}`, x + 140, y, { fontSize: 11, color: '#ff0' });
    y += smallLineHeight;
    
    textRenderer.drawText(`Draw Calls:`, x + 5, y, { fontSize: 11, color: '#ff0' });
    textRenderer.drawText(`${metrics.drawCalls || 0}`, x + 160, y, { fontSize: 11, color: '#ff0' });
    y += smallLineHeight;
    
    textRenderer.drawText(`Vertices:`, x + 5, y, { fontSize: 11, color: '#ff0' });
    textRenderer.drawText(`${(metrics.verticesRendered || 0).toLocaleString()}`, x + 140, y, { fontSize: 11, color: '#ff0' });
    y += smallLineHeight;
    
    textRenderer.drawText(`Batch Efficiency:`, x + 5, y, { fontSize: 11, color: '#ff0' });
    textRenderer.drawText(`${((metrics.batchEfficiency || 0) * 100).toFixed(1)}%`, x + 140, y, { fontSize: 11, color: '#ff0' });
    y += smallLineHeight;
    
    textRenderer.drawText(`Memory:`, x + 5, y, { fontSize: 11, color: '#ff0' });
    textRenderer.drawText(`${(metrics.memory || 0).toFixed(1)} MB`, x + 140, y, { fontSize: 11, color: '#ff0' });
    y += lineHeight + 6;
    
    // Throttling Section (only if enabled)
    const throttleStats = this.getThrottleStats();
    if (throttleStats.enabled) {
      textRenderer.drawText('⏱️ THROTTLING: ON', x, y, { fontSize: 11, color: '#0f0' });
      y += smallLineHeight;
      textRenderer.drawText(`${this.getUpdateRate().toFixed(0)} Hz`, x + 5, y, { fontSize: 10, color: '#0f0' });
      textRenderer.drawText(`Group ${throttleStats.currentGroup}/${this.getThrottleGroups()}`, x + 100, y, { fontSize: 10, color: '#0f0' });
    } else {
      textRenderer.drawText('⏱️ THROTTLING: OFF', x, y, { fontSize: 11, color: '#f00' });
      y += smallLineHeight;
    }
  }
  
  private renderGraphs(renderer: WebGLBatchRenderer): void {
    const graphX = 20;
    const graphY = this.canvasHeight - 150;
    const graphWidth = 300;
    const graphHeight = 100;
    
    // FPS Graph
    this.drawGraph(renderer, graphX, graphY, graphWidth, graphHeight, 
      this.fpsHistory, 0, 120, 0, 1, 0, 0.5);
    
    // Update Time Graph  
    this.drawGraph(renderer, graphX + graphWidth + 20, graphY, graphWidth, graphHeight,
      this.updateTimeHistory, 0, 20, 1, 0.5, 0, 0.5);
  }
  
  private drawGraph(renderer: WebGLBatchRenderer, x: number, y: number, width: number, height: number,
    data: number[], min: number, max: number, r: number, g: number, b: number, alpha: number): void {
    
    // Background
    renderer.drawRect(x, y, width, height, { r: 0, g: 0, b: 0 }, 0.7);
    
    // Draw lines
    const step = width / (this.graphMaxSamples - 1);
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = x + i * step;
      const y1 = y + height - ((data[i] - min) / (max - min)) * height;
      const x2 = x + (i + 1) * step;
      const y2 = y + height - ((data[i + 1] - min) / (max - min)) * height;
      
      // Draw line as thin rect
      renderer.drawRect(x1, y1 - 1, x2 - x1, 2, { r, g, b }, alpha);
    }
    
    // Border
    renderer.drawRect(x, y, width, 2, { r, g, b }, 0.8);
    renderer.drawRect(x, y + height - 2, width, 2, { r, g, b }, 0.8);
    renderer.drawRect(x, y, 2, height, { r, g, b }, 0.8);
    renderer.drawRect(x + width - 2, y, 2, height, { r, g, b }, 0.8);
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
  
  const scene = new ImmersiveScene('main', 1000000);
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
  
  // Mouse tracking
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
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
        const throttleEnabled = scene.isThrottleEnabled();
        scene.setThrottleEnabled(!throttleEnabled);
        break;
      
      // Toggle frustum culling
      case 'f':
        // Toggle between viewport-only and 10x world
        const currentWorld = (scene as any).worldWidth;
        const isLargeWorld = currentWorld > scene.canvasWidth * 2;
        scene.toggleFrustumCulling(!isLargeWorld);
        console.log(`Frustum culling ${!isLargeWorld ? 'ENABLED' : 'DISABLED'} - World: ${(scene as any).worldWidth}x${(scene as any).worldHeight}`);
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
