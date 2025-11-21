/**
 * Camera Controls - UI panel for camera manipulation
 * Professional camera control UI matching DebugPanel and EntitySpawner patterns
 * Toggle with 'V' key (View)
 */

import { Camera } from '../core/Camera';
import { RuntimeConfig } from '../core/RuntimeConfig';

export class CameraControls {
  private camera: Camera;
  private config: RuntimeConfig;
  private container: HTMLDivElement | null = null;
  private visible = true;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private collapsed = false;
  
  constructor(camera: Camera, config: RuntimeConfig) {
    this.camera = camera;
    this.config = config;
    this.loadVisibility();
    this.createUI();
    this.setupKeyboardShortcut();
  }
  
  private loadVisibility(): void {
    const stored = localStorage.getItem('vectorium-camera-controls-visible');
    this.visible = stored !== 'false';
  }
  
  private saveVisibility(): void {
    localStorage.setItem('vectorium-camera-controls-visible', String(this.visible));
  }
  
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.className = 'vectorium-camera-controls';
    this.container.innerHTML = `
      <div class="camera-header">
        <span class="panel-title">📷 CAMERA</span>
        <button class="panel-collapse-btn">▼</button>
      </div>
      <div class="camera-content">
        <div class="camera-section">
          <div class="section-header">🔍 ZOOM</div>
          <div class="control-row">
            <button class="camera-btn" data-action="zoom-in">+</button>
            <span class="zoom-display">1.00x</span>
            <button class="camera-btn" data-action="zoom-out">−</button>
          </div>
          <div class="control-row">
            <input type="range" id="camera-zoom-slider" min="0.1" max="10" step="0.1" value="1" class="camera-slider">
          </div>
          <div class="control-row">
            <button class="camera-btn-secondary" data-action="zoom-reset">Reset Zoom</button>
          </div>
        </div>
        
        <div class="camera-section">
          <div class="section-header">🎯 POSITION</div>
          <div class="control-row">
            <button class="camera-btn" data-action="pan-up">↑</button>
          </div>
          <div class="control-row">
            <button class="camera-btn" data-action="pan-left">←</button>
            <button class="camera-btn-secondary" data-action="center">Center</button>
            <button class="camera-btn" data-action="pan-right">→</button>
          </div>
          <div class="control-row">
            <button class="camera-btn" data-action="pan-down">↓</button>
          </div>
        </div>
        
        <div class="camera-section">
          <div class="section-header">🎬 FEATURES</div>
          <div class="control-row">
            <label>
              <input type="checkbox" id="camera-follow-toggle">
              Follow Entity
            </label>
          </div>
          <div class="control-row">
            <label>
              <input type="checkbox" id="camera-smooth-toggle" checked>
              Smooth Movement
            </label>
          </div>
          <div class="control-row">
            <button class="camera-btn-action" data-action="shake">Test Shake</button>
          </div>
        </div>
        
        <div class="camera-hint">
          Z/X: Zoom | Arrows: Pan | F: Follow | Home: Reset
        </div>
      </div>
      ${this.createStyles()}
    `;
    
    document.body.appendChild(this.container);
    this.attachEventListeners();
    
