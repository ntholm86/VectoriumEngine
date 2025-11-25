/**
 * DebugToolRegistry - Plugin system for debug tools
 * 
 * Allows registering, enabling/disabling debug tools at runtime.
 * Tools can be registered from external code, making the system extensible.
 * 
 * Usage:
 * ```typescript
 * // Register a tool
 * registry.register({
 *   id: 'my-tool',
 *   name: 'My Debug Tool',
 *   create: (engine) => new MyDebugTool(engine),
 *   defaultEnabled: false
 * });
 * 
 * // Enable/disable
 * registry.enable('my-tool');
 * registry.disable('my-tool');
 * 
 * // Console access
 * window.vectoriumDebug.enable('my-tool');
 * window.vectoriumDebug.list();
 * ```
 */

import type { Vectorium } from '../core/Engine';

export interface DebugToolDefinition {
  id: string;
  name: string;
  description?: string;
  create: (engine: Vectorium) => DebugToolInstance;
  defaultEnabled?: boolean;
  keyboardShortcut?: string;
}

export interface DebugToolInstance {
  enable(): void;
  disable(): void;
  toggle?(): void;
  update?(dt: number): void;
  destroy?(): void;
}

export interface DebugToolRegistryAPI {
  list(): Array<{ id: string; name: string; enabled: boolean }>;
  enable(id: string): void;
  disable(id: string): void;
  toggle(id: string): void;
  enableAll(): void;
  disableAll(): void;
}

export class DebugToolRegistry implements DebugToolRegistryAPI {
  private tools = new Map<string, DebugToolDefinition>();
  private instances = new Map<string, DebugToolInstance>();
  private enabled = new Set<string>();
  private engine: Vectorium;
  private enableConsoleAPI: boolean;
  
  constructor(engine: Vectorium, options: { enableConsoleAPI?: boolean } = {}) {
    this.engine = engine;
    this.enableConsoleAPI = options.enableConsoleAPI ?? true;
    
    if (this.enableConsoleAPI) {
      this.exposeConsoleAPI();
    }
  }
  
  /**
   * Register a debug tool
   */
  register(definition: DebugToolDefinition): void {
    if (this.tools.has(definition.id)) {
      console.warn(`DebugToolRegistry: Tool "${definition.id}" already registered, replacing`);
      this.unregister(definition.id);
    }
    
    this.tools.set(definition.id, definition);
    
    // Auto-enable if defaultEnabled is true
    if (definition.defaultEnabled) {
      this.enable(definition.id);
    }
    
    console.log(`DebugToolRegistry: Registered tool "${definition.name}" (${definition.id})`);
  }
  
  /**
   * Unregister and cleanup a tool
   */
  unregister(id: string): void {
    // Disable first if enabled
    if (this.enabled.has(id)) {
      this.disable(id);
    }
    
    this.tools.delete(id);
  }
  
  /**
   * Enable a debug tool
   */
  enable(id: string): void {
    const definition = this.tools.get(id);
    if (!definition) {
      console.warn(`DebugToolRegistry: Tool "${id}" not found`);
      return;
    }
    
    // Already enabled
    if (this.enabled.has(id)) {
      return;
    }
    
    // Create instance
    try {
      const instance = definition.create(this.engine);
      this.instances.set(id, instance);
      this.enabled.add(id);
      instance.enable();
      console.log(`DebugToolRegistry: Enabled "${definition.name}"`);
    } catch (error) {
      console.error(`DebugToolRegistry: Failed to enable "${definition.name}":`, error);
    }
  }
  
  /**
   * Disable a debug tool
   */
  disable(id: string): void {
    const definition = this.tools.get(id);
    const instance = this.instances.get(id);
    
    if (!instance) {
      return; // Not enabled
    }
    
    try {
      instance.disable();
      if (instance.destroy) {
        instance.destroy();
      }
      this.instances.delete(id);
      this.enabled.delete(id);
      console.log(`DebugToolRegistry: Disabled "${definition?.name || id}"`);
    } catch (error) {
      console.error(`DebugToolRegistry: Failed to disable "${definition?.name || id}":`, error);
    }
  }
  
  /**
   * Toggle a debug tool
   */
  toggle(id: string): void {
    if (this.enabled.has(id)) {
      this.disable(id);
    } else {
      this.enable(id);
    }
  }
  
  /**
   * Enable all registered tools
   */
  enableAll(): void {
    this.tools.forEach((_, id) => this.enable(id));
  }
  
  /**
   * Disable all enabled tools
   */
  disableAll(): void {
    // Create array to avoid modification during iteration
    const enabledIds = Array.from(this.enabled);
    enabledIds.forEach(id => this.disable(id));
  }
  
  /**
   * List all registered tools with status
   */
  list(): Array<{ id: string; name: string; enabled: boolean; shortcut?: string }> {
    const result: Array<{ id: string; name: string; enabled: boolean; shortcut?: string }> = [];
    
    this.tools.forEach((definition, id) => {
      result.push({
        id,
        name: definition.name,
        enabled: this.enabled.has(id),
        shortcut: definition.keyboardShortcut
      });
    });
    
    return result;
  }
  
  /**
   * Check if a tool is enabled
   */
  isEnabled(id: string): boolean {
    return this.enabled.has(id);
  }
  
  /**
   * Get a tool instance (if enabled)
   */
  getInstance(id: string): DebugToolInstance | undefined {
    return this.instances.get(id);
  }
  
  /**
   * Update all enabled tools (call from game loop)
   */
  update(dt: number): void {
    this.instances.forEach((instance, id) => {
      if (instance.update) {
        try {
          instance.update(dt);
        } catch (error) {
          console.error(`DebugToolRegistry: Error updating tool "${id}":`, error);
        }
      }
    });
  }
  
  /**
   * Cleanup all tools
   */
  dispose(): void {
    this.disableAll();
    this.tools.clear();
    
    if (this.enableConsoleAPI) {
      delete (window as any).vectoriumDebug;
    }
  }
  
  /**
   * Expose API to window for console access
   */
  private exposeConsoleAPI(): void {
    const api: DebugToolRegistryAPI = {
      list: () => this.list(),
      enable: (id: string) => this.enable(id),
      disable: (id: string) => this.disable(id),
      toggle: (id: string) => this.toggle(id),
      enableAll: () => this.enableAll(),
      disableAll: () => this.disableAll()
    };
    
    (window as any).vectoriumDebug = api;
    
    console.log('DebugToolRegistry: Console API exposed as window.vectoriumDebug');
    console.log('  Usage: window.vectoriumDebug.list()');
    console.log('  Usage: window.vectoriumDebug.toggle("my-tool")');
  }
}
