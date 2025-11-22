/**
 * Entity Spawner - Debug tool for spawning entities during development
 * Inspired by Unity's Game View controls and inspector panels
 * Toggle with 'E' key
 */

import { Scene } from '../core/Engine';

export class EntitySpawner {
  private container: HTMLDivElement | null = null;
  private visible = true;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private clickSpawnCount = 100; // Number of entities to spawn per click
  private activeButton: string = 'spawn100';
  private physicsMode: 'none' | 'gravity' | 'collision' | 'full' = 'none';
  private visualType: 'sprite' | 'circle' | 'star5' | 'triangle' | 'hexagon' | 'heart' | 'square' | 'diamond' | 'text' = 'sprite';
  private textMode: 'static' | 'dynamic' = 'static';
  private textContent: string = 'Hello World';
  private textBold: boolean = false;
  private textItalic: boolean = false;
  private textSize: number = 24;
  private textAlign: 'left' | 'center' | 'right' = 'center';
  private textShadow: boolean = false;
  private textOutline: boolean = false;
  private textGlow: boolean = false;
  
  constructor(_scene: Scene) {
    this.loadVisibility();
    this.createUI();
    this.setupKeyboardShortcut();
  }
  
  /**
   * Get the current spawn count for mouse clicks
   */
  getClickSpawnCount(): number {
    return this.clickSpawnCount;
  }
  
  /**
   * Get the current physics mode
   */
  getPhysicsMode(): 'none' | 'gravity' | 'collision' | 'full' {
    return this.physicsMode;
  }
  
  /**
   * Get the current visual type
   */
  getVisualType(): 'sprite' | 'circle' | 'star5' | 'triangle' | 'hexagon' | 'heart' | 'square' | 'diamond' | 'text' {
    return this.visualType;
  }
  
  /**
   * Get text configuration for spawning
   */
  getTextConfig() {
    return {
      mode: this.textMode,
      content: this.textContent,
      bold: this.textBold,
      italic: this.textItalic,
      size: this.textSize,
      align: this.textAlign,
      shadow: this.textShadow,
      outline: this.textOutline,
      glow: this.textGlow
    };
  }
  
  /**
   * Set the spawn count for mouse clicks
   */
  setClickSpawnCount(count: number): void {
    this.clickSpawnCount = count;
    this.updateActiveButtonDisplay();
  }
  
  /**
   * Register callbacks for remove and clear operations
   */
  registerCallbacks(callbacks: {
    remove1K?: () => void;
    clearAll?: () => void;
  }): void {
    this.spawnCallbacks.set('remove1K', () => callbacks.remove1K?.());
    this.spawnCallbacks.set('clearAll', () => callbacks.clearAll?.());
  }
  