    if (!this.visible) {
      this.container.classList.add('hidden');
    }
  }
  
  private attachEventListeners(): void {
    if (!this.container) return;
    
    // Collapse toggle
    const collapseBtn = this.container.querySelector('.panel-collapse-btn');
    collapseBtn?.addEventListener('click', () => this.toggleCollapse());
    
    // Zoom slider
    const zoomSlider = this.container.querySelector('#camera-zoom-slider') as HTMLInputElement;
    zoomSlider?.addEventListener('input', (e) => {
      const zoom = parseFloat((e.target as HTMLInputElement).value);
      this.camera.setZoom(zoom);
      this.config.setCamera({ zoom });
      this.updateZoomDisplay();
    });
    
    // Follow toggle
    const followToggle = this.container.querySelector('#camera-follow-toggle') as HTMLInputElement;
    followToggle?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.config.setCamera({ followEnabled: enabled });
      if (!enabled) {
        this.camera.stopFollow();
      }
    });
    
    // Smooth toggle
    const smoothToggle = this.container.querySelector('#camera-smooth-toggle') as HTMLInputElement;
    smoothToggle?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.camera.setSmooth(enabled);
      this.config.setCamera({ smooth: enabled });
    });
    
    // Button actions
    const buttons = this.container.querySelectorAll('[data-action]');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        this.handleAction(action!);
      });
    });
    
    // Start update loop for zoom display
    this.startUpdateLoop();
  }
  
  private handleAction(action: string): void {
    const panSpeed = 50;
    
    switch (action) {
      case 'zoom-in':
        const zoomIn = Math.min(this.camera.getZoom() * 1.2, 10.0);
        this.camera.setZoom(zoomIn);
        this.config.setCamera({ zoom: zoomIn });
        this.updateZoomSlider();
        break;
        
      case 'zoom-out':
        const zoomOut = Math.max(this.camera.getZoom() / 1.2, 0.1);
        this.camera.setZoom(zoomOut);
        this.config.setCamera({ zoom: zoomOut });
        this.updateZoomSlider();
        break;
        
      case 'zoom-reset':
        this.camera.setZoom(1.0);
        this.config.setCamera({ zoom: 1.0 });
        this.updateZoomSlider();
        break;
        
      case 'pan-up':
        this.camera.move(0, -panSpeed);
        break;
        
      case 'pan-down':
        this.camera.move(0, panSpeed);
        break;
        
      case 'pan-left':
        this.camera.move(-panSpeed, 0);
        break;
        
      case 'pan-right':
        this.camera.move(panSpeed, 0);
        break;
        
      case 'center':
        this.camera.centerOn(0, 0);
        break;
        
      case 'shake':
        this.camera.startShake(20, 500);
        break;
    }
  }
  
  private updateZoomDisplay(): void {
    if (!this.container) return;
    const display = this.container.querySelector('.zoom-display');
    if (display) {
      display.textContent = `${this.camera.getZoom().toFixed(2)}x`;
    }
  }
  
  private updateZoomSlider(): void {
    if (!this.container) return;
    const slider = this.container.querySelector('#camera-zoom-slider') as HTMLInputElement;
    if (slider) {
      slider.value = String(this.camera.getZoom());
    }
    this.updateZoomDisplay();
  }
  
  private startUpdateLoop(): void {
    const update = () => {
      this.updateZoomDisplay();
      requestAnimationFrame(update);
    };
    update();
  }
  
  private toggleCollapse(): void {
    if (!this.container) return;
    
    this.collapsed = !this.collapsed;
    const content = this.container.querySelector('.camera-content');
    const btn = this.container.querySelector('.panel-collapse-btn');
    
    if (content) {
      content.classList.toggle('collapsed', this.collapsed);
    }
    if (btn) {
      btn.textContent = this.collapsed ? '▶' : '▼';
    }
  }
  
  private setupKeyboardShortcut(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v') {
        this.toggle();
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }
  
  private toggle(): void {
    this.visible = !this.visible;
    this.saveVisibility();
    
    if (this.container) {
      this.container.classList.toggle('hidden', !this.visible);
    }
  }
  
  public destroy(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
  
  /**
   * Update follow toggle when entity is followed externally
   */
  public setFollowEnabled(enabled: boolean): void {
    if (!this.container) return;
    const followToggle = this.container.querySelector('#camera-follow-toggle') as HTMLInputElement;
    if (followToggle) {
      followToggle.checked = enabled;
    }
  }
  
  private createStyles(): string {
    return `
      <style>
        .vectorium-camera-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 280px;
          background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(15, 15, 30, 0.98));
          border: 2px solid #00FF00;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 255, 0, 0.4), 0 0 16px rgba(0, 255, 0, 0.2);
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          color: #00FF00;
          z-index: 10000;
          transition: opacity 0.3s ease, transform 0.3s ease;
          user-select: none;
        }
        
        .vectorium-camera-controls.hidden {
          opacity: 0;
          transform: translateX(20px);
          pointer-events: none;
        }
        
        .camera-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(0, 255, 0, 0.1);
          border-bottom: 1px solid rgba(0, 255, 0, 0.3);
          cursor: pointer;
        }
        
        .camera-header .panel-title {
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 1px;
        }
        
        .camera-header .panel-collapse-btn {
          background: none;
          border: none;
          color: #00FF00;
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          transition: transform 0.2s ease;
        }
        
        .camera-header .panel-collapse-btn:hover {
          transform: scale(1.2);
        }
        
        .camera-content {
          padding: 16px;
          max-height: 600px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        
        .camera-content.collapsed {
          display: none;
        }
        
        .camera-section {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(0, 255, 0, 0.2);
        }
        
        .camera-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .section-header {
          font-weight: 600;
          font-size: 12px;
          color: #00FFFF;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }
        
        .control-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .camera-btn {
          background: linear-gradient(135deg, rgba(0, 255, 0, 0.2), rgba(0, 255, 0, 0.1));
          border: 1px solid #00FF00;
          color: #00FF00;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          min-width: 40px;
        }
        
        .camera-btn:hover {
          background: rgba(0, 255, 0, 0.3);
          box-shadow: 0 0 12px rgba(0, 255, 0, 0.5);
          transform: translateY(-1px);
        }
        
        .camera-btn:active {
          transform: translateY(0);
        }
        
        .camera-btn-secondary {
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid #00FFFF;
          color: #00FFFF;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
          flex: 1;
        }
        
        .camera-btn-secondary:hover {
          background: rgba(0, 255, 255, 0.2);
          box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
        }
        
        .camera-btn-action {
          background: linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(255, 0, 255, 0.1));
          border: 1px solid #FF00FF;
          color: #FF00FF;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
          width: 100%;
        }
        
        .camera-btn-action:hover {
          background: rgba(255, 0, 255, 0.3);
          box-shadow: 0 0 12px rgba(255, 0, 255, 0.5);
          transform: translateY(-1px);
        }
        
        .zoom-display {
          font-size: 16px;
          font-weight: 600;
          color: #FFFF00;
          min-width: 60px;
          text-align: center;
        }
        
        .camera-slider {
          width: 100%;
          height: 4px;
          background: rgba(0, 255, 0, 0.2);
          border-radius: 2px;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
        }
        
        .camera-slider::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #00FF00;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
          transition: all 0.2s ease;
        }
        
        .camera-slider::-webkit-slider-thumb:hover {
          background: #00FFFF;
          box-shadow: 0 0 12px rgba(0, 255, 255, 0.8);
          transform: scale(1.2);
        }
        
        .camera-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #00FF00;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
          transition: all 0.2s ease;
        }
        
        .camera-slider::-moz-range-thumb:hover {
          background: #00FFFF;
          box-shadow: 0 0 12px rgba(0, 255, 255, 0.8);
          transform: scale(1.2);
        }
        
        .control-row label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: #00FF00;
          font-size: 12px;
        }
        
        .control-row input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #00FF00;
        }
        
        .camera-hint {
          margin-top: 16px;
          padding: 12px;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 4px;
          font-size: 11px;
          color: #00FFFF;
          text-align: center;
          line-height: 1.6;
        }
        
        /* Scrollbar styling */
        .camera-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .camera-content::-webkit-scrollbar-track {
          background: rgba(0, 255, 0, 0.1);
        }
        
        .camera-content::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.3);
          border-radius: 3px;
        }
        
        .camera-content::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 0, 0.5);
        }
      </style>
    `;
  }
}
