/**
 * 🎨 Text Pool - Sparse String Storage for ECS
 * 
 * Efficient storage for text labels attached to entities.
 * Uses sparse array pattern - most entities don't have text.
 * 
 * Architecture:
 * - entities store textIndex (Int32Array, -1 = no text)
 * - TextPool stores actual strings at those indices
 * - Memory efficient: only allocates for entities with text
 * 
 * Performance:
 * - O(1) lookup by index
 * - Zero overhead for non-text entities
 * - ~50 bytes per text entity (vs 0 bytes for sprites)
 * 
 * Usage:
 * ```ts
 * const pool = new TextPool(1000);
 * const textIndex = pool.allocate("Hello World");
 * world.setTextIndex(entityId, textIndex);
 * // Later...
 * const text = pool.get(textIndex);
 * pool.free(textIndex);
 * ```
 */

export class TextPool {
  private texts: Map<number, string>;
  private nextId: number = 0;
  private freeList: number[] = [];
  private maxCapacity: number;
  
  constructor(maxCapacity: number = 10000) {
    this.texts = new Map();
    this.maxCapacity = maxCapacity;
  }
  
  /**
   * Allocate a new text entry
   * @param text The string to store
   * @returns Index for this text (use with world.setTextIndex())
   */
  allocate(text: string): number {
    if (this.texts.size >= this.maxCapacity) {
      throw new Error(`TextPool capacity exceeded: ${this.maxCapacity}`);
    }
    
    // Reuse freed index if available
    let index: number;
    if (this.freeList.length > 0) {
      index = this.freeList.pop()!;
    } else {
      index = this.nextId++;
    }
    
    this.texts.set(index, text);
    return index;
  }
  
  /**
   * Update existing text
   * @param index Text index
   * @param text New text value
   */
  update(index: number, text: string): void {
    if (!this.texts.has(index)) {
      throw new Error(`Invalid text index: ${index}`);
    }
    this.texts.set(index, text);
  }
  
  /**
   * Get text by index
   * @param index Text index
   * @returns The stored string, or empty string if not found
   */
  get(index: number): string {
    return this.texts.get(index) ?? '';
  }
  
  /**
   * Check if index has text
   */
  has(index: number): boolean {
    return this.texts.has(index);
  }
  
  /**
   * Free a text entry (returns index to free list)
   * @param index Text index to free
   */
  free(index: number): void {
    if (this.texts.delete(index)) {
      this.freeList.push(index);
    }
  }
  
  /**
   * Get current text count
   */
  getCount(): number {
    return this.texts.size;
  }
  
  /**
   * Get memory usage estimate (bytes)
   */
  getMemoryUsage(): number {
    let bytes = 0;
    for (const text of this.texts.values()) {
      bytes += text.length * 2; // ~2 bytes per character (UTF-16)
    }
    return bytes;
  }
  
  /**
   * Clear all text entries
   */
  clear(): void {
    this.texts.clear();
    this.freeList = [];
    this.nextId = 0;
  }
  
  /**
   * Get all text indices (for debugging)
   */
  getAllIndices(): number[] {
    return Array.from(this.texts.keys());
  }
  
  /**
   * Get debug info
   */
  getDebugInfo(): string {
    const memoryMB = (this.getMemoryUsage() / 1024 / 1024).toFixed(2);
    return `TextPool: ${this.texts.size}/${this.maxCapacity} entries, ${memoryMB} MB, ${this.freeList.length} free`;
  }
}
