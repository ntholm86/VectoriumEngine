/**
 * Vectorium Debug Panel
 * Professional in-game settings UI for performance tuning
 * Inspired by dat.GUI, Unity Inspector, and Chrome DevTools
 */

import { RuntimeConfig } from '../core/RuntimeConfig';
import { UIPanel } from '../ui/UIPanel';
import type { InputManager } from '../input/InputManager';

export class DebugPanel extends UIPanel {
  private runtimeConfig: RuntimeConfig;

  constructor(config: RuntimeConfig, inputManager: InputManager) {
    super({
      id: 'debug-panel',
      title: '⚙️ CONFIG',
      keyboardShortcut: 'c',
      position: 'top-left',
      defaultVisible: false,
      collapsible: true
    }, inputManager);
    this.runtimeConfig = config;
  }

  /**
   * Create panel content (required by UIPanel)
   */
  protected createContent(): string {
    return `
      ${this.renderRenderingSection()}
      ${this.renderPhysicsSection()}
      ${this.renderQualitySection()}
      ${this.renderAnimationSection()}
      ${this.renderDebugSection()}
      ${this.renderActionsSection()}
    `;
  }

  private renderRenderingSection(): string {
    const r = this.runtimeConfig.rendering;
    return `
      <div class="ui-section">
        <div class="section-header">🎨 RENDERING</div>
        <div class="ui-row">
          <label class="ui-label">Resolution</label>
          <select id="cfg-resolution">
            <option value="800x600" ${r.resolution.width === 800 && r.resolution.height === 600 ? 'selected' : ''}>800×600 (4:3)</option>
            <option value="1024x768" ${r.resolution.width === 1024 && r.resolution.height === 768 ? 'selected' : ''}>1024×768 (4:3)</option>
            <option value="1280x720" ${r.resolution.width === 1280 && r.resolution.height === 720 ? 'selected' : ''}>1280×720 (16:9)</option>
            <option value="1366x768" ${r.resolution.width === 1366 && r.resolution.height === 768 ? 'selected' : ''}>1366×768 (16:9)</option>
            <option value="1920x1080" ${r.resolution.width === 1920 && r.resolution.height === 1080 ? 'selected' : ''}>1920×1080 (16:9)</option>
            <option value="2560x1440" ${r.resolution.width === 2560 && r.resolution.height === 1440 ? 'selected' : ''}>2560×1440 (16:9)</option>
          </select>
        </div>
        <div class="ui-row">
          <label class="ui-label">Batch Size</label>
          <select id="cfg-batch-size">
            <option value="16000" ${r.batchSize === 16000 ? 'selected' : ''}>16K (more calls)</option>
            <option value="32000" ${r.batchSize === 32000 ? 'selected' : ''}>32K</option>
            <option value="48000" ${r.batchSize === 48000 ? 'selected' : ''}>48K</option>
            <option value="65000" ${r.batchSize === 65000 ? 'selected' : ''}>65K (default)</option>
          </select>
        </div>
        <div class="ui-row">
          <label class="ui-label">Frustum Culling</label>
          <div class="ui-value">
            <input type="checkbox" id="cfg-culling" ${r.enableFrustumCulling ? 'checked' : ''}>
            <span id="culling-status" class="status-badge" data-status="off">OFF</span>
          </div>
        </div>
        <div class="ui-row">
          <label class="ui-label">Batch Rendering</label>
          <input type="checkbox" id="cfg-batching" ${r.enableBatching ? 'checked' : ''}>
        </div>
        <div class="ui-row">
          <label class="ui-label">VSync</label>
          <input type="checkbox" id="cfg-vsync" ${r.vsync ? 'checked' : ''}>
        </div>
      </div>
    `;
  }

