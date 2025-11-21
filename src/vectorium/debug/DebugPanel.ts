/**
 * Vectorium Debug Panel
 * Professional in-game settings UI for performance tuning
 * Inspired by dat.GUI, Unity Inspector, and Chrome DevTools
 */

import { RuntimeConfig } from '../core/RuntimeConfig';

export class DebugPanel {
  private config: RuntimeConfig;
  private container: HTMLDivElement | null = null;
  private collapsed = false;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.createUI();
    this.setupKeyboardShortcut();
  }

  private createUI(): void {
    this.container = document.createElement('div');
    this.container.className = 'vectorium-debug-panel';
    this.container.innerHTML = `
      <div class="debug-panel-header">
        <span class="panel-title">⚙️ CONFIG</span>
        <button class="panel-collapse-btn">▼</button>
      </div>
      <div class="debug-panel-content">
        ${this.renderRenderingSection()}
        ${this.renderPhysicsSection()}
        ${this.renderQualitySection()}
        ${this.renderAnimationSection()}
        ${this.renderDebugSection()}
        ${this.renderActionsSection()}
      </div>
      ${this.createStyles()}
    `;

    document.body.appendChild(this.container);
    this.attachEventListeners();
  }

  private renderRenderingSection(): string {
    const r = this.config.rendering;
    return `
      <div class="config-section">
        <div class="section-header">🎨 RENDERING</div>
        <div class="config-row">
          <label>Resolution</label>
          <select id="cfg-resolution" class="config-select">
            <option value="800x600" ${r.resolution.width === 800 && r.resolution.height === 600 ? 'selected' : ''}>800×600 (4:3)</option>
            <option value="1024x768" ${r.resolution.width === 1024 && r.resolution.height === 768 ? 'selected' : ''}>1024×768 (4:3)</option>
            <option value="1280x720" ${r.resolution.width === 1280 && r.resolution.height === 720 ? 'selected' : ''}>1280×720 (16:9)</option>
            <option value="1366x768" ${r.resolution.width === 1366 && r.resolution.height === 768 ? 'selected' : ''}>1366×768 (16:9)</option>
            <option value="1920x1080" ${r.resolution.width === 1920 && r.resolution.height === 1080 ? 'selected' : ''}>1920×1080 (16:9)</option>
            <option value="2560x1440" ${r.resolution.width === 2560 && r.resolution.height === 1440 ? 'selected' : ''}>2560×1440 (16:9)</option>
          </select>
        </div>
        <div class="config-row">
          <label>Batch Size</label>
          <select id="cfg-batch-size" class="config-select">
            <option value="16000" ${r.batchSize === 16000 ? 'selected' : ''}>16K (more calls)</option>
            <option value="32000" ${r.batchSize === 32000 ? 'selected' : ''}>32K</option>
            <option value="48000" ${r.batchSize === 48000 ? 'selected' : ''}>48K</option>
            <option value="65000" ${r.batchSize === 65000 ? 'selected' : ''}>65K (default)</option>
          </select>
        </div>
        <div class="config-row">
          <label>Frustum Culling</label>
          <input type="checkbox" id="cfg-culling" ${r.enableFrustumCulling ? 'checked' : ''}>
        </div>
        <div class="config-row">
          <label>Batch Rendering</label>
          <input type="checkbox" id="cfg-batching" ${r.enableBatching ? 'checked' : ''}>
        </div>
        <div class="config-row">
          <label>VSync</label>
          <input type="checkbox" id="cfg-vsync" ${r.vsync ? 'checked' : ''}>
        </div>
      </div>
    `;
  }

  private renderPhysicsSection(): string {
    const p = this.config.physics;
    return `
      <div class="config-section">
        <div class="section-header">⚙️ PHYSICS</div>
        <div class="config-row">
          <label>World Multiplier</label>
          <input type="range" id="cfg-bounds-mult" min="1" max="10" step="0.5" value="${p.boundsMultiplier}" class="config-slider">
          <span class="slider-value">${p.boundsMultiplier}x</span>
        </div>
        <div class="config-row">
          <label>Bounce</label>
          <input type="checkbox" id="cfg-bounce" ${p.enableBounce ? 'checked' : ''}>
        </div>
        <div class="config-row">
          <label>Damping</label>
          <input type="range" id="cfg-damping" min="0" max="1" step="0.01" value="${p.velocityDamping}" class="config-slider">
          <span class="slider-value">${p.velocityDamping.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  private renderQualitySection(): string {
    const q = this.config.quality;
    return `
      <div class="config-section">
        <div class="section-header">📊 QUALITY</div>
        <div class="config-row">
          <label>Adaptive Quality</label>
          <input type="checkbox" id="cfg-adaptive" ${q.enableAdaptiveQuality ? 'checked' : ''}>
        </div>
        <div class="config-row">
          <label>Target FPS</label>
          <input type="number" id="cfg-target-fps" min="30" max="144" value="${q.targetFPS}" class="config-input">
        </div>
      </div>
    `;
  }

  private renderAnimationSection(): string {
    const a = this.config.animation;
    return `
      <div class="config-section">
        <div class="section-header">🎭 ANIMATION</div>
        <div class="config-row">
          <label>Speed</label>
          <input type="range" id="cfg-anim-speed" min="0" max="2" step="0.1" value="${a.animationSpeed}" class="config-slider">
          <span class="slider-value">${a.animationSpeed.toFixed(1)}x</span>
        </div>
        <div class="config-row">
          <label>Rotation</label>
          <input type="checkbox" id="cfg-rotation" ${a.enableRotation ? 'checked' : ''}>
        </div>
        <div class="config-row">
          <label>Pulse</label>
          <input type="checkbox" id="cfg-pulse" ${a.enablePulse ? 'checked' : ''}>
        </div>
        <div class="config-row">
          <label>Wobble</label>
          <input type="checkbox" id="cfg-wobble" ${a.enableWobble ? 'checked' : ''}>
        </div>
      </div>
    `;
  }

  private renderDebugSection(): string {
    const d = this.config.debug;
    return `
      <div class="config-section">
        <div class="section-header">🐛 DEBUG</div>
        <div class="config-row">
          <label>Show Grid</label>
          <input type="checkbox" id="cfg-show-grid" ${d.showGrid ? 'checked' : ''}>
        </div>
        <div class="config-row">
          <label>Show Bounds</label>
          <input type="checkbox" id="cfg-show-bounds" ${d.showBounds ? 'checked' : ''}>
        </div>
        <div class="config-row">
          <label>Perf Warnings</label>
          <input type="checkbox" id="cfg-warnings" ${d.logPerformanceWarnings ? 'checked' : ''}>
        </div>
      </div>
    `;
  }

  private renderActionsSection(): string {
    return `
      <div class="config-section">
        <div class="section-header">💾 ACTIONS</div>
        <button id="cfg-fullscreen" class="action-btn fullscreen">🖥️ Fullscreen</button>
        <button id="cfg-reset" class="action-btn danger">Reset Defaults</button>
        <button id="cfg-export" class="action-btn">Export JSON</button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Collapse toggle
    const collapseBtn = this.container.querySelector('.panel-collapse-btn');
    collapseBtn?.addEventListener('click', () => this.toggleCollapse());

    // Rendering
    this.on('cfg-resolution', 'change', (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      const [width, height] = value.split('x').map(Number);
      this.config.setRendering({ resolution: { width, height } });
    });

    this.on('cfg-batch-size', 'change', (e: Event) => {
      const value = parseInt((e.target as HTMLSelectElement).value, 10);
      this.config.setRendering({ batchSize: value });
    });

    this.on('cfg-culling', 'change', (e: Event) => {
      this.config.setRendering({ enableFrustumCulling: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-batching', 'change', (e: Event) => {
      this.config.setRendering({ enableBatching: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-vsync', 'change', (e: Event) => {
      this.config.setRendering({ vsync: (e.target as HTMLInputElement).checked });
    });

    // Physics
    this.on('cfg-bounds-mult', 'input', (e: Event) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.setPhysics({ boundsMultiplier: value });
      this.updateSliderValue(e.target as HTMLInputElement, `${value}x`);
    });

    this.on('cfg-bounce', 'change', (e: Event) => {
      this.config.setPhysics({ enableBounce: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-damping', 'input', (e: Event) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.setPhysics({ velocityDamping: value });
      this.updateSliderValue(e.target as HTMLInputElement, value.toFixed(2));
    });

    // Quality
    this.on('cfg-adaptive', 'change', (e: Event) => {
      this.config.setQuality({ enableAdaptiveQuality: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-target-fps', 'change', (e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.config.setQuality({ targetFPS: value });
    });

    // Animation
    this.on('cfg-anim-speed', 'input', (e: Event) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.setAnimation({ animationSpeed: value });
      this.updateSliderValue(e.target as HTMLInputElement, `${value.toFixed(1)}x`);
    });

    this.on('cfg-rotation', 'change', (e: Event) => {
      this.config.setAnimation({ enableRotation: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-pulse', 'change', (e: Event) => {
      this.config.setAnimation({ enablePulse: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-wobble', 'change', (e: Event) => {
      this.config.setAnimation({ enableWobble: (e.target as HTMLInputElement).checked });
    });

    // Debug
    this.on('cfg-show-grid', 'change', (e: Event) => {
      this.config.setDebug({ showGrid: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-show-bounds', 'change', (e: Event) => {
      this.config.setDebug({ showBounds: (e.target as HTMLInputElement).checked });
    });

    this.on('cfg-warnings', 'change', (e: Event) => {
      this.config.setDebug({ logPerformanceWarnings: (e.target as HTMLInputElement).checked });
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
        this.config.reset();
        this.refresh();
      }
    });

    this.on('cfg-export', 'click', () => {
      const json = this.config.export();
      navigator.clipboard.writeText(json);
      alert('Config copied to clipboard!');
    });
  }

  private on(id: string, event: string, handler: (e: Event) => void): void {
    const el = this.container?.querySelector(`#${id}`);
    el?.addEventListener(event, handler);
  }

  private updateSliderValue(slider: HTMLInputElement, text: string): void {
    const valueSpan = slider.nextElementSibling as HTMLSpanElement;
    if (valueSpan) valueSpan.textContent = text;
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    if (this.container) {
      const content = this.container.querySelector('.debug-panel-content') as HTMLDivElement;
      const btn = this.container.querySelector('.panel-collapse-btn') as HTMLButtonElement;
      if (this.collapsed) {
        content.style.display = 'none';
        btn.textContent = '▶';
      } else {
        content.style.display = 'block';
        btn.textContent = '▼';
      }
    }
  }

  private refresh(): void {
    if (!this.container) return;
    const content = this.container.querySelector('.debug-panel-content') as HTMLDivElement;
    content.innerHTML = `
      ${this.renderRenderingSection()}
      ${this.renderPhysicsSection()}
      ${this.renderQualitySection()}
      ${this.renderAnimationSection()}
      ${this.renderDebugSection()}
      ${this.renderActionsSection()}
    `;
    this.attachEventListeners();
  }

  private setupKeyboardShortcut(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if ((e.key === 'c' || e.key === 'C') &&
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        this.toggle();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  toggle(): void {
    if (this.container) {
      this.container.classList.toggle('hidden');
    }
  }

  destroy(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    if (this.container) {
      this.container.remove();
    }
  }

  private createStyles(): string {
    return `
      <style>
        .vectorium-debug-panel {
          position: fixed;
          top: 10px;
          left: 10px;
          width: 320px;
          max-height: 95vh;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.92);
          border: 2px solid #00FF00;
          border-radius: 6px;
          font-family: 'Courier New', Consolas, monospace;
          font-size: 11px;
          color: #00FF00;
          box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
          z-index: 9999;
          transition: opacity 0.3s, transform 0.3s;
        }
        .vectorium-debug-panel.hidden {
          opacity: 0;
          transform: translateX(-360px);
          pointer-events: none;
        }
        .debug-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: rgba(0, 255, 0, 0.05);
          border-bottom: 1px solid rgba(0, 255, 0, 0.3);
        }
        .panel-title {
          font-weight: bold;
          font-size: 13px;
          letter-spacing: 0.5px;
        }
        .panel-collapse-btn {
          background: none;
          border: none;
          color: #00FF00;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
        }
        .debug-panel-content {
          padding: 0;
        }
        .config-section {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .section-header {
          background: rgba(0, 255, 0, 0.1);
          padding: 6px 12px;
          margin: 0 -12px 8px -12px;
          font-weight: bold;
          font-size: 10px;
          letter-spacing: 0.5px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #4a9eff;
        }
        .config-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 0;
          line-height: 1.4;
        }
        .config-row label {
          font-size: 11px;
          color: #00FF00;
        }
        .config-select, .config-input {
          background: #000;
          color: #00FF00;
          border: 1px solid #00FF00;
          border-radius: 3px;
          padding: 4px 6px;
          font-family: inherit;
          font-size: 10px;
          width: 140px;
        }
        .config-slider {
          width: 100px;
          margin-right: 6px;
        }
        .slider-value {
          min-width: 40px;
          text-align: right;
          font-weight: bold;
          color: #FFFF00;
        }
        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        .action-btn {
          width: 100%;
          padding: 8px;
          margin-bottom: 6px;
          background: #00FF00;
          color: #000;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
        }
        .action-btn:hover {
          background: #00FF88;
        }
        .action-btn.danger {
          background: #FF4444;
          color: #FFF;
        }
        .action-btn.danger:hover {
          background: #FF5555;
        }
        .action-btn.fullscreen {
          background: #00AA00;
        }
        .action-btn.fullscreen:hover {
          background: #00CC00;
        }
        .vectorium-debug-panel::-webkit-scrollbar {
          width: 8px;
        }
        .vectorium-debug-panel::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }
        .vectorium-debug-panel::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.3);
          border-radius: 4px;
        }
        .vectorium-debug-panel::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 0, 0.5);
        }
      </style>
    `;
  }
}
