/**
 * Entity Spawner - Debug tool for spawning entities during development
 * Inspired by Unity's Game View controls and inspector panels
 * Toggle with 'E' key
 */

import { Scene } from '../core/Engine';
import { UIPanel, UIPanelConfig } from '../ui/UIPanel';

export class EntitySpawner extends UIPanel {
  private clickSpawnCount = 100; // Number of entities to spawn per click
  private activeButton: string = 'spawn100';
  private physicsMode: 'none' | 'gravity' | 'collision' | 'full' = 'none';
  private visualType: 'sprite' | 'circle' | 'star5' | 'triangle' | 'hexagon' | 'heart' | 'square' | 'diamond' | 'text' = 'sprite';
  private textMode: 'static' | 'dynamic' = 'dynamic';
  private textContent: string = 'Hello World';
  private textBold: boolean = false;
  private textItalic: boolean = false;
  private textSize: number = 24;
  private textAlign: 'left' | 'center' | 'right' = 'center';
  private textShadow: boolean = false;
  private textOutline: boolean = false;
  private textGlow: boolean = false;
  private spawnCallbacks: Map<string, () => void> = new Map();
  
  constructor(_scene: Scene) {
    const config: UIPanelConfig = {
      id: 'entity-spawner',
      title: '🎮 SPAWN ENTITIES',
      keyboardShortcut: 'e',
      position: 'bottom-left',
      defaultVisible: true,
      collapsible: true
    };
    super(config);
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

  /**
   * Create panel content (required by UIPanel)
   */
  protected createContent(): string {
    return `
      <div class="spawn-mode-hint">CLICK CANVAS TO SPAWN</div>
      
      <div class="control-row">
        <label class="control-label">⚙️ Physics Mode:</label>
        <select id="physicsMode" class="vectorium-select">
          <option value="none">🎾 None (Bouncing Only)</option>
          <option value="gravity">⬇️ Gravity (Falls Down)</option>
          <option value="collision">💥 Collision (Entities Collide)</option>
          <option value="full">🌍 Full (Gravity + Collision)</option>
        </select>
      </div>
      
      <div class="control-row">
        <label class="control-label">🎨 Visual Type:</label>
        <select id="visualType" class="vectorium-select">
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
      
      <div id="textConfigSection" style="display: none;">
        <div class="control-row">
          <label class="control-label">📋 Text Mode:</label>
          <select id="textMode" class="vectorium-select">
            <option value="static">Static (Labels, No Animation)</option>
            <option value="dynamic" selected>Dynamic (Animated, Moving)</option>
          </select>
        </div>
        
        <div class="control-row">
          <label class="control-label">Text Content:</label>
          <input type="text" id="textContent" class="vectorium-input" value="Hello World" maxlength="50" style="flex: 1;">
        </div>
        
        <div class="control-row">
          <label class="control-label">🎨 Text Style:</label>
          <div class="control-value">
            <label style="display: flex; align-items: center; gap: 4px;">
              <input type="checkbox" id="textBold" class="vectorium-checkbox">
              <span style="font-size: 11px;">Bold</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px;">
              <input type="checkbox" id="textItalic" class="vectorium-checkbox">
              <span style="font-size: 11px;">Italic</span>
            </label>
          </div>
        </div>
        
        <div class="control-row">
          <label class="control-label">Size:</label>
          <div class="control-value">
            <input type="range" id="textSize" min="12" max="72" value="24" class="vectorium-slider">
            <span id="textSizeValue" style="font-size: 11px; min-width: 40px; text-align: right;">24px</span>
          </div>
        </div>
        
        <div class="control-row">
          <label class="control-label">📐 Alignment:</label>
          <select id="textAlign" class="vectorium-select">
            <option value="left">Left</option>
            <option value="center" selected>Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        
        <div class="control-row">
          <label class="control-label">✨ Effects:</label>
          <div class="control-value">
            <label style="display: flex; align-items: center; gap: 4px;">
              <input type="checkbox" id="textShadow" class="vectorium-checkbox">
              <span style="font-size: 11px;">Shadow</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px;">
              <input type="checkbox" id="textOutline" class="vectorium-checkbox">
              <span style="font-size: 11px;">Outline</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px;">
              <input type="checkbox" id="textGlow" class="vectorium-checkbox">
              <span style="font-size: 11px;">Glow</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="section-divider"></div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
        <button id="spawn10" class="spawn-btn vectorium-btn">10</button>
        <button id="spawn50" class="spawn-btn vectorium-btn">50</button>
        <button id="spawn100" class="spawn-btn vectorium-btn spawn-btn-active">100</button>
        <button id="spawn500" class="spawn-btn vectorium-btn">500</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
        <button id="spawn1K" class="spawn-btn vectorium-btn">1K</button>
        <button id="spawn10K" class="spawn-btn vectorium-btn">10K</button>
        <button id="spawn100K" class="spawn-btn vectorium-btn" style="background: rgba(255, 0, 255, 0.3); border-color: #ff00ff;">100K 🔥</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
        <button id="spawn500K" class="spawn-btn vectorium-btn" style="background: rgba(255, 0, 0, 0.3); border-color: #ff0000; color: #ff0000;">500K 💥</button>
        <button id="spawn1M" class="spawn-btn vectorium-btn" style="background: rgba(255, 0, 0, 0.3); border-color: #ff0000; color: #ff0000;">1M ☢️</button>
      </div>
      
      <div class="clear-buttons">
        <button id="remove1K" class="vectorium-btn" style="background: rgba(255, 0, 0, 0.2); border-color: #ff0000; color: #ff0000;">-1K</button>
        <button id="clearAll" class="vectorium-btn" style="background: rgba(255, 0, 0, 0.2); border-color: #ff0000; color: #ff0000;">Clear All</button>
      </div>
      
      <div class="info-text">P: Profiler | C: Config | E: Spawner</div>
    `;
  }

  /**
   * Attach event listeners (required by UIPanel)
   */
  protected attachEventListeners(): void {
    if (!this.container) return;
    
    // Physics mode selector
    this.on('physicsMode', 'change', (e) => {
      this.physicsMode = (e.target as HTMLSelectElement).value as typeof this.physicsMode;
    });
    
    // Visual type selector
    this.on('visualType', 'change', (e) => {
      this.visualType = (e.target as HTMLSelectElement).value as typeof this.visualType;
      this.updateTextConfigVisibility();
    });
    
    // Text mode selector
    this.on('textMode', 'change', (e) => {
      this.textMode = (e.target as HTMLSelectElement).value as typeof this.textMode;
    });
    
    // Text content input
    this.on('textContent', 'input', (e) => {
      this.textContent = (e.target as HTMLInputElement).value;
    });
    
    // Text styling checkboxes
    this.on('textBold', 'change', (e) => {
      this.textBold = (e.target as HTMLInputElement).checked;
    });
    
    this.on('textItalic', 'change', (e) => {
      this.textItalic = (e.target as HTMLInputElement).checked;
    });
    
    // Text size slider
    const textSizeValue = this.container.querySelector('#textSizeValue');
    this.on('textSize', 'input', (e) => {
      this.textSize = parseInt((e.target as HTMLInputElement).value);
      if (textSizeValue) textSizeValue.textContent = `${this.textSize}px`;
    });
    
    // Text alignment selector
    this.on('textAlign', 'change', (e) => {
      this.textAlign = (e.target as HTMLSelectElement).value as typeof this.textAlign;
    });
    
    // Text effects checkboxes
    this.on('textShadow', 'change', (e) => {
      this.textShadow = (e.target as HTMLInputElement).checked;
    });
    
    this.on('textOutline', 'change', (e) => {
      this.textOutline = (e.target as HTMLInputElement).checked;
    });
    
    this.on('textGlow', 'change', (e) => {
      this.textGlow = (e.target as HTMLInputElement).checked;
    });
    
    // Spawn buttons
    this.on('spawn10', 'click', () => { this.setClickSpawnCount(10); this.activeButton = 'spawn10'; });
    this.on('spawn50', 'click', () => { this.setClickSpawnCount(50); this.activeButton = 'spawn50'; });
    this.on('spawn100', 'click', () => { this.setClickSpawnCount(100); this.activeButton = 'spawn100'; });
    this.on('spawn500', 'click', () => { this.setClickSpawnCount(500); this.activeButton = 'spawn500'; });
    this.on('spawn1K', 'click', () => { this.setClickSpawnCount(1000); this.activeButton = 'spawn1K'; });
    this.on('spawn10K', 'click', () => { this.setClickSpawnCount(10000); this.activeButton = 'spawn10K'; });
    this.on('spawn100K', 'click', () => { this.setClickSpawnCount(100000); this.activeButton = 'spawn100K'; });
    this.on('spawn500K', 'click', () => { this.setClickSpawnCount(500000); this.activeButton = 'spawn500K'; });
    this.on('spawn1M', 'click', () => { this.setClickSpawnCount(1000000); this.activeButton = 'spawn1M'; });
    
    this.on('remove1K', 'click', () => { this.triggerCallback('remove1K'); });
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
    const allButtons = this.container.querySelectorAll('.spawn-btn');
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
}
