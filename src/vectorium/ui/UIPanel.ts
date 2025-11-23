/**
 * Vectorium UI Panel - Base Class
 * Provides common functionality for all UI panels (debug tools, profilers, spawners)
 * Eliminates code duplication and provides consistent behavior
 */

export interface UIPanelConfig {
  id: string;                    // Unique identifier (e.g., 'entity-spawner')
  title: string;                 // Display title (e.g., '🎮 SPAWN ENTITIES')
  keyboardShortcut: string;      // Toggle key (e.g., 'e', 'p', 'c')
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  defaultVisible: boolean;       // Initial visibility
  collapsible: boolean;          // Can be collapsed
  storageKey?: string;           // Override default localStorage key
}

export abstract class UIPanel {
  protected config: UIPanelConfig;
  protected container: HTMLDivElement | null = null;
  protected visible: boolean;
  protected collapsed: boolean = false;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: UIPanelConfig) {
    this.config = config;
    this.visible = config.defaultVisible;
    this.loadVisibility();
    // Defer createUI to next tick to allow child constructor to complete
    setTimeout(() => {
      this.createUI();
      this.setupKeyboardShortcut();
    }, 0);
  }

  /**
   * Abstract methods - must be implemented by subclasses
   */
  protected abstract createContent(): string;
  protected abstract attachEventListeners(): void;

  /**
   * Create the UI structure
   */
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.className = `vectorium-panel vectorium-panel-${this.config.position} ${this.config.id}`;
    
    const collapseBtn = this.config.collapsible 
      ? '<button class="panel-collapse-btn">▼</button>' 
      : '';
    
    this.container.innerHTML = `
      <div class="vectorium-panel-header">
        <span class="panel-title">${this.config.title}</span>
        ${collapseBtn}
      </div>
      <div class="vectorium-panel-content">
        ${this.createContent()}
      </div>
    `;

    document.body.appendChild(this.container);
    
    // Attach collapse handler if collapsible
    if (this.config.collapsible) {
      const collapseBtn = this.container.querySelector('.panel-collapse-btn');
      collapseBtn?.addEventListener('click', () => this.toggleCollapse());
    }
    
    // Attach subclass-specific event listeners
    this.attachEventListeners();

    // Apply initial visibility
    if (!this.visible) {
      this.container.classList.add('hidden');
    }
  }

  /**
   * Toggle collapse state
   */
  protected toggleCollapse(): void {
    if (!this.container || !this.config.collapsible) return;

    this.collapsed = !this.collapsed;
    const content = this.container.querySelector('.vectorium-panel-content') as HTMLDivElement;
    const btn = this.container.querySelector('.panel-collapse-btn') as HTMLButtonElement;

    if (content) {
      content.style.display = this.collapsed ? 'none' : 'block';
    }
    if (btn) {
      btn.textContent = this.collapsed ? '▶' : '▼';
    }
  }

  /**
   * Setup keyboard shortcut
   */
  private setupKeyboardShortcut(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === this.config.keyboardShortcut.toLowerCase() &&
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        this.toggle();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Load visibility from localStorage
   */
  protected loadVisibility(): void {
    const storageKey = this.config.storageKey || `vectorium-${this.config.id}-visible`;
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      this.visible = saved === 'true';
    }
  }

  /**
   * Save visibility to localStorage
   */
  protected saveVisibility(): void {
    const storageKey = this.config.storageKey || `vectorium-${this.config.id}-visible`;
    localStorage.setItem(storageKey, this.visible.toString());
  }

  /**
   * Toggle visibility
   */
  public toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show panel
   */
  public show(): void {
    if (this.container && !this.visible) {
      this.visible = true;
      this.container.classList.remove('hidden');
      this.saveVisibility();
    }
  }

  /**
   * Hide panel
   */
  public hide(): void {
    if (this.container && this.visible) {
      this.visible = false;
      this.container.classList.add('hidden');
      this.saveVisibility();
    }
  }

  /**
   * Check if panel is visible
   */
  public isVisible(): boolean {
    return this.visible;
  }

  /**
   * Destroy panel (cleanup)
   */
  public destroy(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * Helper: Add event listener to element by ID
   */
  protected on(id: string, event: string, handler: (e: Event) => void): void {
    const el = this.container?.querySelector(`#${id}`);
    el?.addEventListener(event, handler);
  }
}