  private spawnCallbacks: Map<string, () => void> = new Map();
  
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.className = 'vectorium-entity-spawner';
    this.container.innerHTML = `
      <div class="spawner-header">
        <span class="panel-title">🎮 SPAWN ENTITIES</span>
        <button class="panel-collapse-btn">▼</button>
      </div>
      <div class="spawner-content">
        <div class="spawn-section">
          <div class="spawn-mode-hint">CLICK CANVAS TO SPAWN</div>
          
          <div class="entity-type-section">
            <label class="entity-type-label">⚙️ Physics Mode:</label>
            <select id="physicsMode" class="entity-type-select">
              <option value="none">🎾 None (Bouncing Only)</option>
              <option value="gravity">⬇️ Gravity (Falls Down)</option>
              <option value="collision">💥 Collision (Entities Collide)</option>
              <option value="full">🌍 Full (Gravity + Collision)</option>
            </select>
          </div>
          
          <div class="entity-type-section">
            <label class="entity-type-label">🎨 Visual Type:</label>
            <select id="visualType" class="entity-type-select">
              <option value="sprite">🖼️ Sprite (Default Texture)</option>
              <optgroup label="GPU-Accelerated Shapes">
                <option value="circle">⚪ Circle</option>
                <option value="star5">⭐ 5-Point Star</option>
                <option value="triangle">🔺 Triangle</option>
                <option value="hexagon">⬡ Hexagon</option>
                <option value="heart">❤️ Heart</option>
                <option value="square">⬛ Square</option>
                <option value="diamond">💠 Diamond</option>
              </optgroup>
              <optgroup label="Text Rendering">
                <option value="text">📝 Text</option>
              </optgroup>
            </select>
          </div>
          
          <div id="textConfigSection" class="text-config-section" style="display: none;">
            <div class="entity-type-section">
              <label class="entity-type-label">📝 Text Mode:</label>
              <select id="textMode" class="entity-type-select">
                <option value="static">Static Text</option>
                <option value="dynamic">Dynamic Text (Counter)</option>
              </select>
            </div>
            
            <div id="staticTextConfig" class="entity-type-section">
              <label class="entity-type-label">Text Content:</label>
              <input type="text" id="textContent" class="text-input" value="Hello World" maxlength="50">
            </div>
            
            <div class="entity-type-section">
              <label class="entity-type-label">🎨 Text Style:</label>
              <div class="text-style-row">
                <label class="text-checkbox-label">
                  <input type="checkbox" id="textBold" class="text-checkbox">
                  <span>Bold</span>
                </label>
                <label class="text-checkbox-label">
                  <input type="checkbox" id="textItalic" class="text-checkbox">
                  <span>Italic</span>
                </label>
              </div>
              <div class="text-style-row">
                <label class="text-size-label">Size:</label>
                <input type="range" id="textSize" min="12" max="72" value="24" class="text-slider">
                <span id="textSizeValue" class="text-size-value">24px</span>
              </div>
            </div>
            
            <div class="entity-type-section">
              <label class="entity-type-label">📐 Alignment:</label>
              <select id="textAlign" class="entity-type-select">
                <option value="left">Left</option>
                <option value="center" selected>Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            
            <div class="entity-type-section">
              <label class="entity-type-label">✨ Effects:</label>
              <div class="text-style-row">
                <label class="text-checkbox-label">
                  <input type="checkbox" id="textShadow" class="text-checkbox">
                  <span>Shadow</span>
                </label>
                <label class="text-checkbox-label">
                  <input type="checkbox" id="textOutline" class="text-checkbox">
                  <span>Outline</span>
                </label>
                <label class="text-checkbox-label">
                  <input type="checkbox" id="textGlow" class="text-checkbox">
                  <span>Glow</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="button-grid">
            <button id="spawn10" class="spawn-btn">10</button>
            <button id="spawn50" class="spawn-btn">50</button>
            <button id="spawn100" class="spawn-btn spawn-btn-active">100</button>
            <button id="spawn500" class="spawn-btn">500</button>
          </div>
          <div class="button-grid">
            <button id="spawn1K" class="spawn-btn">1K</button>
            <button id="spawn10K" class="spawn-btn">10K</button>
            <button id="spawn100K" class="spawn-btn spawn-btn-hot">100K 🔥</button>
          </div>
          <div class="button-grid">
            <button id="spawn500K" class="spawn-btn spawn-btn-danger">500K 💥</button>
            <button id="spawn1M" class="spawn-btn spawn-btn-danger">1M ☢️</button>
          </div>
          <div class="button-grid" style="margin-top: 12px;">
            <button id="remove1K" class="spawn-btn spawn-btn-remove">-1K</button>
            <button id="clearAll" class="spawn-btn spawn-btn-remove">Clear All</button>
          </div>
        </div>
        <div class="spawner-hint">
          P: Profiler | C: Config | E: Spawner
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
    
    // Physics mode selector
    const physicsModeSelect = this.container.querySelector('#physicsMode') as HTMLSelectElement;
    physicsModeSelect?.addEventListener('change', (e) => {
      this.physicsMode = (e.target as HTMLSelectElement).value as typeof this.physicsMode;
    });
    
    // Visual type selector
    const visualTypeSelect = this.container.querySelector('#visualType') as HTMLSelectElement;
    visualTypeSelect?.addEventListener('change', (e) => {
      this.visualType = (e.target as HTMLSelectElement).value as typeof this.visualType;
      this.updateTextConfigVisibility();
    });
    
    // Text mode selector
    const textModeSelect = this.container.querySelector('#textMode') as HTMLSelectElement;
    textModeSelect?.addEventListener('change', (e) => {
      this.textMode = (e.target as HTMLSelectElement).value as typeof this.textMode;
      this.updateStaticTextVisibility();
    });
    
    // Text content input
    const textContentInput = this.container.querySelector('#textContent') as HTMLInputElement;
    textContentInput?.addEventListener('input', (e) => {
      this.textContent = (e.target as HTMLInputElement).value;
    });
    
    // Text styling checkboxes
    const textBoldCheckbox = this.container.querySelector('#textBold') as HTMLInputElement;
    textBoldCheckbox?.addEventListener('change', (e) => {
      this.textBold = (e.target as HTMLInputElement).checked;
    });
    
    const textItalicCheckbox = this.container.querySelector('#textItalic') as HTMLInputElement;
    textItalicCheckbox?.addEventListener('change', (e) => {
      this.textItalic = (e.target as HTMLInputElement).checked;
    });
    
    // Text size slider
    const textSizeSlider = this.container.querySelector('#textSize') as HTMLInputElement;
    const textSizeValue = this.container.querySelector('#textSizeValue');
    textSizeSlider?.addEventListener('input', (e) => {
      this.textSize = parseInt((e.target as HTMLInputElement).value);
      if (textSizeValue) textSizeValue.textContent = `${this.textSize}px`;
    });
    
    // Text alignment selector
    const textAlignSelect = this.container.querySelector('#textAlign') as HTMLSelectElement;
    textAlignSelect?.addEventListener('change', (e) => {
      this.textAlign = (e.target as HTMLSelectElement).value as typeof this.textAlign;
    });
    
    // Text effects checkboxes
    const textShadowCheckbox = this.container.querySelector('#textShadow') as HTMLInputElement;
    textShadowCheckbox?.addEventListener('change', (e) => {
      this.textShadow = (e.target as HTMLInputElement).checked;
    });
    
    const textOutlineCheckbox = this.container.querySelector('#textOutline') as HTMLInputElement;
    textOutlineCheckbox?.addEventListener('change', (e) => {
      this.textOutline = (e.target as HTMLInputElement).checked;
    });
    
    const textGlowCheckbox = this.container.querySelector('#textGlow') as HTMLInputElement;
    textGlowCheckbox?.addEventListener('change', (e) => {
      this.textGlow = (e.target as HTMLInputElement).checked;
    });
    
    // Spawn buttons set click spawn count
    this.on('spawn10', 'click', () => {
      this.setClickSpawnCount(10);
      this.activeButton = 'spawn10';
    });
    
    this.on('spawn50', 'click', () => {
      this.setClickSpawnCount(50);
      this.activeButton = 'spawn50';
    });
    
    this.on('spawn100', 'click', () => {
      this.setClickSpawnCount(100);
      this.activeButton = 'spawn100';
    });
    
    this.on('spawn500', 'click', () => {
      this.setClickSpawnCount(500);
      this.activeButton = 'spawn500';
    });
    
    this.on('spawn1K', 'click', () => {
      this.setClickSpawnCount(1000);
      this.activeButton = 'spawn1K';
    });
    
    this.on('spawn10K', 'click', () => {
      this.setClickSpawnCount(10000);
      this.activeButton = 'spawn10K';
    });
    
    this.on('spawn100K', 'click', () => {
      this.setClickSpawnCount(100000);
      this.activeButton = 'spawn100K';
    });
    
    this.on('spawn500K', 'click', () => {
      this.setClickSpawnCount(500000);
      this.activeButton = 'spawn500K';
    });
    
    this.on('spawn1M', 'click', () => {
      this.setClickSpawnCount(1000000);
      this.activeButton = 'spawn1M';
    });
    
    this.on('remove1K', 'click', () => {
      this.triggerCallback('remove1K');
    });
    
    this.on('clearAll', 'click', () => {
      if (confirm('Clear all entities?')) {
        this.triggerCallback('clearAll');
      }
    });
  }
  
  private triggerCallback(id: string): void {
    const callback = this.spawnCallbacks.get(id);
    if (callback) {
      callback();
    }
  }
  
  private updateActiveButtonDisplay(): void {
    if (!this.container) return;
    
    // Remove active class from all buttons
    const allButtons = this.container.querySelectorAll('.spawn-btn:not(.spawn-btn-remove)');
    allButtons.forEach(btn => btn.classList.remove('spawn-btn-active'));
    
    // Add active class to current button
    const activeBtn = this.container.querySelector(`#${this.activeButton}`);
    activeBtn?.classList.add('spawn-btn-active');
  }
  
  private updateTextConfigVisibility(): void {
    if (!this.container) return;
    const textConfigSection = this.container.querySelector('#textConfigSection') as HTMLDivElement;
    if (textConfigSection) {
      textConfigSection.style.display = this.visualType === 'text' ? 'block' : 'none';
    }
  }
  
  private updateStaticTextVisibility(): void {
    if (!this.container) return;
    const staticTextConfig = this.container.querySelector('#staticTextConfig') as HTMLDivElement;
    if (staticTextConfig) {
      staticTextConfig.style.display = this.textMode === 'static' ? 'block' : 'none';
    }
  }
  
  private on(id: string, event: string, handler: (e: Event) => void): void {
    const el = this.container?.querySelector(`#${id}`);
    el?.addEventListener(event, handler);
  }
  
  private toggleCollapse(): void {
    if (!this.container) return;
    const content = this.container.querySelector('.spawner-content') as HTMLDivElement;
    const btn = this.container.querySelector('.panel-collapse-btn') as HTMLButtonElement;
    const isCollapsed = content.style.display === 'none';
    
    if (isCollapsed) {
      content.style.display = 'block';
      btn.textContent = '▼';
    } else {
      content.style.display = 'none';
      btn.textContent = '▶';
    }
  }
  
  private setupKeyboardShortcut(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if ((e.key === 'e' || e.key === 'E') &&
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        this.toggle();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }
  
  private loadVisibility(): void {
    const saved = localStorage.getItem('vectorium-entity-spawner-visible');
    if (saved !== null) {
      this.visible = saved === 'true';
    }
  }
  
  private saveVisibility(): void {
    localStorage.setItem('vectorium-entity-spawner-visible', this.visible.toString());
  }
  
  toggle(): void {
    if (this.container) {
      this.visible = !this.visible;
      this.container.classList.toggle('hidden');
      this.saveVisibility();
    }
  }
  
  show(): void {
    if (this.container && !this.visible) {
      this.visible = true;
      this.container.classList.remove('hidden');
      this.saveVisibility();
    }
  }
  
  hide(): void {
    if (this.container && this.visible) {
      this.visible = false;
      this.container.classList.add('hidden');
      this.saveVisibility();
    }
  }
  
  destroy(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    if (this.container) {
      this.container.remove();
    }
    this.spawnCallbacks.clear();
  }
  
  private createStyles(): string {
    return `
      <style>
        .vectorium-entity-spawner {
          position: fixed;
          bottom: 10px;
          left: 10px;
          width: 280px;
          background: rgba(0, 0, 0, 0.92);
          border: 2px solid #00FF00;
          border-radius: 6px;
          font-family: 'Courier New', Consolas, monospace;
          font-size: 11px;
          color: #00FF00;
          box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
          z-index: 9998;
          transition: opacity 0.3s, transform 0.3s;
        }
        .vectorium-entity-spawner.hidden {
          opacity: 0;
          transform: translateY(320px);
          pointer-events: none;
        }
        .spawner-header {
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
        .spawner-content {
          padding: 0;
        }
        .spawn-section {
          padding: 12px;
        }
        
        .entity-type-section {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(0, 255, 0, 0.05);
          border: 1px solid rgba(0, 255, 0, 0.2);
          border-radius: 4px;
        }
        
        .entity-type-label {
          display: block;
          font-size: 11px;
          color: #00FF00;
          margin-bottom: 4px;
          font-weight: bold;
        }
        
        .entity-type-select {
          width: 100%;
          padding: 6px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 0, 0.3);
          border-radius: 4px;
          color: #00FF00;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          cursor: pointer;
        }
        
        .entity-type-select:hover {
          background: rgba(0, 255, 0, 0.1);
          border-color: rgba(0, 255, 0, 0.5);
        }
        
        .entity-type-select option {
          background: #0a0a0a;
          color: #00FF00;
        }
        
        .text-config-section {
          margin-top: 8px;
        }
        
        .text-input {
          width: 100%;
          padding: 6px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 0, 0.3);
          border-radius: 4px;
          color: #00FF00;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        
        .text-input:focus {
          outline: none;
          border-color: rgba(0, 255, 0, 0.7);
          background: rgba(0, 255, 0, 0.05);
        }
        
        .text-style-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 6px;
        }
        
        .text-checkbox-label {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 11px;
        }
        
        .text-checkbox {
          cursor: pointer;
        }
        
        .text-size-label {
          font-size: 11px;
          margin-right: 4px;
        }
        
        .text-slider {
          flex: 1;
          cursor: pointer;
        }
        
        .text-size-value {
          font-size: 11px;
          min-width: 40px;
          text-align: right;
        }
        
        .button-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          margin-bottom: 5px;
        }
        .spawn-btn {
          padding: 8px;
          background: #00FF00;
          color: #000;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          transition: background 0.2s;
        }
        .spawn-btn:hover {
          background: #00FF88;
        }
        .spawn-btn-active {
          background: #00FF00;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.6);
          border: 2px solid #00FF00;
        }
        .spawn-mode-hint {
          font-size: 11px;
          font-weight: bold;
          color: #00FF00;
          text-align: center;
          padding: 8px;
          margin-bottom: 10px;
          background: rgba(0, 255, 0, 0.1);
          border-radius: 4px;
        }
        .spawn-btn-hot {
          background: #FF00FF;
        }
        .spawn-btn-hot:hover {
          background: #FF44FF;
        }
        .spawn-btn-danger {
          background: #FF0000;
          color: #FFF;
        }
        .spawn-btn-danger:hover {
          background: #FF4444;
        }
        .spawn-btn-remove {
          background: #FF0000;
          color: #FFF;
        }
        .spawn-btn-remove:hover {
          background: #FF4444;
        }
        .spawner-hint {
          font-size: 10px;
          color: #00AA00;
          text-align: center;
          padding: 10px 12px;
          border-top: 1px solid rgba(0, 255, 0, 0.3);
          background: rgba(0, 255, 0, 0.02);
        }
      </style>
    `;
  }
}