  private renderPhysicsSection(): string {
    const p = this.runtimeConfig.physics;
    return `
      <div class="ui-section">
        <div class="section-header">⚙️ PHYSICS</div>
        <div class="ui-row">
          <label class="ui-label">World Multiplier</label>
          <div class="ui-value">
            <input type="range" id="cfg-bounds-mult" min="1" max="10" step="0.5" value="${p.boundsMultiplier}">
            <span class="metric-value">${p.boundsMultiplier}x</span>
          </div>
        </div>
        <div class="ui-row">
          <label class="ui-label">Bounce</label>
          <input type="checkbox" id="cfg-bounce" ${p.enableBounce ? 'checked' : ''}>
        </div>
        <div class="ui-row">
          <label class="ui-label">Damping</label>
          <div class="ui-value">
            <input type="range" id="cfg-damping" min="0" max="1" step="0.01" value="${p.velocityDamping}">
            <span class="metric-value">${p.velocityDamping.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderQualitySection(): string {
    const q = this.runtimeConfig.quality;
    return `
      <div class="ui-section">
        <div class="section-header">📊 QUALITY</div>
        <div class="ui-row">
          <label class="ui-label">Adaptive Quality</label>
          <input type="checkbox" id="cfg-adaptive" ${q.enableAdaptiveQuality ? 'checked' : ''}>
        </div>
        <div class="ui-row">
          <label class="ui-label">Target FPS</label>
          <input type="number" id="cfg-target-fps" min="30" max="144" value="${q.targetFPS}">
        </div>
      </div>
    `;
  }

  private renderAnimationSection(): string {
    const a = this.runtimeConfig.animation;
    return `
      <div class="ui-section">
        <div class="section-header">🎭 ANIMATION</div>
        <div class="ui-row">
          <label class="ui-label">Speed</label>
          <div class="ui-value">
            <input type="range" id="cfg-anim-speed" min="0" max="2" step="0.1" value="${a.animationSpeed}">
            <span class="metric-value">${a.animationSpeed.toFixed(1)}x</span>
          </div>
        </div>
        <div class="ui-row">
          <label class="ui-label">Rotation</label>
          <input type="checkbox" id="cfg-rotation" ${a.enableRotation ? 'checked' : ''}>
        </div>
        <div class="ui-row">
          <label class="ui-label">Pulse</label>
          <input type="checkbox" id="cfg-pulse" ${a.enablePulse ? 'checked' : ''}>
        </div>
        <div class="ui-row">
          <label class="ui-label">Wobble</label>
          <input type="checkbox" id="cfg-wobble" ${a.enableWobble ? 'checked' : ''}>
        </div>
      </div>
    `;
  }

  private renderDebugSection(): string {
    const d = this.runtimeConfig.debug;
    return `
      <div class="ui-section">
        <div class="section-header">🐛 DEBUG</div>
        <div class="ui-row">
          <label class="ui-label">Show Grid</label>
          <input type="checkbox" id="cfg-show-grid" ${d.showGrid ? 'checked' : ''}>
        </div>
        <div class="ui-row">
          <label class="ui-label">Show Bounds</label>
          <input type="checkbox" id="cfg-show-bounds" ${d.showBounds ? 'checked' : ''}>
        </div>
        <div class="ui-row">
          <label class="ui-label">Perf Warnings</label>
          <input type="checkbox" id="cfg-warnings" ${d.logPerformanceWarnings ? 'checked' : ''}>
        </div>
      </div>
    `;
  }

  private renderActionsSection(): string {
    return `
      <div class="ui-section">
        <div class="section-header">💾 ACTIONS</div>
        <button id="cfg-fullscreen" class="vectorium-btn">🖥️ Fullscreen</button>
        <button id="cfg-reset" class="vectorium-btn danger-solid">Reset Defaults</button>
        <button id="cfg-export" class="vectorium-btn">Export JSON</button>
      </div>
    `;
  }

  /**
   * Attach event listeners (required by UIPanel)
   */
  protected attachEventListeners(): void {
    if (!this.container) return;

    // Rendering
    this.on('cfg-resolution', 'change', (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      const [width, height] = value.split('x').map(Number);
      this.runtimeConfig.setRendering({ resolution: { width, height } });
    });

    this.on('cfg-batch-size', 'change', (e: Event) => {
      const value = parseInt((e.target as HTMLSelectElement).value, 10);
      this.runtimeConfig.setRendering({ batchSize: value });
    });

    this.on('cfg-culling', 'change', (e: Event) => {
      this.runtimeConfig.setRendering({ enableFrustumCulling: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-batching', 'change', (e: Event) => {
      this.runtimeConfig.setRendering({ enableBatching: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-vsync', 'change', (e: Event) => {
      this.runtimeConfig.setRendering({ vsync: (e.target as HTMLInputElement).checked });
    });

    // Physics
    this.on('cfg-bounds-mult', 'input', (e: Event) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.runtimeConfig.setPhysics({ boundsMultiplier: value });
      this.updateSliderValue(e.target as HTMLInputElement, `${value}x`);
    });

    this.on('cfg-bounce', 'change', (e: Event) => {
      this.runtimeConfig.setPhysics({ enableBounce: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-damping', 'input', (e: Event) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.runtimeConfig.setPhysics({ velocityDamping: value });
      this.updateSliderValue(e.target as HTMLInputElement, value.toFixed(2));
    });

    // Quality
    this.on('cfg-adaptive', 'change', (e: Event) => {
      this.runtimeConfig.setQuality({ enableAdaptiveQuality: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-target-fps', 'change', (e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.runtimeConfig.setQuality({ targetFPS: value });
    });

    // Animation
    this.on('cfg-anim-speed', 'input', (e: Event) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.runtimeConfig.setAnimation({ animationSpeed: value });
      this.updateSliderValue(e.target as HTMLInputElement, `${value.toFixed(1)}x`);
    });

    this.on('cfg-rotation', 'change', (e: Event) => {
      this.runtimeConfig.setAnimation({ enableRotation: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-pulse', 'change', (e: Event) => {
      this.runtimeConfig.setAnimation({ enablePulse: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-wobble', 'change', (e: Event) => {
      this.runtimeConfig.setAnimation({ enableWobble: (e.target as HTMLInputElement).checked });
    });

    // Debug
    this.on('cfg-show-grid', 'change', (e: Event) => {
      this.runtimeConfig.setDebug({ showGrid: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-show-bounds', 'change', (e: Event) => {
      this.runtimeConfig.setDebug({ showBounds: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-warnings', 'change', (e: Event) => {
      this.runtimeConfig.setDebug({ logPerformanceWarnings: (e.target as HTMLInputElement).checked });
    });

    // Actions
    this.on('cfg-fullscreen', 'click', () => {
      const canvas = document.querySelector('canvas');
      if (canvas && canvas.requestFullscreen) {
        canvas.requestFullscreen();
      }
    });

    this.on('cfg-reset', 'click', () => {
      if (confirm('Reset all settings to defaults?')) {
        this.runtimeConfig.reset();
        this.refresh();
      }
    });

    this.on('cfg-export', 'click', () => {
      const json = this.runtimeConfig.export();
      navigator.clipboard.writeText(json);
      alert('Config copied to clipboard!');
    });
  }

  private updateSliderValue(slider: HTMLInputElement, text: string): void {
    const valueSpan = slider.nextElementSibling as HTMLSpanElement;
    if (valueSpan) valueSpan.textContent = text;
  }

  private refresh(): void {
    if (!this.container) return;
    const content = this.container.querySelector('.vectorium-panel-content') as HTMLDivElement;
    content.innerHTML = this.createContent();
    this.attachEventListeners();
  }
  
  /**
   * Update the culling status indicator (called by engine)
   */
  updateCullingStatus(isActive: boolean, worldScale: number): void {
    const statusEl = this.container?.querySelector('#culling-status');
    if (statusEl) {
      statusEl.textContent = isActive ? 'ON' : 'OFF';
      statusEl.className = 'status-badge';
      statusEl.setAttribute('data-status', isActive ? 'on' : 'off');
      statusEl.setAttribute('title', 
        isActive 
          ? `Active (world scale: ${worldScale.toFixed(2)}x)`
          : `Auto-disabled (world scale: ${worldScale.toFixed(2)}x)`
      );
    }
  }
}

