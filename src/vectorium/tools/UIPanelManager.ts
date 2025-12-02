/**
 * UIPanelManager - Centralized UI panel lifecycle management
 * 
 * Manages registration, initialization, visibility, and cleanup of UI panels.
 * Provides console access and reduces boilerplate in Engine.
 * 
 * Usage:
 * ```typescript
 * // In Engine
 * const panelMgr = new UIPanelManager();
 * panelMgr.register('performance', new PerformanceMonitor(...));
 * panelMgr.showAll();
 * 
 * // In console
 * window.vectoriumPanels.show('debug');
 * window.vectoriumPanels.hide('performance');
 * ```
 */

import type { UIPanel } from './UIPanel';

export interface UIPanelManagerAPI {
  show(name: string): void;
  hide(name: string): void;
  toggle(name: string): void;
  showAll(): void;
  hideAll(): void;
  list(): string[];
  get(name: string): UIPanel | undefined;
}

export class UIPanelManager implements UIPanelManagerAPI {
  private panels = new Map<string, UIPanel>();
  
  constructor() {
  }
  
  /**
   * Register a panel with a unique name
   */
  register(name: string, panel: UIPanel): void {
    if (this.panels.has(name)) {
      console.warn(`UIPanelManager: Panel "${name}" already registered, replacing`);
    }
    this.panels.set(name, panel);
  }
  
  /**
   * Unregister and cleanup a panel
   */
  unregister(name: string): void {
    const panel = this.panels.get(name);
    if (panel) {
      panel.hide();
      this.panels.delete(name);
    }
  }
  
  /**
   * Show a specific panel
   */
  show(name: string): void {
    const panel = this.panels.get(name);
    if (panel) {
      panel.show();
    } else {
      console.warn(`UIPanelManager: Panel "${name}" not found`);
    }
  }
  
  /**
   * Hide a specific panel
   */
  hide(name: string): void {
    const panel = this.panels.get(name);
    if (panel) {
      panel.hide();
    } else {
      console.warn(`UIPanelManager: Panel "${name}" not found`);
    }
  }
  
  /**
   * Toggle panel visibility
   */
  toggle(name: string): void {
    const panel = this.panels.get(name);
    if (panel) {
      panel.toggle();
    } else {
      console.warn(`UIPanelManager: Panel "${name}" not found`);
    }
  }
  
  /**
   * Show all panels
   */
  showAll(): void {
    this.panels.forEach(panel => panel.show());
  }
  
  /**
   * Hide all panels
   */
  hideAll(): void {
    this.panels.forEach(panel => panel.hide());
  }
  
  /**
   * List all registered panel names
   */
  list(): string[] {
    return Array.from(this.panels.keys());
  }
  
  /**
   * Get a panel by name (for direct access)
   */
  get(name: string): UIPanel | undefined {
    return this.panels.get(name);
  }
  
  /**
   * Check if panel exists
   */
  has(name: string): boolean {
    return this.panels.has(name);
  }
  
  /**
   * Update all panels (if they have update methods)
   */
  update(dt: number): void {
    this.panels.forEach(panel => {
      if ('update' in panel && typeof (panel as any).update === 'function') {
        (panel as any).update(dt);
      }
    });
  }
  
  /**
   * Cleanup all panels
   */
  dispose(): void {
    this.panels.forEach(panel => panel.hide());
    this.panels.clear();
  }
}

