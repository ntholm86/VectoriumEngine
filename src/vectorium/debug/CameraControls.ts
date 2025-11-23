/**
 * Camera Controls - UI panel for camera manipulation
 * Professional camera control UI matching DebugPanel and EntitySpawner patterns
 * Toggle with 'V' key (View)
 */

import { Camera } from '../core/Camera';
import { RuntimeConfig } from '../core/RuntimeConfig';
import { UIPanel, UIPanelConfig } from '../ui/UIPanel';

export class CameraControls extends UIPanel {
  private camera: Camera;
  private runtimeConfig: RuntimeConfig;

  constructor(camera: Camera, config: RuntimeConfig) {
    super({
      id: 'camera-controls',
      title: '📹 CAMERA',
      keyboardShortcut: 'v',
      position: 'bottom-right',
      defaultVisible: false,
      collapsible: true
    });
    this.camera = camera;
    this.runtimeConfig = config;
    this.startUpdateLoop();
  }
  
  /**
   * Create panel content (required by UIPanel)
   */
  protected createContent(): string {
    return `
      <div class="ui-section">
        <div class="section-header">🔍 ZOOM</div>
        <div class="ui-row">
          <button class="vectorium-btn small" data-action="zoom-in">+</button>
          <span class="zoom-display">1.00x</span>
          <button class="vectorium-btn small" data-action="zoom-out">−</button>
        </div>
        <div class="ui-row">
          <input type="range" id="camera-zoom-slider" min="0.1" max="10" step="0.1" value="1">
        </div>
        <div class="ui-row">
          <button class="vectorium-btn flex-1" data-action="zoom-reset">Reset Zoom</button>
        </div>
      </div>
      
      <div class="ui-section">
        <div class="section-header">🎯 POSITION</div>
        <div class="ui-row text-center">
          <button class="vectorium-btn small" data-action="pan-up">↑</button>
        </div>
        <div class="ui-row">
          <button class="vectorium-btn small" data-action="pan-left">←</button>
          <button class="vectorium-btn flex-1" data-action="center">Center</button>
          <button class="vectorium-btn small" data-action="pan-right">→</button>
        </div>
        <div class="ui-row text-center">
          <button class="vectorium-btn small" data-action="pan-down">↓</button>
        </div>
      </div>
      
      <div class="ui-section">
        <div class="section-header">🎬 FEATURES</div>
        <div class="ui-row">
          <label class="ui-label">
            <input type="checkbox" id="camera-follow-toggle">
            <span>Follow Entity</span>
          </label>
        </div>
        <div class="ui-row">
          <label class="ui-label">
            <input type="checkbox" id="camera-smooth-toggle" checked>
            <span>Smooth Movement</span>
          </label>
        </div>
        <div class="ui-row">
          <button class="vectorium-btn special full-width" data-action="shake">Test Shake</button>
        </div>
      </div>
      
      <div class="ui-hint">
        Z/X: Zoom | Arrows: Pan | F: Follow | Home: Reset
      </div>
    `;
  }
  
  /**
   * Attach event listeners (required by UIPanel)
   */
  protected attachEventListeners(): void {
    if (!this.container) return;
    
    // Zoom slider
    this.on('camera-zoom-slider', 'input', (e) => {
      const zoom = parseFloat((e.target as HTMLInputElement).value);
      this.camera.setZoom(zoom);
      this.runtimeConfig.setCamera({ zoom });
      this.updateZoomDisplay();
    });
    
    // Follow toggle
    this.on('camera-follow-toggle', 'change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.runtimeConfig.setCamera({ followEnabled: enabled });
      if (!enabled) {
        this.camera.stopFollow();
      }
    });
    
    // Smooth toggle
    this.on('camera-smooth-toggle', 'change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.camera.setSmooth(enabled);
      this.runtimeConfig.setCamera({ smooth: enabled });
    });
    
    // Button actions
    const buttons = this.container.querySelectorAll('[data-action]');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        this.handleAction(action!);
      });
    });
  }
  
  private handleAction(action: string): void {
    const panSpeed = 50;
    
    switch (action) {
      case 'zoom-in':
        const zoomIn = Math.min(this.camera.getZoom() * 1.2, 10.0);
        this.camera.setZoom(zoomIn);
        this.runtimeConfig.setCamera({ zoom: zoomIn });
        this.updateZoomSlider();
        break;
        
      case 'zoom-out':
        const zoomOut = Math.max(this.camera.getZoom() / 1.2, 0.1);
        this.camera.setZoom(zoomOut);
        this.runtimeConfig.setCamera({ zoom: zoomOut });
        this.updateZoomSlider();
        break;
        
      case 'zoom-reset':
        this.camera.setZoom(1.0);
        this.runtimeConfig.setCamera({ zoom: 1.0 });
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
}

