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
      <div class="ui-hint">CLICK CANVAS TO SPAWN</div>
      
      <div class="ui-row">
        <label class="ui-label">⚙️ Physics Mode:</label>
        <select id="physicsMode">
          <option value="none">🎾 None (Bouncing Only)</option>
          <option value="gravity">⬇️ Gravity (Falls Down)</option>
          <option value="collision">💥 Collision (Entities Collide)</option>
          <option value="full">🌍 Full (Gravity + Collision)</option>
        </select>
      </div>
      
      <div class="ui-row">
        <label class="ui-label">🎨 Visual Type:</label>
        <select id="visualType">
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
      
      <div id="textConfigSection" class="hidden">
        <div class="ui-row">
          <label class="ui-label">📋 Text Mode:</label>
          <select id="textMode">
            <option value="static">Static (Labels, No Animation)</option>
            <option value="dynamic" selected>Dynamic (Animated, Moving)</option>
          </select>
        </div>
        
        <div class="ui-row">
          <label class="ui-label">Text Content:</label>
          <input type="text" id="textContent" value="Hello World" maxlength="50" class="flex-1">
        </div>
        
        <div class="ui-row">
          <label class="ui-label">🎨 Text Style:</label>
          <div class="ui-value">
            <label class="checkbox-group">
              <input type="checkbox" id="textBold">
              <span>Bold</span>
            </label>
            <label class="checkbox-group">
              <input type="checkbox" id="textItalic">
              <span>Italic</span>
            </label>
          </div>
        </div>
        
        <div class="ui-row">
          <label class="ui-label">Size:</label>
          <div class="ui-value">
            <input type="range" id="textSize" min="12" max="72" value="24">
            <span id="textSizeValue" class="checkbox-group"><span>24px</span></span>
          </div>
        </div>
        
        <div class="ui-row">
          <label class="ui-label">📐 Alignment:</label>
          <select id="textAlign">
            <option value="left">Left</option>
            <option value="center" selected>Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        
        <div class="ui-row">
          <label class="ui-label">✨ Effects:</label>
          <div class="ui-value">
            <label class="checkbox-group">
              <input type="checkbox" id="textShadow">
              <span>Shadow</span>
            </label>
            <label class="checkbox-group">
              <input type="checkbox" id="textOutline">
              <span>Outline</span>
            </label>
            <label class="checkbox-group">
              <input type="checkbox" id="textGlow">
              <span>Glow</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="btn-grid-2col">
        <button id="spawn10" class="vectorium-btn full-width">10</button>
        <button id="spawn50" class="vectorium-btn full-width">50</button>
        <button id="spawn100" class="vectorium-btn full-width active">100</button>
        <button id="spawn500" class="vectorium-btn full-width">500</button>
      </div>
      <div class="btn-grid-2col">
        <button id="spawn1K" class="vectorium-btn full-width">1K</button>
        <button id="spawn10K" class="vectorium-btn full-width">10K</button>
        <button id="spawn100K" class="vectorium-btn full-width special">100K 🔥</button>
      </div>
      <div class="btn-grid-2col">
        <button id="spawn500K" class="vectorium-btn full-width danger-solid">500K 💥</button>
        <button id="spawn1M" class="vectorium-btn full-width danger-solid">1M ☢️</button>
      </div>
      
      <div class="ui-btn-group">
        <button id="remove1K" class="vectorium-btn danger">-1K</button>
        <button id="clearAll" class="vectorium-btn danger">Clear All</button>
      </div>
      
      <div class="ui-hint">P: Profiler | C: Config | E: Spawner</div>
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
    const allButtons = this.container.querySelectorAll('.vectorium-btn.full-width');
    allButtons.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to current button
    const activeBtn = this.container.querySelector(`#${this.activeButton}`);
    activeBtn?.classList.add('active');
  }
  
  private updateTextConfigVisibility(): void {
    if (!this.container) return;
    const textConfigSection = this.container.querySelector('#textConfigSection') as HTMLDivElement;
    if (textConfigSection) {
      if (this.visualType === 'text') {
        textConfigSection.classList.remove('hidden');
      } else {
        textConfigSection.classList.add('hidden');
      }
    }
  }
}
