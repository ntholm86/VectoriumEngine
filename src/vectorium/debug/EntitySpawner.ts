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
          <div class="button-grid">
            <button id="spawn100" class="spawn-btn spawn-btn-active">100</button>
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
    
    // Spawn buttons set click spawn count
    this.on('spawn100', 'click', () => {
      this.setClickSpawnCount(100);
      this.activeButton = 'spawn100';
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
